import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import pgSession from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { verifyDatabaseConnection, isDatabaseReady, getPoolStats, pool as dbPool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    isAdmin: boolean;
    isAuthenticated: boolean;
  }
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

const MemoryStoreSession = MemoryStore(session);
const PgSessionStore = pgSession(session);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

let serverReady = false;

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!serverReady && req.path !== "/health") {
    res.status(200).set({ "Content-Type": "text/html" }).end(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"></head><body><div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><p>Loading...</p></div></body></html>`);
    return;
  }
  next();
});

let activeSessionMiddleware: any = null;

function createSessionMiddleware(store: any) {
  return session({
    secret: process.env.SESSION_SECRET,
    name: "pfp_session",
    rolling: true,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 30 * 60 * 1000,
      sameSite: "lax",
      path: "/",
    },
  });
}

if (!isProduction) {
  activeSessionMiddleware = createSessionMiddleware(
    new MemoryStoreSession({ checkPeriod: 86400000 })
  );
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!activeSessionMiddleware) {
    return next();
  }
  activeSessionMiddleware(req, res, next);
});

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), magnetometer=(), gyroscope=(), accelerometer=()");
  next();
});

const blockedPathPatterns = [
  /^\/\.env(?:\..*)?\/?$/i,
  /^\/\.git(?:\/|$)/i,
  /^\/\.svn(?:\/|$)/i,
  /^\/\.hg(?:\/|$)/i,
  /^\/\.aws(?:\/|$)/i,
  /^\/\.htpasswd/i,
  /^\/\.htaccess/i,
  /^\/\.DS_Store/i,
  /^\/wp-admin(?:\/|$)/i,
  /^\/wp-login\.php/i,
  /^\/wp-content(?:\/|$)/i,
  /^\/wp-includes(?:\/|$)/i,
  /^\/wp-json(?:\/|$)/i,
  /^\/wp-config/i,
  /^\/xmlrpc\.php/i,
  /^\/phpmyadmin(?:\/|$)/i,
  /^\/server-status(?:\/|$)/i,
  /^\/server-info(?:\/|$)/i,
  /^\/elmah\.axd/i,
  /^\/trace\.axd/i,
  /^\/package\.json$/i,
  /^\/package-lock\.json$/i,
  /^\/composer\.(json|lock)$/i,
  /^\/docker-compose\.yml$/i,
  /^\/Dockerfile$/i,
  /^\/web\.config$/i,
  /^\/config\.php/i,
  /^\/debug(?:\/|$)/i,
  /^\/backup(?:\/|$)/i,
  /^\/install\.php/i,
  /^\/setup\.php/i,
  /^\/phpinfo\.php/i,
  /^\/info\.php/i,
  /^\/console(?:\/|$)/i,
  /^\/solr(?:\/|$)/i,
  /^\/cgi-bin(?:\/|$)/i,
  /^\/api\/swagger(?:\/|$)/i,
  /^\/api\/docs(?:\/|$)/i,
  /^\/crossdomain\.xml/i,
  /^\/graphql(?:\/|$)/i,
  /^\/actuator(?:\/|$)/i,
  /^\/admin\/?$/i,
  /^\/administrator(?:\/|$)/i,
  /^\/_profiler(?:\/|$)/i,
  /^\/\.well-known\/(?!acme-challenge)/i,
  /\.(bak|old|orig|save|swp|temp|sql|tar\.gz|tar|gz|zip|rar|7z)$/i,
  /^\/drupal(?:\/|$)/i,
  /^\/user\/(login|register|password)(?:\/|$)/i,
  /^\/CHANGELOG\.txt$/i,
  /^\/jmx-console(?:\/|$)/i,
  /^\/manager(?:\/|$)/i,
  /^\/web-console(?:\/|$)/i,
  /^\/status(?:\/|$)/i,
  /^\/node\/\d/i,
  /^\/sites\/default(?:\/|$)/i,
  /^\/misc\/drupal\.js/i,
  /^\/invoke(?:\/|$)/i,
  /^\/jbossws(?:\/|$)/i,
  /^\/host-manager(?:\/|$)/i,
  /^\/robots\.txt$/i,
  /^\/sitemap\.xml$/i,
  /^\/api\/v\d+(?:\/|$)/i,
];

app.use((req, res, next) => {
  const p = decodeURIComponent(req.path).replace(/\/+/g, "/");
  for (const pattern of blockedPathPatterns) {
    if (pattern.test(p)) {
      return res.status(404).end();
    }
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/store/auth/login", authLimiter);

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Please try again later." },
});
app.use("/api/store/auth/signup", signupLimiter);
app.use("/api/store/auth/forgot-password", signupLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
app.use("/api/", apiLimiter);

if (isProduction) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "limjiba.com,limjiba.replit.app").split(",").map(d => d.trim());
  app.use("/api/", (req: Request, res: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.headers.origin || req.headers.referer;
    if (!origin) {
      if ((req.session as any)?.isAuthenticated || (req.session as any)?.storeCustomer) {
        return res.status(403).json({ error: "Origin header required for authenticated requests" });
      }
      return next();
    }
    try {
      const url = new URL(origin);
      const host = url.hostname;
      if (allowedOrigins.some(d => host === d || host.endsWith(`.${d}`))) return next();
    } catch {}
    return res.status(403).json({ error: "Cross-origin request blocked" });
  });
}

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
      const response: any = { 
        status: dbReady ? "healthy" : "starting",
        database: dbReady ? "connected" : "connecting",
      };
      if (!isProduction) {
        response.pool = getPoolStats();
      }
      res.status(200).json(response);
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

    log("Registering routes...");
    await registerRoutes(httpServer, app);
    log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler: ${status} - ${message}`);
      res.status(status).json({ message: isProduction && status >= 500 ? "Internal Server Error" : message });
    });

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

    try {
      const dbSuccess = await verifyDatabaseConnection();
      if (dbSuccess) {
        log("Database ready for requests");

        if (isProduction) {
          try {
            await dbPool.query(`DELETE FROM user_sessions WHERE expire < NOW()`);
            const countResult = await dbPool.query(`SELECT COUNT(*) as cnt FROM user_sessions`);
            log(`Session cleanup done. Active sessions: ${countResult.rows[0]?.cnt || 0}`);
          } catch (cleanupErr: any) {
            log(`Session table cleanup: ${cleanupErr.message}`);
          }
          try {
            const pgStore = new PgSessionStore({
              pool: dbPool,
              tableName: "user_sessions",
              createTableIfMissing: false,
              pruneSessionInterval: 60 * 15,
            });
            await dbPool.query(`SELECT 1 FROM user_sessions LIMIT 1`);
            activeSessionMiddleware = createSessionMiddleware(pgStore);
            log("PgSessionStore activated after DB verification");
          } catch (storeErr: any) {
            log(`PgSessionStore probe failed, falling back to MemoryStore: ${storeErr.message}`);
          }
        }
      } else {
        log("WARNING: Database connection issues - operations will retry automatically");
      }
    } catch (err: any) {
      log(`Database verification error: ${err.message}`);
    }

    if (!activeSessionMiddleware) {
      activeSessionMiddleware = createSessionMiddleware(
        new MemoryStoreSession({ checkPeriod: 86400000 })
      );
      log("Using MemoryStore for sessions (fallback)");
    }

    serverReady = true;
    log("Server fully initialized and ready");
  } catch (error: any) {
    console.error("FATAL: Server initialization failed:", error);
    log(`FATAL: Server initialization failed: ${error.message}`);
    process.exit(1);
  }
})();
