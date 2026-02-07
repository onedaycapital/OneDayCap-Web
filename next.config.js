/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/apply", destination: "/" },
      { source: "/application", destination: "/" },
    ];
  },
};

module.exports = nextConfig;
