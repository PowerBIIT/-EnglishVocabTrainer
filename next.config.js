/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
const e2eUiFlag =
  process.env.NEXT_PUBLIC_E2E_TEST ?? process.env.E2E_TEST ?? 'false';

const googleAdsSources = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
  ? [
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://stats.g.doubleclick.net',
      'https://www.googleadservices.com',
    ]
  : [];

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  ...googleAdsSources,
].join(' ');

const connectSrc = [
  "'self'",
  ...(isDev ? ['ws:'] : []),
  ...googleAdsSources,
].join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]),
];

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_E2E_TEST: e2eUiFlag,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
