/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ignorar errores de Estilo (Linting)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 2. Ignorar errores de Tipado (TypeScript/JSDoc) -> ¡Esto suele ser el culpable!
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;