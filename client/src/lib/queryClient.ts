import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Parse error response body to extract meaningful error message
async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) {
      return res.statusText || `HTTP ${res.status}`;
    }
    
    // Try to parse as JSON to get structured error
    try {
      const json = JSON.parse(text);
      // Return the most descriptive message available
      if (json.message) return json.message;
      if (json.error) {
        if (json.details && typeof json.details === 'string') {
          return `${json.error}: ${json.details}`;
        }
        return json.error;
      }
      return text;
    } catch {
      // Not JSON, return as plain text
      return text;
    }
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const errorMessage = await parseErrorResponse(res);
    const error = new Error(errorMessage) as Error & { status: number; retryable?: boolean };
    error.status = res.status;
    
    // Mark 503 errors as retryable
    if (res.status === 503) {
      error.retryable = true;
    }
    
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
