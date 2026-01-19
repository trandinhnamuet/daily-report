import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id, name } = await req.json();

  const res = NextResponse.json({ success: true });

  res.cookies.set("reporter_id", String(id), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  res.cookies.set("reporter_name", encodeURIComponent(name), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
