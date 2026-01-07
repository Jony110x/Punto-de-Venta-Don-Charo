/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Search, ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from 'lucide-react';
import { getProductos, getCategorias, createProducto, updateProducto, deleteProducto, actualizarPreciosMasivo, getProductosIdsFiltrados } from '../api/api';
import ProductoForm from './ProductoForm';
import { useToast } from '../Toast';
import { useTheme } from '../context/ThemeContext';

const Stock = () => {
  const { theme } = useTheme();
  
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

  // Estado para detectar tamaño de pantalla
  const [isMobile, setIsMobile] = useState(false);

  // Detectar cambios en el tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    setProductosSeleccionados([]);
    
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

  const [seleccionandoTodos, setSeleccionandoTodos] = useState(false);

  const toggleSeleccionarTodos = async () => {
    if (productosSeleccionados.length > 0) {
      setProductosSeleccionados([]);
      return;
    }

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

  const abrirModalActualizacionMasiva = () => {
    if (productosSeleccionados.length === 0) {
      toast.warning('Debe seleccionar al menos un producto');
      return;
    }
    setPorcentajeAumento('');
    setShowModalActualizacionMasiva(true);
  };

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

  // Componente skeleton - CON DARK MODE
  const SkeletonRow = () => (
    <tr style={{ borderTop: `1px solid ${theme.border.light}` }}>
      <td style={{ padding: '0.75rem' }}>
        <div style={{ 
          width: '16px',
          height: '16px',
          backgroundColor: theme.border.medium, 
          borderRadius: '0.25rem',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      <td style={{ padding: '0.75rem' }}>
        <div style={{ 
          height: '1rem', 
          backgroundColor: theme.border.medium, 
          borderRadius: '0.25rem',
          width: '80%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <div style={{ 
          height: '0.75rem', 
          backgroundColor: theme.border.medium, 
          borderRadius: '0.25rem',
          width: '50%',
          marginTop: '0.5rem',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </td>
      {!isMobile && (
        <>
          <td style={{ padding: '0.75rem' }}>
            <div style={{ 
              height: '1rem', 
              backgroundColor: theme.border.medium, 
              borderRadius: '0.25rem',
              width: '70%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </td>
          <td style={{ padding: '0.75rem' }}>
            <div style={{ 
              height: '1rem', 
              backgroundColor: theme.border.medium, 
              borderRadius: '0.25rem',
              width: '60%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </td>
          <td style={{ padding: '0.75rem' }}>
            <div style={{ 
              height: '1rem', 
              backgroundColor: theme.border.medium, 
              borderRadius: '0.25rem',
              width: '60%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </td>
          <td style={{ padding: '0.75rem' }}>
            <div style={{ 
              height: '1.5rem', 
              backgroundColor: theme.border.medium, 
              borderRadius: '0.25rem',
              width: '50%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </td>
          <td style={{ padding: '0.75rem' }}>
            <div style={{ 
              height: '1rem', 
              backgroundColor: theme.border.medium, 
              borderRadius: '0.25rem',
              width: '40%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </td>
          <td style={{ padding: '0.75rem' }}>
            <div style={{ 
              height: '1.5rem', 
              backgroundColor: theme.border.medium, 
              borderRadius: '9999px',
              width: '70%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </td>
        </>
      )}
      <td style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <div style={{ 
            width: '28px',
            height: '28px',
            backgroundColor: theme.border.medium, 
            borderRadius: '0.375rem',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{ 
            width: '28px',
            height: '28px',
            backgroundColor: theme.border.medium, 
            borderRadius: '0.375rem',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
      </td>
    </tr>
  );

  // Componente de tarjeta mobile - CON DARK MODE
  const ProductoCard = ({ producto, isLast }) => {
    const estado = getEstadoStock(producto);
    const margen = producto.margen_porcentaje?.toFixed(1) || '0.0';
    const isSelected = productosSeleccionados.includes(producto.id);

    return (
      <div 
        ref={isLast ? lastProductRef : null}
        style={{
          backgroundColor: isSelected ? theme.bg.active : theme.bg.card,
          padding: '1rem',
          borderBottom: `1px solid ${theme.border.light}`,
          transition: 'background-color 0.2s'
        }}
      >
        {/* Header de la tarjeta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSeleccionarProducto(producto.id)}
              style={{ 
                cursor: 'pointer', 
                width: '18px', 
                height: '18px',
                marginTop: '0.125rem',
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: 600, 
                fontSize: '0.9375rem',
                marginBottom: '0.25rem',
                wordBreak: 'break-word',
                color: theme.text.primary
              }}>
                {producto.nombre}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: theme.text.secondary,
                textTransform: 'capitalize'
              }}>
                {producto.categoria || 'Sin categoría'}
              </div>
              {producto.codigo_barras && (
                <div style={{ fontSize: '0.7rem', color: theme.text.tertiary, marginTop: '0.125rem' }}>
                  CB: {producto.codigo_barras}
                </div>
              )}
            </div>
          </div>
          
          {/* Badge de estado */}
          <span style={{
            backgroundColor: estado.color,
            color: estado.textColor,
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {estado.text}
          </span>
        </div>

        {/* Grid de información */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: theme.text.secondary, marginBottom: '0.125rem' }}>
              Precio Costo
            </div>
            <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.875rem' }}>
              ${producto.precio_costo.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: theme.text.secondary, marginBottom: '0.125rem' }}>
              Precio Venta
            </div>
            <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.875rem' }}>
              ${producto.precio_venta.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: theme.text.secondary, marginBottom: '0.125rem' }}>
              Margen
            </div>
            <span style={{
              backgroundColor: margen > 30 ? '#d1fae5' : margen > 15 ? '#fef3c7' : '#fee2e2',
              color: margen > 30 ? '#065f46' : margen > 15 ? '#92400e' : '#991b1b',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-block'
            }}>
              {margen}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: theme.text.secondary, marginBottom: '0.125rem' }}>
              Stock
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: theme.text.primary }}>
              {producto.stock}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              setProductoEdit(producto);
              setShowForm(true);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: theme.brand.primary,
              color: theme.text.white,
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
          >
            <Edit2 size={14} />
            Editar
          </button>
          <button
            onClick={() => confirmarEliminarProducto(producto)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: theme.brand.danger,
              color: theme.text.white,
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      padding: isMobile ? '0.5rem' : '0.5rem',
      height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)',
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
          
          /* Scrollbar personalizado con tema */
          div[style*="overflow"] {
            scrollbar-width: thin;
            scrollbar-gutter: stable;
          }
          
          div[style*="overflow"]::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          div[style*="overflow"]::-webkit-scrollbar-track {
            background: ${theme.bg.tertiary};
            border-radius: 10px;
          }
          
          div[style*="overflow"]::-webkit-scrollbar-thumb {
            background: ${theme.border.medium};
            border-radius: 10px;
          }
          
          div[style*="overflow"]::-webkit-scrollbar-thumb:hover {
            background: ${theme.border.dark};
          }

          /* Ocultar scrollbar horizontal en mobile */
          @media (max-width: 767px) {
            div[style*="overflow"]::-webkit-scrollbar-horizontal {
              display: none;
            }
          }
        `}
      </style>
      
      {/* Panel de filtros - CON DARK MODE */}
      <div style={{
        backgroundColor: theme.bg.card,
        padding: filtrosColapsados ? '0.75rem' : (isMobile ? '0.75rem' : '1rem'), 
        borderRadius: '0.5rem',
        border: `2px solid ${theme.border.light}`,
        marginBottom: '0.5rem', 
        flexShrink: 0,
        transition: 'padding 0.3s ease'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '0.75rem' : '0',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center', 
          marginBottom: filtrosColapsados ? 0 : (isMobile ? '0.75rem' : '0.75rem')
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ 
              fontSize: isMobile ? '1.25rem' : '1.5rem', 
              fontWeight: 'bold', 
              margin: 0,
              color: theme.text.primary
            }}>
              Control de Stock
            </h2>
            <button 
              onClick={() => setFiltrosColapsados(!filtrosColapsados)}
              className="btn"
              style={{ 
                backgroundColor: theme.bg.tertiary, 
                color: theme.text.primary,
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
              title={filtrosColapsados ? 'Mostrar filtros' : 'Ocultar filtros'}
            >
              {filtrosColapsados ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              {filtrosColapsados ? 'Mostrar filtros' : 'Ocultar filtros'}
            </button>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: '0.5rem', 
            alignItems: isMobile ? 'stretch' : 'center' 
          }}>
            <span style={{ 
              fontSize: '0.875rem', 
              color: theme.text.secondary,
              textAlign: isMobile ? 'center' : 'right'
            }}>
              {productos.length} de {total} productos
              {productosSeleccionados.length > 0 && (
                <span style={{ color: theme.brand.primary, fontWeight: 600, marginLeft: '0.5rem' }}>
                  ({productosSeleccionados.length} seleccionados)
                </span>
              )}
            </span>
            
            {/* Botones de acción */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
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
                    gap: '0.5rem',
                    fontSize: isMobile ? '0.8125rem' : '0.875rem',
                    flex: isMobile ? '1' : 'auto',
                    justifyContent: 'center',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <TrendingUp size={16} />
                  {isMobile ? 'Actualizar' : 'Actualizar Precios'}
                </button>
              )}
              
              <button 
                onClick={handleRefresh} 
                className="btn" 
                style={{ 
                  backgroundColor: theme.text.secondary, 
                  color: theme.text.white, 
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '0' : '0.5rem',
                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  flex: isMobile ? '0' : 'auto',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <RefreshCw size={16} />
                {!isMobile && 'Actualizar'}
              </button>
              
              <button 
                onClick={() => setShowForm(true)} 
                className="btn btn-primary" 
                style={{ 
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '0.25rem' : '0.5rem',
                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  flex: isMobile ? '1' : 'auto',
                  justifyContent: 'center',
                  backgroundColor: theme.brand.primary,
                  color: theme.text.white,
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <Plus size={16} />
                {isMobile ? 'Nuevo' : 'Nuevo Producto'}
              </button>
            </div>
          </div>
        </div>

        {/* Controles de filtros */}
        {!filtrosColapsados && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem', 
            alignItems: 'end' 
          }}>
            {/* Buscador */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                marginBottom: '0.375rem' 
              }}>
                Buscar por nombre o categoría
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: theme.text.tertiary
                }} />
                <input
                  type="text"
                  placeholder="Escriba para buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="input"
                  style={{ 
                    paddingLeft: '2.5rem', 
                    padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                    width: '100%',
                    fontSize: isMobile ? '16px' : '0.875rem',
                    backgroundColor: theme.input.bg,
                    border: `1px solid ${theme.input.border}`,
                    borderRadius: '0.375rem',
                    color: theme.text.primary
                  }}
                />
              </div>
            </div>

            {/* Filtro por categoría */}
            <div style={{ position: 'relative' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                marginBottom: '0.375rem' 
              }}>
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
                  width: '100%',
                  fontSize: isMobile ? '16px' : '0.875rem',
                  backgroundColor: theme.input.bg,
                  border: `1px solid ${theme.input.border}`,
                  borderRadius: '0.375rem',
                  color: theme.text.primary
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
                    backgroundColor: theme.bg.card,
                    border: `1px solid ${theme.border.light}`,
                    borderRadius: '0.375rem',
                    marginTop: '0.25rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: theme.shadow.md,
                    zIndex: 1000
                  }}
                >
                  {categoriasFiltradas.length > 0 ? (
                    categoriasFiltradas.map((cat, idx) => (
                      <div
                        key={idx}
                        onClick={() => seleccionarCategoriaFiltro(cat)}
                        style={{
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          borderBottom: idx < categoriasFiltradas.length - 1 ? `1px solid ${theme.border.light}` : 'none',
                          transition: 'background-color 0.15s',
                          textTransform: 'capitalize',
                          backgroundColor: filtroCategoria === cat ? theme.bg.active : theme.bg.card,
                          fontWeight: filtroCategoria === cat ? 600 : 400,
                          color: filtroCategoria === cat ? theme.brand.primary : theme.text.primary
                        }}
                        onMouseEnter={(e) => {
                          if (filtroCategoria !== cat) {
                            e.currentTarget.style.backgroundColor = theme.bg.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (filtroCategoria !== cat) {
                            e.currentTarget.style.backgroundColor = theme.bg.card;
                          }
                        }}
                      >
                        {cat === 'todas' ? 'Todas las categorías' : cat}
                        {filtroCategoria === cat && (
                          <span style={{ float: 'right', color: theme.brand.primary }}>✓</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      padding: '0.75rem 1rem', 
                      color: theme.text.tertiary,
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
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                marginBottom: '0.375rem' 
              }}>
                Estado de Stock
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="input"
                style={{ 
                  padding: '0.5rem',
                  width: '100%',
                  fontSize: isMobile ? '16px' : '0.875rem',
                  backgroundColor: theme.input.bg,
                  border: `1px solid ${theme.input.border}`,
                  borderRadius: '0.375rem',
                  color: theme.text.primary
                }}
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
                  backgroundColor: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? theme.brand.danger : theme.bg.tertiary,
                  color: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? theme.text.white : theme.text.tertiary,
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  cursor: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? 'pointer' : 'not-allowed',
                  opacity: (busqueda || filtroCategoria !== 'todas' || filtroEstado !== 'todos') ? 1 : 0.6,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 600
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contenedor de productos - Vista Mobile (Cards) o Desktop (Tabla) */}
      <div style={{
        backgroundColor: theme.bg.card,
        borderRadius: '0.5rem',
        border: `2px solid ${theme.border.light}`,
        flex: 1,
        overflow: 'auto',
        minHeight: 0
      }}>
        {productos.length === 0 && !loading ? (
          <div style={{ 
            padding: isMobile ? '2rem 1rem' : '3rem', 
            textAlign: 'center',
            color: theme.text.secondary
          }}>
            <Search size={isMobile ? 48 : 64} style={{ margin: '0 auto', marginBottom: '1rem', color: theme.border.medium }} />
            <p style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: theme.text.primary }}>
              No se encontraron productos
            </p>
            <p style={{ fontSize: '0.875rem', color: theme.text.secondary }}>
              Intenta cambiar los filtros de búsqueda
            </p>
          </div>
        ) : isMobile ? (
          // Vista Mobile: Cards
          <div>
            {/* Header con checkbox "Seleccionar todos" */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: theme.bg.tertiary,
              borderBottom: `2px solid ${theme.border.light}`,
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
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
                  width: '18px', 
                  height: '18px',
                  opacity: seleccionandoTodos ? 0.5 : 1
                }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: theme.text.primary }}>
                {seleccionandoTodos ? 'Seleccionando...' : 'Seleccionar todos'}
              </span>
            </div>
            
            {loading && productos.length === 0 ? (
              <>
                {[...Array(5)].map((_, index) => (
                  <div key={`skeleton-${index}`} style={{
                    padding: '1rem',
                    borderBottom: `1px solid ${theme.border.light}`
                  }}>
                    <div style={{ 
                      height: '1rem', 
                      backgroundColor: theme.border.medium, 
                      borderRadius: '0.25rem',
                      width: '80%',
                      marginBottom: '0.5rem',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    <div style={{ 
                      height: '0.875rem', 
                      backgroundColor: theme.border.medium, 
                      borderRadius: '0.25rem',
                      width: '60%',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                  </div>
                ))}
              </>
            ) : (
              productos.map((producto, index) => (
                <ProductoCard 
                  key={producto.id} 
                  producto={producto} 
                  isLast={index === productos.length - 1}
                />
              ))
            )}
          </div>
        ) : (
          // Vista Desktop: Tabla
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead style={{ 
              backgroundColor: theme.bg.tertiary,
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left', width: '50px' }}>
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
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '25%', color: theme.text.primary }}>Producto</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '12%', color: theme.text.primary }}>Categoría</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '10%', color: theme.text.primary }}>P. Costo</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '10%', color: theme.text.primary }}>P. Venta</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '10%', color: theme.text.primary }}>Margen</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '8%', color: theme.text.primary }}>Stock</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '10%', color: theme.text.primary }}>Estado</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem', width: '120px', color: theme.text.primary }}>Acciones</th>
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
                        borderTop: `1px solid ${theme.border.light}`,
                        backgroundColor: isSelected ? theme.bg.active : theme.bg.card
                      }}
                    >
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSeleccionarProducto(producto.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: theme.text.primary }}>{producto.nombre}</div>
                          {producto.codigo_barras && (
                            <div style={{ fontSize: '0.7rem', color: theme.text.secondary }}>
                              CB: {producto.codigo_barras}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize', fontSize: '0.875rem', color: theme.text.primary }}>
                        {producto.categoria || 'Sin categoría'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: 600, fontSize: '0.875rem' }}>
                        ${producto.precio_costo.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#059669', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        ${producto.precio_venta.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
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
                      <td style={{ padding: '0.75rem', fontWeight: 'bold', fontSize: '0.875rem', color: theme.text.primary }}>{producto.stock}</td>
                      <td style={{ padding: '0.75rem' }}>
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
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            onClick={() => {
                              setProductoEdit(producto);
                              setShowForm(true);
                            }}
                            style={{
                              padding: '0.375rem',
                              backgroundColor: theme.brand.primary,
                              color: theme.text.white,
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
                              backgroundColor: theme.brand.danger,
                              color: theme.text.white,
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
            color: theme.text.secondary
          }}>
            <p>Cargando más productos...</p>
          </div>
        )}
        
        {!hasMore && productos.length > 0 && (
          <div style={{ 
            padding: '1rem', 
            textAlign: 'center',
            color: theme.text.secondary,
            fontSize: '0.875rem'
          }}>
            <p>Todos los productos cargados ({total} total)</p>
          </div>
        )}
      </div>

      {/* Modal de Actualización Masiva - CON DARK MODE */}
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
          zIndex: 1000,
          padding: isMobile ? '1rem' : '0'
        }}>
          <div style={{
            backgroundColor: theme.bg.card,
            borderRadius: '0.75rem',
            padding: isMobile ? '1.25rem' : '1.5rem',
            maxWidth: isMobile ? '100%' : '700px',
            width: isMobile ? '100%' : '90%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: theme.shadow.xl,
            animation: 'slideIn 0.2s ease-out',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: theme.bg.active,
                padding: isMobile ? '0.5rem' : '0.75rem',
                borderRadius: '50%',
                marginRight: '1rem',
                flexShrink: 0
              }}>
                <TrendingUp size={isMobile ? 20 : 24} style={{ color: theme.brand.primary }} />
              </div>
              <h3 style={{ 
                fontSize: isMobile ? '1.125rem' : '1.25rem', 
                fontWeight: 'bold', 
                margin: 0, 
                color: theme.text.primary,
                lineHeight: 1.3
              }}>
                Actualización Masiva de Precios
              </h3>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: theme.text.secondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {productosSeleccionados.length} producto{productosSeleccionados.length !== 1 ? 's' : ''} seleccionado{productosSeleccionados.length !== 1 ? 's' : ''}
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: theme.text.primary }}>
                  Porcentaje de Aumento (%)
                </label>
                <input
                  type="number"
                  value={porcentajeAumento}
                  onChange={(e) => setPorcentajeAumento(e.target.value)}
                  placeholder="Ej: 10 para aumentar 10%"
                  step="0.01"
                  className="input"
                  style={{ 
                    width: '100%',
                    fontSize: isMobile ? '16px' : '0.875rem',
                    backgroundColor: theme.input.bg,
                    border: `1px solid ${theme.input.border}`,
                    borderRadius: '0.375rem',
                    color: theme.text.primary,
                    padding: '0.5rem'
                  }}
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: theme.text.secondary, marginTop: '0.25rem' }}>
                  Valores negativos reducen el precio (mínimo -50%, máximo 200%)
                </p>
              </div>
            </div>

            {/* Preview de cambios */}
            {porcentajeAumento && !isNaN(parseFloat(porcentajeAumento)) && (
              <div style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: theme.bg.secondary,
                padding: isMobile ? '0.75rem' : '1rem',
                borderRadius: '0.5rem',
                border: `1px solid ${theme.border.light}`,
                marginBottom: '1rem',
                maxHeight: '400px'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: theme.text.primary }}>
                  Preview de cambios:
                </h4>
                
                {isMobile ? (
                  // Vista mobile: Cards compactas
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {productosConCambios.slice(0, 50).map((producto, idx) => (
                      <div key={idx} style={{
                        backgroundColor: theme.bg.card,
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        border: `1px solid ${theme.border.light}`
                      }}>
                        <div style={{ 
                          fontSize: '0.8125rem', 
                          fontWeight: 600, 
                          marginBottom: '0.5rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: theme.text.primary
                        }}>
                          {producto.nombre}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                          <div>
                            <span style={{ color: theme.text.secondary }}>Costo actual:</span>
                            <div style={{ color: '#dc2626', fontWeight: 600 }}>
                              ${producto.precio_costo.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: theme.text.secondary }}>Costo nuevo:</span>
                            <div style={{ color: theme.brand.primary, fontWeight: 600 }}>
                              ${producto.nuevo_precio_costo.toFixed(2)}
                            </div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: theme.text.secondary }}>Venta nuevo:</span>
                            <div style={{ color: '#059669', fontWeight: 600 }}>
                              ${producto.nuevo_precio_venta.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {productosConCambios.length > 50 && (
                      <div style={{ textAlign: 'center', color: theme.text.secondary, fontStyle: 'italic', fontSize: '0.75rem' }}>
                        ... y {productosConCambios.length - 50} producto{productosConCambios.length - 50 !== 1 ? 's' : ''} más
                      </div>
                    )}
                  </div>
                ) : (
                  // Vista desktop: Tabla
                  <table style={{ width: '100%', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${theme.border.light}` }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem', color: theme.text.secondary }}>Producto</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem', color: theme.text.secondary }}>P. Costo Actual</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem', color: theme.text.secondary }}>P. Costo Nuevo</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem', color: theme.text.secondary }}>P. Venta Nuevo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosConCambios.slice(0, 50).map((producto, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${theme.border.light}` }}>
                          <td style={{ 
                            padding: '0.5rem', 
                            maxWidth: '200px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            color: theme.text.primary
                          }}>
                            {producto.nombre}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.5rem', color: '#dc2626' }}>
                            ${producto.precio_costo.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600, color: theme.brand.primary }}>
                            ${producto.nuevo_precio_costo.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600, color: '#059669' }}>
                            ${producto.nuevo_precio_venta.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {productosConCambios.length > 50 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '0.5rem', color: theme.text.secondary, fontStyle: 'italic' }}>
                            ... y {productosConCambios.length - 50} producto{productosConCambios.length - 50 !== 1 ? 's' : ''} más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column-reverse' : 'row',
              gap: '0.75rem', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  setShowModalActualizacionMasiva(false);
                  setPorcentajeAumento('');
                }}
                disabled={aplicandoActualizacion}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: theme.bg.tertiary,
                  color: theme.text.primary,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: aplicandoActualizacion ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  opacity: aplicandoActualizacion ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!aplicandoActualizacion) e.currentTarget.style.backgroundColor = theme.bg.hover;
                }}
                onMouseLeave={(e) => {
                  if (!aplicandoActualizacion) e.currentTarget.style.backgroundColor = theme.bg.tertiary;
                }}
              >
                Cancelar
              </button>
              <button
                onClick={aplicarActualizacionMasiva}
                disabled={!porcentajeAumento || isNaN(parseFloat(porcentajeAumento)) || aplicandoActualizacion}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: aplicandoActualizacion ? theme.text.secondary : theme.brand.primary,
                  color: theme.text.white,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: (!porcentajeAumento || isNaN(parseFloat(porcentajeAumento)) || aplicandoActualizacion) ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  opacity: (!porcentajeAumento || isNaN(parseFloat(porcentajeAumento))) ? 0.6 : 1
                }}
              >
                {aplicandoActualizacion ? 'Aplicando...' : 'Confirmar Actualización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación - CON DARK MODE */}
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
          zIndex: 1000,
          padding: isMobile ? '1rem' : '0'
        }}>
          <div style={{
            backgroundColor: theme.bg.card,
            borderRadius: '0.75rem',
            padding: isMobile ? '1.25rem' : '1.5rem',
            maxWidth: isMobile ? '100%' : '450px',
            width: isMobile ? '100%' : '90%',
            boxShadow: theme.shadow.xl,
            animation: 'slideIn 0.2s ease-out'
          }}>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: '#fee2e2',
                padding: isMobile ? '0.5rem' : '0.75rem',
                borderRadius: '50%',
                marginRight: '1rem',
                flexShrink: 0
              }}>
                <AlertTriangle size={isMobile ? 20 : 24} style={{ color: '#dc2626' }} />
              </div>
              <h3 style={{ 
                fontSize: isMobile ? '1.125rem' : '1.25rem', 
                fontWeight: 'bold', 
                margin: 0, 
                color: theme.text.primary
              }}>
                Eliminar Producto
              </h3>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: theme.text.secondary, marginBottom: '1rem', lineHeight: '1.5', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
              </p>
              <div style={{
                backgroundColor: theme.bg.secondary,
                padding: '1rem',
                borderRadius: '0.5rem',
                border: `1px solid ${theme.border.light}`
              }}>
                <p style={{ 
                  fontWeight: 600, 
                  fontSize: isMobile ? '0.9375rem' : '1rem', 
                  marginBottom: '0.25rem', 
                  color: theme.text.primary
                }}>
                  {productoAEliminar.nombre}
                </p>
                <p style={{ fontSize: '0.875rem', color: theme.text.secondary, textTransform: 'capitalize' }}>
                  {productoAEliminar.categoria || 'Sin categoría'} • Stock: {productoAEliminar.stock}
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column-reverse' : 'row',
              gap: '0.75rem', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProductoAEliminar(null);
                }}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: theme.bg.tertiary,
                  color: theme.text.primary,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.bg.tertiary}
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarProducto}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: theme.brand.danger,
                  color: theme.text.white,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s'
                }}
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