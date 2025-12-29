'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// 1. IMPORTAR TOAST
import toast from 'react-hot-toast';

export default function PublicCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  // --- 📱 CONFIGURA TU WHATSAPP AQUÍ ---
  const TELEFONO_TIENDA = '527131080538'; 

  useEffect(() => {
    fetchPublicProducts();
  }, []);

  const fetchPublicProducts = async () => {
    // Traemos SOLO los productos activos (is_active = true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true) 
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error cargando catálogo:", error);
      toast.error("Error cargando productos");
    } else {
      setProducts(data || []);
    }
    
    setLoading(false);
  };

  // Filtrado por buscador
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para generar link de WhatsApp (MEJORADA CON TOAST)
  const handleWhatsAppOrder = (product) => {
    // Feedback visual para el cliente
    toast.success("Abriendo WhatsApp...", {
      icon: '💬',
      style: {
        borderRadius: '10px',
        background: '#25D366', // Color verde WhatsApp
        color: '#fff',
      },
    });

    const text = `Hola! 👋 Me interesa este producto del catálogo: ${product.name} - $${product.price}`;
    const url = `https://wa.me/${TELEFONO_TIENDA}?text=${encodeURIComponent(text)}`;
    
    // Pequeño retraso para que se vea el toast antes de cambiar de ventana
    setTimeout(() => {
        window.open(url, '_blank');
    }, 500);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      
      {/* HEADER PÚBLICO */}
      <header className="bg-black text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-wider uppercase">✨ Mi Tienda Online</h1>
            <p className="text-xs text-gray-400">Catálogo Digital</p>
          </div>
          
          <div className="w-full md:w-96">
            <input 
              type="text" 
              placeholder="🔍 Buscar prenda..." 
              className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 px-4 text-sm text-white focus:outline-none focus:border-white transition"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* GRID DE PRODUCTOS */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl">No encontramos productos con ese nombre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock_quantity <= 0;
              
              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition duration-300 overflow-hidden group flex flex-col h-full border border-gray-100">
                  
                  {/* Imagen */}
                  <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        onClick={() => setSelectedImage(product.image_url)}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700 cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
                    )}
                    
                    {/* Etiqueta de Agotado */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-widest transform -rotate-12">
                          Agotado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="mb-2">
                      <h3 className="font-bold text-gray-900 leading-tight mb-1">{product.name}</h3>
                      {product.attributes && (
                        <p className="text-xs text-gray-500">
                          {product.attributes.talla} • {product.attributes.color}
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-xl font-bold text-gray-900">${product.price}</span>
                      
                      <button 
                        onClick={() => handleWhatsAppOrder(product)}
                        disabled={isOutOfStock}
                        className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 transition shadow-lg ${
                          isOutOfStock 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                        }`}
                      >
                        {isOutOfStock ? 'Sin Stock' : (
                          <>
                            <span>Pedir</span>
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.151-.174.2-.298.3-.495.099-.198.05-.372-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

       {/* MODAL ZOOM */}
       {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}