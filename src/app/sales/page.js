'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// --- MODAL DEL TICKET ---
function TicketModal({ sale, onClose, onCancel }) {
  if (!sale) return null;

  const isCancelled = sale.status === 'cancelado';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 relative flex flex-col items-center font-mono text-sm border border-gray-100">
        
        {/* Encabezado */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 text-2xl ${isCancelled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
          {isCancelled ? '✕' : '✓'}
        </div>
        <h2 className="font-bold text-xl mb-1 text-gray-900">
          {isCancelled ? 'CANCELADO' : 'Comprobante'}
        </h2>
        
        {/* --- ZONA DE AUDITORÍA --- */}
        <div className="text-center mb-4 space-y-1">
            <p className="text-gray-500 text-xs">ID: {sale.id.slice(0, 8)}</p>
            <p className="text-gray-400 text-[10px]">{new Date(sale.created_at).toLocaleString()}</p>
            
            <p className="text-xs text-gray-600 mt-2">
                Vendedor: <span className="font-bold">{sale.user_email || 'Desconocido'}</span>
            </p>

            {isCancelled && (
                <div className="mt-2 bg-red-50 border border-red-100 p-2 rounded">
                    <p className="text-xs text-red-600 font-bold uppercase">Cancelado por:</p>
                    <p className="text-xs text-red-800">{sale.cancelled_by || 'Admin'}</p>
                </div>
            )}
        </div>
        
        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

        {/* Productos */}
        <div className="w-full space-y-3 mb-4 text-gray-800 opacity-90">
          {sale.items?.map((item, idx) => (
            <div key={idx} className={`flex justify-between items-start ${isCancelled ? 'line-through text-gray-400' : ''}`}>
              <div>
                <span className="font-bold">{item.quantity} x {item.product_name}</span>
                <div className="text-[10px] text-gray-500 uppercase">
                   {item.size} • {item.color}
                </div>
              </div>
              <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

        {/* Totales */}
        <div className="flex justify-between w-full font-bold text-lg mb-6 text-gray-900">
          <span>TOTAL</span>
          <span>${Number(sale.total).toFixed(2)}</span>
        </div>

        {/* Botones */}
        <button onClick={onClose} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition mb-2">
          Cerrar
        </button>
        
        {!isCancelled && (
          <>
            <button onClick={() => window.print()} className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition mb-2">
              🖨️ Imprimir copia
            </button>
            
            <button 
              onClick={() => {
                if(confirm('ATENCIÓN: ¿Seguro que quieres CANCELAR esta venta?\n\nSe devolverá el stock a cada variante.')) {
                  onCancel(sale);
                }
              }} 
              className="w-full text-red-600 text-xs hover:bg-red-50 py-2 rounded transition font-bold"
            >
              ⛔ Cancelar Venta (Devolver Stock)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL DE HISTORIAL ---
export default function SalesHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const fetchSales = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        router.push('/login');
        return;
    }
    
    setCurrentUserEmail(session.user.email);

    const { data } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setSales(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, [router]);

  const openTicket = async (sale) => {
    const { data: items } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id);
    setSelectedSale({ ...sale, items: items || [] });
  };

  // --- LÓGICA DE CANCELACIÓN (ADAPTADA A VARIANTES) ---
  const handleCancelSale = async (saleToCancel) => {
    const toastId = toast.loading("Cancelando y devolviendo stock...");

    try {
      setLoading(true);

      // 1. Devolver el Stock a cada VARIANTE
      for (const item of saleToCancel.items) {
        const variantId = item.variant_id; // Ahora usamos el ID de la variante
        if (!variantId) continue;

        // A. Obtener stock actual de la variante
        const { data: variantData, error: errVariant } = await supabase
          .from('product_variants')
          .select('stock') 
          .eq('id', variantId)
          .single();

        if (errVariant) continue;

        const stockActual = variantData.stock; 
        const newStock = Number(stockActual) + Number(item.quantity);

        // B. Actualizar stock en la variante
        await supabase
          .from('product_variants')
          .update({ stock: newStock })
          .eq('id', variantId);
        
        // C. Registrar en KARDEX (Devolución)
        await supabase.from('inventory_movements').insert([{
             variant_id: variantId,
             movement_type: 'devolucion', // Tipo especial para devoluciones
             quantity: Number(item.quantity), // Positivo (entra)
             reason: `Cancelación Venta #${saleToCancel.id.slice(0,8)}`,
             user_email: currentUserEmail
        }]);
      }

      // 2. Marcar Venta como CANCELADO
      const { error } = await supabase
        .from('sales')
        .update({ 
            status: 'cancelado',
            cancelled_by: currentUserEmail 
        })
        .eq('id', saleToCancel.id);

      if (error) throw error;

      toast.success("Venta cancelada exitosamente", { id: toastId });
      
      setSelectedSale(null);
      fetchSales(); 

    } catch (error) {
      console.error(error);
      toast.error('Error al cancelar: ' + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => 
    sale.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center text-gray-500 font-mono animate-pulse">Cargando historial... ⏳</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Historial de Ventas</h1>
          <p className="text-gray-500 text-sm">Auditoría, Reimpresiones y Cancelaciones</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 font-medium shadow-sm transition">
            ← Volver al Dashboard
          </Link>
          <Link href="/" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 shadow-md transition">
            Nueva Venta
          </Link>
        </div>
      </header>

      {/* Buscador */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="🔍 Buscar por ID de venta..." 
          className="w-full md:w-96 border border-gray-300 rounded-lg py-2 px-4 focus:ring-2 focus:ring-black focus:outline-none shadow-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Fecha / Vendedor</th>
              <th className="px-6 py-4">ID Venta</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className={`hover:bg-gray-50 transition ${sale.status === 'cancelado' ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-4">
                  {sale.status === 'cancelado' ? (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border border-red-200">Cancelado</span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border border-green-200">Pagado</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{new Date(sale.created_at).toLocaleDateString()}</span>
                    <span className="text-[10px] text-gray-500">{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {sale.user_email?.split('@')[0]}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-400">
                  {sale.id.slice(0, 8)}...
                </td>
                <td className={`px-6 py-4 text-right font-bold ${sale.status === 'cancelado' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  ${sale.total}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => openTicket(sale)}
                    className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline"
                  >
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                  No se encontraron ventas con ese criterio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <TicketModal 
        sale={selectedSale} 
        onClose={() => setSelectedSale(null)} 
        onCancel={handleCancelSale}
      />
    </div>
  );
}