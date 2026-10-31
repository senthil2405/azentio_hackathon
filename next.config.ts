import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// HTTPS-only directives apply on the real deployment (Vercel), not on local/LAN http testing.
const isHttpsDeploy = Boolean(process.env.VERCEL);

// Content Security Policy. 'unsafe-inline' for scripts is a documented trade-off: per-request nonces would
// make every public page dynamic (losing CDN/static cost and latency benefits). There are no HTML injection
// sinks in the app (no dangerouslySetInnerHTML; links restricted to http(s)), which limits the residual risk.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isHttpsDeploy ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isHttpsDeploy ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  ...(isHttpsDeploy ? [{ key: "Cross-Origin-Opener-Policy", value: "same-origin" }] : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
