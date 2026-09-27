import "./lib/error-capture";

import serverEntry from "@tanstack/react-start/server-entry";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";


function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

async function fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  try {
    const response = await serverEntry.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return brandedErrorResponse();
  }
}

// This module runs on the Lovable edge runtime (Cloudflare Workers), where the
// platform calls the exported `fetch` itself and binding a TCP port is not allowed
// (doing so crashed the published site at load time with a 502).
// A standalone Node host (Cloud Run / Firebase App Hosting) sets K_SERVICE; only
// there do we lazily boot an HTTP server and serve the built client assets.
if (!import.meta.env.DEV && process.env.K_SERVICE) {
  void (async () => {
    const [{ serve }, { serveStatic }, { fileURLToPath }, { dirname, join }] = await Promise.all([
      import("srvx/node"),
      import("srvx/static"),
      import("node:url"),
      import("node:path"),
    ]);
    const clientDir = join(dirname(fileURLToPath(import.meta.url)), "../client");
    const port = Number.parseInt(process.env.PORT ?? "", 10) || 8080;
    serve({
      port,
      middleware: [serveStatic({ dir: clientDir })],
      fetch: (request: Request) => fetch(request, undefined, undefined),
    });
  })();
}
export default { fetch };
