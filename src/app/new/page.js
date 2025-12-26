'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null); // Estado para guardar el archivo seleccionado

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    talla: '',
    color: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = null;

    // 1. Si el usuario seleccionó foto, la subimos primero
    if (file) {
      const fileName = `${Date.now()}-${file.name}`; // Nombre único para que no se repitan
      
      const { data, error: uploadError } = await supabase
        .storage
        .from('products') // Tu bucket
        .upload(fileName, file);

      if (uploadError) {
        alert('Error subiendo imagen: ' + uploadError.message);
        setLoading(false);
        return;
      }

      // 2. Obtenemos la URL pública de la foto
      const { data: urlData } = supabase
        .storage
        .from('products')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;
    }

    // 3. Guardamos el producto en la BD con la URL de la imagen
    const { error } = await supabase
      .from('products')
      .insert([
        {
          // OJO: Asegúrate que este sea tu ID de organización correcto
          organization_id: '8e946838-e3c5-4d67-ae6a-5a3de423eaf8', 
          name: formData.name,
          price: Number(formData.price),
          stock_quantity: Number(formData.stock),
          image_url: imageUrl, // Aquí va el link de la foto
          attributes: {
            talla: formData.talla,
            color: formData.color
          }
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
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Registrar Producto</h1>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Input de Imagen NUEVO */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Foto del Producto</label>
            <input 
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
            />
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
                <option value="CH">CH</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="XG">XG</option>
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
              {loading ? 'Subiendo...' : 'Guardar Producto'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}