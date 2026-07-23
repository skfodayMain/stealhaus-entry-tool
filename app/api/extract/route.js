import { NextResponse } from "next/server";

// This route:
// 1. Fetches the product page you pasted a link for
// 2. Sends the page text to Claude with instructions to pull out specific fields
// 3. Returns clean JSON back to the front end for you to review before saving

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Step 1: fetch the page HTML
    const pageResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });

    if (!pageResponse.ok) {
      return NextResponse.json(
        { error: `Could not load that page (status ${pageResponse.status}). It may be sold out, moved, or blocking automated requests.` },
        { status: 502 }
      );
    }

    const html = await pageResponse.text();

    // Strip tags down to plain text and trim to a safe length so we don't
    // send huge, costly requests to Claude for one product page.
    const plainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    // Step 2: ask Claude to extract the fields we need, as JSON only
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are extracting product data for a luxury deal-tracking database from a retailer's product page.

Page URL: ${url}

Page text content:
"""
${plainText}
"""

Return ONLY a JSON object (no markdown, no preamble, no code fences) with exactly these fields:
{
  "brand": "",
  "category": "",           // e.g. Clothing, Shoes, Bags, Jewellery, Watches, Sunglasses, Optical Glasses - be specific, this is a free text field
  "gender": "",             // Womenswear, Menswear, or Unisex - best guess from the page
  "product_name": "",
  "description": "",        // one short sentence describing the item, or "" if not clearly stated
  "original_price": null,   // number only, no currency symbol
  "sale_price": null,       // number only, no currency symbol
  "currency": "",           // e.g. GBP, USD, EUR
  "sizes_available": "",    // comma separated, or "One Size"
  "image_url": "",          // the main product image, full URL
  "stock_status": "",       // one of: In Stock, Low Stock, One Left, Sold Out, Unknown
  "style_tags": ""          // comma separated short tags if obvious, e.g. "leather, ankle boot" - else ""
}

If you cannot confidently find a field, use an empty string ("") or null rather than guessing.`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return NextResponse.json(
        { error: `Claude API error: ${errText}` },
        { status: 502 }
      );
    }

    const claudeData = await claudeResponse.json();
    const textBlock = claudeData.content.find((c) => c.type === "text");
    const cleaned = (textBlock?.text || "{}").replace(/```json|```/g, "").trim();

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json(
        { error: "Claude's response wasn't valid JSON. Try again or enter details manually.", raw: cleaned },
        { status: 502 }
      );
    }

    return NextResponse.json({ extracted, product_url: url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
