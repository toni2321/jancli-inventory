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
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [productName, setProductName] = useState('');
  const [existingVariants, setExistingVariants] = useState([]);

  const TALLAS_DISPONIBLES = ['UNITALLA', 'XCH', 'CH', 'M', 'G', 'XG', 'XXG'];
  
  // --- NUEVO ESTADO: COLORES DESDE LA BASE DE DATOS ---
  const [dbColors, setDbColors] = useState([]);

  const [newVariant, setNewVariant] = useState({
    size: 'UNITALLA',
    color: '',
    stock: '',
    imageFile: null,
    previewUrl: null
  });

  const [adjustModal, setAdjustModal] = useState({
    isOpen: false, variant: null, movementType: 'entrada', quantity: '', reason: ''
  });
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [editModal, setEditModal] = useState({
    isOpen: false, variantId: null, size: '', color: '', imageFile: null, previewUrl: null, currentImageUrl: null
  });
  const [isEditing, setIsEditing] = useState(false);

  const [massModal, setMassModal] = useState(false);
  const [isMassSaving, setIsMassSaving] = useState(false);
  const [massReason, setMassReason] = useState('Ingreso de Taller / Proveedor');
  const [massRows, setMassRows] = useState([
    { color: '', UNITALLA: '', XCH: '', CH: '', M: '', G: '', XG: '', XXG: '' }
  ]);

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    variant: null,
    movements: [],
    loading: false
  });

  // --- NUEVA FUNCIÓN: CARGAR COLORES ---
  const fetchColors = async () => {
    const { data, error } = await supabase
      .from('colors')
      .select('name')
      .order('name', { ascending: true });
    
    if (data && !error) {
      setDbColors(data.map(c => c.name));
    }
  };

  const fetchProductAndVariants = async () => {
    const { data: productData } = await supabase.from('products').select('name').eq('id', id).single();
    if (productData) setProductName(productData.name);

    const { data: variantsData } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (variantsData) setExistingVariants(variantsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchProductAndVariants();
    fetchColors(); // <-- Llamamos a los colores al entrar
  }, [id]);

  // --- NUEVA FUNCIÓN: AGREGAR COLOR AL CATÁLOGO ---
  const handleAddNewColor = async () => {
    const newColor = window.prompt("Ingresa el nombre del nuevo color (Ej. Amarillo):");
    if (!newColor || !newColor.trim()) return;

    // Formateamos para que siempre la primera letra sea mayúscula
    const colorName = newColor.trim();
    const formattedColor = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();

    const toastId = toast.loading("Guardando color en la base de datos...");

    try {
      const { error } = await supabase.from('colors').insert([{ name: formattedColor }]);
      
      if (error) {
        // Error '23505' es el código SQL para "Valor Duplicado" (Violación del UNIQUE)
        if (error.code === '23505') throw new Error("Este color ya existe en tu catálogo.");
        throw error;
      }

      toast.success(`Color "${formattedColor}" agregado con éxito`, { id: toastId });
      fetchColors(); // Recargamos la lista automáticamente
    } catch (error) {
      toast.error(error.message, { id: toastId });
    }
  };

  const uploadImage = async (file) => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
    const compressedFile = await imageCompression(file, options);
    const fileName = `variant-${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
    const { error } = await supabase.storage.from('products').upload(fileName, compressedFile);
    if (error) throw error;
    const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const openHistoryModal = async (variant) => {
    setHistoryModal({ isOpen: true, variant, movements: [], loading: true });
    
    const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('variant_id', variant.id)
        .order('created_at', { ascending: false });

    if (!error && data) {
        setHistoryModal({ isOpen: true, variant, movements: data, loading: false });
    } else {
        toast.error("No se pudo cargar el historial.");
        setHistoryModal({ isOpen: true, variant, movements: [], loading: false });
    }
  };

  // 1. GUARDAR NUEVA VARIANTE
  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!newVariant.color || !newVariant.stock) {
      toast.error("El color y el stock inicial son obligatorios.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Verificando...");

    try {
      const { data: duplicateCheck } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id)
        .eq('size', newVariant.size)
        .ilike('color', newVariant.color)
        .single();

      if (duplicateCheck) {
        toast.error(`Ya existe la talla ${newVariant.size} en color ${newVariant.color}. Usa "Ajustar Stock".`, { id: toastId });
        setSaving(false);
        return; 
      }

      toast.loading("Guardando variante...", { id: toastId });
      let imageUrl = null;
      if (newVariant.imageFile) {
        imageUrl = await uploadImage(newVariant.imageFile);
      }

      const { data: variantData, error: variantError } = await supabase
        .from('product_variants')
        .insert([{
          product_id: id,
          size: newVariant.size,
          color: newVariant.color,
          variant_image_url: imageUrl,
          stock: Number(newVariant.stock)
        }]).select().single();

      if (variantError) throw variantError;

      await supabase.from('inventory_movements').insert([{
        variant_id: variantData.id,
        movement_type: 'conteo_inicial',
        quantity: Number(newVariant.stock),
        reason: 'Alta inicial',
        user_email: 'admin@jancli.com' 
      }]);

      toast.success("¡Variante agregada!", { id: toastId });
      setNewVariant({ size: 'UNITALLA', color: '', stock: '', imageFile: null, previewUrl: null });
      fetchProductAndVariants();

    } catch (error) {
      toast.error("Error: " + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // 2. AJUSTE DE STOCK (KARDEX)
  const submitStockAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustModal.quantity || Number(adjustModal.quantity) <= 0) {
        toast.error("Ingresa una cantidad válida mayor a 0");
        return;
    }
    if (!adjustModal.reason.trim()) {
        toast.error("Debes ingresar un motivo");
        return;
    }

    setIsAdjusting(true);
    const toastId = toast.loading("Registrando movimiento...");
    const qtyToAdjust = Number(adjustModal.quantity);

    try {
        let newCalculatedStock = adjustModal.variant.stock;
        
        if (adjustModal.movementType === 'entrada') {
            newCalculatedStock += qtyToAdjust;
        } else if (adjustModal.movementType === 'salida') {
            if (qtyToAdjust > newCalculatedStock) {
                toast.error("No puedes sacar más stock del que existe", { id: toastId });
                setIsAdjusting(false);
                return;
            }
            newCalculatedStock -= qtyToAdjust;
        }

        const { error: updateError } = await supabase
            .from('product_variants')
            .update({ stock: newCalculatedStock })
            .eq('id', adjustModal.variant.id);
        
        if (updateError) throw updateError;

        const { error: moveError } = await supabase
            .from('inventory_movements')
            .insert([{
                variant_id: adjustModal.variant.id,
                movement_type: adjustModal.movementType,
                quantity: qtyToAdjust,
                reason: adjustModal.reason.trim(),
                user_email: 'admin@jancli.com'
            }]);
        
        if (moveError) throw moveError;

        toast.success("Inventario actualizado correctamente", { id: toastId });
        setAdjustModal({ isOpen: false, variant: null, movementType: 'entrada', quantity: '', reason: '' });
        fetchProductAndVariants();

    } catch (error) {
        toast.error("Error al actualizar: " + error.message, { id: toastId });
    } finally {
        setIsAdjusting(false);
    }
  };

  // 3. EDITAR INFORMACIÓN DE LA VARIANTE
  const openEditModal = (v) => {
    setEditModal({
      isOpen: true,
      variantId: v.id,
      size: v.size,
      color: v.color,
      imageFile: null,
      previewUrl: null,
      currentImageUrl: v.variant_image_url
    });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditModal({ ...editModal, imageFile: file, previewUrl: URL.createObjectURL(file) });
    }
  };

  const submitEditVariant = async (e) => {
    e.preventDefault();
    if (!editModal.color) {
      toast.error("Debes seleccionar un color.");
      return;
    }

    setIsEditing(true);
    const toastId = toast.loading("Verificando datos...");

    try {
      const { data: duplicateCheck } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id)
        .eq('size', editModal.size)
        .ilike('color', editModal.color)
        .neq('id', editModal.variantId) 
        .single();

      if (duplicateCheck) {
        toast.error(`Ya existe otra variante con talla ${editModal.size} y color ${editModal.color}.`, { id: toastId });
        setIsEditing(false);
        return; 
      }

      toast.loading("Actualizando...", { id: toastId });
      
      let imageUrl = editModal.currentImageUrl;
      if (editModal.imageFile) {
        imageUrl = await uploadImage(editModal.imageFile);
      }

      const { error } = await supabase
        .from('product_variants')
        .update({
          size: editModal.size,
          color: editModal.color,
          variant_image_url: imageUrl
        })
        .eq('id', editModal.variantId);

      if (error) throw error;

      toast.success("Variante editada correctamente", { id: toastId });
      setEditModal({ ...editModal, isOpen: false });
      fetchProductAndVariants();

    } catch (error) {
      toast.error("Error al editar: " + error.message, { id: toastId });
    } finally {
      setIsEditing(false);
    }
  };

  // 4. FUNCIONES PARA INGRESO MASIVO
  const addMassRow = () => {
    setMassRows([...massRows, { color: '', UNITALLA: '', XCH: '', CH: '', M: '', G: '', XG: '', XXG: '' }]);
  };

  const handleMassRowChange = (index, field, value) => {
    const newRows = [...massRows];
    newRows[index][field] = value;
    setMassRows(newRows);
  };

  const submitMassEntry = async (e) => {
    e.preventDefault();
    if (!massReason.trim()) {
      toast.error("Debes ingresar un motivo/referencia (Ej. Lote #123)");
      return;
    }

    setIsMassSaving(true);
    const toastId = toast.loading("Procesando matriz de mercancía...");

    try {
      for (const row of massRows) {
        const color = row.color;
        if (!color) continue; 

        for (const size of TALLAS_DISPONIBLES) {
          const qty = Number(row[size]);
          
          if (qty > 0) {
            const { data: existingVariant } = await supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', id)
              .eq('size', size)
              .ilike('color', color)
              .single();

            let targetVariantId;

            if (existingVariant) {
              const newStock = existingVariant.stock + qty;
              await supabase.from('product_variants').update({ stock: newStock }).eq('id', existingVariant.id);
              targetVariantId = existingVariant.id;
            } else {
              const { data: newVariantData, error: insertError } = await supabase
                .from('product_variants')
                .insert([{ product_id: id, size: size, color: color, stock: qty }])
                .select().single();
              
              if (insertError) throw insertError;
              targetVariantId = newVariantData.id;
            }

            await supabase.from('inventory_movements').insert([{
              variant_id: targetVariantId,
              movement_type: existingVariant ? 'entrada' : 'conteo_inicial',
              quantity: qty,
              reason: massReason.trim(),
              user_email: 'admin@jancli.com' 
            }]);
          }
        }
      }

      toast.success("Ingreso de mercancía completado con éxito", { id: toastId });
      setMassModal(false);
      setMassRows([{ color: '', UNITALLA: '', XCH: '', CH: '', M: '', G: '', XG: '', XXG: '' }]);
      setMassReason('Ingreso de Taller / Proveedor');
      fetchProductAndVariants();

    } catch (error) {
      toast.error("Error en el ingreso masivo: " + error.message, { id: toastId });
    } finally {
      setIsMassSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-900">Cargando datos... ⏳</div>;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6 font-sans flex justify-center pb-20 relative">
        <div className="w-full max-w-5xl">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Administrar Variantes e Inventario</h1>
                <p className="text-gray-500 text-sm mt-1">Producto: <span className="font-bold text-black">{productName}</span></p>
            </div>
            
            <div className="flex gap-3">
                <button 
                  onClick={() => setMassModal(true)}
                  className="bg-green-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-green-700 shadow-md transition flex items-center gap-2"
                >
                  📦 Ingreso Masivo
                </button>
                <Link href="/" className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition flex items-center">
                    ← Volver al catálogo
                </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMNA IZQ: AGREGAR NUEVA VARIANTE */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
              <div className="flex items-center gap-2 mb-6 border-b pb-4">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">+</span>
                  <h2 className="text-base font-bold text-gray-800">Dar de alta variante</h2>
              </div>
              
              <form onSubmit={handleAddVariant} className="space-y-4">
                  <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Talla</label>
                      <select 
                        className="w-full border border-gray-200 p-2.5 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newVariant.size}
                        onChange={e => setNewVariant({...newVariant, size: e.target.value})}
                      >
                        {TALLAS_DISPONIBLES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                  </div>

                  {/* CAMBIO: Selector de colores dinamico + Botón Nuevo */}
                  <div>
                      <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">Color</label>
                          <button type="button" onClick={handleAddNewColor} className="text-[10px] font-bold text-blue-500 hover:text-blue-700">+ Nuevo Color</button>
                      </div>
                      <select 
                        className="w-full border border-gray-200 p-2.5 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newVariant.color}
                        onChange={e => setNewVariant({...newVariant, color: e.target.value})}
                      >
                        <option value="">Selecciona un color...</option>
                        {dbColors.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                  </div>

                  <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stock Inicial</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full border border-gray-200 p-2.5 rounded-lg text-sm text-gray-900 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newVariant.stock}
                        onChange={e => setNewVariant({...newVariant, stock: e.target.value})}
                      />
                  </div>
                  
                  <div className="relative">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Foto Específica (Opcional)</label>
                      <div className="flex items-center gap-2 border border-gray-200 p-2 rounded-lg bg-gray-50 cursor-pointer relative hover:bg-gray-100 transition h-[42px]">
                        {newVariant.previewUrl ? (
                            <img src={newVariant.previewUrl} className="w-6 h-6 rounded object-cover shadow-sm" />
                        ) : (
                            <span className="text-gray-400 text-xs">📷</span>
                        )}
                        <span className="text-xs text-gray-600 truncate flex-1 font-medium">
                          {newVariant.imageFile ? "Lista" : "Subir Foto"}
                        </span>
                        <input type="file" onChange={(e) => {
                          const file = e.target.files[0];
                          if(file) setNewVariant({...newVariant, imageFile: file, previewUrl: URL.createObjectURL(file)});
                        }} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </div>
                  </div>

                  <button type="submit" disabled={saving} className="w-full bg-black text-white py-3 mt-4 rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50">
                    {saving ? 'Verificando y Guardando...' : 'Guardar Variante'}
                  </button>
              </form>
            </div>

            {/* COLUMNA DER: VARIANTES Y KARDEX */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex justify-between items-center border-b pb-4">
                 <span>Inventario Actual</span>
                 <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{existingVariants.length} registradas</span>
               </h3>

               {existingVariants.length === 0 ? (
                 <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                   Este producto aún no tiene variantes registradas.<br/>Usa el formulario de la izquierda.
                 </div>
               ) : (
                 <div className="space-y-4">
                    {existingVariants.map((v) => (
                      <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition gap-4">
                        <div className="flex items-center gap-4">
                            {v.variant_image_url ? (
                              <img src={v.variant_image_url} className="w-14 h-14 rounded-lg object-cover border border-gray-200 shadow-sm" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200">Sin<br/>Foto</div>
                            )}
                            <div>
                              <p className="text-base font-bold text-gray-900">{v.color}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{v.size}</span>
                                <span className={`text-xs font-bold ${v.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    Stock: {v.stock}
                                </span>
                              </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                             onClick={() => openHistoryModal(v)}
                             className="bg-gray-50 text-gray-600 border border-gray-200 p-2 rounded-lg hover:bg-gray-200 hover:text-black transition flex items-center justify-center"
                             title="Ver Historial"
                           >
                              🕒
                           </button>
                           <button 
                             onClick={() => openEditModal(v)}
                             className="bg-gray-50 text-gray-600 border border-gray-200 p-2 rounded-lg hover:bg-gray-100 hover:text-black transition flex items-center justify-center"
                             title="Editar Info"
                           >
                              ✏️
                           </button>

                           <button 
                             onClick={() => setAdjustModal({ isOpen: true, variant: v, movementType: 'entrada', quantity: '', reason: '' })}
                             className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1 w-full sm:w-auto justify-center"
                           >
                              📦 Ajustar Stock
                           </button>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
            
          </div>
        </div>

        {/* --- MODAL DE EDICIÓN DE VARIANTE --- */}
        {editModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Editar Variante</h3>
                        <button onClick={() => setEditModal({...editModal, isOpen: false})} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
                    </div>
                    
                    <form onSubmit={submitEditVariant} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Talla</label>
                            <select 
                                className="w-full border border-gray-300 p-3 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-black outline-none"
                                value={editModal.size}
                                onChange={e => setEditModal({...editModal, size: e.target.value})}
                            >
                                {TALLAS_DISPONIBLES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* CAMBIO: Selector de colores dinamico */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-gray-600">Color</label>
                                <button type="button" onClick={handleAddNewColor} className="text-xs font-bold text-blue-500 hover:text-blue-700">+ Nuevo Color</button>
                            </div>
                            <select 
                                className="w-full border border-gray-300 p-3 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-black outline-none"
                                value={editModal.color}
                                onChange={e => setEditModal({...editModal, color: e.target.value})}
                            >
                                <option value="">Selecciona un color...</option>
                                {dbColors.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Cambiar Foto</label>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
                                    {editModal.previewUrl ? (
                                        <img src={editModal.previewUrl} className="w-full h-full object-cover"/>
                                    ) : editModal.currentImageUrl ? (
                                        <img src={editModal.currentImageUrl} className="w-full h-full object-cover"/>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Sin foto</span>
                                    )}
                                </div>
                                <div className="relative flex-1">
                                    <div className="w-full border border-gray-300 p-2 rounded-lg text-xs text-gray-600 bg-white text-center cursor-pointer hover:bg-gray-50 transition">
                                        Seleccionar nueva foto
                                    </div>
                                    <input type="file" onChange={handleEditImageChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isEditing}
                            className="w-full bg-black text-white py-3.5 mt-2 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 shadow-md"
                        >
                            {isEditing ? 'Guardando cambios...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* --- MODAL DE AJUSTE DE INVENTARIO (Kardex) --- */}
        {adjustModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Ajustar Inventario</h3>
                        <button onClick={() => setAdjustModal({...adjustModal, isOpen: false})} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
                    </div>
                    
                    <form onSubmit={submitStockAdjustment} className="p-6 space-y-5">
                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded shadow-sm border border-gray-100 overflow-hidden flex items-center justify-center text-xs">
                                {adjustModal.variant.variant_image_url ? <img src={adjustModal.variant.variant_image_url} className="w-full h-full object-cover"/> : '📷'}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{productName} - {adjustModal.variant.color}</p>
                                <p className="text-xs text-gray-500">Talla: {adjustModal.variant.size} | Stock Actual: <span className="font-bold text-black">{adjustModal.variant.stock}</span></p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                type="button"
                                onClick={() => setAdjustModal({...adjustModal, movementType: 'entrada'})}
                                className={`py-2 rounded-lg text-sm font-bold border transition ${adjustModal.movementType === 'entrada' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                📈 Entrada
                            </button>
                            <button 
                                type="button"
                                onClick={() => setAdjustModal({...adjustModal, movementType: 'salida'})}
                                className={`py-2 rounded-lg text-sm font-bold border transition ${adjustModal.movementType === 'salida' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                📉 Salida
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Cantidad de piezas</label>
                            <input 
                                type="number" 
                                min="1"
                                placeholder="Ej. 10" 
                                className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 bg-white font-bold focus:ring-2 focus:ring-black outline-none"
                                value={adjustModal.quantity}
                                onChange={e => setAdjustModal({...adjustModal, quantity: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Motivo / Justificación</label>
                            <input 
                                type="text" 
                                placeholder="Ej. Llegó mercancía, Merma..." 
                                className="w-full border border-gray-300 p-3 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-black outline-none"
                                value={adjustModal.reason}
                                onChange={e => setAdjustModal({...adjustModal, reason: e.target.value})}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isAdjusting}
                            className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 shadow-md"
                        >
                            {isAdjusting ? 'Guardando...' : 'Confirmar Ajuste'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* --- MODAL DE INGRESO MASIVO --- */}
        {massModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="bg-green-600 p-4 border-b border-green-700 flex justify-between items-center text-white">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">📦 Ingreso Masivo de Mercancía</h3>
                    <p className="text-green-100 text-xs">Captura rápida de corte / lote. Registra múltiples colores y tallas a la vez.</p>
                  </div>
                  <button onClick={() => setMassModal(false)} className="text-white hover:text-green-200 font-bold text-xl">✕</button>
              </div>
              
              <div className="p-4 flex-grow overflow-y-auto bg-gray-50">
                <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-xs font-bold text-gray-600 mb-2">Referencia / Motivo del Ingreso (Para el Kardex)</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Entrega de taller central, Lote #455..." 
                      className="w-full border border-gray-300 p-3 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500 outline-none font-medium"
                      value={massReason}
                      onChange={e => setMassReason(e.target.value)}
                    />
                </div>

                {/* BOTÓN PARA AGREGAR COLORES DESDE LA MATRIZ */}
                <div className="flex justify-between items-center mb-2 px-1">
                    <label className="block text-xs font-bold text-gray-600">Detalle de Mercancía</label>
                    <button type="button" onClick={handleAddNewColor} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition shadow-sm">
                        + Agregar Nuevo Color al Catálogo
                    </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-gray-500 uppercase bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-bold w-48">Color</th>
                        {TALLAS_DISPONIBLES.map(t => <th key={t} className="px-2 py-3 font-bold text-center w-20">{t}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {massRows.map((row, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-2 py-2">
                            {/* CAMBIO: Selector de colores dinamico */}
                            <select 
                              className="w-full border border-gray-300 p-2 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                              value={row.color}
                              onChange={(e) => handleMassRowChange(index, 'color', e.target.value)}
                            >
                              <option value="">Elegir...</option>
                              {dbColors.map(c => (
                                  <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          {TALLAS_DISPONIBLES.map(talla => (
                            <td key={talla} className="px-1 py-2">
                              <input 
                                type="number" 
                                placeholder="0" 
                                min="0"
                                className="w-full border border-gray-300 p-2 rounded-md text-center text-sm font-bold text-gray-900 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                                value={row[talla]}
                                onChange={(e) => handleMassRowChange(index, talla, e.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-start">
                  <button type="button" onClick={addMassRow} className="text-green-600 font-bold text-sm bg-green-50 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-100 transition">
                    + Agregar otra fila
                  </button>
                </div>
              </div>

              <div className="bg-white p-4 border-t border-gray-200 flex justify-end gap-3">
                 <button onClick={() => setMassModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                 <button onClick={submitMassEntry} disabled={isMassSaving} className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg disabled:opacity-50 transition">
                    {isMassSaving ? 'Guardando en Kardex...' : '✅ Guardar Ingreso Completo'}
                 </button>
              </div>

            </div>
          </div>
        )}

{historyModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">🕒 Historial de Movimientos</h3>
                          {historyModal.variant && (
                            <p className="text-xs text-gray-500 mt-1">
                              Variante: <span className="font-bold text-black">{historyModal.variant.color} - {historyModal.variant.size}</span>
                            </p>
                          )}
                        </div>
                        <button onClick={() => setHistoryModal({isOpen: false, variant: null, movements: [], loading: false})} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
                    </div>
                    
                    <div className="p-0 flex-grow overflow-y-auto bg-white">
                        {historyModal.loading ? (
                            <div className="p-10 text-center text-sm text-gray-500 animate-pulse">Cargando registros...</div>
                        ) : historyModal.movements.length === 0 ? (
                            <div className="p-10 text-center text-sm text-gray-500">No hay movimientos registrados para esta variante.</div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 border-b border-gray-200 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">Fecha / Hora</th>
                                        <th className="px-4 py-3 font-bold">Tipo</th>
                                        <th className="px-4 py-3 font-bold text-center">Cant.</th>
                                        <th className="px-4 py-3 font-bold">Motivo / Usuario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyModal.movements.map((mov) => {
                                        const dateObj = new Date(mov.created_at);
                                        const dateString = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                                        const timeString = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                        
                                        let badgeColor = "bg-gray-100 text-gray-600";
                                        let sign = "";
                                        if (mov.movement_type === 'entrada' || mov.movement_type === 'conteo_inicial') {
                                            badgeColor = "bg-green-100 text-green-700 border-green-200";
                                            sign = "+";
                                        } else if (mov.movement_type === 'salida' || mov.movement_type === 'venta') {
                                            badgeColor = "bg-red-100 text-red-700 border-red-200";
                                            sign = "-";
                                        }

                                        return (
                                            <tr key={mov.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-600">
                                                    <div className="font-medium text-gray-900">{dateString}</div>
                                                    <div className="text-[10px]">{timeString}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase border ${badgeColor}`}>
                                                        {mov.movement_type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-gray-900">{sign}{mov.quantity}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-gray-900 text-xs font-medium">{mov.reason || 'Sin justificación'}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">{mov.user_email || 'Sistema'}</div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
                        <button onClick={() => setHistoryModal({isOpen: false, variant: null, movements: [], loading: false})} className="px-6 py-2 rounded-lg font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 transition">Cerrar</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </AdminGuard>
  );
}