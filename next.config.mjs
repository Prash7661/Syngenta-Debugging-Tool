/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Docker optimization
  output: 'standalone',
  // Experimental features for better performance
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
}

export default nextConfig
