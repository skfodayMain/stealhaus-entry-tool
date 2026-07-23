import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../lib/supabase";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Your database only accepts exactly 'men', 'women', or 'unisex' for gender
// (see products_gender_check constraint). This maps common variants Claude
// might return to the exact allowed value, or null if nothing matches -
// null is always safe since gender is an optional column.
function normalizeGender(value) {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (["men", "man", "menswear", "male"].includes(v)) return "men";
  if (["women", "woman", "womenswear", "female"].includes(v)) return "women";
  if (["unisex", "uni-sex"].includes(v)) return "unisex";
  return null;
}

// Your database only accepts exactly 'in_stock', 'low_stock', or 'out_of_stock'
// for stock_status (see products_stock_status_check constraint). This maps
// whatever comes back from extraction (or manual typing) to the exact
// allowed value, or null if nothing matches.
function normalizeStockStatus(value) {
  if (!value) return null;
  const v = value.toLowerCase().trim().replace(/\s+/g, "_");
  if (["in_stock", "instock"].includes(v)) return "in_stock";
  if (["low_stock", "one_left", "lowstock"].includes(v)) return "low_stock";
  if (["out_of_stock", "sold_out", "soldout", "outofstock"].includes(v)) return "out_of_stock";
  return null;
}

// Find a brand by name, or create it if it doesn't exist yet. Returns the brand id.
async function getOrCreateBrandId(brandName) {
  const { data: found } = await supabase
    .from("brands")
    .select("id")
    .ilike("name", brandName)
    .maybeSingle();

  if (found) return found.id;

  const { data: created, error } = await supabase
    .from("brands")
    .insert([{ name: brandName, slug: slugify(brandName), status: "established" }])
    .select("id")
    .single();

  if (error) throw new Error(`Could not create brand "${brandName}": ${error.message}`);
  return created.id;
}

// Find a retailer by name. Your retailer list is curated ahead of time, so if
// it's missing here, that's worth double-checking rather than auto-creating.
async function getRetailerId(retailerName) {
  const { data: found, error } = await supabase
    .from("retailers")
    .select("id")
    .ilike("name", retailerName)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!found) return null;
  return found.id;
}

// GET → the 5 most recently added products, with brand + retailer names attached
export async function GET() {
  const { data, error } = await supabase
    .from("products")
    .select("*, brands(name), retailers(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ recent: data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      product_url,
      brand,
      retailer,
      product_name,
      category,
      gender,
      description,
      original_price,
      sale_price,
      currency,
      sizes_available,
      image_url,
      stock_status,
      style_tags,
      force,
    } = body;

    if (!product_url || !brand || !retailer || !product_name) {
      return NextResponse.json(
        { error: "Brand, Retailer, Product name and Product URL are all required." },
        { status: 400 }
      );
    }

    // Duplicate check #1: exact Product URL match
    const { data: urlMatches, error: urlCheckError } = await supabase
      .from("products")
      .select("id, name, product_url")
      .eq("product_url", product_url);

    if (urlCheckError) {
      return NextResponse.json({ error: urlCheckError.message }, { status: 500 });
    }

    // Resolve brand + retailer to their IDs (needed for both the backup
    // duplicate check below and the eventual insert)
    const brandId = await getOrCreateBrandId(brand);
    const retailerId = await getRetailerId(retailer);

    if (!retailerId) {
      return NextResponse.json(
        {
          error: `"${retailer}" isn't in your Retailers table yet. Add it there first (it's on your curated list, so this is likely a spelling mismatch - check it matches exactly).`,
        },
        { status: 400 }
      );
    }

    // Duplicate check #2 (backup): same Brand + same Product Name, even if
    // the URL is different - catches things like colour-variant links or a
    // retailer changing their URL structure, which check #1 alone would miss.
    const { data: nameMatches, error: nameCheckError } = await supabase
      .from("products")
      .select("id, name, product_url")
      .eq("brand_id", brandId)
      .ilike("name", product_name);

    if (nameCheckError) {
      return NextResponse.json({ error: nameCheckError.message }, { status: 500 });
    }

    // Merge both checks, removing any duplicate rows found by both
    const seen = new Set();
    const allMatches = [...(urlMatches || []), ...(nameMatches || [])].filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    if (allMatches.length > 0 && !force) {
      return NextResponse.json({ duplicate: true, matches: allMatches });
    }

    const now = new Date().toISOString();

    const styleTagsArray = style_tags
      ? style_tags.split(",").map((t) => t.trim()).filter(Boolean)
      : null;

    const baseInsert = {
      retailer_id: retailerId,
      brand_id: brandId,
      name: product_name,
      description: description || null,
      category: category || null,
      gender: normalizeGender(gender),
      image_url: image_url || null,
      product_url,
      // Your products table requires affiliate_url on every row, but you don't
      // have real affiliate links yet - using the plain product link as a
      // stand-in for now. Once you're approved for an affiliate programme,
      // this can be swapped for the real tracked link.
      affiliate_url: product_url,
      currency: currency || null,
      current_price: sale_price || null,
      original_price: original_price || null,
      stock_status: normalizeStockStatus(stock_status),
      still_in_feed: true,
      date_first_imported: now,
      date_last_checked: now,
    };

    let { data: product, error: insertError } = await supabase
      .from("products")
      .insert([{ ...baseInsert, style_tags: styleTagsArray }])
      .select()
      .single();

    // If style_tags column type doesn't accept an array (e.g. it's plain text),
    // retry once without it rather than failing the whole save.
    if (insertError && styleTagsArray) {
      const retry = await supabase
        .from("products")
        .insert([baseInsert])
        .select()
        .single();
      product = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Save each size as its own row in product_variants
    if (sizes_available) {
      const sizes = sizes_available
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (sizes.length > 0) {
        const variantRows = sizes.map((size) => ({
          product_id: product.id,
          size,
          stock_available: normalizeStockStatus(stock_status) !== "out_of_stock",
        }));

        const { error: variantError } = await supabase
          .from("product_variants")
          .insert(variantRows);

        if (variantError) {
          // Product saved OK, but flag the variant issue rather than failing silently
          return NextResponse.json({
            saved: product,
            warning: `Product saved, but sizes could not be saved: ${variantError.message}`,
          });
        }
      }
    }

    return NextResponse.json({ saved: product });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
