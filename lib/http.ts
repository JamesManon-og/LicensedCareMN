import { NextResponse } from "next/server";
import type { z } from "zod";

/** A failure the user should see: an HTTP status and a message that is safe to show them. */
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Wraps a route handler so it can throw instead of building error responses. An HttpError becomes
 * a JSON response with its status and message; any other error is logged and returned as a
 * generic 500, so database and library messages never reach the browser.
 */
export function handleRoute<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error(error);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/** The request's JSON body, checked against `schema`; a missing, malformed or invalid body is a 400 with `message`. */
export async function readJson<Schema extends z.ZodType>(request: Request, schema: Schema, message: string): Promise<z.infer<Schema>> {
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success) throw new HttpError(400, message);
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A record id from the URL. Ids are UUIDs, so anything else cannot exist: a 404, not a database error. */
export function parseId(id: string, message = "Not found.") {
  if (!UUID.test(id)) throw new HttpError(404, message);
  return id;
}
