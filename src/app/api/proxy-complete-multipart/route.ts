import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const body = await req.text();
  const apiKey = req.headers.get("x-api-key");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/uploads/complete-multi-part`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "Authorization": apiKey } : {}),
    },
    body,
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
} 