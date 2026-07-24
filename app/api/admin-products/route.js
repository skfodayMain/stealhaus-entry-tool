import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

const PAGE_SIZE = 50;

// GET /api/admin-products?page=1 - paginated list of ALL products (including
// sold out / hidden ones), for the manage page. Uses the admin client so RLS
// doesn't hide anything from you here.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabaseAdmin
    .from("products")
    .select("*, brands(name), retailers(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: data,
    totalCount: count,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  });
}
