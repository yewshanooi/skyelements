import type { NextConfig } from "next";

const securityHeaders = [
    { 
        key: "X-DNS-Prefetch-Control", 
        value: "off" 
    },
    { 
        key: "Strict-Transport-Security", 
        value: "max-age=63072000; includeSubDomains; preload" 
    },
    {
        key: "X-Frame-Options", 
        value: "SAMEORIGIN" 
    },
    { 
        key: "X-Content-Type-Options", 
        value: "nosniff" 
    },
    { 
        key: "Referrer-Policy", 
        value: "strict-origin-when-cross-origin" 
    },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500kb',
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
