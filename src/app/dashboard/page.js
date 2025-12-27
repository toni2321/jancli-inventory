'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIngresos: 0,
    totalVentas: 0,
    ticketPromedio: 0
  });
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Seguridad: Verificar usuario
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Traer TODAS las ventas
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error cargando dashboard:", error);
      } else {
        // 3. MATEMÁTICAS (Cálculos en el cliente)
        
        // Sumar todo el dinero (campo 'total')
        const totalMoney = sales.reduce((acc, sale) => acc + Number(sale.total), 0);
        
        // Contar cuántos tickets hay
        const totalCount = sales.length;

        // Calcular promedio (ticket promedio)
        const avg = totalCount > 0 ? (totalMoney / totalCount) : 0;

        setStats({
          totalIngresos: totalMoney,
          totalVentas: totalCount,
          ticketPromedio: avg
        });

        // Guardamos las últimas 5 ventas para la lista
        setRecentSales(sales.slice(0, 5));
      }
      setLoading(false);
    };

    fetchData();
  }, [router]);

  if (loading) return <div className="p-10 text-center text-gray-500">Calculando ganancias... 📈</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* HEADER SIMPLE */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
          <p className="text-gray-500 text-sm">Resumen global de tu negocio</p>
        </div>
        <Link 
          href="/" 
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 font-medium transition shadow-sm"
        >
          ← Volver al Inventario
        </Link>
      </header>

      {/* --- SECCIÓN DE TARJETAS (KPIs) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* TARJETA 1: DINERO TOTAL */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Ingresos Totales</h3>
          <p className="text-4xl font-bold text-green-600">
            ${stats.totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-green-700 bg-green-50 inline-block px-2 py-1 rounded mt-2 font-medium">
            Histórico acumulado
          </p>
        </div>

        {/* TARJETA 2: NÚMERO DE VENTAS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tickets Generados</h3>
          <p className="text-4xl font-bold text-gray-900">
            {stats.totalVentas}
          </p>
          <p className="text-xs text-gray-400 mt-2">Transacciones completadas</p>
        </div>

        {/* TARJETA 3: TICKET PROMEDIO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Ticket Promedio</h3>
          <p className="text-4xl font-bold text-blue-600">
            ${stats.ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-2">Promedio por venta</p>
        </div>
      </div>
{/* --- AGREGA ESTO AQUÍ: EL BOTÓN DE HISTORIAL --- */}
      <div className="mb-8 flex justify-end">
        <Link 
          href="/sales" 
          className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 font-bold shadow-lg transition flex items-center gap-2 transform hover:-translate-y-1"
        >
          📜 Ver Historial Completo y Reimprimir
        </Link>
      </div>
      {/* --- SECCIÓN DE HISTORIAL RECIENTE --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-800">Últimas Ventas</h2>
        </div>
        
        {recentSales.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aún no hay ventas registradas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentSales.map((sale) => (
              <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                <div>
                  <p className="font-bold text-gray-900 text-sm">Venta #{sale.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(sale.created_at).toLocaleDateString()} a las {new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-green-700 text-lg">
                    +${Number(sale.total).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Completado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}