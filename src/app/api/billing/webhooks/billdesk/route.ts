import { NextResponse } from "next/server";

export async function POST() {
  // BillDesk stub — not yet configured
  return NextResponse.json({ error: "BillDesk not configured" }, { status: 501 });
}
