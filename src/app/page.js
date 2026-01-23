'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
// 👇 1. IMPORTACIONES NUEVAS PARA EL MODO OFFLINE
import { db, guardarVentaOffline } from '@/lib/db';

// ==========================================
// 1. COMPONENTE: TARJETA (Sin cambios mayores)
// ==========================================
function ProductCard({ product, onAddToCart, onImageClick, userRole }) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qtyToAdd, setQtyToAdd] = useState(1);

  // Validación de seguridad por si el producto viene incompleto
  const variants = product.product_variants || [];
  const sizes = [...new Set(variants.map(v => v.size))].sort();
  
  const availableColors = selectedSize 
    ? variants.filter(v => v.size === selectedSize)
    : [];

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSelectedVariant(null);
  };

  const handleColorSelect = (variant) => {
    setSelectedVariant(variant);
  };

  const displayImage = selectedVariant?.variant_image_url || product.image_url;
  const currentStock = selectedVariant ? selectedVariant.stock : 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
      <div className="h-56 relative bg-gray-100 group overflow-hidden">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={product.name} 
            onClick={() => onImageClick(displayImage)}
            className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin Imagen</div>
        )}
        
        {userRole === 'admin' && (
          <Link href={`/edit/${product.id}`} className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-md hover:text-blue-600 text-gray-600 z-10 transition">
            ✏️
          </Link>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow gap-3">
        <div>
          <h2 className="font-bold text-gray-900 text-base leading-tight mb-1">{product.name}</h2>
          <p className="text-xl font-extrabold text-gray-900">${product.price}</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">1. Elige Talla</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedSize === size 
                      ? 'bg-black text-white border-black shadow-md transform scale-105'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className={`transition-opacity duration-300 ${selectedSize ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">2. Elige Color</p>
            <div className="flex flex-wrap gap-2">
              {availableColors.length > 0 ? availableColors.map(v => (
                <button
                  key={v.id}
                  onClick={() => handleColorSelect(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedVariant?.id === v.id
                      ? 'bg-black text-white border-black shadow-md transform scale-105' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {v.color}
                </button>
              )) : (
                <span className="text-xs text-gray-400 italic">Selecciona una talla primero</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-3 h-5">
             {selectedVariant ? (
                <span className={`text-xs font-bold flex items-center gap-1 ${currentStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {currentStock > 0 ? '● Disponible:' : '● Agotado:'} {currentStock} pza(s)
                </span>
             ) : (
                <span className="text-xs text-gray-400">Selecciona opciones...</span>
             )}
          </div>

          <div className="flex gap-2">
            <input 
              type="number" 
              min="1" 
              max={currentStock > 0 ? currentStock : 1} 
              value={qtyToAdd} 
              onChange={(e) => setQtyToAdd(Number(e.target.value))}
              disabled={!selectedVariant || currentStock === 0}
              className="w-16 border border-gray-300 rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-black outline-none bg-gray-50 text-gray-900"
            />
            <button 
              onClick={() => {
                onAddToCart(product, selectedVariant, qtyToAdd);
                setQtyToAdd(1);
              }}
              disabled={!selectedVariant || currentStock === 0}
              className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition shadow-md ${
                !selectedVariant || currentStock === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800 active:scale-95'
              }`}
            >
              {currentStock === 0 && selectedVariant ? 'Sin Stock' : 'Agregar +'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. COMPONENTE: TICKET MODAL
// ==========================================
function TicketModal({ sale, onClose }) {
  if (!sale) return null;
  // Detectamos si fue offline revisando si tiene el campo synced
  const isOfflineTicket = sale.synced === false; 

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl p-6 relative flex flex-col items-center font-mono text-sm">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 text-2xl ${isOfflineTicket ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
            {isOfflineTicket ? '☁️' : '✓'}
        </div>
        <h2 className="font-bold text-xl mb-1 text-gray-900">
            {isOfflineTicket ? 'Guardado Offline' : '¡Venta Exitosa!'}
        </h2>
        {isOfflineTicket && <p className="text-xs text-yellow-600 font-bold mb-2">Pendiente de sincronizar</p>}
        
        <p className="text-gray-500 text-xs mb-4">ID: {sale.id ? sale.id.slice(0, 8) : 'TEMP'}</p>
        
        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>
        <div className="w-full space-y-2 mb-4 text-gray-800">
          {sale.items.map((item, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{item.quantity} x {item.product_name || item.name} <br/><span className="text-[10px] text-gray-500">({item.size} / {item.color})</span></span>
              <span className="font-medium">${(item.quantity * item.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="w-full border-t border-dashed border-gray-300 my-2"></div>
        
        <div className="flex justify-between w-full font-bold text-lg mb-6 text-gray-900">
          <span>TOTAL</span>
          <span>${Number(sale.total).toFixed(2)}</span>
        </div>

        <button onClick={onClose} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition">Cerrar</button>
        <button onClick={() => window.print()} className="mt-2 text-xs text-gray-400 underline hover:text-gray-600">Imprimir comprobante</button>
      </div>
    </div>
  );
}

// ==========================================
// 3. COMPONENTE PRINCIPAL
// ==========================================
export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      // Intentamos obtener sesión. Si estamos offline, esto podría fallar o tardar,
      // pero si es PWA puede que mantenga la sesión en local storage de Supabase.
      const { data: { session } } = await supabase.auth.getSession();
      
      // Si no hay sesión y hay internet, login. Si no hay internet, intentamos seguir (riesgoso pero necesario)
      if (!session && navigator.onLine) {
        router.push('/login');
      } else {
        if(session) {
            setUser(session.user);
            // Intentar sacar rol, si falla (offline) asumimos vendedor o leemos de caché
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            setUserRole(profile ? profile.role : 'vendedor');
        }
        fetchProducts(); 
      }
    };
    checkUser();
  }, [router, showArchived]);

  // 👇 CAMBIO 2: CARGA DE PRODUCTOS HÍBRIDA (ONLINE/OFFLINE)
  const fetchProducts = async () => {
    setLoading(true);
    
    // A. Si hay internet: Bajamos de Supabase Y guardamos en Dexie
    if (navigator.onLine) {
        let query = supabase
        .from('products')
        .select('*, product_variants(*)')
        .order('created_at', { ascending: false });

        if (!showArchived) query = query.eq('is_active', true);
        else query = query.eq('is_active', false);

        const { data, error } = await query;

        if (!error && data) {
            setProducts(data);
            
            // GUARDAR COPIA EN CACHÉ LOCAL (DEXIE)
            // Guardamos variantes por separado para facilitar la búsqueda offline
            try {
                // Limpiamos caché viejo simple (esto se puede optimizar)
                const variantsToSave = [];
                data.forEach(p => {
                    if(p.product_variants) {
                        p.product_variants.forEach(v => variantsToSave.push(v));
                    }
                });
                
                // Actualizamos Dexie
                await db.products.bulkPut(data); // "put" sobreescribe si existe ID
                await db.product_variants.bulkPut(variantsToSave);
                console.log("Catálogo guardado localmente para uso offline");
            } catch(e) {
                console.error("Error guardando caché:", e);
            }
        } else {
            toast.error("Error cargando productos");
        }
    } 
    // B. Si NO hay internet: Leemos de Dexie
    else {
        toast("Modo Offline: Cargando catálogo local", { icon: '📡' });
        try {
            // Reconstruimos la estructura (Producto -> Variantes)
            const localProducts = await db.products.toArray();
            const localVariants = await db.product_variants.toArray();

            // Unimos manualmente para que el UI funcione igual
            const productsWithVariants = localProducts.map(p => ({
                ...p,
                product_variants: localVariants.filter(v => v.product_id === p.id)
            }));
            
            // Filtro manual de activos/inactivos
            const filtered = showArchived 
                ? productsWithVariants.filter(p => p.is_active === false)
                : productsWithVariants.filter(p => p.is_active === true);

            setProducts(filtered);
        } catch (e) {
            console.error("Error leyendo DB local:", e);
            toast.error("No se pudo cargar el inventario local");
        }
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const addToCart = (product, variant, quantity) => {
    if (!variant) {
        toast.error("Selecciona talla y color primero");
        return;
    }

    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.variantId === variant.id);
      
      if (existingItem) {
        if ((existingItem.cartQuantity + quantity) > variant.stock) {
          toast.error(`¡Solo quedan ${variant.stock} disponibles!`);
          return currentCart;
        }
        toast.success(`+${quantity} ${product.name}`);
        return currentCart.map(item => 
          item.variantId === variant.id 
            ? { ...item, cartQuantity: item.cartQuantity + quantity }
            : item
        );
      } else {
        if (variant.stock < quantity) {
          toast.error("No hay suficiente stock");
          return currentCart;
        }
        toast.success(`Agregado: ${product.name} (${variant.size})`);
        return [...currentCart, {
            id: product.id,
            variantId: variant.id,
            name: product.name,
            price: product.price,
            size: variant.size,
            color: variant.color,
            cartQuantity: quantity,
            image: variant.variant_image_url || product.image_url
        }];
      }
    });
  };

  const removeFromCart = (variantId) => {
    toast("Eliminado del carrito", { icon: '🗑️' });
    setCart(currentCart => currentCart.filter(item => item.variantId !== variantId));
  };

  // 👇 CAMBIO 3: PROCESAMIENTO ROBUSTO (RPC SERVER O DEXIE LOCAL)
  const processSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    const toastId = toast.loading("Procesando venta...");

    const cartTotal = cart.reduce((total, item) => total + (item.price * item.cartQuantity), 0);

    // Preparamos el objeto de items limpio para la DB
    const itemsPayload = cart.map(item => ({
        variant_id: item.variantId,
        quantity: item.cartQuantity,
        product_name: item.name,
        size: item.size,
        color: item.color,
        price: item.price
    }));

    try {
      // === OPCIÓN A: ONLINE (Intentar RPC) ===
      if (navigator.onLine) {
          try {
              const { data, error } = await supabase.rpc('registrar_venta_offline', {
                  p_user_email: user?.email || 'offline_user',
                  p_total: cartTotal,
                  p_items: itemsPayload
              });

              if (error) throw error;

              // Éxito Online
              toast.success("¡Venta registrada en Nube!", { id: toastId });
              setLastSale({ 
                  id: data.sale_id, 
                  total: cartTotal, 
                  items: cart, 
                  synced: true,
                  created_at: new Date().toISOString()
              });
              
              // Recargamos productos para ver stock actualizado real
              setCart([]);
              fetchProducts();

          } catch (serverError) {
              console.error("Fallo servidor, guardando local...", serverError);
              throw new Error("FALLBACK_LOCAL"); // Forzamos ir al catch de abajo
          }
      } 
      // === OPCIÓN B: OFFLINE (Guardar en Dexie) ===
      else {
          throw new Error("OFFLINE_MODE");
      }

    } catch (error) {
      // Si falló el servidor o no hay internet, guardamos localmente
      if (error.message === "FALLBACK_LOCAL" || error.message === "OFFLINE_MODE" || !navigator.onLine) {
          
          const guardado = await guardarVentaOffline(user?.email, cartTotal, itemsPayload);
          
          if (guardado) {
              toast.success("Sin internet: Guardado en dispositivo", { id: toastId, icon: '💾' });
              
              setLastSale({ 
                  id: `OFF-${Date.now()}`, // ID temporal
                  total: cartTotal, 
                  items: cart,
                  synced: false 
              });

              // Limpiamos carrito
              setCart([]);
              
              // IMPORTANTE: Recargar productos LOCALES para ver que el stock bajó (en la copia local)
              fetchProducts(); 
          } else {
              toast.error("Error crítico: No se pudo guardar la venta", { id: toastId });
          }

      } else {
          // Error real (ej: validación de datos)
          toast.error("Error: " + error.message, { id: toastId });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.cartQuantity), 0);

  if (loading && products.length === 0) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 animate-pulse">Cargando catálogo...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans flex flex-col md:flex-row gap-6">
      
      {/* IZQUIERDA: INVENTARIO */}
      <div className="flex-1">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Inventario JANCLI
                {!navigator.onLine && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200">OFFLINE</span>}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
               <span>{user?.email || 'Modo Offline'}</span>
               <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-black text-white">{userRole || 'Vendedor'}</span>
               <button onClick={handleLogout} className="text-red-500 font-bold hover:underline px-1">(Salir)</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input type="text" placeholder="Buscar..." className="w-full md:w-48 border border-gray-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-black text-gray-800" onChange={(e) => setSearchTerm(e.target.value)} />
            
            {userRole === 'admin' && (
              <>
                <Link href="/dashboard" className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 font-medium text-sm flex items-center justify-center whitespace-nowrap">📊 Finanzas</Link>
                <Link href="/new" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm flex items-center justify-center whitespace-nowrap">+ Nuevo Producto</Link>
              </>
            )}
          </div>
        </header>

        {/* PESTAÑAS (Admin) */}
        {userRole === 'admin' ? (
            <div className="flex gap-4 mb-6 border-b border-gray-200 pb-0">
                <button onClick={() => setShowArchived(false)} className={`text-sm font-bold pb-3 px-2 border-b-2 transition ${!showArchived ? 'text-black border-black' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>📦 Disponibles</button>
                <button onClick={() => setShowArchived(true)} className={`text-sm font-bold pb-3 px-2 border-b-2 transition ${showArchived ? 'text-black border-black' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>🗄️ Papelera</button>
            </div>
        ) : (
            <div className="mb-6 text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">📦 Catálogo de Venta</div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
            {showArchived ? "La papelera está vacía." : "No se encontraron productos."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={addToCart} 
                onImageClick={setSelectedImage}
                userRole={userRole} 
              />
            ))}
          </div>
        )}
      </div>

      {/* DERECHA: CARRITO */}
      <div className="w-full md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-5 h-fit sticky top-4 flex flex-col z-20">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2 border-gray-100 text-gray-900">🛒 Carrito</h2>
        
        {cart.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">Carrito vacío</div>
        ) : (
          <div className="flex-grow space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {cart.map(item => (
              <div key={item.variantId} className="flex justify-between items-start text-sm border-b border-gray-50 pb-3">
                <div className="flex items-start gap-3">
                    {/* Miniatura */}
                    <div className="h-12 w-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <div className="text-xs flex items-center justify-center h-full">📷</div>}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-1 font-medium bg-gray-100 px-1.5 py-0.5 rounded inline-block">
                            {item.size} • {item.color}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.cartQuantity} x ${item.price}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-bold text-gray-900">${item.price * item.cartQuantity}</span>
                  <button onClick={() => removeFromCart(item.variantId)} className="text-gray-400 hover:text-red-500 p-1">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M3 6v18h18v-18h-18zm5 14c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm4-18v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2 bg-gray-50 -mx-5 -mb-5 p-5 rounded-b-xl border-t border-gray-100">
          <div className="flex justify-between items-center text-xl font-bold mb-4 text-gray-900">
            <span>Total</span><span>${cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={processSale}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95"
          >
            {isProcessing ? 'Procesando...' : 'COBRAR ✅'}
          </button>
        </div>
      </div>

      {/* MODAL ZOOM DE IMAGEN */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
        </div>
      )}

      {/* MODAL TICKET */}
      <TicketModal sale={lastSale} onClose={() => setLastSale(null)} />
    </div>
  );
}