'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export default function NewProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // --- DATOS DEL PRODUCTO PADRE ---
  const [mainImage, setMainImage] = useState(null);
  const [mainPreview, setMainPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: ''
  });

  // --- DATOS PARA LA NUEVA VARIANTE ---
  const [tempVariant, setTempVariant] = useState({
    size: 'UNITALLA',
    color: '',
    stock: '',
    imageFile: null,
    previewUrl: null
  });

  const [variantsList, setVariantsList] = useState([]);

  // 1. Manejo de Foto Principal
  const handleMainImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setMainImage(file);
      setMainPreview(URL.createObjectURL(file));
    }
  };

  // 2. Manejo de Foto de Variante
  const handleVariantImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setTempVariant({
        ...tempVariant,
        imageFile: file,
        previewUrl: URL.createObjectURL(file)
      });
    }
  };

  // 3. Agregar Variante a la Lista
  const addVariantToList = () => {
    if (!tempVariant.color || !tempVariant.stock) {
      toast.error("Falta color o stock");
      return;
    }

    setVariantsList([
      ...variantsList,
      { ...tempVariant, id: Date.now() }
    ]);

    setTempVariant({
      size: 'UNITALLA',
      color: '',
      stock: '',
      imageFile: null,
      previewUrl: null
    });
    
    toast.success("Variante agregada");
  };

  // 4. Quitar Variante
  const removeVariant = (idToRemove) => {
    setVariantsList(variantsList.filter(v => v.id !== idToRemove));
  };

  // --- 5. GUARDADO FINAL ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (variantsList.length === 0) {
      toast.error("Debes agregar al menos una variante (talla/color)");
      return;
    }

    if (!formData.name || !formData.price) {
        toast.error("Falta nombre o precio del producto");
        return;
    }

    setLoading(true);
    const toastId = toast.loading("Creando producto...");

    try {
      // A. SUBIR FOTO PRINCIPAL
      let mainImageUrl = null;
      if (mainImage) {
        toast.loading("Subiendo portada...", { id: toastId });
        mainImageUrl = await uploadImage(mainImage);
      }

      // B. CREAR PRODUCTO PADRE
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([{
          organization_id: '8e946838-e3c5-4d67-ae6a-5a3de423eaf8', 
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          image_url: mainImageUrl,
          is_active: true
        }])
        .select()
        .single();

      if (productError) throw productError;
      const productId = productData.id;

      // C. PROCESAR VARIANTES
      toast.loading(`Guardando ${variantsList.length} variantes...`, { id: toastId });

      for (const variant of variantsList) {
        let variantImageUrl = null;
        if (variant.imageFile) {
          variantImageUrl = await uploadImage(variant.imageFile);
        }

        const { data: variantData, error: variantError } = await supabase
          .from('product_variants')
          .insert([{
            product_id: productId,
            size: variant.size,
            color: variant.color,
            variant_image_url: variantImageUrl,
            stock: 0 
          }])
          .select()
          .single();

        if (variantError) throw variantError;

        // KARDEX INICIAL
        await supabase.from('inventory_movements').insert([{
            variant_id: variantData.id,
            movement_type: 'conteo_inicial',
            quantity: Number(variant.stock),
            reason: 'Inventario Inicial',
            user_email: 'admin@jancli.com' 
        }]);

        // ACTUALIZAR STOCK
        await supabase.from('product_variants')
            .update({ stock: Number(variant.stock) })
            .eq('id', variantData.id);
      }

      toast.success("¡Producto creado con éxito!", { id: toastId });
      router.push('/');
      router.refresh();

    } catch (error) {
      console.error(error);
      toast.error("Error: " + error.message, { id: toastId });
      setLoading(false);
    }
  };

  const uploadImage = async (file) => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
    const compressedFile = await imageCompression(file, options);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
    
    const { error } = await supabase.storage.from('products').upload(fileName, compressedFile);
    if (error) throw error;
    
    const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    return data.publicUrl;
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6 font-sans flex justify-center pb-20">
        <div className="w-full max-w-5xl">
          
          {/* HEADER CON BOTÓN VOLVER */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nuevo Producto</h1>
            <Link 
                href="/" 
                className="text-gray-500 hover:text-black font-medium text-sm flex items-center gap-1 transition"
            >
                ← Volver al inicio
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* --- COLUMNA IZQUIERDA: DATOS GENERALES --- */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <h2 className="text-lg font-bold text-gray-800">Información General</h2>
              </div>
              
              <div className="space-y-6">
                 {/* FOTO PORTADA */}
                 <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">Foto de Portada</label>
                  <div className="flex items-center gap-4">
                    <div className="h-32 w-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative hover:border-gray-400 transition cursor-pointer group">
                      {mainPreview ? (
                        <img src={mainPreview} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                            <span className="text-2xl block mb-1">📷</span>
                            <span className="text-[10px] text-gray-400 group-hover:text-gray-600">Subir</span>
                        </div>
                      )}
                      <input type="file" onChange={handleMainImageChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      Esta será la imagen principal<br/>que verán tus clientes en el catálogo.
                    </div>
                  </div>
                 </div>

                 {/* NOMBRE */}
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">Nombre del Modelo</label>
                   <input 
                      type="text" 
                      placeholder="Ej. Sudadera Polar Premium" 
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded-lg focus:ring-2 focus:ring-black focus:bg-white outline-none transition"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                   />
                 </div>

                 {/* PRECIO */}
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">Precio ($)</label>
                   <input 
                      type="number" 
                      placeholder="0.00" 
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded-lg focus:ring-2 focus:ring-black focus:bg-white outline-none transition font-mono"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                   />
                 </div>

                 {/* DESCRIPCIÓN */}
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">Descripción (Opcional)</label>
                   <textarea 
                      rows="3"
                      placeholder="Detalles de la tela, corte, cuidados..." 
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded-lg focus:ring-2 focus:ring-black focus:bg-white outline-none text-sm transition"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                   />
                 </div>
              </div>
            </div>

            {/* --- COLUMNA DERECHA: VARIANTES --- */}
            <div className="space-y-6">
              
              {/* FORMULARIO AGREGAR VARIANTE */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex items-center gap-2 mb-6">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <h2 className="text-lg font-bold text-gray-800">Agregar Variantes</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                     <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Talla</label>
                     <select 
                        className="w-full border border-gray-200 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={tempVariant.size}
                        onChange={e => setTempVariant({...tempVariant, size: e.target.value})}
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
                        value={tempVariant.color}
                        onChange={e => setTempVariant({...tempVariant, color: e.target.value})}
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
                        value={tempVariant.stock}
                        onChange={e => setTempVariant({...tempVariant, stock: e.target.value})}
                     />
                  </div>
                  
                  {/* FOTO ESPECÍFICA */}
                  <div className="relative">
                     <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Foto (Opcional)</label>
                     <div className="flex items-center gap-2 border border-gray-200 p-2 rounded-lg bg-gray-50 cursor-pointer relative hover:bg-gray-100 transition h-[42px]">
                        {tempVariant.previewUrl ? (
                           <img src={tempVariant.previewUrl} className="w-6 h-6 rounded object-cover shadow-sm" />
                        ) : (
                           <span className="text-gray-400 text-xs">📷</span>
                        )}
                        <span className="text-xs text-gray-600 truncate flex-1 font-medium">
                          {tempVariant.imageFile ? "Lista" : "Subir Foto"}
                        </span>
                        <input type="file" onChange={handleVariantImageChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                     </div>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={addVariantToList}
                  className="w-full bg-blue-50 text-blue-700 border border-blue-100 py-3 rounded-xl font-bold text-sm hover:bg-blue-100 hover:shadow-sm transition flex items-center justify-center gap-2"
                >
                  <span>+</span> Agregar Variante
                </button>
              </div>

              {/* LISTA DE VARIANTES AGREGADAS */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex justify-between">
                   <span>Lista de Variantes</span>
                   <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{variantsList.length}</span>
                 </h3>

                 {variantsList.length === 0 ? (
                   <div className="text-center py-8 text-gray-300 text-sm border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                     Aún no hay variantes.<br/>Agrega tallas y colores arriba.
                   </div>
                 ) : (
                   <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {variantsList.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                          <div className="flex items-center gap-4">
                             {v.previewUrl ? (
                               <img src={v.previewUrl} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                             ) : (
                               <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-bold">Sin<br/>Foto</div>
                             )}
                             <div>
                               <p className="text-sm font-bold text-gray-900">{v.color} / {v.size}</p>
                               <p className="text-xs text-gray-500 font-mono">Stock: {v.stock}</p>
                             </div>
                          </div>
                          <button onClick={() => removeVariant(v.id)} className="text-gray-300 hover:text-red-500 p-2 transition">
                            ✕
                          </button>
                        </div>
                      ))}
                   </div>
                 )}
              </div>

              {/* BOTÓN FINAL */}
              <button 
                onClick={handleSubmit}
                disabled={loading || variantsList.length === 0}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-900 hover:shadow-xl hover:scale-[1.02] transition transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Guardando...' : '💾 GUARDAR PRODUCTO'}
              </button>

            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}