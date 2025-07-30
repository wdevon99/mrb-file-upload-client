import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const apiKey = req.headers.get("x-api-key");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/uploads/init-multi-part`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "Authorization": apiKey } : {}),
    },
    body,
  });

  console.log("res:", res);
  console.log("apiKey:", apiKey);

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
} 