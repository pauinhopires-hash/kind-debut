import "./lib/error-capture";

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serve } from "srvx/node";
import { serveStatic } from "srvx/static";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

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
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return brandedErrorResponse();
  }
}

// @tanstack/react-start/server-entry only handles SSR routes — unlike Nitro's own
// generated entry, it does NOT serve the built client assets (dist/client/*), so we
// serve those ourselves before falling back to the SSR handler.
const clientDir = join(dirname(fileURLToPath(import.meta.url)), "../client");

// Firebase App Hosting (Cloud Run) runs this file as a plain Node process — unlike
// Cloudflare Workers, nothing else calls .fetch() for us, so we must bind our own
// HTTP server on $PORT (same approach Nitro's own node-server preset uses).
// Guarded to production only — `vite dev` also evaluates this module for its own
// SSR middleware, and would otherwise open a second, competing HTTP server.
if (!import.meta.env.DEV) {
  const port = Number.parseInt(process.env.PORT ?? "", 10) || 8080;
  serve({
    port,
    middleware: [serveStatic({ dir: clientDir })],
    fetch: (request: Request) => fetch(request, undefined, undefined),
  });
}

export default { fetch };
