'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- REUTILIZAMOS EL TICKET MODAL ---
function TicketModal({ sale, onClose }) {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl p-6 relative flex flex-col items-center font-mono text-sm">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-2xl">✓</div>
        <h2 className="font-bold text-xl mb-1 text-gray-900">Comprobante</h2>
        <p className="text-gray-500 text-xs mb-4">ID: {sale.id.slice(0, 8)}</p>
        <p className="text-gray-400 text-[10px] mb-2">{new Date(sale.created_at).toLocaleString()}</p>
        
        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

        <div className="w-full space-y-2 mb-4 text-gray-800">
          {sale.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{item.quantity} x {item.product_name || item.name}</span>
              <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

        <div className="flex justify-between w-full font-bold text-lg mb-6 text-gray-900">
          <span>TOTAL</span>
          <span>${Number(sale.total).toFixed(2)}</span>
        </div>

        <button onClick={onClose} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition">Cerrar</button>
        <button onClick={() => window.print()} className="mt-2 text-xs text-gray-400 underline hover:text-gray-600">Imprimir copia</button>
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

  useEffect(() => {
    const fetchSales = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');

      // Traemos las ventas ordenadas por fecha (más reciente primero)
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setSales(data);
      setLoading(false);
    };
    fetchSales();
  }, [router]);

  // Función inteligente: Carga los items SOLO cuando abres el ticket
  const openTicket = async (sale) => {
    // 1. Buscamos los productos de esa venta específica
    const { data: items } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id);

    // 2. Combinamos la info de la venta + sus items
    setSelectedSale({ ...sale, items: items || [] });
  };

  const filteredSales = sales.filter(sale => 
    sale.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando historial... ⏳</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Ventas</h1>
          <p className="text-gray-500 text-sm">Consulta y reimprime tus tickets</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 font-medium shadow-sm">
            ← Volver al Dashboard
          </Link>
          <Link href="/" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 shadow-md">
            Ir a Vender
          </Link>
        </div>
      </header>

      {/* Buscador */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Buscar por ID de venta..." 
          className="w-full md:w-96 border border-gray-300 rounded-lg py-2 px-4 focus:ring-2 focus:ring-black focus:outline-none"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Fecha / Hora</th>
              <th className="px-6 py-4">ID Venta</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  {new Date(sale.created_at).toLocaleDateString()} <span className="text-gray-400 mx-1">|</span> {new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="px-6 py-4 font-mono text-xs">{sale.id.slice(0, 8)}...</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">${sale.total}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => openTicket(sale)}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-xs border border-blue-100 bg-blue-50 px-3 py-1 rounded-full transition"
                  >
                    Ver Ticket 🧾
                  </button>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                  No se encontraron ventas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para ver el Ticket */}
      <TicketModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
    </div>
  );
}