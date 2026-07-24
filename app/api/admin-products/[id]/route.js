import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

// Same normalisation rules as the entry tool - your database only accepts
// exact lowercase values for these two fields.
function normalizeGender(value) {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (["men", "man", "menswear", "male"].includes(v)) return "men";
  if (["women", "woman", "womenswear", "female"].includes(v)) return "women";
  if (["unisex", "uni-sex"].includes(v)) return "unisex";
  return null;
}

function normalizeStockStatus(value) {
  if (!value) return null;
  const v = value.toLowerCase().trim().replace(/\s+/g, "_");
  if (["in_stock", "instock"].includes(v)) return "in_stock";
  if (["low_stock", "one_left", "lowstock"].includes(v)) return "low_stock";
  if (["out_of_stock", "sold_out", "soldout", "outofstock"].includes(v)) return "out_of_stock";
  return null;
}

// PUT /api/admin-products/[id] - update a product's editable fields
export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();

  const updates = {
    name: body.name,
    description: body.description || null,
    category: body.category || null,
    gender: normalizeGender(body.gender),
    image_url: body.image_url || null,
    image_urls: body.image_urls && body.image_urls.length > 0 ? body.image_urls : null,
    product_url: body.product_url,
    affiliate_url: body.affiliate_url || body.product_url,
    currency: body.currency || null,
    current_price: body.current_price || null,
    original_price: body.original_price || null,
    stock_status: normalizeStockStatus(body.stock_status),
    still_in_feed: body.still_in_feed,
    date_last_checked: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data });
}

// DELETE /api/admin-products/[id]?mode=hide|permanent
export async function DELETE(request, { params }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "hide";

  if (mode === "permanent") {
    // Also remove its size/variant rows first, since they reference this product
    await supabaseAdmin.from("product_variants").delete().eq("product_id", id);

    const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: true, mode: "permanent" });
  }

  // Default: just hide it from the shop/feed, keep the data
  const { error } = await supabaseAdmin
    .from("products")
    .update({ still_in_feed: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: true, mode: "hide" });
}
