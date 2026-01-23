// src/lib/db.js
import Dexie from 'dexie';

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