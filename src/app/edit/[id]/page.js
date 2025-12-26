'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EditProduct({ params }) {
  const router = useRouter();
  const { id } = use(params); // Desempaquetamos el ID de la URL

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newFile, setNewFile] = useState(null); // ESTADO NUEVO: Para la nueva foto si la hay

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    talla: '',
    color: '',
    image_url: '' // Agregamos el campo de la URL actual
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
        alert('Error cargando producto');
        router.push('/');
      } else {
        // Rellenamos el formulario con los datos de la BD
        setFormData({
          name: data.name,
          price: data.price,
          stock: data.stock_quantity,
          talla: data.attributes?.talla || '',
          color: data.attributes?.color || '',
          image_url: data.image_url || null // Guardamos la URL actual
        });
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, router]);

  // 2. Guardar cambios (UPDATE)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);

    let finalImageUrl = formData.image_url; // Por defecto, usamos la URL que ya tenía

    // --- LÓGICA NUEVA DE IMAGEN ---
    // Si el usuario seleccionó un archivo NUEVO, lo subimos
    if (newFile) {
      const fileName = `updated-${Date.now()}-${newFile.name}`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('products')
        .upload(fileName, newFile);

      if (uploadError) {
        alert('Error subiendo la nueva imagen: ' + uploadError.message);
        setUpdating(false);
        return;
      }

      // Obtenemos la nueva URL pública
      const { data: urlData } = supabase
        .storage
        .from('products')
        .getPublicUrl(fileName);
      
      finalImageUrl = urlData.publicUrl; // Actualizamos la variable con la nueva URL
    }
    // -----------------------------

    // Actualizamos la base de datos
    const { error } = await supabase
      .from('products')
      .update({
        name: formData.name,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock),
        image_url: finalImageUrl, // Usamos la URL final (sea la vieja o la nueva)
        attributes: {
          talla: formData.talla,
          color: formData.color
        }
      })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar: ' + error.message);
      setUpdating(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando datos...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Editar Producto</h1>
        
        <form onSubmit={handleUpdate} className="space-y-5">
          
          {/* --- SECCIÓN DE IMAGEN --- */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">Imagen del Producto</label>
            
            {/* Vista previa de la imagen actual */}
            {formData.image_url && !newFile && (
              <div className="mb-4 flex justify-center">
                <img src={formData.image_url} alt="Actual" className="h-32 w-32 object-cover rounded-lg border border-gray-300 shadow-sm" />
              </div>
            )}

            {/* Input para subir nueva */}
            <input 
              type="file"
              accept="image/*"
              onChange={(e) => setNewFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-2">Si seleccionas un archivo, se reemplazará la imagen actual.</p>
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
                <option value="CH">CH</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="XG">XG</option>
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
              {updating ? (newFile ? 'Subiendo y Actualizando...' : 'Actualizando...') : 'Actualizar Producto'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}