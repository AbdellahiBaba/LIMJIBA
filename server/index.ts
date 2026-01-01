import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { verifyDatabaseConnection, isDatabaseReady, getPoolStats } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log(`Starting server initialization...`);
    log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    log(`PORT: ${process.env.PORT || '5000 (default)'}`);

    // Health check endpoint - ALWAYS returns 200 so Replit doesn't kill the container
    // Database status is reported in the response body for monitoring
    app.get("/health", (_req: Request, res: Response) => {
      const dbReady = isDatabaseReady();
      const poolStats = getPoolStats();
      
      // Always return 200 to pass Replit health checks
      // The actual database status is in the response body
      res.status(200).json({ 
        status: dbReady ? "healthy" : "starting",
        database: dbReady ? "connected" : "connecting",
        pool: poolStats
      });
    });

    // NOTE: Removed blocking /api middleware that returned 503
    // Instead, let actual database operations fail with proper error messages
    // This prevents false 503s during production cold starts

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    const port = parseInt(process.env.PORT || "5000", 10);
    
    // Start listening IMMEDIATELY so Replit health checks don't timeout
    // This must happen BEFORE any async setup to prevent cold start failures
    httpServer.listen(port, "0.0.0.0", () => {
      log(`Server listening on http://0.0.0.0:${port}`);
    });

    httpServer.on("error", (err: any) => {
      log(`Server error: ${err.message}`);
      console.error("Server error:", err);
    });

    // Start database verification in background immediately
    verifyDatabaseConnection().then((success) => {
      if (success) {
        log("Database ready for requests");
      } else {
        log("WARNING: Database connection issues - operations will retry automatically");
      }
    }).catch((err) => {
      log(`Database verification error: ${err.message}`);
    });

    // Now register routes and setup static files
    log("Registering routes...");
    await registerRoutes(httpServer, app);
    log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Setup vite in development or static files in production
    if (process.env.NODE_ENV === "production") {
      log("Setting up static file serving for production...");
      serveStatic(app);
      log("Static file serving configured");
    } else {
      log("Setting up Vite for development...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      log("Vite development server configured");
    }

    log("Server fully initialized and ready");
  } catch (error: any) {
    console.error("FATAL: Server initialization failed:", error);
    log(`FATAL: Server initialization failed: ${error.message}`);
    process.exit(1);
  }
})();
