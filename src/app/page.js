'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ==========================================
// 1. COMPONENTE: TARJETA DE PRODUCTO (ACTUALIZADO CON ARCHIVAR)
// ==========================================
function ProductCard({ product, onAddToCart, onToggleStatus, onImageClick }) {
  const [qtyToAdd, setQtyToAdd] = useState(1);
  const isActive = product.is_active; // Verificamos si está activo

  const handleQtyChange = (e) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      setQtyToAdd(""); 
      return;
    }
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      if (val < 1) setQtyToAdd(1);
      else if (val > product.stock_quantity) setQtyToAdd(product.stock_quantity);
      else setQtyToAdd(val);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-200 flex flex-col ${!isActive ? 'opacity-60 grayscale bg-gray-50' : ''}`}>
      {/* Imagen */}
      <div className="h-40 relative bg-gray-100">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            onClick={() => onImageClick(product.image_url)}
            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin Imagen</div>
        )}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <Link href={`/edit/${product.id}`} className="bg-white/90 p-1.5 rounded-full shadow hover:text-blue-600 text-gray-500">✏️</Link>
          
          {/* BOTÓN INTELIGENTE: ARCHIVAR O REACTIVAR */}
          <button 
            onClick={() => onToggleStatus(product)} 
            className={`bg-white/90 p-1.5 rounded-full shadow transition ${isActive ? 'hover:text-red-500 text-gray-500' : 'hover:text-green-600 text-green-600'}`}
            title={isActive ? "Archivar (Papelera)" : "Reactivar"}
          >
            {isActive ? '🗑️' : '♻️'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <h2 className="font-bold text-gray-800 line-clamp-1 text-sm">{product.name}</h2>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${product.stock_quantity < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            Stock: {product.stock_quantity}
          </span>
        </div>
        
        <div className="text-xs text-gray-400 mb-2 flex gap-2">
          <span>{product.attributes?.talla}</span>
          <span>{product.attributes?.color}</span>
        </div>

        <div className="mt-auto pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold text-gray-900">${product.price}</span>
            {!isActive && <span className="text-[10px] font-bold border border-gray-400 px-1 rounded text-gray-500">ARCHIVADO</span>}
          </div>

          {/* ZONA DE AGREGAR (SOLO SI ESTÁ ACTIVO) */}
          {isActive ? (
            <div className="flex gap-2">
              <input 
                type="number" 
                min="1" 
                max={product.stock_quantity}
                value={qtyToAdd}
                onChange={handleQtyChange}
                onBlur={() => { if (qtyToAdd === "") setQtyToAdd(1); }}
                disabled={product.stock_quantity === 0}
                className="w-14 border border-gray-400 bg-white text-gray-900 font-bold rounded text-center text-sm focus:ring-2 focus:ring-black focus:outline-none placeholder-gray-500 shadow-sm"
              />
              <button 
                onClick={() => {
                  onAddToCart(product, Number(qtyToAdd) || 1);
                  setQtyToAdd(1); 
                }}
                disabled={product.stock_quantity === 0}
                className="flex-1 bg-black text-white py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition shadow-sm"
              >
                {product.stock_quantity === 0 ? 'Agotado' : '+ Agregar'}
              </button>
            </div>
          ) : (
            <div className="text-center text-xs text-gray-400 py-1.5 font-medium bg-gray-100 rounded">
              No disponible para venta
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. COMPONENTE: TICKET MODAL (SIN CAMBIOS)
// ==========================================
function TicketModal({ sale, onClose }) {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl p-6 relative flex flex-col items-center font-mono text-sm">
        
        {/* Icono */}
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-2xl">
          ✓
        </div>

        <h2 className="font-bold text-xl mb-1 text-gray-900">¡Venta Exitosa!</h2>
        <p className="text-gray-500 text-xs mb-4">ID: {sale.id.slice(0, 8)}</p>

        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

        {/* LISTA DE PRODUCTOS */}
        <div className="w-full space-y-2 mb-4 text-gray-800">
          {sale.items.map((item, idx) => {
            const qty = item.cartQuantity || item.quantity || 0;
            const price = Number(item.price) || 0;
            const totalItem = (qty * price).toFixed(2);

            return (
              <div key={idx} className="flex justify-between">
                <span>{qty} x {item.name}</span>
                <span className="font-medium">${totalItem}</span>
              </div>
            );
          })}
        </div>

        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

        {/* TOTAL */}
        <div className="flex justify-between w-full font-bold text-lg mb-6 text-gray-900">
          <span>TOTAL</span>
          <span>${Number(sale.total).toFixed(2)}</span>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition"
        >
          Cerrar / Nueva Venta
        </button>

        <button 
          onClick={() => window.print()}
          className="mt-2 text-xs text-gray-400 underline hover:text-gray-600"
        >
          Imprimir comprobante
        </button>

      </div>
    </div>
  );
}

// ==========================================
// 3. COMPONENTE PRINCIPAL (HOME)
// ==========================================
export default function Home() {
  const router = useRouter();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [cart, setCart] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estado para el ticket
  const [lastSale, setLastSale] = useState(null);

  // NUEVO: Estado para filtrar archivados
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        fetchProducts(); // Cargar productos al iniciar
      }
    };
    checkUser();
  }, [router, showArchived]); // Recargamos si cambiamos de pestaña (Disponibles/Archivados)

  // --- FETCH MEJORADO CON FILTRO ---
  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // Lógica del filtro:
    if (!showArchived) {
      // Si estamos en la pestaña normal, solo traemos los activos (is_active = true)
      query = query.eq('is_active', true);
    } else {
      // Si estamos en la papelera, traemos solo los inactivos (is_active = false)
      query = query.eq('is_active', false);
    }

    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- NUEVA FUNCIÓN: ARCHIVAR/REACTIVAR (Soft Delete) ---
  const toggleProductStatus = async (product) => {
    const action = product.is_active ? "ARCHIVAR" : "REACTIVAR";
    const confirmMessage = product.is_active 
      ? `¿Seguro que quieres OCULTAR "${product.name}"?\n\nNo se borrará, se moverá a la pestaña de Archivados y podrás recuperarlo después.`
      : `¿Deseas REACTIVAR "${product.name}" para venderlo de nuevo?`;

    if (!window.confirm(confirmMessage)) return;

    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active }) // Invertimos el estado
      .eq('id', product.id);

    if (!error) {
       // Recargar la lista para que desaparezca/aparezca
       fetchProducts();
    } else {
       alert("Error al actualizar: " + error.message);
    }
  };

  // --- LÓGICA DEL CARRITO (IGUAL) ---
  const addToCart = (product, quantity) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id);
      
      if (existingItem) {
        if ((existingItem.cartQuantity + quantity) > product.stock_quantity) {
          alert(`¡Solo hay ${product.stock_quantity} disponibles!`);
          return currentCart;
        }
        return currentCart.map(item => 
          item.id === product.id 
            ? { ...item, cartQuantity: item.cartQuantity + quantity }
            : item
        );
      } else {
        if (product.stock_quantity < quantity) {
          alert("No hay suficiente stock");
          return currentCart;
        }
        return [...currentCart, { ...product, cartQuantity: quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.cartQuantity), 0);

  // --- LÓGICA DE VENTA (IGUAL) ---
  const processSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{ total: cartTotal, user_email: user?.email }]) // Asegúrate que la columna user_email exista, si no usa user_id
        .select()
        .single();

      if (saleError) throw saleError;

      for (const item of cart) {
        await supabase.from('sale_items').insert([{
          sale_id: saleData.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.cartQuantity,
          price: item.price
        }]);

        const newStock = item.stock_quantity - item.cartQuantity;
        // Aquí actualizamos el stock. NOTA: No tocamos is_active, sigue igual.
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
      }

      setLastSale({
        ...saleData,
        items: [...cart]
      });

      setCart([]);
      fetchProducts();

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans flex flex-col md:flex-row gap-6">
      
      {/* IZQUIERDA: INVENTARIO */}
      <div className="flex-1">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* TITULO Y USUARIO */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inventario JANCLI</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
             <span>Hola, {user?.email}</span>
             <button onClick={handleLogout} className="text-red-500 font-bold hover:underline px-1">(Salir)</button>
          </div>
        </div>

        {/* BUSCADOR Y BOTONES */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full md:w-48 border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-black focus:outline-none text-gray-700"
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Link 
            href="/dashboard" 
            className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium shadow-sm whitespace-nowrap text-sm flex items-center justify-center gap-2"
          >
            📊 Ver Ganancias
          </Link>

          <Link 
            href="/new" 
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition shadow-md flex items-center justify-center whitespace-nowrap text-sm"
          >
            + Nuevo
          </Link>
        </div>
        </header>

        {/* --- PESTAÑAS DE FILTRO --- */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-0">
          <button 
            onClick={() => setShowArchived(false)}
            className={`text-sm font-bold pb-3 px-2 border-b-2 transition ${!showArchived ? 'text-black border-black' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            📦 Disponibles
          </button>
          <button 
            onClick={() => setShowArchived(true)}
            className={`text-sm font-bold pb-3 px-2 border-b-2 transition ${showArchived ? 'text-black border-black' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            🗄️ Archivados (Papelera)
          </button>
        </div>

        {/* LISTA DE PRODUCTOS */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
            {showArchived ? "La papelera está vacía." : "No se encontraron productos disponibles."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={addToCart} 
                onToggleStatus={toggleProductStatus} // Usamos la nueva función
                onImageClick={setSelectedImage}
              />
            ))}
          </div>
        )}
      </div>

      {/* DERECHA: CARRITO (IGUAL) */}
      <div className="w-full md:w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-5 h-fit sticky top-4 flex flex-col z-20">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2 border-gray-100">🛒 Carrito</h2>
        
        {cart.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">Vacío</div>
        ) : (
          <div className="flex-grow space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <div>
                  <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                  <p className="text-gray-500 text-xs">{item.cartQuantity} x ${item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">${item.price * item.cartQuantity}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 font-bold px-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2">
          <div className="flex justify-between items-center text-lg font-bold mb-4 text-gray-900">
            <span>Total:</span><span>${cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={processSale}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isProcessing ? 'Procesando...' : 'Cobrar ✅'}
          </button>
        </div>
      </div>

      {/* MODAL ZOOM */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-h-[85vh] max-w-full rounded-lg" />
        </div>
      )}

      {/* MODAL TICKET */}
      <TicketModal sale={lastSale} onClose={() => setLastSale(null)} />

    </div>
  );
}