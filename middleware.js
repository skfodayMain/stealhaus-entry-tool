import { NextResponse } from "next/server";

// When someone visits shop.stealhaus.com directly, show them the /shop grid
// page instead of the admin tool that normally lives at the root path.
// The .vercel.app address (used for the admin tool) is untouched by this.
export function middleware(request) {
  const host = request.headers.get("host") || "";
  if (host.startsWith("shop.") && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/shop", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
