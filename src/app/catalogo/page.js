'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ==========================================
// 1. COMPONENTE: TARJETA DE PRODUCTO PÚBLICA
// ==========================================
function PublicProductCard({ product, onImageClick, phoneNumber }) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  // 1. Obtener tallas únicas disponibles
  const sizes = [...new Set(product.product_variants?.map(v => v.size))].sort();

  // 2. Filtrar colores según talla
  const availableColors = selectedSize 
    ? product.product_variants.filter(v => v.size === selectedSize)
    : [];

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSelectedVariant(null);
  };

  const handleColorSelect = (variant) => {
    setSelectedVariant(variant);
  };

  // 3. Determinar imagen y stock
  const displayImage = selectedVariant?.variant_image_url || product.image_url;
  const currentStock = selectedVariant ? selectedVariant.stock : 0;

  // 4. GENERAR LINK DE WHATSAPP INTELIGENTE
  const handleWhatsAppOrder = () => {
    if (!selectedVariant) {
        toast.error("Por favor selecciona Talla y Color");
        return;
    }

    toast.success("Abriendo WhatsApp...", {
      icon: '💬',
      style: { borderRadius: '10px', background: '#25D366', color: '#fff' },
    });

    // Mensaje bien estructurado para que no pierdas tiempo preguntando
    const text = `Hola! 👋 Me interesa este producto:
    
👕 Modelo: ${product.name}
📏 Talla: ${selectedVariant.size}
🎨 Color: ${selectedVariant.color}
💰 Precio: $${product.price}

¿Lo tienen disponible?`;

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
    
    setTimeout(() => {
        window.open(url, '_blank');
    }, 800);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition duration-300 overflow-hidden flex flex-col h-full border border-gray-100 group">
      
      {/* IMAGEN */}
      <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={product.name} 
            onClick={() => onImageClick(displayImage)}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-700 cursor-pointer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">📷</div>
        )}
        
        {/* Etiqueta si variante específica está agotada */}
        {selectedVariant && currentStock === 0 && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-widest -rotate-12 shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* INFO */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 leading-tight mb-1 text-lg">{product.name}</h3>
          <p className="text-xl font-extrabold text-gray-900">${product.price}</p>
        </div>

        {/* SELECTORES VISUALES */}
        <div className="space-y-3 mb-4">
            
            {/* Tallas */}
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">1. Talla</p>
                <div className="flex flex-wrap gap-2">
                    {sizes.map(size => (
                        <button
                            key={size}
                            onClick={() => handleSizeSelect(size)}
                            className={`px-3 py-1 rounded text-xs font-bold border transition ${
                                selectedSize === size 
                                ? 'bg-black text-white border-black shadow' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Colores */}
            <div className={`transition-opacity duration-300 ${selectedSize ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">2. Color</p>
                <div className="flex flex-wrap gap-2">
                    {availableColors.length > 0 ? availableColors.map(v => (
                        <button
                            key={v.id}
                            onClick={() => handleColorSelect(v)}
                            className={`px-3 py-1 rounded text-xs font-bold border transition ${
                                selectedVariant?.id === v.id
                                ? 'bg-black text-white border-black shadow' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                        >
                            {v.color}
                        </button>
                    )) : <span className="text-xs text-gray-300">Selecciona talla...</span>}
                </div>
            </div>
        </div>
        
        {/* BOTÓN WHATSAPP */}
        <div className="mt-auto pt-4 border-t border-gray-50">
          <button 
            onClick={handleWhatsAppOrder}
            disabled={!selectedVariant || currentStock === 0}
            className={`w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg ${
              !selectedVariant || currentStock === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-[1.02]'
            }`}
          >
            {currentStock === 0 && selectedVariant ? (
                'Sin Stock 🚫'
            ) : (
                <>
                  <span>Pedir por WhatsApp</span>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.151-.174.2-.298.3-.495.099-.198.05-.372-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. PÁGINA PRINCIPAL
// ==========================================
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
    // Traemos productos Y sus variantes (El JOIN mágico)
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)') 
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

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <PublicProductCard 
                key={product.id} 
                product={product} 
                onImageClick={setSelectedImage}
                phoneNumber={TELEFONO_TIENDA}
              />
            ))}
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