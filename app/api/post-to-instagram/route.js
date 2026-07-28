// app/api/post-to-instagram/route.js
//
// Publishes an image + caption to your Instagram Business account
// using the Instagram Graph API.
//
// Required environment variables (set these in Vercel → Settings → Environment Variables):
//   IG_BUSINESS_ACCOUNT_ID   - your Instagram Business Account numeric ID
//   IG_ACCESS_TOKEN          - the long-lived access token generated in Meta
//
// Called with a POST request, JSON body: { "image_url": "...", "caption": "..." }
// image_url MUST be a public URL (e.g. a Supabase Storage public bucket link) -
// Instagram cannot accept a local file or a data:// URL.

import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body || !body.image_url || !body.caption) {
    return NextResponse.json(
      { error: 'Both image_url and caption are required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { image_url, caption } = body;
  const IG_ID = (process.env.IG_BUSINESS_ACCOUNT_ID || '').trim().replace(/^["']|["']$/g, '');
  const TOKEN = (process.env.IG_ACCESS_TOKEN || '').trim().replace(/^["']|["']$/g, '');

  if (!IG_ID || !TOKEN) {
    return NextResponse.json(
      { error: 'Server is missing IG_BUSINESS_ACCOUNT_ID or IG_ACCESS_TOKEN' },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    // Step 1: create a media container
    const createRes = await fetch(
      `https://graph.instagram.com/v21.0/${IG_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url,
          caption,
          access_token: TOKEN
        })
      }
    );
    const createData = await createRes.json();

    if (!createRes.ok) {
      return NextResponse.json(
        {
          error: 'Failed to create media container',
          details: createData,
          diagnostic: { token_length: TOKEN.length, ig_id_length: IG_ID.length }
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const creationId = createData.id;

    // Step 2: publish the container
    const publishRes = await fetch(
      `https://graph.instagram.com/v21.0/${IG_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: TOKEN
        })
      }
    );
    const publishData = await publishRes.json();

    if (!publishRes.ok) {
      return NextResponse.json(
        { error: 'Failed to publish media', details: publishData },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ success: true, post_id: publishData.id }, { headers: CORS_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error', details: err.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
