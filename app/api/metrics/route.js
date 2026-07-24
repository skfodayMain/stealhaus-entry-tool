import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  try {
    // Total clicks, all time
    const { count: totalClicks } = await supabaseAdmin
      .from("product_clicks")
      .select("*", { count: "exact", head: true });

    // Clicks in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: last7Days } = await supabaseAdmin
      .from("product_clicks")
      .select("*", { count: "exact", head: true })
      .gte("clicked_at", sevenDaysAgo);

    // Total products live
    const { count: totalProducts } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("still_in_feed", true);

    // All clicks with product info, for top-item and top-brand breakdowns
    const { data: clicks, error: clicksError } = await supabaseAdmin
      .from("product_clicks")
      .select("product_id, clicked_at, products(name, current_price, currency, brands(name), retailers(name))")
      .order("clicked_at", { ascending: false })
      .limit(1000);

    if (clicksError) {
      return NextResponse.json({ error: clicksError.message }, { status: 500 });
    }

    // Top clicked products
    const productCounts = {};
    const brandCounts = {};
    const retailerCounts = {};

    for (const c of clicks || []) {
      if (!c.products) continue;
      const pid = c.product_id;
      productCounts[pid] = productCounts[pid] || { name: c.products.name, count: 0 };
      productCounts[pid].count += 1;

      const brandName = c.products.brands?.name;
      if (brandName) brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;

      const retailerName = c.products.retailers?.name;
      if (retailerName) retailerCounts[retailerName] = (retailerCounts[retailerName] || 0) + 1;
    }

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topBrands = Object.entries(brandCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topRetailers = Object.entries(retailerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalClicks: totalClicks || 0,
      last7Days: last7Days || 0,
      totalProducts: totalProducts || 0,
      topProducts,
      topBrands,
      topRetailers,
      recentClicks: (clicks || []).slice(0, 20),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
