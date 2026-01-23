import withPWAInit from "@ducanh2912/next-pwa";

// 1. Configuración de la PWA (Offline)
const withPWA = withPWAInit({
  dest: "public", // Carpeta donde se guardará el service worker
  cacheOnFrontEndNav: true, // Cachear rutas al navegar
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false, // No recargar la página automáticamente al volver internet
  swcMinify: true,
  disable: process.env.NODE_ENV === "development", // Desactivar en modo desarrollo para que no te moleste el caché mientras programas
  workboxOptions: {
    disableDevLogs: true, // Limpiar la consola de logs del service worker
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2. Tus configuraciones actuales (Ignorar errores)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 3. (Opcional) Si usas imágenes de Supabase, recuerda agregarlas aquí si no fallarán
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', 
      },
    ],
  },
};

// 4. Exportamos la configuración envuelta en withPWA
export default withPWA(nextConfig);