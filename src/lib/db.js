// src/lib/db.js
import Dexie from 'dexie';
import { supabase } from './supabase';

export const db = new Dexie('JancliInventoryOffline');

db.version(1).stores({
  // Tablas espejo de Supabase (solo los campos que necesitas para buscar/mostrar)
  products: 'id, organization_id, name', 
  product_variants: 'id, product_id, size, color, stock', 
  
  // Tabla exclusiva para cuando no hay internet
  pending_sales: '++id, created_at, synced' 
});

// Función auxiliar para guardar venta offline
export async function guardarVentaOffline(email, total, items) {
  try {
    await db.transaction('rw', db.pending_sales, db.product_variants, async () => {
      // 1. Guardar la venta en la cola
      await db.pending_sales.add({
        payload: { user_email: email, total, items },
        created_at: new Date().toISOString(),
        synced: false
      });

      // 2. Restar stock visualmente en la base local para no vender doble
      for (const item of items) {
        const variant = await db.product_variants.get(item.variant_id);
        if (variant) {
          await db.product_variants.update(item.variant_id, {
            stock: variant.stock - item.quantity
          });
        }
      }
    });
    return true;
  } catch (error) {
    console.error("Error guardando offline:", error);
    return false;
  }
}

// Contador de ventas pendientes de sincronizar
export async function countPendingSales() {
  try {
    // 👇 CAMBIO: Usamos .filter() en lugar de .where()
    const count = await db.pending_sales.filter(sale => sale.synced === false).count();
    return count;
  } catch (error) {
    console.error('Error contando ventas pendientes:', error);
    return 0;
  }
}

// Sincroniza con Supabase todas las ventas pendientes en Dexie
export async function syncPendingSales() {
  // Protección básica por si se ejecuta sin navegador o sin internet
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { total: 0, success: 0, failed: 0, errors: ['Sin conexión a internet'] };
  }

  const pending = await db.pending_sales.filter(sale => sale.synced === false).toArray();
  
  let success = 0;
  let failed = 0;
  const errors = [];

  for (const sale of pending) {
    const { payload } = sale;

    if (!payload) {
      failed += 1;
      errors.push(`Venta ${sale.id}: payload vacío`);
      continue;
    }

    try {
      const { user_email, total, items } = payload;

      // Si en medio se pierde internet, paramos el bucle y dejamos el resto para la próxima
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }

      const { error } = await supabase.rpc('registrar_venta_offline', {
        p_user_email: user_email || 'offline_user',
        p_total: total,
        p_items: items
      });

      if (error) {
        throw error;
      }

      await db.pending_sales.update(sale.id, {
        synced: true,
        synced_at: new Date().toISOString(),
        last_error: null
      });

      success += 1;
    } catch (err) {
      failed += 1;
      const message = err?.message || 'Error desconocido al sincronizar venta';
      errors.push(`Venta ${sale.id}: ${message}`);

      await db.pending_sales.update(sale.id, {
        last_error: message
      });
    }
  }

  return { total: pending.length, success, failed, errors };
}