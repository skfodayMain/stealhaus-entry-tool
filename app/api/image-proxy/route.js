// app/api/image-proxy/route.js
//
// Fetches an external image on the server and returns it with permissive
// CORS headers, so the browser can load it into a <canvas> without being
// blocked by cross-origin restrictions (which was causing "Tainted canvases
// may not be exported" errors on Download and Post to Instagram).
//
// Usage: /api/image-proxy?url=https://retailer.com/photo.jpg

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      return new Response('Failed to fetch source image', { status: 502 });
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return new Response('Error fetching image', { status: 500 });
  }
}
