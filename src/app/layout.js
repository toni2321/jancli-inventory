import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToasterProvider from "@/components/ToasterProvider";
import OfflineSyncManager from "@/components/OfflineSyncManager";

// 1. 👇 IMPORTAR EL COMPONENTE AQUÍ
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Inventario JANCLI",
  description: "Sistema de gestión de inventario",
  manifest: "/manifest.json", 
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToasterProvider />
        <OfflineSyncManager />
        
        {children}

        {/* 2. 👇 PONERLO AQUÍ AL FINAL (antes de cerrar body) */}
        <SpeedInsights />
      </body>
    </html>
  );
}