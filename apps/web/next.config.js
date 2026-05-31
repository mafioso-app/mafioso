/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  // Set OUTPUT_STANDALONE=true in Docker/CI; not needed on Vercel (managed) or local Windows dev
  output: process.env['OUTPUT_STANDALONE'] === 'true' ? 'standalone' : undefined,
  poweredByHeader: false,
  transpilePackages: ['@mafioso/types'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

module.exports = nextConfig
