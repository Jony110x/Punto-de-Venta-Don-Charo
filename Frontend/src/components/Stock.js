/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Search, ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from 'lucide-react';
import { getProductos, getCategorias, createProducto, updateProducto, deleteProducto, actualizarPreciosMasivo, getProductosIdsFiltrados } from '../api/api';
import ProductoForm from './ProductoForm';
import { useToast } from '../Toast';

const Stock = () => {
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [productoEdit, setProductoEdit] = useState(null);
  const [filtrosColapsados, setFiltrosColapsados] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const toast = useToast();
  
  // Estados de paginación
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  
  // Estados de filtros
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [categorias, setCategorias] = useState(['todas']);
  
  // Estados para autocompletado de categorías
  const [categoriaInputFiltro, setCategoriaInputFiltro] = useState('');
  const [mostrarSugerenciasFiltro, setMostrarSugerenciasFiltro] = useState(false);
  const inputCategoriaFiltroRef = useRef(null);
  const sugerenciasFiltroRef = useRef(null);
  
  // Estados para actualización masiva
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [showModalActualizacionMasiva, setShowModalActualizacionMasiva] = useState(false);
  const [porcentajeAumento, setPorcentajeAumento] = useState('');
  const [aplicandoActualizacion, setAplicandoActualizacion] = useState(false);
  
  // Refs para control de peticiones y scroll infinito
  const observerRef = useRef();
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  // Anchos fijos de columnas para tabla
  const COLUMN_WIDTHS = {
  checkbox: '50px',
  producto: '25%',
  categoria: '12%',
  precioCosto: '10%',
  precioVenta: '10%',
  margen: '10%',
  stock: '8%',
  estado: '10%',
  acciones: '120px'  
};

  // Debounce para búsqueda
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (busqueda.trim() === '') {
      setBusquedaDebounced('');
      return;
    }

    const valorActual = busqueda;
    
    debounceTimerRef.current = setTimeout(() => {
      setBusquedaDebounced(valorActual);
      debounceTimerRef.current = null;
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [busqueda]);

  // Cargar categorías al iniciar
  useEffect(() => {
    cargarCategorias();
  }, []);

  // Recargar productos cuando cambian los filtros
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setProductos([]);
    setSkip(0);
    setHasMore(true);
    setProductosSeleccionados([]); // Limpiar selección al cambiar filtros
    
    cargarProductos(0, true);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [busquedaDebounced, filtroCategoria, filtroEstado]);

  const cargarCategorias = async () => {
    try {
      const response = await getCategorias();
      setCategorias(['todas', ...response.data]);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const handleCategoriaFiltroChange = (e) => {
    const valor = e.target.value;
    setCategoriaInputFiltro(valor);
    
    if (valor.trim() === '') {
      setFiltroCategoria('todas');
      setMostrarSugerenciasFiltro(false);
      return;
    }

    setMostrarSugerenciasFiltro(true);
  };

  const seleccionarCategoriaFiltro = (categoria) => {
    setCategoriaInputFiltro(categoria === 'todas' ? '' : categoria);
    setFiltroCategoria(categoria);
    setMostrarSugerenciasFiltro(false);
  };

  // Filtrar categorías según input
  const categoriasFiltradas = categorias.filter(cat => {
    if (!categoriaInputFiltro.trim()) return true;
    if (cat === 'todas') return 'todas las categorías'.includes(categoriaInputFiltro.toLowerCase());
    return cat.toLowerCase().includes(categoriaInputFiltro.toLowerCase());
  }).sort((a, b) => {
    if (a === 'todas') return -1;
    if (b === 'todas') return 1;
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
  });

  // Cerrar dropdown de categorías
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sugerenciasFiltroRef.current &&
        !sugerenciasFiltroRef.current.contains(event.target) &&
        inputCategoriaFiltroRef.current &&
        !inputCategoriaFiltroRef.current.contains(event.target)
      ) {
        setMostrarSugerenciasFiltro(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar productos con paginación
  const cargarProductos = async (skipValue, reset = false) => {
    const currentSkip = skipValue !== undefined ? skipValue : skip;
    
    if (!hasMore && !reset) return;
    
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = {
        skip: currentSkip,
        limit: LIMIT,
        ...(busquedaDebounced && { busqueda: busquedaDebounced }),
        ...(filtroCategoria !== 'todas' && { categoria: filtroCategoria }),
        ...(filtroEstado !== 'todos' && { estado_stock: filtroEstado })
      };

      const response = await getProductos(params);
      
      if (thisRequestId !== requestIdRef.current) {
        return;
      }
      
      const { productos: nuevosProductos, total: totalProductos, has_more } = response.data;

      if (reset) {
        setProductos(nuevosProductos);
        setSkip(LIMIT);
      } else {
        setProductos(prev => [...prev, ...nuevosProductos]);
        setSkip(currentSkip + LIMIT);
      }
      
      setTotal(totalProductos);
      setHasMore(has_more);

    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
        console.error('Error cargando productos:', error);
        toast.error('Error al cargar productos');
      }
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Intersection Observer para scroll infinito
  const lastProductRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        cargarProductos(skip, false);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, skip]);

  const handleCrearProducto = async (data) => {
    try {
      await createProducto(data);
      toast.success('Producto creado exitosamente');
      setShowForm(false);
      setProductos([]);
      setSkip(0);
      setHasMore(true);
      cargarProductos(0, true);
    } catch (error) {
      console.error('Error creando producto:', error);
      toast.error('Error al crear producto');
    }
  };

  const handleActualizarProducto = async (data) => {
    try {
      await updateProducto(productoEdit.id, data);
      toast.success('Producto actualizado exitosamente');
      setShowForm(false);
      setProductoEdit(null);
      setProductos([]);
      setSkip(0);
      setHasMore(true);
      cargarProductos(0, true);
    } catch (error) {
      console.error('Error actualizando producto:', error);
      toast.error('Error al actualizar producto');
    }
  };

  const confirmarEliminarProducto = (producto) => {
    setProductoAEliminar(producto);
    setShowDeleteModal(true);
  };

  const handleEliminarProducto = async () => {
    if (!productoAEliminar) return;
    
    try {
      await deleteProducto(productoAEliminar.id);
      toast.success('Producto eliminado exitosamente');
      setShowDeleteModal(false);
      setProductoAEliminar(null);
      setProductos([]);
      setSkip(0);
      setHasMore(true);
      cargarProductos(0, true);
    } catch (error) {
      console.error('Error eliminando producto:', error);
      toast.error('Error al eliminar producto');
    }
  };

  // Funciones de selección múltiple
  const toggleSeleccionarProducto = (productoId) => {
    setProductosSeleccionados(prev => {
      if (prev.includes(productoId)) {
        return prev.filter(id => id !== productoId);
      } else {
        return [...prev, productoId];
      }
    });
  };

  // Nuevo estado para tracking
const [seleccionandoTodos, setSeleccionandoTodos] = useState(false);

// Función mejorada para seleccionar todos
const toggleSeleccionarTodos = async () => {
  // Si ya hay productos seleccionados, deseleccionar todos
  if (productosSeleccionados.length > 0) {
    setProductosSeleccionados([]);
    return;
  }

  // Seleccionar todos los productos filtrados
  try {
    setSeleccionandoTodos(true);
    
    const params = {
      ...(busquedaDebounced && { busqueda: busquedaDebounced }),
      ...(filtroCategoria !== 'todas' && { categoria: filtroCategoria }),
      ...(filtroEstado !== 'todos' && { estado_stock: filtroEstado })
    };

    const response = await getProductosIdsFiltrados(params);
    setProductosSeleccionados(response.data);
    
    toast.success(`${response.data.length} productos seleccionados`);
  } catch (error) {
    console.error('Error seleccionando todos los productos:', error);
    toast.error('Error al seleccionar productos');
  } finally {
    setSeleccionandoTodos(false);
  }
};


  // Abrir modal de actualización masiva
  const abrirModalActualizacionMasiva = () => {
    if (productosSeleccionados.length === 0) {
      toast.warning('Debe seleccionar al menos un producto');
      return;
    }
    setPorcentajeAumento('');
    setShowModalActualizacionMasiva(true);
  };

  // Aplicar actualización masiva
  const aplicarActualizacionMasiva = async () => {
    const porcentaje = parseFloat(porcentajeAumento);
    
    if (isNaN(porcentaje)) {
      toast.error('Ingrese un porcentaje válido');
      return;
    }

    if (porcentaje < -50) {
      toast.error('El porcentaje no puede ser menor a -50%');
      return;
    }

    if (porcentaje > 200) {
      toast.error('El porcentaje no puede ser mayor a 200%');
      return;
    }

    try {
      setAplicandoActualizacion(true);
      
      const response = await actualizarPreciosMasivo({
        producto_ids: productosSeleccionados,
        porcentaje_aumento: porcentaje
      });

      toast.success(response.data.message);
      setShowModalActualizacionMasiva(false);
      setProductosSeleccionados([]);
      setPorcentajeAumento('');
      
      // Recargar productos
      setProductos([]);
      setSkip(0);
      setHasMore(true);
      cargarProductos(0, true);

    } catch (error) {
      console.error('Error en actualización masiva:', error);
      toast.error(error.response?.data?.detail || 'Error al actualizar productos');
    } finally {
      setAplicandoActualizacion(false);
    }
  };

  // Calcular preview de cambios
  const productosConCambios = productos
    .filter(p => productosSeleccionados.includes(p.id))
    .map(p => {
      const porcentaje = parseFloat(porcentajeAumento) || 0;
      const nuevoPrecioCosto = p.precio_costo * (1 + porcentaje / 100);
      const nuevoPrecioVenta = nuevoPrecioCosto * (1 + p.margen_porcentaje / 100);
      
      return {
        ...p,
        nuevo_precio_costo: nuevoPrecioCosto,
        nuevo_precio_venta: nuevoPrecioVenta
      };
    });

  const getEstadoStock = (producto) => {
    if (producto.stock < 10) return { text: 'Crítico', color: '#fee2e2', textColor: '#991b1b' };
    if (producto.stock < producto.stock_minimo) return { text: 'Bajo', color: '#fef3c7', textColor: '#92400e' };
    return { text: 'Normal', color: '#d1fae5', textColor: '#065f46' };
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaInputFiltro('');
    setFiltroCategoria('todas');
    setFiltroEstado('todos');
  };

  const handleRefresh = () => {
    setProductos([]);
    setSkip(0);
    setHasMore(true);
    setProductosSeleccionados([]);
    cargarProductos(0, true);
  };

  // Componente skeleton
  const SkeletonRow = () => (
    <tr style={{ borderTop: '1px solid #e5e7eb' }}>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.checkbox }}>
        <div style={{ 
          width: '16px',
          height: '16px',
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.producto }}>
        <div style={{ 
          height: '1rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          width: '80%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <div style={{ 
          height: '0.75rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          width: '50%',
          marginTop: '0.5rem',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.categoria }}>
        <div style={{ 
          height: '1rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          width: '70%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.precioCosto }}>
        <div style={{ 
          height: '1rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          width: '60%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.precioVenta }}>
        <div style={{ 
          height: '1rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          width: '60%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.margen }}>
        <div style={{ 
          height: '1.5rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          width: '50%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.stock }}>
        <div style={{ 
          height: '1rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '0.25rem',
          width: '40%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.estado }}>
        <div style={{ 
          height: '1.5rem', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '9999px',
          width: '70%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.acciones }}>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <div style={{ 
            width: '28px',
            height: '28px',
            backgroundColor: '#e5e7eb', 
            borderRadius: '0.375rem',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{ 
            width: '28px',
            height: '28px',
            backgroundColor: '#e5e7eb', 
            borderRadius: '0.375rem',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
      </td>
    </tr>
  );

  return (
    <div style={{ 
      padding: '0.5rem',
      height: 'calc(100vh - 140px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Animaciones CSS */}
      <style>
  {`
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    div[style*="overflowY: scroll"] {
      scrollbar-width: thin; /* Firefox */
      scrollbar-gutter: stable; /* Reservar espacio para scrollbar */
    }
    
    /* Estilos para WebKit (Chrome, Safari, Edge) */
    div[style*="overflowY: scroll"]::-webkit-scrollbar {
      width: 12px;
    }
    
    div[style*="overflowY: scroll"]::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    div[style*="overflowY: scroll"]::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 10px;
    }
    
    div[style*="overflowY: scroll"]::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `}
</style>
      
      {/* Panel de filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: filtrosColapsados ? '0.75rem' : '1rem', 
        borderRadius: '0.5rem',
        border: '2px solid #e5e7eb',
        marginBottom: '0.5rem', 
        flexShrink: 0,
        transition: 'padding 0.3s ease'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: filtrosColapsados ? 0 : '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Control de Stock</h2>
            <button 
              onClick={() => setFiltrosColapsados(!filtrosColapsados)}
              className="btn"
              style={{ 
                backgroundColor: '#f3f4f6', 
                color: '#374151',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title={filtrosColapsados ? 'Mostrar filtros' : 'Ocultar filtros'}
            >
              {filtrosColapsados ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              {filtrosColapsados ? 'Mostrar filtros' : 'Ocultar filtros'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280', marginRight: '0.5rem' }}>
              {productos.length} de {total} productos
              {productosSeleccionados.length > 0 && (
                <span style={{ color: '#3b82f6', fontWeight: 600, marginLeft: '0.5rem' }}>
                  ({productosSeleccionados.length} seleccionados)
                </span>
              )}
            </span>
            
            {/* Botón Actualización Masiva */}
            {productosSeleccionados.length > 0 && (
              <button 
                onClick={abrirModalActualizacionMasiva}
                className="btn" 
                style={{ 
                  backgroundColor: '#8b5cf6', 
                  color: 'white', 
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <TrendingUp size={16} />
                Actualizar Precios
              </button>
            )}
            
            <button onClick={handleRefresh} className="btn" style={{ backgroundColor: '#6b7280', color: 'white', padding: '0.5rem 0.75rem' }}>
              <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
              Actualizar
            </button>
            <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Controles de filtros */}
        {!filtrosColapsados && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            {/* Buscador */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                Buscar por nombre o categoría
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  placeholder="Escriba para buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '2.5rem', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
                />
              </div>
            </div>

            {/* Filtro por categoría */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                Categoría
              </label>
              <input
                ref={inputCategoriaFiltroRef}
                type="text"
                value={categoriaInputFiltro}
                onChange={handleCategoriaFiltroChange}
                onFocus={() => setMostrarSugerenciasFiltro(true)}
                placeholder="Todas las categorías"
                className="input"
                style={{ 
                  textTransform: 'capitalize', 
                  padding: '0.5rem',
                  width: '100%'
                }}
                autoComplete="off"
              />
              
              {mostrarSugerenciasFiltro && (
                <div
                  ref={sugerenciasFiltroRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    marginTop: '0.25rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000
                  }}
                >
                  {categoriasFiltradas.length > 0 ? (
                    categoriasFiltradas.map((cat, idx) => (
                      <div
                        key={idx}
                        onClick={() => seleccionarCategoriaFiltro(cat)}
                        style={{
                          padding: '0.35rem 1rem',
                          cursor: 'pointer',
                          borderBottom: idx < categoriasFiltradas.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background-color 0.15s',
                          textTransform: 'capitalize',
                          backgroundColor: filtroCategoria === cat ? '#eff6ff' : 'white',
                          fontWeight: filtroCategoria === cat ? 600 : 400,
                          color: filtroCategoria === cat ? '#3b82f6' : '#374151'
                        }}
                        onMouseEnter={(e) => {
                          if (filtroCategoria !== cat) {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (filtroCategoria !== cat) {
                            e.currentTarget.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        {cat === 'todas' ? 'Todas las categorías' : cat}
                        {filtroCategoria === cat && (
                          <span style={{ float: 'right', color: '#3b82f6' }}>✓</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      padding: '0.75rem 1rem', 
                      color: '#9ca3af',
                      textAlign: 'center',
                      fontSize: '0.875rem'
                    }}>
                      No se encontraron categorías
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filtro por estado */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                Estado de Stock
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="input"
                style={{ padding: '0.5rem' }}
              >
                <option value="todos">Todos</option>
                <option value="normal">Normal</option>
                <option value="bajo">Bajo</option>
                <option value="critico">Crítico</option>
              </select>
            </div>

            {/* Botón limpiar */}
            <div>
              <button
                onClick={limpiarFiltros}
                disabled={!busqueda && filtroCategoria === 'todas' && filtroEstado === 'todos'}
                className="btn"
                style={{ 
                  backgroundColor: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? '#ef4444' : '#e5e7eb',
                  color: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? 'white' : '#9ca3af',
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  cursor: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? 'pointer' : 'not-allowed',
                  opacity: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? 1 : 0.6,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de productos */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '2px solid #e5e7eb',
        flex: 1,
        overflow: 'scroll',
        minHeight: 0
      }}>
        {productos.length === 0 && !loading ? (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <Search size={64} style={{ margin: '0 auto', marginBottom: '1rem', color: '#d1d5db' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No se encontraron productos
            </p>
            <p style={{ fontSize: '0.875rem' }}>
              Intenta cambiar los filtros de búsqueda
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead style={{ 
              backgroundColor: '#f3f4f6',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left', width: COLUMN_WIDTHS.checkbox }}>
  <input
    type="checkbox"
    checked={productosSeleccionados.length > 0 && productosSeleccionados.length === total}
    ref={input => {
      if (input) {
        input.indeterminate = productosSeleccionados.length > 0 && productosSeleccionados.length < total;
      }
    }}
    onChange={toggleSeleccionarTodos}
    disabled={seleccionandoTodos}
    style={{ 
      cursor: seleccionandoTodos ? 'wait' : 'pointer', 
      width: '16px', 
      height: '16px',
      opacity: seleccionandoTodos ? 0.5 : 1
    }}
    title={seleccionandoTodos ? "Seleccionando..." : "Seleccionar todos los filtrados"}
  />
</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.producto }}>Producto</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.categoria }}>Categoría</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.precioCosto }}>P. Costo</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.precioVenta }}>P. Venta</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.margen }}>Margen</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.stock }}>Stock</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.estado }}>Estado</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.acciones }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && productos.length === 0 ? (
                <>
                  {[...Array(10)].map((_, index) => (
                    <SkeletonRow key={`skeleton-${index}`} />
                  ))}
                </>
              ) : (
                productos.map((producto, index) => {
                  const estado = getEstadoStock(producto);
                  const margen = producto.margen_porcentaje?.toFixed(1) || '0.0';
                  const isLast = index === productos.length - 1;
                  const isSelected = productosSeleccionados.includes(producto.id);
                  
                  return (
                    <tr 
                      key={producto.id} 
                      ref={isLast ? lastProductRef : null}
                      style={{ 
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: isSelected ? '#eff6ff' : 'white'
                      }}
                    >
                      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.checkbox }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSeleccionarProducto(producto.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.producto }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{producto.nombre}</div>
                          {producto.codigo_barras && (
                            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                              CB: {producto.codigo_barras}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize', fontSize: '0.875rem', width: COLUMN_WIDTHS.categoria }}>
                        {producto.categoria || 'Sin categoría'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: 600, fontSize: '0.875rem', width: COLUMN_WIDTHS.precioCosto }}>
                        ${producto.precio_costo.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#059669', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.precioVenta }}>
                        ${producto.precio_venta.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.margen }}>
                        <span style={{
                          backgroundColor: margen > 30 ? '#d1fae5' : margen > 15 ? '#fef3c7' : '#fee2e2',
                          color: margen > 30 ? '#065f46' : margen > 15 ? '#92400e' : '#991b1b',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600
                        }}>
                          {margen}%
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold', fontSize: '0.875rem', width: COLUMN_WIDTHS.stock }}>{producto.stock}</td>
                      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.estado }}>
                        <span style={{
                          backgroundColor: estado.color,
                          color: estado.textColor,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.8125rem',
                          fontWeight: 600
                        }}>
                          {estado.text}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', width: COLUMN_WIDTHS.acciones }}>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            onClick={() => {
                              setProductoEdit(producto);
                              setShowForm(true);
                            }}
                            style={{
                              padding: '0.375rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer'
                            }}
                            title="Editar producto"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => confirmarEliminarProducto(producto)}
                            style={{
                              padding: '0.375rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer'
                            }}
                            title="Eliminar producto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
        
        {loadingMore && (
          <div style={{ 
            padding: '1rem', 
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <p>Cargando más productos...</p>
          </div>
        )}
        
        {!hasMore && productos.length > 0 && (
          <div style={{ 
            padding: '1rem', 
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            <p>Todos los productos cargados ({total} total)</p>
          </div>
        )}
      </div>

      {/* Modal de Actualización Masiva */}
      {showModalActualizacionMasiva && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: '#eff6ff',
                padding: '0.75rem',
                borderRadius: '50%',
                marginRight: '1rem'
              }}>
                <TrendingUp size={24} style={{ color: '#3b82f6' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>
                Actualización Masiva de Precios
              </h3>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {productosSeleccionados.length} producto{productosSeleccionados.length !== 1 ? 's' : ''} seleccionado{productosSeleccionados.length !== 1 ? 's' : ''}
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                  Porcentaje de Aumento (%)
                </label>
                <input
                  type="number"
                  value={porcentajeAumento}
                  onChange={(e) => setPorcentajeAumento(e.target.value)}
                  placeholder="Ej: 10 para aumentar 10%"
                  step="0.01"
                  className="input"
                  style={{ width: '100%' }}
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Valores negativos reducen el precio (mínimo -50%, máximo 200%)
                </p>
              </div>
            </div>

            {/* Preview de cambios */}
{porcentajeAumento && !isNaN(parseFloat(porcentajeAumento)) && (
  <div style={{
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    marginBottom: '1rem',
    maxHeight: '400px' 
  }}>
    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
      Preview de cambios:
    </h4>
    <table style={{ width: '100%', fontSize: '0.8125rem' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
          <th style={{ textAlign: 'left', padding: '0.5rem', color: '#6b7280' }}>Producto</th>
          <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b7280' }}>P. Costo Actual</th>
          <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b7280' }}>P. Costo Nuevo</th>
          <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b7280' }}>P. Venta Nuevo</th>
        </tr>
      </thead>
      <tbody>
        {productosConCambios.slice(0, 50).map((producto, idx) => ( 
          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {producto.nombre}
            </td>
            <td style={{ textAlign: 'right', padding: '0.5rem', color: '#dc2626' }}>
              ${producto.precio_costo.toFixed(2)}
            </td>
            <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600, color: '#3b82f6' }}>
              ${producto.nuevo_precio_costo.toFixed(2)}
            </td>
            <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600, color: '#059669' }}>
              ${producto.nuevo_precio_venta.toFixed(2)}
            </td>
          </tr>
        ))}
        {productosConCambios.length > 50 && ( 
          <tr>
            <td colSpan="4" style={{ textAlign: 'center', padding: '0.5rem', color: '#6b7280', fontStyle: 'italic' }}>
              ... y {productosConCambios.length - 20} producto{productosConCambios.length - 20 !== 1 ? 's' : ''} más {/* ✅ TEXTO DINÁMICO */}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowModalActualizacionMasiva(false);
                  setPorcentajeAumento('');
                }}
                disabled={aplicandoActualizacion}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: aplicandoActualizacion ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  opacity: aplicandoActualizacion ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!aplicandoActualizacion) e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  if (!aplicandoActualizacion) e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                Cancelar
              </button>
              <button
                onClick={aplicarActualizacionMasiva}
                disabled={!porcentajeAumento || isNaN(parseFloat(porcentajeAumento)) || aplicandoActualizacion}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: aplicandoActualizacion ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: (!porcentajeAumento || isNaN(parseFloat(porcentajeAumento)) || aplicandoActualizacion) ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  opacity: (!porcentajeAumento || isNaN(parseFloat(porcentajeAumento))) ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (porcentajeAumento && !isNaN(parseFloat(porcentajeAumento)) && !aplicandoActualizacion) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!aplicandoActualizacion) e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                {aplicandoActualizacion ? 'Aplicando...' : 'Confirmar Actualización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && productoAEliminar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: '#fee2e2',
                padding: '0.75rem',
                borderRadius: '50%',
                marginRight: '1rem'
              }}>
                <AlertTriangle size={24} style={{ color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>
                Eliminar Producto
              </h3>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem', lineHeight: '1.5' }}>
                ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
              </p>
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: '#111827' }}>
                  {productoAEliminar.nombre}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>
                  {productoAEliminar.categoria || 'Sin categoría'} • Stock: {productoAEliminar.stock}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProductoAEliminar(null);
                }}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarProducto}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulario de producto */}
      {showForm && (
        <ProductoForm
          producto={productoEdit}
          onClose={() => {
            setShowForm(false);
            setProductoEdit(null);
          }}
          onSubmit={productoEdit ? handleActualizarProducto : handleCrearProducto}
        />
      )}
    </div>
  );
};

export default Stock;