'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  // --- ESTADOS DE DATOS ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // --- ESTADOS DE INTERFAZ ---
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- ESTADOS DEL CARRITO (NUEVO) ---
  const [cart, setCart] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false); // Para bloquear botón mientras cobra

  // 1. CARGA INICIAL Y SEGURIDAD
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        fetchProducts();
      }
    };
    checkUser();
  }, [router]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDelete = async (id) => {
    const confirmacion = window.confirm("¿Seguro que quieres borrar este producto?");
    if (!confirmacion) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      alert('Error al borrar');
    } else {
      setProducts(products.filter(product => product.id !== id));
    }
  };

  // ==========================================
  // LÓGICA DEL CARRITO Y VENTAS (LO NUEVO)
  // ==========================================

  // A. Agregar producto al carrito
  const addToCart = (product) => {
    setCart(currentCart => {
      // ¿Ya existe en el carrito?
      const existingItem = currentCart.find(item => item.id === product.id);
      
      if (existingItem) {
        // Verificar que no superemos el stock disponible
        if (existingItem.cartQuantity >= product.stock_quantity) {
          alert("¡No hay suficiente stock para agregar más!");
          return currentCart;
        }
        // Si hay stock, sumamos 1
        return currentCart.map(item => 
          item.id === product.id 
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      } else {
        // Si es nuevo en el carrito
        if (product.stock_quantity < 1) {
          alert("Producto Agotado");
          return currentCart;
        }
        return [...currentCart, { ...product, cartQuantity: 1 }];
      }
    });
  };

  // B. Quitar producto del carrito
  const removeFromCart = (productId) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  // C. Calcular Total ($)
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.cartQuantity), 0);

  // D. PROCESAR VENTA (Guardar y Descontar Stock)
  const processSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Crear el ticket de venta en la tabla 'sales'
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{ 
          total: cartTotal, 
          user_email: user?.email 
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Procesar cada item del carrito
      for (const item of cart) {
        // Guardar detalle en 'sale_items'
        await supabase.from('sale_items').insert([{
          sale_id: saleData.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.cartQuantity,
          price: item.price
        }]);

        // --- AQUÍ OCURRE EL DESCUENTO DE STOCK ---
        const newStock = item.stock_quantity - item.cartQuantity;
        await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', item.id);
      }

      // 3. Finalizar
      alert("¡Venta realizada con éxito! 💰");
      setCart([]); // Limpiar carrito
      fetchProducts(); // Recargar productos para ver el stock actualizado

    } catch (error) {
      console.error(error);
      alert("Error al procesar la venta: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- FILTRADO ---
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Cargando sistema...</div>;

  return (
    // Cambiamos a Flex Row para tener 2 columnas en pantallas grandes
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans flex flex-col md:flex-row gap-6">
      
      {/* ========================================= */}
      {/* COLUMNA IZQUIERDA: INVENTARIO (Tu código anterior) */}
      {/* ========================================= */}
      <div className="flex-1">
        
        {/* HEADER */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inventario JANCLI</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
               <span>Hola, {user?.email}</span>
               <button 
                 onClick={handleLogout} 
                 className="text-red-500 hover:text-red-700 font-bold text-xs border border-red-200 px-2 py-0.5 rounded hover:bg-red-50 transition"
               >
                 Salir
               </button>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              className="w-full md:w-48 border border-gray-300 rounded-lg py-2 pl-3 pr-4 focus:ring-2 focus:ring-black focus:outline-none text-gray-700"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Link 
              href="/new" 
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition font-medium shadow-md whitespace-nowrap text-sm flex items-center"
            >
              + Nuevo
            </Link>
          </div>
        </header>

        {/* GRID DE PRODUCTOS */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No se encontraron productos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-200 flex flex-col">
                
                {/* Imagen y Botones Flotantes */}
                <div className="h-40 relative bg-gray-100">
                   {product.image_url ? (
                     <img 
                       src={product.image_url} 
                       alt={product.name} 
                       onClick={() => setSelectedImage(product.image_url)}
                       className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-500"
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin Imagen</div>
                   )}
                   
                   {/* Botones Editar/Borrar (Pequeños en la esquina) */}
                   <div className="absolute top-2 right-2 flex gap-1 z-10">
                     <Link href={`/edit/${product.id}`} className="bg-white/90 p-1.5 rounded-full shadow hover:text-blue-600 text-gray-500">
                       ✏️
                     </Link>
                     <button onClick={() => handleDelete(product.id)} className="bg-white/90 p-1.5 rounded-full shadow hover:text-red-500 text-gray-500">
                       🗑️
                     </button>
                   </div>
                </div>

                {/* Info del Producto */}
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

                  <div className="mt-auto flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-lg font-bold text-gray-900">${product.price}</span>
                    
                    {/* BOTÓN VENDER (NUEVO) */}
                    <button 
                      onClick={() => addToCart(product)}
                      disabled={product.stock_quantity === 0}
                      className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
                    >
                      {product.stock_quantity === 0 ? 'Agotado' : '+ Agregar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* COLUMNA DERECHA: EL CARRITO (Sidebar) */}
      {/* ========================================= */}
      <div className="w-full md:w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-5 h-fit sticky top-4 flex flex-col z-20">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 border-b pb-2 border-gray-100">
          🛒 Carrito de Venta
        </h2>

        {cart.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">
            <p>El carrito está vacío.</p>
            <p className="text-xs mt-1">Agrega productos del inventario.</p>
          </div>
        ) : (
          <div className="flex-grow space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 animate-in slide-in-from-left-2 duration-300">
                <div>
                  <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                  <p className="text-gray-500 text-xs">
                    {item.cartQuantity} x ${item.price}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">${item.price * item.cartQuantity}</span>
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="text-gray-400 hover:text-red-500 font-bold px-1 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totales y Botón Pagar */}
        <div className="mt-auto pt-2">
          <div className="flex justify-between items-center text-lg font-bold mb-4 text-gray-900">
            <span>Total:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          
          <button 
            onClick={processSale}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
          >
            {isProcessing ? (
              <span>Procesando... ⏳</span>
            ) : (
              <>
                <span>Cobrar Venta</span>
                <span>✅</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL DE ZOOM (Mantenemos tu código) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-screen flex flex-col items-center">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={selectedImage} 
              alt="Zoom Producto" 
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}

    </div>
  );
}