import { NextResponse } from "next/server";

const AI_TRADER_API = process.env.NEXT_PUBLIC_AI_TRADER_API || "https://ai-trader-jylt.onrender.com";

export async function GET() {
  try {
    const res = await fetch(`${AI_TRADER_API}/analytics/matrix`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
