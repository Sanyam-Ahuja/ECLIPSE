import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://34.100.183.146:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
