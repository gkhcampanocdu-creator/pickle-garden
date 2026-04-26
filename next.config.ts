import type { NextConfig } from "next";

// Domains allowed to receive fetch/WebSocket connections from the browser.
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

const isDev = process.env.NODE_ENV === 'development'

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.resend.com;
  frame-src https://www.google.com https://maps.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Clickjacking protection
          { key: 'X-Frame-Options',        value: 'DENY' },
          // MIME-type sniffing protection
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer information sent to external sites
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          // Disable browser features not needed by this app
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
          // Force HTTPS for 1 year (enable once you have a verified SSL cert on your domain)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // XSS + injection protection
          { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
        ],
      },
    ]
  },
};

export default nextConfig;
