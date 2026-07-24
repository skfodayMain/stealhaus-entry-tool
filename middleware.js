import { NextResponse } from "next/server";

// PUBLIC: the /shop grid page - anyone can view this, no password.
// PROTECTED: the entry tool ("/"), /metrics, /manage, and their related
// API routes - these require the username/password set in Vercel's
// Environment Variables (ADMIN_USERNAME / ADMIN_PASSWORD).

export function middleware(request) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Public: shop.stealhaus.com's root shows the shop grid, no password needed
  if (host.startsWith("shop.") && pathname === "/") {
    return NextResponse.rewrite(new URL("/shop", request.url));
  }

  // Everything else this middleware runs on (see matcher below) requires
  // the correct username + password
  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const separatorIndex = decoded.indexOf(":");
      const user = decoded.slice(0, separatorIndex);
      const pass = decoded.slice(separatorIndex + 1);
      if (user === validUser && pass === validPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="StealHaus Admin"' },
  });
}

export const config = {
  matcher: [
    "/",
    "/metrics/:path*",
    "/manage/:path*",
    "/api/extract/:path*",
    "/api/products/:path*",
    "/api/metrics/:path*",
    "/api/admin-products/:path*",
  ],
};
