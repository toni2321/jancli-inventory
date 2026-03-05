'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/AdminGuard'; 
import toast from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Guardamos TODAS las ventas aquí para no consultar la BD a cada rato
  const [allSales, setAllSales] = useState([]);
  
  // Estado para el filtro de mes
  const [selectedMonth, setSelectedMonth] = useState('current'); 
  const [monthOptions, setMonthOptions] = useState([]);

  // Estados visuales que cambian al usar el filtro
  const [stats, setStats] = useState({ totalIngresos: 0, totalVentas: 0, ticketPromedio: 0 });
  const [trendData, setTrendData] = useState({ data: [], maxDaily: 1, label: '' });
  const [sellerRanking, setSellerRanking] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  // Estados de Almacén e Inventario (NO cambian con el filtro de fecha)
  const [inventoryValue, setInventoryValue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  // 1. CARGA INICIAL DE DATOS
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      // Generar opciones para el menú (Últimos 6 meses)
      const options = [];
      const datePointer = new Date();
      for(let i=0; i<6; i++) {
        const val = `${datePointer.getFullYear()}-${String(datePointer.getMonth()+1).padStart(2,'0')}`;
        const name = datePointer.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        options.push({ value: val, label: name.charAt(0).toUpperCase() + name.slice(1) });
        datePointer.setMonth(datePointer.getMonth() - 1);
      }
      setMonthOptions(options);
      setSelectedMonth(options[0].value); // Por defecto, el mes actual

      // Cargar Ventas
      const { data: sales, error: salesError } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (salesError) { 
          toast.error("Error ventas: " + salesError.message); 
      } else {
          setAllSales(sales); // Guardamos todo, canceladas y válidas, para el historial
      }

      // Cargar Inventario
      const { data: products, error: prodError } = await supabase.from('products').select('id, name, price, product_variants(size, color, stock, variant_image_url)').eq('is_active', true);
      if (!prodError && products) {
        let tValue = 0, tPieces = 0, low = [];
        products.forEach(p => {
          if (p.product_variants) {
            p.product_variants.forEach(v => {
              if (v.stock > 0) { tPieces += v.stock; tValue += (v.stock * p.price); }
              if (v.stock >= 0 && v.stock <= 5) {
                low.push({ productName: p.name, color: v.color, size: v.size, stock: v.stock, image: v.variant_image_url });
              }
            });
          }
        });
        low.sort((a, b) => a.stock - b.stock);
        setInventoryValue(tValue); setTotalItems(tPieces); setLowStockItems(low);
      }
      
      setLoading(false);
    };
    fetchInitialData();
  }, [router]);

  // 2. EFECTO RECALCULADOR (Se dispara al cambiar el select de fecha)
  useEffect(() => {
    if (allSales.length === 0) return;

    // Filtramos ventas del mes seleccionado
    const filteredSales = selectedMonth === 'all' 
      ? allSales 
      : allSales.filter(s => s.created_at.startsWith(selectedMonth));

    const validFilteredSales = filteredSales.filter(s => s.status !== 'cancelado');

    // A. Recalcular KPIs superiores
    const totalMoney = validFilteredSales.reduce((acc, sale) => acc + Number(sale.total), 0);
    const totalCount = validFilteredSales.length;
    setStats({
      totalIngresos: totalMoney,
      totalVentas: totalCount,
      ticketPromedio: totalCount > 0 ? (totalMoney / totalCount) : 0
    });

    // B. Recalcular Ranking de Vendedores
    const rankingMap = validFilteredSales.reduce((acc, sale) => {
      const email = sale.user_email || 'Sistema';
      if (!acc[email]) acc[email] = { email, totalVendido: 0, numVentas: 0 };
      acc[email].totalVendido += Number(sale.total);
      acc[email].numVentas += 1;
      return acc;
    }, {});
    setSellerRanking(Object.values(rankingMap).sort((a, b) => b.totalVendido - a.totalVendido));

    // C. Recalcular Gráfica (Semanas si es un mes, Meses si es Histórico)
    let chartData = [];
    let chartLabel = '';

    if (selectedMonth !== 'all') {
      chartLabel = 'Ventas por Semana';
      chartData = [
        { label: 'Sem 1', total: 0 }, { label: 'Sem 2', total: 0 }, 
        { label: 'Sem 3', total: 0 }, { label: 'Sem 4', total: 0 }, { label: 'Sem 5', total: 0 }
      ];
      validFilteredSales.forEach(sale => {
        const d = new Date(sale.created_at);
        const weekNum = Math.floor((d.getDate() - 1) / 7); 
        if (weekNum >= 0 && weekNum < 5) chartData[weekNum].total += Number(sale.total);
      });
    } else {
      chartLabel = 'Ventas Históricas (Últimos 6 meses)';
      chartData = monthOptions.map(m => ({ label: m.label.split(' ')[0].substring(0,3), total: 0 })).reverse();
      const optionsReversed = [...monthOptions].reverse();
      validFilteredSales.forEach(sale => {
        const saleMonth = sale.created_at.substring(0, 7);
        const idx = optionsReversed.findIndex(o => o.value === saleMonth);
        if (idx !== -1) chartData[idx].total += Number(sale.total);
      });
    }

    const maxDaily = Math.max(...chartData.map(d => d.total), 1);
    setTrendData({ data: chartData, maxDaily, label: chartLabel });

    // D. Actualizar historial visual (Últimas 5 del filtro)
    setRecentSales(filteredSales.slice(0, 5));

  }, [selectedMonth, allSales, monthOptions]);

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Calculando finanzas y almacén... 📈</div>;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6 font-sans pb-20">
        
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Control</h1>
            <p className="text-gray-500 text-sm">Resumen financiero y estatus del almacén</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* SELECTOR DE MESES */}
            <select 
                className="w-full sm:w-auto bg-white border border-gray-300 text-gray-900 font-bold px-4 py-2.5 rounded-xl shadow-sm focus:ring-2 focus:ring-black outline-none"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
            >
                <option value="all">📊 Histórico Total</option>
                {monthOptions.map((opt, idx) => (
                    <option key={idx} value={opt.value}>📅 {opt.label}</option>
                ))}
            </select>

            <Link href="/" className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-100 transition shadow-sm whitespace-nowrap text-center">
              ← Volver al Inventario
            </Link>
          </div>
        </header>

        {/* ========================================== */}
        {/* SECCIÓN 1: FINANZAS Y VENTAS DINÁMICAS */}
        {/* ========================================== */}
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">💰 Desempeño de Ventas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-all">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Ingresos Reales</h3>
            <p className="text-4xl font-bold text-green-600">${stats.totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-all">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tickets Válidos</h3>
            <p className="text-4xl font-bold text-gray-900">{stats.totalVentas}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-all">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Ticket Promedio</h3>
            <p className="text-4xl font-bold text-blue-600">${stats.ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* GRÁFICA Y RANKING DE VENDEDORES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-600 uppercase mb-6 flex items-center gap-2">
                    📈 {trendData.label}
                </h3>
                <div className="flex items-end justify-between h-40 gap-2 pt-6">
                    {trendData.data.map((col, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer">
                        <div className="absolute -top-8 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            ${col.total.toLocaleString('es-MX', {maximumFractionDigits:0})}
                        </div>
                        <div 
                            className="w-full bg-blue-500 rounded-t-md transition-all duration-700 ease-out group-hover:bg-blue-600"
                            style={{ height: `${Math.max((col.total / trendData.maxDaily) * 100, col.total > 0 ? 2 : 0)}%`, minHeight: col.total > 0 ? '4px' : '0px' }}
                        ></div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase mt-2">{col.label}</span>
                    </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 flex items-center gap-2">
                    🏆 Desempeño por Vendedor
                </h3>
                {sellerRanking.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 mt-10">Sin datos en este periodo.</div>
                ) : (
                    <div className="flex-1 overflow-y-auto max-h-48 pr-2">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-400">
                                    <th className="pb-2 font-medium">Vendedor</th>
                                    <th className="pb-2 font-medium text-center">Tickets</th>
                                    <th className="pb-2 font-medium text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sellerRanking.map((seller, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                                        <td className="py-3 text-gray-900 font-medium flex items-center gap-2">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤'} {seller.email.split('@')[0]}
                                        </td>
                                        <td className="py-3 text-center text-gray-500">{seller.numVentas}</td>
                                        <td className="py-3 text-right font-bold text-green-600">${seller.totalVendido.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {/* ========================================== */}
        {/* SECCIÓN 2: ALMACÉN E INVENTARIO */}
        {/* ========================================== */}
        <h2 className="text-lg font-bold text-gray-800 mb-4 mt-10 border-b pb-2">📦 Estatus de Almacén Actual</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Capital Invertido (Mercancía)</h3>
            <p className="text-4xl font-bold text-gray-900">${inventoryValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 mt-2">Valor total al precio de venta actual</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Volumen Total</h3>
            <p className="text-4xl font-bold text-gray-900">{totalItems.toLocaleString('es-MX')} <span className="text-xl text-gray-400 font-medium">piezas</span></p>
            <p className="text-xs text-gray-500 mt-2">Prendas disponibles para venta</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
          <div className="px-6 py-4 border-b border-gray-100 bg-red-50/50 flex justify-between items-center">
            <h2 className="font-bold text-red-800 flex items-center gap-2">🚨 Alertas de Producción (Stock Crítico) <span className="bg-red-200 text-red-800 text-[10px] px-2 py-0.5 rounded-full">{lowStockItems.length}</span></h2>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center text-green-600 bg-green-50 font-medium">¡Tienes buen nivel de inventario!</div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lowStockItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:border-red-200 transition">
                  <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200">
                    {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">Sin Foto</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate" title={item.productName}>{item.productName}</p>
                    <p className="text-[10px] text-gray-500">{item.color} • <span className="font-bold">{item.size}</span></p>
                  </div>
                  <div className="text-center bg-red-50 rounded px-2 py-1 border border-red-100">
                    <span className={`block text-sm font-black leading-none ${item.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>{item.stock}</span>
                    <span className="text-[8px] text-gray-500 uppercase font-bold">Pzas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* SECCIÓN 3: HISTORIAL DE VENTAS */}
        {/* ========================================== */}
        <div className="flex justify-between items-end mb-4 border-b pb-2">
            <h2 className="text-lg font-bold text-gray-800">🛒 Actividad del Periodo Seleccionado</h2>
            <Link href="/sales" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition">
              Ver todo y reimprimir →
            </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay ventas en este periodo.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentSales.map((sale) => {
                const isCancelled = sale.status === 'cancelado';
                return (
                  <div key={sale.id} className={`p-4 flex justify-between items-center transition ${isCancelled ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                    <div>
                      <p className={`font-bold text-sm ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        Venta #{sale.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.created_at).toLocaleDateString()} a las {new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`block font-bold text-lg ${isCancelled ? 'text-gray-400 line-through' : 'text-green-700'}`}>
                        {isCancelled ? '' : '+'}${Number(sale.total).toFixed(2)}
                      </span>
                      {isCancelled ? (
                          <span className="text-[10px] text-red-500 uppercase font-bold tracking-wide border border-red-200 px-2 py-0.5 rounded-full bg-red-50">CANCELADO</span>
                      ) : (
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Completado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </AdminGuard>
  );
}