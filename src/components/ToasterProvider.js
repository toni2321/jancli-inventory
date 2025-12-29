'use client'; // 👈 Esto es lo importante: Marca que esto corre en el navegador

import { Toaster } from 'react-hot-toast';

export default function ToasterProvider() {
  return (
    <Toaster 
      position="top-center" 
      toastOptions={{
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      }}
    />
  );
}