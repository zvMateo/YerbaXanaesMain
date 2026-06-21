import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Revalidación on-demand del catálogo. La llama el API (server-to-server) cuando
// cambian productos/stock. Protegida por REVALIDATE_SECRET (header).
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { revalidated: false, message: "Revalidation not configured" },
      { status: 503 },
    );
  }

  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json(
      { revalidated: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const tag = request.nextUrl.searchParams.get("tag") || "products";
  // Next.js 16: revalidateTag requiere un cacheLife profile. "max" = stale-while-revalidate.
  revalidateTag(tag, "max");

  return NextResponse.json({ revalidated: true, tag });
}
