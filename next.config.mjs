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
  // Netlify specific configuration
  trailingSlash: true,
  // Ensure proper handling of dynamic routes
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
  // Ensure proper handling of 404 pages
  async redirects() {
    return [
      {
        source: "/404",
        destination: "/_not-found",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
