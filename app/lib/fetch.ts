import { isProduction } from "@/lib/utils";
import type { z } from "zod";

type FetchJsonOptions<T> = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: { json: unknown } | { formData: FormData };
  schema: z.ZodType<T>;
  signal?: AbortSignal;
};

type FetchJsonResult<T> =
  | {
      data: T;
      error: undefined;
    }
  | {
      data: undefined;
      error: Error;
    };

export class FetchJsonError extends Error {
  constructor(
    message: string,
    public cause: unknown,
    public statusCode?: number,
    public apiError?: string,
  ) {
    super(message, { cause });
    this.name = "FetchJsonError";
  }
}

export async function fetchJson<T>({
  method,
  url,
  headers = {},
  body,
  schema,
  signal,
}: FetchJsonOptions<T>): Promise<FetchJsonResult<T>> {
  try {
    const requestInit: RequestInit = {
      method,
      headers: {
        ...headers,
      },
      signal,
    };

    if (body) {
      if ("json" in body) {
        // @ts-expect-error headers is set above
        requestInit.headers["Content-Type"] = "application/json";
        requestInit.body = JSON.stringify(body.json);
      } else if ("formData" in body) {
        requestInit.body = body.formData;
      }
    }

    const response = await fetch(url, requestInit);
    if (!isProduction()) {
      console.log("[FetchJson] response", response);
    }
    const responseText = await response.text();
    if (!isProduction()) {
      console.log("[FetchJson] responseText", responseText);
    }
    let jsonData;
    try {
      jsonData = JSON.parse(responseText);
    } catch (error) {
      // JSON parsing failed
      console.error("[FetchJson] error", error);
      return {
        data: undefined,
        error: new FetchJsonError(
          !response.ok
            ? `Request failed with status ${response.status}`
            : "Invalid JSON response",
          responseText,
          response.status,
          !response.ok ? responseText : undefined,
        ),
      };
    }

    // Check if response is not OK (4xx, 5xx) - extract error message from API response
    if (!response.ok) {
      // Try to extract error message from common API error response formats
      const apiErrorMessage =
        jsonData?.error?.message ||
        jsonData?.error ||
        jsonData?.message ||
        jsonData?.errors?.[0]?.message ||
        JSON.stringify(jsonData?.errors) ||
        "Request failed";

      return {
        data: undefined,
        error: new FetchJsonError(
          apiErrorMessage,
          jsonData,
          response.status,
          apiErrorMessage,
        ),
      };
    }

    // If response is OK, validate against schema
    const parseResult = schema.safeParse(jsonData);
    if (parseResult.success) {
      return {
        error: undefined,
        data: parseResult.data,
      };
    } else {
      // Schema validation failed - include schema errors in message
      const schemaErrors = parseResult.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");

      return {
        data: undefined,
        error: new FetchJsonError(
          `Schema validation failed: ${schemaErrors}`,
          jsonData,
          response.status,
          `Schema validation failed: ${schemaErrors}`,
        ),
      };
    }
  } catch (error) {
    return {
      data: undefined,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export async function fetchJsonOrThrow<T>({
  method,
  url,
  headers = {},
  body,
  schema,
  signal,
}: FetchJsonOptions<T>): Promise<T> {
  const result = await fetchJson({
    method,
    url,
    headers,
    body,
    schema,
    signal,
  });
  if (result.error) {
    console.error("[FetchJson] error", result.error);
    throw result.error;
  }
  return result.data;
}
