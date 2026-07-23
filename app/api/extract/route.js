import { NextResponse } from "next/server";

// This route:
// 1. Takes the page text YOU copied and pasted from your own browser
//    (this avoids retailer sites blocking automated server requests)
// 2. Sends that text to Claude with instructions to pull out specific fields
// 3. Returns clean JSON back to the front end for you to review before saving

export async function POST(request) {
  try {
    const { url, pageText } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }
    if (!pageText || pageText.trim().length < 50) {
      return NextResponse.json(
        { error: "Paste the product page content into the box below the link first." },
        { status: 400 }
      );
    }

    // Trim to a safe length so we don't send huge, costly requests to Claude
    // for one product page.
    const plainText = pageText.trim().slice(0, 15000);

    // Ask Claude to extract the fields we need, as JSON only
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
  "gender": "",              // exactly one of: men, women, unisex (lowercase, singular) - best guess from the page
  "product_name": "",
  "description": "",        // one short sentence describing the item, or "" if not clearly stated
  "original_price": null,   // number only, no currency symbol
  "sale_price": null,       // number only, no currency symbol
  "currency": "",           // e.g. GBP, USD, EUR
  "sizes_available": "",    // comma separated, or "One Size"
  "image_url": "",          // the main product image, full URL - if not visible in the pasted text, leave blank
  "stock_status": "",       // exactly one of: in_stock, low_stock, out_of_stock (lowercase, underscore) - use low_stock if only one or a few remain
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

