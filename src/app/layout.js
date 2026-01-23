import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 👇 Importamos tus componentes globales
import ToasterProvider from "@/components/ToasterProvider";
import OfflineSyncManager from "@/components/OfflineSyncManager"; // <--- NUEVO: El cerebro offline

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
  // 👇 NUEVO: Esto permite que el navegador sepa que es una App Instalable
  manifest: "/manifest.json", 
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Proveedor de Notificaciones (Toasts) */}
        <ToasterProvider />

        {/* 👇 NUEVO: Componente invisible que sincroniza datos cuando vuelve el internet */}
        <OfflineSyncManager />
        
        {children}
      </body>
    </html>
  );
}