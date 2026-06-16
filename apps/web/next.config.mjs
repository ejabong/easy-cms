/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@easy-cms/core', '@easy-cms/db'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    // Server Actions are enabled by default in Next 15.
  },
};

export default nextConfig;
