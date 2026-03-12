import { NextResponse } from "next/server";

/**
 * Health check
 * @description Returns server health status
 * @response 200:HealthResponse
 * @tag Health
 * @openapi
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
