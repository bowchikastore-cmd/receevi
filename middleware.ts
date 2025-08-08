import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Skip rewrite if the request is for /api/webhook
  if (req.nextUrl.pathname === '/api/webhook') {
    return NextResponse.next();
  }

  // Otherwise, allow everything else (or your existing logic)
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/webhook'],
};
