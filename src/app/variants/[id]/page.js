'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export default function ManageVariants({ params }) {
  const router = useRouter();
  const { id } = use(params); // ID del producto padre

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Datos del producto para el título
  const [productName, setProductName] = useState('');
  
  // Lista de variantes existentes en la BD
  const [existingVariants, setExistingVariants] = useState([]);

  // Formulario para la NUEVA variante
  const [newVariant, setNewVariant] = useState({
    size: 'UNITALLA',
    color: '',
    stock: '',
    imageFile: null,
    previewUrl: null
  });

  // Cargar el nombre del producto y sus variantes actuales
  const fetchProductAndVariants = async () => {
    // 1. Traer nombre del producto
    const { data: productData } = await supabase
      .from('products')
      .select('name')
      .eq('id', id)
      .single();
    
    if (productData) setProductName(productData.name);

    // 2. Traer variantes
    const { data: variantsData, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (!error && variantsData) {
      setExistingVariants(variantsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductAndVariants();
  }, [id]);

  // Manejo de la foto de la nueva variante
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewVariant({
        ...newVariant,
        imageFile: file,
        previewUrl: URL.createObjectURL(file)
      });
    }
  };

  // Función para subir imagen
  const uploadImage = async (file) => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
    const compressedFile = await imageCompression(file, options);
    const fileName = `variant-${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
    
    const { error } = await supabase.storage.from('products').upload(fileName, compressedFile);
    if (error) throw error;
    
    const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Guardar LA NUEVA VARIANTE en la BD
  const handleAddVariant = async (e) => {
    e.preventDefault();
    
    if (!newVariant.color || !newVariant.stock) {
      toast.error("El color y el stock inicial son obligatorios.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Guardando nueva variante...");

    try {
      let imageUrl = null;
      if (newVariant.imageFile) {
        toast.loading("Subiendo imagen...", { id: toastId });
        imageUrl = await uploadImage(newVariant.imageFile);
      }

      toast.loading("Registrando en base de datos...", { id: toastId });

      // 1. Insertar en product_variants
      const { data: variantData, error: variantError } = await supabase
        .from('product_variants')
        .insert([{
          product_id: id,
          size: newVariant.size,
          color: newVariant.color,
          variant_image_url: imageUrl,
          stock: Number(newVariant.stock)
        }])
        .select()
        .single();

      if (variantError) throw variantError;

      // 2. Insertar en inventory_movements (Kardex inicial de esta variante)
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert([{
          variant_id: variantData.id,
          movement_type: 'conteo_inicial',
          quantity: Number(newVariant.stock),
          reason: 'Agregado desde Administrador de Variantes',
          user_email: 'admin@jancli.com' // Aquí puedes poner el email del usuario logueado en el futuro
        }]);

      if (movementError) throw movementError;

      toast.success("¡Variante agregada correctamente!", { id: toastId });
      
      // Limpiar formulario
      setNewVariant({
        size: 'UNITALLA',
        color: '',
        stock: '',
        imageFile: null,
        previewUrl: null
      });

      // Recargar la lista
      fetchProductAndVariants();

    } catch (error) {
      console.error(error);
      toast.error("Error: " + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando datos... ⏳</div>;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6 font-sans flex justify-center pb-20">
        <div className="w-full max-w-4xl">
          
          {/* HEADER CON BOTÓN VOLVER */}
          <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Administrar Variantes</h1>
                <p className="text-gray-500 text-sm mt-1">Producto: <span className="font-bold text-black">{productName}</span></p>
            </div>
            <Link 
                href="/" 
                className="text-gray-500 hover:text-black font-medium text-sm flex items-center gap-1 transition"
            >
                ← Volver al catálogo
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* --- COLUMNA IZQUIERDA: AGREGAR NUEVA VARIANTE --- */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">+</span>
                  <h2 className="text-lg font-bold text-gray-800">Nueva Variante</h2>
              </div>
              
              <form onSubmit={handleAddVariant}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Talla</label>
                        <select 
                          className="w-full border border-gray-200 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={newVariant.size}
                          onChange={e => setNewVariant({...newVariant, size: e.target.value})}
                        >
                          <option>UNITALLA</option>
                          <option>XCH</option>
                          <option>CH</option>
                          <option>M</option>
                          <option>G</option>
                          <option>XG</option>
                          <option>XXG</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Rojo" 
                          className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={newVariant.color}
                          onChange={e => setNewVariant({...newVariant, color: e.target.value})}
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stock Inicial</label>
                        <input 
                          type="number" 
                          placeholder="0" 
                          className="w-full border border-gray-200 p-2.5 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={newVariant.stock}
                          onChange={e => setNewVariant({...newVariant, stock: e.target.value})}
                        />
                    </div>
                    
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Foto (Opcional)</label>
                        <div className="flex items-center gap-2 border border-gray-200 p-2 rounded-lg bg-gray-50 cursor-pointer relative hover:bg-gray-100 transition h-[42px]">
                          {newVariant.previewUrl ? (
                              <img src={newVariant.previewUrl} className="w-6 h-6 rounded object-cover shadow-sm" />
                          ) : (
                              <span className="text-gray-400 text-xs">📷</span>
                          )}
                          <span className="text-xs text-gray-600 truncate flex-1 font-medium">
                            {newVariant.imageFile ? "Lista" : "Subir Foto"}
                          </span>
                          <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar Variante'}
                  </button>
              </form>
            </div>

            {/* --- COLUMNA DERECHA: VARIANTES ACTUALES --- */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex justify-between">
                 <span>Variantes Actuales</span>
                 <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{existingVariants.length}</span>
               </h3>

               {existingVariants.length === 0 ? (
                 <div className="text-center py-8 text-gray-300 text-sm border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                   Este producto aún no tiene variantes registradas.
                 </div>
               ) : (
                 <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {existingVariants.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            {v.variant_image_url ? (
                              <img src={v.variant_image_url} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-bold">Sin<br/>Foto</div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-gray-900">{v.color} / {v.size}</p>
                              <p className="text-xs text-gray-500 font-mono">Stock actual: <span className="font-bold text-blue-600">{v.stock}</span></p>
                            </div>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
            
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}