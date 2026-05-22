import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "cadre-test",
    timestamp: new Date().toISOString(),
  });
}
