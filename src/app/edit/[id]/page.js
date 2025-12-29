'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
// 1. IMPORTAMOS LAS MEJORAS
import AdminGuard from '@/components/AdminGuard';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export default function EditProduct({ params }) {
  const router = useRouter();
  const { id } = use(params); // Desempaquetamos el ID de la URL

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newFile, setNewFile] = useState(null);
  // Estado para preview inmediato de la nueva foto
  const [previewUrl, setPreviewUrl] = useState(null); 

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    talla: '',
    color: '',
    image_url: '' 
  });

  // 1. Cargar datos al entrar (READ)
  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast.error('Error cargando producto');
        router.push('/');
      } else {
        setFormData({
          name: data.name,
          price: data.price,
          stock: data.stock_quantity,
          talla: data.attributes?.talla || '',
          color: data.attributes?.color || '',
          image_url: data.image_url || null
        });
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, router]);

  // Manejo de cambio de archivo (para mostrar preview)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Preview instantáneo
    }
  };

  // 2. Guardar cambios (UPDATE)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    
    // Toast de carga
    const toastId = toast.loading("Actualizando producto...");

    let finalImageUrl = formData.image_url; 

    // --- LÓGICA DE IMAGEN CON COMPRESIÓN ---
    if (newFile) {
      try {
        // A. Comprimir
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        
        toast.loading("Comprimiendo imagen...", { id: toastId });
        const compressedFile = await imageCompression(newFile, options);

        // B. Subir
        const fileName = `updated-${Date.now()}-${newFile.name}`;
        toast.loading("Subiendo imagen...", { id: toastId });

        const { error: uploadError } = await supabase
          .storage
          .from('products')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        // C. Obtener URL
        const { data: urlData } = supabase
          .storage
          .from('products')
          .getPublicUrl(fileName);
        
        finalImageUrl = urlData.publicUrl;

      } catch (error) {
        toast.error('Error imagen: ' + error.message, { id: toastId });
        setUpdating(false);
        return;
      }
    }
    // -----------------------------

    // Actualizar BD
    const { error } = await supabase
      .from('products')
      .update({
        name: formData.name,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock),
        image_url: finalImageUrl,
        attributes: {
          talla: formData.talla,
          color: formData.color
        }
      })
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar: ' + error.message, { id: toastId });
      setUpdating(false);
    } else {
      toast.success('¡Producto actualizado!', { id: toastId });
      router.push('/');
      router.refresh();
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando datos... ⏳</div>;

  // 3. ENVUELTO EN ADMINGUARD 🛡️
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Editar Producto</h1>
          
          <form onSubmit={handleUpdate} className="space-y-5">
            
            {/* --- SECCIÓN DE IMAGEN --- */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
              <label className="block text-sm font-bold text-gray-700 mb-3">Imagen del Producto</label>
              
              {/* Mostrar: Preview Nuevo O Imagen Vieja O Placeholder */}
              <div className="mb-4 flex justify-center">
                {previewUrl ? (
                   <img src={previewUrl} alt="Nueva" className="h-32 w-32 object-cover rounded-lg border-2 border-blue-500 shadow-sm" />
                ) : formData.image_url ? (
                   <img src={formData.image_url} alt="Actual" className="h-32 w-32 object-cover rounded-lg border border-gray-300 shadow-sm" />
                ) : (
                   <div className="h-32 w-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">Sin foto</div>
                )}
              </div>

              <input 
                type="file"
                accept="image/*"
                onChange={handleFileChange} // Usamos la nueva función
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-2">
                {newFile ? "⚠️ Se reemplazará la imagen anterior." : "Sube una foto para cambiar la actual."}
              </p>
            </div>
            {/* ------------------------- */}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
              <input 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                type="text" 
                className="w-full border border-gray-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Precio ($)</label>
                <input 
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  type="number" 
                  className="w-full border border-gray-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Stock</label>
                <input 
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  type="number" 
                  className="w-full border border-gray-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Talla</label>
                <select 
                  value={formData.talla}
                  onChange={(e) => setFormData({...formData, talla: e.target.value})}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm text-black bg-white focus:ring-2 focus:ring-black focus:outline-none"
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
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  type="text" 
                  className="w-full border border-gray-300 rounded-md p-2 text-sm text-black focus:ring-2 focus:ring-black focus:outline-none"
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
                disabled={updating}
                className="w-2/3 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition shadow-lg disabled:opacity-50"
              >
                {updating ? 'Guardando...' : 'Actualizar Producto'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </AdminGuard>
  );
}