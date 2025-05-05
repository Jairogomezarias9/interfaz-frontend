import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https', // Add protocol
        hostname: 'cdn.betspace.tech'
      }
    ]
  }
};

export default nextConfig;
