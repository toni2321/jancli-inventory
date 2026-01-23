'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks'; // Necesitas instalar esto: npm install dexie-react-hooks
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function OfflineSyncManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Escuchar cambios en la tabla de pendientes en tiempo real
  // (Requiere npm install dexie-react-hooks)
  const pendingSales = useLiveQuery(() => db.pending_sales.toArray());
  const pendingCount = pendingSales?.length || 0;

  // 2. Detectar estado de internet
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexión restaurada: Intentando sincronizar...");
      // Intentar sincronizar apenas vuelva internet
      syncNow(); 
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSales]); // Re-ejecutar si cambia la lista de pendientes

  // 3. La lógica dura: Subir datos a Supabase
  const syncNow = async () => {
    if (!navigator.onLine || pendingCount === 0 || isSyncing) return;

    setIsSyncing(true);
    const toastId = toast.loading(`Sincronizando ${pendingCount} ventas offline...`);

    let successCount = 0;
    let errorCount = 0;

    // Recorremos las ventas pendientes
    for (const venta of pendingSales) {
      try {
        // Llamada RPC a Supabase (La función SQL que creamos antes)
        const { error } = await supabase.rpc('registrar_venta_offline', {
          p_user_email: venta.payload.user_email,
          p_total: venta.payload.total,
          p_items: venta.payload.items
        });

        if (error) throw error;

        // ÉXITO: Borramos de la base de datos local
        await db.pending_sales.delete(venta.id);
        successCount++;

      } catch (err) {
        console.error("Error sync venta:", err);
        errorCount++;
      }
    }

    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} ventas subidas correctamente.`, { id: toastId });
      // Opcional: Recargar la página si estás en el historial
      window.location.reload(); 
    } else if (errorCount > 0) {
      toast.error(`Error al subir ${errorCount} ventas. Se reintentará luego.`, { id: toastId });
    } else {
      toast.dismiss(toastId);
    }
  };

  // 4. Renderizado: Una barrita discreta si hay cosas pendientes
  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-2xl z-50 flex items-center gap-4 border border-gray-700">
      <div className="flex flex-col">
        <span className="font-bold text-sm text-yellow-400">
          ⚠️ Modo Offline
        </span>
        <span className="text-xs text-gray-300">
          {pendingCount} venta(s) guardada(s) en el celular.
        </span>
      </div>
      
      {isOnline ? (
        <button 
          onClick={syncNow}
          disabled={isSyncing}
          className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-xs font-bold transition animate-pulse"
        >
          {isSyncing ? 'Subiendo...' : 'Sincronizar Ahora'}
        </button>
      ) : (
        <span className="text-xs bg-red-900 px-2 py-1 rounded text-red-200 border border-red-800">
          Sin Internet
        </span>
      )}
    </div>
  );
}