/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Advertencia: Esto permite que el build termine aunque haya errores de ESLint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;