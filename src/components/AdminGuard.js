'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      // 1. Obtener usuario
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Verificar Rol en Base de Datos
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // 3. Veredicto
      if (profile && profile.role === 'admin') {
        setAuthorized(true); // ¡Pase usted!
      } else {
        alert("⛔ Acceso Denegado: Esta zona es solo para Administradores.");
        router.push('/'); // ¡Fuera!
      }
    };

    checkAdmin();
  }, [router]);

  // Mientras verificamos, mostramos un spinner (nadie ve el contenido real)
  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mb-4"></div>
        <p className="text-sm font-mono animate-pulse">Verificando credenciales de Admin...</p>
      </div>
    );
  }

  // Si pasó la prueba, mostramos el contenido protegido
  return <>{children}</>;
}