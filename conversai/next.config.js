/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // During deployment, allow builds with TypeScript errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // During deployment, allow builds with ESLint errors
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig