import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 👇 CAMBIO 1: Importamos NUESTRO componente, no la librería directa
import ToasterProvider from "@/components/ToasterProvider"; 

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
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 👇 CAMBIO 2: Usamos nuestro Provider aquí */}
        <ToasterProvider />
        
        {children}
      </body>
    </html>
  );
}