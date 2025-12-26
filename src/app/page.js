'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // <--- IMPORTANTE: Importamos el router

export default function Home() {
  const router = useRouter(); // Inicializamos el router
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // ESTADO NUEVO: Para saber quién es el usuario conectado
  const [user, setUser] = useState(null);

  // Definimos esta función ANTES del useEffect para que no dé errores
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  // 1. EL GUARDIÁN DE SEGURIDAD (Auth Check)
  useEffect(() => {
    const checkUser = async () => {
      // Preguntamos a Supabase si hay alguien logueado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Si NO hay sesión, nos manda a la pantalla de Login
        router.push('/login');
      } else {
        // Si SÍ hay sesión, guardamos el usuario y cargamos los productos
        setUser(session.user);
        fetchProducts();
      }
    };
    
    checkUser();
  }, [router]);

  // Función para Cerrar Sesión
  const handleLogout = async () => {
    await supabase.auth.signOut(); // Borra la sesión de Supabase
    router.push('/login'); // Nos regresa al login
  };

  const handleDelete = async (id) => {
    const confirmacion = window.confirm("¿Seguro que quieres borrar este producto?");
    if (!confirmacion) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al borrar');
    } else {
      setProducts(products.filter(product => product.id !== id));
    }
  };

  // --- LÓGICA DEL BUSCADOR ---
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // ---------------------------

  // Mientras carga o verifica usuario, mostramos esto
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Verificando acceso...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      
      {/* HEADER CON INFO DE USUARIO Y LOGOUT */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inventario JANCLI</h1>
          {/* Aquí mostramos el email del usuario y el botón de salir */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
             <span>Hola, {user?.email}</span>
             <button 
               onClick={handleLogout} 
               className="text-red-500 hover:text-red-700 font-bold text-xs border border-red-200 px-2 py-0.5 rounded hover:bg-red-50 transition"
             >
               Salir
             </button>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {/* Barra de Búsqueda */}
          <div className="relative flex-grow md:flex-grow-0">
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              className="w-full md:w-64 border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-black focus:outline-none text-gray-700"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Lupa Icono */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <Link 
            href="/new" 
            className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition font-medium shadow-md whitespace-nowrap"
          >
            + Nuevo
          </Link>
        </div>
      </header>

      <main>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            {searchTerm ? (
               <p className="text-gray-500">No se encontraron productos con "{searchTerm}".</p>
            ) : (
               <p className="text-gray-500">No hay productos en el inventario.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-200 group relative flex flex-col">
                
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                  <Link
                    href={`/edit/${product.id}`}
                    className="bg-white/90 p-2 rounded-full shadow-sm text-gray-500 hover:text-blue-600 hover:bg-white transition backdrop-blur-sm"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>

                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="bg-white/90 p-2 rounded-full shadow-sm text-gray-500 hover:text-red-500 hover:bg-white transition backdrop-blur-sm"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="h-56 w-full bg-gray-100 flex items-center justify-center relative overflow-hidden">
                   {product.image_url ? (
                     <img 
                       src={product.image_url} 
                       alt={product.name} 
                       onClick={() => setSelectedImage(product.image_url)}
                       className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-500"
                     />
                   ) : (
                     <div className="text-gray-300 flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium">Sin Imagen</span>
                     </div>
                   )}
                </div>

                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-bold text-lg text-gray-800 pr-8 line-clamp-1">{product.name}</h2>
                  <p className="text-xs text-gray-400 mt-1">ID: {product.id.slice(0, 8)}</p>
                </div>

                <div className="p-5 bg-gray-50/50 flex-grow">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-gray-900">${product.price}</span>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${product.stock_quantity < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      Stock: {product.stock_quantity}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white p-2 rounded border border-gray-100">
                      <span className="block text-xs text-gray-400 font-bold uppercase">Talla</span>
                      {product.attributes?.talla || '-'}
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-100">
                      <span className="block text-xs text-gray-400 font-bold uppercase">Color</span>
                      {product.attributes?.color || '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL DE ZOOM */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl w-full max-h-screen flex flex-col items-center">
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img 
                src={selectedImage} 
                alt="Zoom Producto" 
                className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()} 
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}