'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
// Importamos la trituradora de imágenes
import imageCompression from 'browser-image-compression';

export default function NewProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estados para manejo de imágenes
  const [file, setFile] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null); 
  const [selectedGalleryUrl, setSelectedGalleryUrl] = useState(null); 

  // Estados para la Galería Modal
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  // Estado para mostrar que se está comprimiendo/subiendo
  const [compressing, setCompressing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    talla: '',
    color: ''
  });

  // --- 1. CARGAR GALERÍA ---
  const fetchGalleryImages = async () => {
    setLoadingGallery(true);
    const { data, error } = await supabase
      .storage
      .from('products')
      .list('', { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      alert("Error cargando galería: " + error.message);
    } else {
      const imagesWithUrl = data.map(file => {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(file.name);
        return { ...file, publicUrl };
      });
      setGalleryImages(imagesWithUrl);
    }
    setLoadingGallery(false);
  };

  // --- 2. SELECCIONAR DE GALERÍA ---
  const handleSelectFromGallery = (url) => {
    setSelectedGalleryUrl(url); 
    setPreviewUrl(url); 
    setFile(null); 
    setShowGallery(false); 
  };

  // --- 3. BORRAR IMAGEN CON PROTECCIÓN (SAFE DELETE) 🛡️ ---
  const handleDeleteImage = async (imageName, publicUrl) => {
    // A. Preguntar confirmación básica
    if(!confirm("¿Intentar borrar esta imagen?")) return;

    try {
      // B. VERIFICAR SI SE ESTÁ USANDO 🕵️‍♂️
      // Buscamos en la tabla 'products' si hay alguno que tenga este 'image_url'
      const { data: productsUsing, error: checkError } = await supabase
        .from('products')
        .select('name')
        .eq('image_url', publicUrl);

      if (checkError) throw checkError;

      // C. Si encontramos productos, BLOQUEAMOS el borrado
      if (productsUsing && productsUsing.length > 0) {
        // Mostramos el nombre del primer producto que la usa para dar contexto
        alert(`⛔ NO SE PUEDE BORRAR.\n\nEsta imagen está siendo usada por: "${productsUsing[0].name}" (y quizás otros).\n\nPrimero cambia la foto de ese producto.`);
        return;
      }

      // D. Si nadie la usa, procedemos a borrar
      const { error: deleteError } = await supabase.storage.from('products').remove([imageName]);
      
      if (deleteError) throw deleteError;
      
      alert("✅ Imagen borrada correctamente (no estaba en uso).");
      fetchGalleryImages(); // Recargar lista

    } catch (error) {
      alert("Error verificando imagen: " + error.message);
    }
  };

  // --- 4. MANEJO DE ARCHIVO LOCAL (COMPRESIÓN VISUAL) ---
  const handleLocalFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Mostramos preview inmediato (aunque sea pesado, solo es para que el usuario vea)
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setFile(selectedFile);
      setSelectedGalleryUrl(null);
    }
  };

  // --- 5. SUBIR Y GUARDAR PRODUCTO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalImageUrl = selectedGalleryUrl; 

    // A. Si hay archivo nuevo -> COMPRIMIR Y SUBIR
    if (file) {
      setCompressing(true);
      try {
        // --- AQUÍ OCURRE LA MAGIA DE LA COMPRESIÓN 🪄 ---
        const options = {
          maxSizeMB: 0.5,          // Máximo 0.5 MB (500KB) -> Calidad suficiente para web
          maxWidthOrHeight: 1200,  // Redimensionar si es gigante (ej. 4000px de cámara)
          useWebWorker: true,
        };

        console.log(`Peso original: ${file.size / 1024 / 1024} MB`);
        const compressedFile = await imageCompression(file, options);
        console.log(`Peso comprimido: ${compressedFile.size / 1024 / 1024} MB`);
        // ------------------------------------------------

        const fileName = `${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase
          .storage
          .from('products')
          .upload(fileName, compressedFile); // Subimos el comprimido

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase
          .storage
          .from('products')
          .getPublicUrl(fileName);
        
        finalImageUrl = urlData.publicUrl;

      } catch (error) {
        alert('Error al procesar imagen: ' + error.message);
        setLoading(false);
        setCompressing(false);
        return;
      }
      setCompressing(false);
    }

    // B. Guardar en BD
    const { error } = await supabase
      .from('products')
      .insert([
        {
          organization_id: '8e946838-e3c5-4d67-ae6a-5a3de423eaf8', 
          name: formData.name,
          price: Number(formData.price),
          stock_quantity: Number(formData.stock),
          image_url: finalImageUrl, 
          attributes: {
            talla: formData.talla,
            color: formData.color
          },
          is_active: true 
        }
      ]);

    if (error) {
      alert('Error al guardar en BD: ' + error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200 relative">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Registrar Producto</h1>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* --- ZONA DE IMAGEN --- */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700">Foto del Producto</label>
            
            {/* Previsualización */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 min-h-[150px]">
              {compressing ? (
                <div className="text-blue-600 font-bold animate-pulse text-sm">
                  ⚡ Comprimiendo imagen...
                </div>
              ) : previewUrl ? (
                <div className="relative w-full h-48">
                  <img src={previewUrl} alt="Vista previa" className="w-full h-full object-contain rounded" />
                  <button 
                    type="button" 
                    onClick={() => { setPreviewUrl(null); setFile(null); setSelectedGalleryUrl(null); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <p className="text-2xl mb-2">📷</p>
                  <p className="text-xs">Sin imagen seleccionada</p>
                </div>
              )}
            </div>

            {/* Botones de Selección */}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer bg-black text-white text-center py-2 rounded-lg text-xs font-bold hover:bg-gray-800 transition shadow">
                Subir Nueva
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
              </label>

              <button 
                type="button"
                onClick={() => { setShowGallery(true); fetchGalleryImages(); }}
                className="flex-1 bg-gray-200 text-gray-800 text-center py-2 rounded-lg text-xs font-bold hover:bg-gray-300 transition shadow"
              >
                📚 Abrir Galería
              </button>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
            <input 
              required
              type="text" 
              className="w-full border border-gray-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
              placeholder="Ej. Sudadera Polar"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Precio ($)</label>
              <input 
                required
                type="number" 
                className="w-full border border-gray-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
                placeholder="0.00"
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Stock</label>
              <input 
                required
                type="number" 
                className="w-full border border-gray-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
                placeholder="0"
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
              />
            </div>
          </div>

          {/* Variantes */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Talla</label>
              <select 
                className="w-full border border-gray-300 rounded-md p-2 text-sm text-black bg-white focus:ring-2 focus:ring-black focus:outline-none"
                onChange={(e) => setFormData({...formData, talla: e.target.value})}
              >
                <option value="">Elegir...</option>
                <option value="XCH">XCH</option>
                <option value="CH">CH</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="XG">XG</option>
                <option value="UNITALLA">Unitalla</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Color</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-md p-2 text-sm text-black focus:ring-2 focus:ring-black focus:outline-none"
                placeholder="Ej. Rojo"
                onChange={(e) => setFormData({...formData, color: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="w-1/3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-2/3 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition shadow-lg disabled:opacity-50"
            >
              {loading || compressing ? 'Procesando...' : 'Guardar Producto'}
            </button>
          </div>

        </form>
      </div>

      {/* --- MODAL DE GALERÍA --- */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-gray-800">Galería de Imágenes</h3>
              <button onClick={() => setShowGallery(false)} className="text-gray-500 hover:text-black font-bold text-xl px-2">✕</button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {loadingGallery ? (
                <div className="text-center py-10 text-gray-400 animate-pulse">Cargando fotos...</div>
              ) : galleryImages.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No hay imágenes guardadas aún.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition">
                      
                      {/* Imagen Clickable */}
                      <img 
                        src={img.publicUrl} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => handleSelectFromGallery(img.publicUrl)}
                        alt={img.name}
                      />
                      
                      {/* Botón Borrar Seguro 🛡️ */}
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // Pasamos el nombre Y la URL pública para validar
                            handleDeleteImage(img.name, img.publicUrl); 
                        }}
                        className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition shadow-sm"
                        title="Borrar imagen (Si no está en uso)"
                      >
                        🗑️
                      </button>
                      
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center rounded-b-xl">
              Toca una foto para seleccionarla. El 🗑️ te avisará si la imagen está en uso.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}