/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, ShoppingCart, Trash2, Scan, DollarSign, Banknote, X } from 'lucide-react';
import { getProductos, createVenta, buscarPorCodigo, getCotizaciones } from '../api/api';
import { useToast } from '../Toast';
import { useTheme } from '../context/ThemeContext';
import { useOffline } from '../context/OfflineContext';
import { 
  saveVentaPendiente, 
  updateProductoStock 
} from '../utils/indexedDB';

// Componente de tarjeta de producto memoizado - CON DARK MODE
const ProductCard = React.memo(({ producto, onAgregar, monedaSeleccionada, cotizaciones, isMobile, theme }) => {
  const convertirPrecio = (precioARS) => {
    if (monedaSeleccionada === 'USD') return precioARS * cotizaciones.USD;
    if (monedaSeleccionada === 'BRL') return precioARS * cotizaciones.BRL;
    return precioARS;
  };

  const getSimbolo = () => {
    if (monedaSeleccionada === 'USD') return 'US$';
    if (monedaSeleccionada === 'BRL') return 'R$';
    return '$';
  };

  const precioNormal = convertirPrecio(producto.precio_venta);
  const precioEfectivo = precioNormal * 0.92;
  
  return (
    <div
      style={{
        backgroundColor: theme.bg.card,
        border: `2px solid ${theme.border.light}`,
        padding: isMobile ? '0.625rem' : '0.5rem',
        borderRadius: '0.375rem',
        transition: 'border-color 0.2s',
        cursor: 'pointer',
        height: 'fit-content'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.brand.primary}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border.light}
    >
      <div style={{ marginBottom: '0.375rem' }}>
        <h3 style={{ 
          fontWeight: 'bold', 
          marginBottom: '0.125rem', 
          fontSize: isMobile ? '0.875rem' : '0.8125rem',
          lineHeight: '1.2',
          color: theme.text.primary
        }}>
          {producto.nombre}
        </h3>
        <p style={{ fontSize: isMobile ? '0.75rem' : '0.6875rem', color: theme.text.secondary, lineHeight: '1.2' }}>
          {producto.categoria || 'Sin categoría'}
        </p>
        {producto.codigo_barras && (
          <p style={{ fontSize: '0.625rem', color: theme.text.tertiary, marginTop: '0.125rem' }}>
            CB: {producto.codigo_barras}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '0.375rem' }}>
        <div style={{ marginBottom: '0.375rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
            <DollarSign size={12} style={{ color: '#1e40af' }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#1e40af' }}>
              NORMAL
            </span>
          </div>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.125rem', fontWeight: 'bold', color: '#1e40af', lineHeight: '1' }}>
            {getSimbolo()} {precioNormal.toFixed(2)}
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#d1fae5',
          padding: '0.25rem 0.375rem',
          borderRadius: '0.25rem',
          border: '1px solid #86efac'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
            <Banknote size={10} style={{ color: '#059669' }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#059669' }}>
              Efectivo (-8%)
            </span>
          </div>
          <div style={{ fontSize: isMobile ? '0.875rem' : '0.8125rem', fontWeight: 'bold', color: '#059669', lineHeight: '1' }}>
            {getSimbolo()} {precioEfectivo.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: isMobile ? '0.75rem' : '0.6875rem', color: theme.text.secondary }}>
          Stock: {producto.stock}
        </span>
        <button
          onClick={() => onAgregar(producto)}
          className="btn btn-primary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem', 
            padding: isMobile ? '0.375rem 0.625rem' : '0.25rem 0.5rem', 
            fontSize: isMobile ? '0.8125rem' : '0.75rem',
            whiteSpace: 'nowrap',
            backgroundColor: theme.brand.primary,
            color: theme.text.white,
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <Plus size={isMobile ? 14 : 12} />
          Agregar
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.producto.id === nextProps.producto.id &&
    prevProps.producto.stock === nextProps.producto.stock &&
    prevProps.monedaSeleccionada === nextProps.monedaSeleccionada &&
    prevProps.cotizaciones.USD === nextProps.cotizaciones.USD &&
    prevProps.cotizaciones.BRL === nextProps.cotizaciones.BRL &&
    prevProps.isMobile === nextProps.isMobile
  );
});

// Skeleton para productos - CON DARK MODE
const ProductCardSkeleton = ({ isMobile, theme }) => (
  <div style={{
    backgroundColor: theme.bg.tertiary,
    border: `2px solid ${theme.border.light}`,
    padding: isMobile ? '0.625rem' : '0.5rem',
    borderRadius: '0.375rem',
    height: 'fit-content'
  }}>
    <div style={{ marginBottom: '0.375rem' }}>
      <div style={{ 
        height: '1rem', 
        backgroundColor: theme.border.medium, 
        borderRadius: '0.25rem',
        marginBottom: '0.375rem',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{ 
        height: '0.75rem', 
        backgroundColor: theme.border.medium, 
        borderRadius: '0.25rem',
        width: '60%',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
    </div>
    <div style={{ 
      height: '3rem', 
      backgroundColor: theme.border.medium, 
      borderRadius: '0.25rem',
      marginBottom: '0.375rem',
      animation: 'pulse 1.5s ease-in-out infinite'
    }} />
    <div style={{ 
      height: '1.5rem', 
      backgroundColor: theme.border.medium, 
      borderRadius: '0.25rem',
      animation: 'pulse 1.5s ease-in-out infinite'
    }} />
  </div>
);

const Ventas = () => {
  const { theme } = useTheme();
  
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState('ARS');
  const [metodoPago, setMetodoPago] = useState('normal');
  const [cotizaciones, setCotizaciones] = useState({ USD: 1, BRL: 1 });
  
  // Estados de paginación
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  
  // Estado para detectar tamaño de pantalla
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showCarritoModal, setShowCarritoModal] = useState(false);
  
  // Referencias
  const codigoInputRef = useRef(null);
  const gridRef = useRef(null);
  const observerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const toast = useToast();
  
  const { isOnline, updateVentasPendientes } = useOffline();

  // Detectar cambios en el tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Inicialización y eventos globales
  useEffect(() => {
    cargarCotizaciones();
    if (codigoInputRef.current && !isMobile) {
      codigoInputRef.current.focus();
    }

    const handleGlobalKeyPress = (e) => {
      if (e.key === 'Enter' && carrito.length > 0 && !isMobile) {
        if (document.activeElement !== codigoInputRef.current) {
          e.preventDefault();
          finalizarVenta();
        }
      }
    };

    document.addEventListener('keypress', handleGlobalKeyPress);
    return () => document.removeEventListener('keypress', handleGlobalKeyPress);
  }, [carrito, isMobile]);

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

  // Recargar productos cuando cambia la búsqueda
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (busquedaDebounced.length > 0) {
      setProductos([]);
      setSkip(0);
      setHasMore(true);
      cargarProductos(0, true);
    } else {
      setProductos([]);
      setTotal(0);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [busquedaDebounced]);

  // Cargar cotizaciones de monedas
  const cargarCotizaciones = async () => {
    try {
      const rates = await getCotizaciones();
      setCotizaciones(rates);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    }
  };

  // Cargar productos con paginación
  const cargarProductos = async (skipValue = skip, reset = false) => {
    if (!hasMore && !reset) return;
    if (!busquedaDebounced && !reset) return;
    
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
        skip: skipValue,
        limit: LIMIT,
        ...(busquedaDebounced && { busqueda: busquedaDebounced })
      };

      const response = await getProductos(params);
      
      if (thisRequestId !== requestIdRef.current) {
        return;
      }
      
      const { productos: nuevosProductos, total: totalProductos, has_more } = response.data;

      const productosConStock = nuevosProductos.filter(p => p.stock > 0);

      if (reset) {
        setProductos(productosConStock);
      } else {
        setProductos(prev => [...prev, ...productosConStock]);
      }
      
      setTotal(totalProductos);
      setHasMore(has_more);
      setSkip(skipValue + LIMIT);

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
      if (entries[0].isIntersecting && hasMore && busquedaDebounced.length > 0) {
        cargarProductos();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, skip, busquedaDebounced]);

  // Convertir precio según moneda seleccionada
  const convertirPrecio = (precioARS) => {
    if (monedaSeleccionada === 'USD') {
      return precioARS * cotizaciones.USD;
    } else if (monedaSeleccionada === 'BRL') {
      return precioARS * cotizaciones.BRL;
    }
    return precioARS;
  };

  // Calcular descuento por pago en efectivo
  const calcularPrecioEfectivo = (precio) => {
    return precio * 0.92;
  };

  // Obtener símbolo de moneda
  const getSimbolo = () => {
    if (monedaSeleccionada === 'USD') return 'US$';
    if (monedaSeleccionada === 'BRL') return 'R$';
    return '$';
  };

  // Obtener precio final según moneda y método de pago
  const getPrecioFinal = (precio) => {
    const precioConvertido = convertirPrecio(precio);
    return metodoPago === 'efectivo' ? calcularPrecioEfectivo(precioConvertido) : precioConvertido;
  };

  // Buscar producto por código de barras
  const buscarProductoPorCodigo = async (codigo) => {
    if (!codigo || codigo.trim() === '') return;

    try {
      setBuscandoCodigo(true);
      const response = await buscarPorCodigo(codigo.trim());
      const producto = response.data;
      
      agregarAlCarrito({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio_venta,
        stock: producto.stock,
        categoria: producto.categoria
      });
      
      setCodigoBarras('');
      if (codigoInputRef.current && !isMobile) {
        codigoInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error buscando producto:', error);
      toast.error('Producto no encontrado');
      setCodigoBarras('');
      if (codigoInputRef.current && !isMobile) {
        codigoInputRef.current.focus();
      }
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const handleCodigoKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarProductoPorCodigo(codigoBarras);
    }
  };

  // Agregar producto al carrito
  const agregarAlCarrito = useCallback((producto) => {
    setCarrito(prevCarrito => {
      const itemExistente = prevCarrito.find(item => item.producto_id === producto.id);
      
      if (itemExistente) {
        if (itemExistente.cantidad >= producto.stock) {
          toast.warning('No hay suficiente stock');
          return prevCarrito;
        }
        return prevCarrito.map(item =>
          item.producto_id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        return [...prevCarrito, {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio_unitario: producto.precio_venta || producto.precio,
          cantidad: 1,
          stock_disponible: producto.stock
        }];
      }
    });
    
    // En mobile, mostrar el carrito automáticamente
    if (isMobile) {
      setShowCarritoModal(true);
    }
  }, [toast, isMobile]);

  // Modificar cantidad de un producto en el carrito
  const modificarCantidad = useCallback((producto_id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(producto_id);
      return;
    }

    setCarrito(prevCarrito => {
      const item = prevCarrito.find(i => i.producto_id === producto_id);
      if (!item) return prevCarrito;
      
      if (nuevaCantidad > item.stock_disponible) {
        toast.warning('No hay suficiente stock');
        return prevCarrito;
      }

      return prevCarrito.map(item =>
        item.producto_id === producto_id
          ? { ...item, cantidad: nuevaCantidad }
          : item
      );
    });
  }, [toast]);

  // Eliminar producto del carrito
  const eliminarDelCarrito = useCallback((producto_id) => {
    setCarrito(prevCarrito => prevCarrito.filter(item => item.producto_id !== producto_id));
  }, []);

  // Finalizar venta (online u offline)
  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      toast.warning('El carrito está vacío');
      return;
    }

    try {
      const ventaData = {
        items: carrito.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        })),
        metodo_pago: metodoPago
      };

      if (!isOnline) {
        await saveVentaPendiente(ventaData);
        
        for (const item of carrito) {
          const producto = productos.find(p => p.id === item.producto_id);
          if (producto) {
            const nuevoStock = producto.stock - item.cantidad;
            await updateProductoStock(item.producto_id, nuevoStock);
            
            setProductos(prevProductos => 
              prevProductos.map(p => 
                p.id === item.producto_id 
                  ? { ...p, stock: nuevoStock }
                  : p
              )
            );
          }
        }
        
        await updateVentasPendientes();
        
        toast.success('Venta guardada localmente (se sincronizará al conectar)');
        setCarrito([]);
        setShowCarritoModal(false);
        
        if (busquedaDebounced.length > 0) {
          setProductos([]);
          setSkip(0);
          setHasMore(true);
          cargarProductos(0, true);
        }
        
        if (codigoInputRef.current && !isMobile) {
          codigoInputRef.current.focus();
        }
        
        return;
      }

      await createVenta(ventaData);
      toast.success('Venta registrada exitosamente');
      setCarrito([]);
      setShowCarritoModal(false);
      
      if (busquedaDebounced.length > 0) {
        setProductos([]);
        setSkip(0);
        setHasMore(true);
        cargarProductos(0, true);
      }
      
      if (codigoInputRef.current && !isMobile) {
        codigoInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error creando venta:', error);
      toast.error('Error al registrar la venta');
    }
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (getPrecioFinal(item.precio_unitario) * item.cantidad), 0);
  const mostrarProductos = busquedaDebounced.length > 0;

  // Componente de carrito (reutilizable para desktop y modal mobile) - CON DARK MODE
  const CarritoContent = () => (
    <>
      {carrito.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.text.tertiary,
          padding: isMobile ? '2rem 1rem' : '0'
        }}>
          <ShoppingCart size={isMobile ? 40 : 48} />
          <p style={{ marginTop: '1rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
            El carrito está vacío
          </p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Agregue productos para comenzar
          </p>
        </div>
      ) : (
        <>
          {/* Selectores de moneda y método de pago */}
          <div style={{ 
            marginBottom: '0.75rem', 
            paddingBottom: '0.75rem', 
            borderBottom: `2px solid ${theme.border.light}`
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ 
                fontSize: isMobile ? '0.8125rem' : '0.75rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                display: 'block', 
                marginBottom: '0.375rem' 
              }}>
                Moneda:
              </label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {['ARS', 'USD', 'BRL'].map(moneda => (
                  <button
                    key={moneda}
                    onClick={() => setMonedaSeleccionada(moneda)}
                    style={{
                      flex: 1,
                      padding: isMobile ? '0.5rem' : '0.375rem',
                      backgroundColor: monedaSeleccionada === moneda ? theme.brand.primary : theme.bg.tertiary,
                      color: monedaSeleccionada === moneda ? theme.text.white : theme.text.primary,
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.9375rem' : '0.875rem'
                    }}
                  >
                    {moneda === 'ARS' ? 'ARS $' : moneda}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ 
                fontSize: isMobile ? '0.8125rem' : '0.75rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                display: 'block', 
                marginBottom: '0.375rem' 
              }}>
                Método de Pago:
              </label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  onClick={() => setMetodoPago('normal')}
                  style={{
                    flex: 1,
                    padding: isMobile ? '0.625rem' : '0.5rem',
                    backgroundColor: metodoPago === 'normal' ? theme.brand.primary : theme.bg.tertiary,
                    color: metodoPago === 'normal' ? theme.text.white : theme.text.primary,
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    fontSize: isMobile ? '0.9375rem' : '0.875rem'
                  }}
                >
                  <DollarSign size={16} />
                  Normal
                </button>
                <button
                  onClick={() => setMetodoPago('efectivo')}
                  style={{
                    flex: 1,
                    padding: isMobile ? '0.625rem' : '0.5rem',
                    backgroundColor: metodoPago === 'efectivo' ? '#10b981' : theme.bg.tertiary,
                    color: metodoPago === 'efectivo' ? theme.text.white : theme.text.primary,
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    fontSize: isMobile ? '0.9375rem' : '0.875rem'
                  }}
                >
                  <Banknote size={16} />
                  Efectivo (-8%)
                </button>
              </div>
            </div>
          </div>

          {/* Items del carrito */}
          <div style={{ 
            flex: 1, 
            marginBottom: '0.75rem', 
            overflowY: 'auto',
            paddingRight: '0.5rem',
            minHeight: 0
          }}>
            {carrito.map(item => {
              const precioFinal = getPrecioFinal(item.precio_unitario);
              
              return (
                <div
                  key={item.producto_id}
                  style={{
                    borderBottom: `1px solid ${theme.border.light}`,
                    paddingBottom: '0.5rem',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'start', 
                    marginBottom: '0.375rem' 
                  }}>
                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                      <h4 style={{ 
                        fontWeight: 600, 
                        fontSize: isMobile ? '0.9375rem' : '0.875rem',
                        lineHeight: '1.3',
                        marginBottom: '0.125rem',
                        color: theme.text.primary
                      }}>
                        {item.nombre}
                      </h4>
                      <div style={{ fontSize: isMobile ? '0.8125rem' : '0.75rem', color: theme.text.secondary }}>
                        {getSimbolo()}{precioFinal.toFixed(2)} c/u
                      </div>
                    </div>
                    <button
                      onClick={() => eliminarDelCarrito(item.producto_id)}
                      style={{
                        padding: '0.25rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: theme.brand.danger,
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={isMobile ? 18 : 16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => modificarCantidad(item.producto_id, item.cantidad - 1)}
                      style={{
                        padding: isMobile ? '0.375rem 0.75rem' : '0.25rem 0.625rem',
                        backgroundColor: theme.bg.tertiary,
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '1rem' : '0.875rem',
                        color: theme.text.primary
                      }}
                    >
                      -
                    </button>
                    <span style={{ 
                      fontWeight: 'bold', 
                      minWidth: isMobile ? '2rem' : '1.5rem', 
                      textAlign: 'center', 
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      color: theme.text.primary
                    }}>
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => modificarCantidad(item.producto_id, item.cantidad + 1)}
                      style={{
                        padding: isMobile ? '0.375rem 0.75rem' : '0.25rem 0.625rem',
                        backgroundColor: theme.bg.tertiary,
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '1rem' : '0.875rem',
                        color: theme.text.primary
                      }}
                    >
                      +
                    </button>
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontWeight: 'bold', 
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      color: theme.text.primary
                    }}>
                      {getSimbolo()}{(precioFinal * item.cantidad).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total y botón finalizar */}
          <div style={{
            backgroundColor: metodoPago === 'efectivo' ? '#d1fae5' : '#dbeafe',
            padding: isMobile ? '1rem' : '0.75rem',
            borderRadius: '0.5rem',
            border: `2px solid ${metodoPago === 'efectivo' ? '#86efac' : '#93c5fd'}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{ 
                fontSize: isMobile ? '1.125rem' : '1rem', 
                fontWeight: 600 
              }}>
                Total a pagar:
              </span>
              <span style={{ 
                fontSize: isMobile ? '1.75rem' : '1.5rem', 
                fontWeight: 'bold', 
                color: metodoPago === 'efectivo' ? '#059669' : '#1e40af' 
              }}>
                {getSimbolo()}{totalCarrito.toFixed(2)}
              </span>
            </div>
            {metodoPago === 'efectivo' && (
              <div style={{ 
                fontSize: isMobile ? '0.8125rem' : '0.75rem', 
                color: '#059669', 
                fontWeight: 600,
                marginBottom: '0.5rem',
                textAlign: 'center'
              }}>
                Ahorro: {getSimbolo()}{(totalCarrito / 0.92 * 0.08).toFixed(2)}
              </div>
            )}
            <button
              onClick={finalizarVenta}
              className="btn"
              style={{ 
                width: '100%', 
                padding: isMobile ? '0.75rem' : '0.625rem', 
                fontSize: isMobile ? '1.125rem' : '1rem',
                backgroundColor: metodoPago === 'efectivo' ? '#10b981' : theme.brand.primary,
                color: theme.text.white,
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {!isOnline ? 'Guardar Venta (Offline)' : 'Finalizar Venta'}
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <div style={{ 
      padding: isMobile ? '0.5rem' : '1rem',
      height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)',
      overflow: 'hidden'
    }}>
      {/* Animación de pulso para skeletons */}
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
          @media (max-width: 640px) {
           .hide-on-mobile {
            display: none !important;
            }
          }
        `}
      </style>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '0.5rem' : '1rem',
        height: '100%'
      }}>
        {/* Panel de búsqueda y productos */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0,
          height: '100%'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexShrink: 0
          }}>
            <h2 style={{ 
              fontSize: isMobile ? '1.25rem' : '1.5rem', 
              fontWeight: 'bold',
              margin: 0,
              color: theme.text.primary
            }}>
              Nueva Venta {!isOnline && <span style={{ color: theme.brand.danger, fontSize: '0.875rem' }}>OFFLINE</span>}
            </h2>
            
            {/* Botón flotante del carrito en mobile */}
            {isMobile && carrito.length > 0 && (
              <button
                onClick={() => setShowCarritoModal(true)}
                style={{
                  position: 'relative',
                  padding: '0.625rem',
                  backgroundColor: theme.brand.primary,
                  color: theme.text.white,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                <ShoppingCart size={20} />
                Ver Carrito
                <span style={{
                  position: 'absolute',
                  top: '-0.375rem',
                  right: '-0.375rem',
                  backgroundColor: theme.brand.danger,
                  color: theme.text.white,
                  borderRadius: '9999px',
                  width: '1.25rem',
                  height: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {carrito.length}
                </span>
              </button>
            )}
          </div>

          {/* Lector de código de barras */}
          <div style={{
            backgroundColor: '#dbeafe',
            padding: isMobile ? '0.625rem' : '0.75rem',
            borderRadius: '0.5rem',
            border: '2px solid #3b82f6',
            marginBottom: isMobile ? '0.5rem' : '0.75rem',
            flexShrink: 0
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginBottom: '0.5rem' 
            }}>
              <Scan size={isMobile ? 18 : 20} style={{ color: '#1e40af' }} />
              <label style={{ 
                fontWeight: 600, 
                color: '#1e40af', 
                fontSize: isMobile ? '0.8125rem' : '0.875rem' 
              }}>
                Código de Barras
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={codigoInputRef}
                type="text"
                placeholder="Escanee o escriba..."
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onKeyPress={handleCodigoKeyPress}
                disabled={buscandoCodigo}
                className="input"
                style={{ 
                  flex: 1,
                  fontSize: isMobile ? '16px' : '1rem',
                  backgroundColor: theme.input.bg,
                  border: `1px solid ${theme.input.border}`,
                  color: theme.text.primary,
                  padding: '0.5rem',
                  borderRadius: '0.375rem'
                }}
              />
              <button
                onClick={() => buscarProductoPorCodigo(codigoBarras)}
                disabled={buscandoCodigo || !codigoBarras.trim()}
                className="btn btn-primary"
                style={{ 
                  minWidth: isMobile ? '70px' : '80px', 
                  padding: '0.5rem',
                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  backgroundColor: theme.brand.primary,
                  color: theme.text.white,
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: (buscandoCodigo || !codigoBarras.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (buscandoCodigo || !codigoBarras.trim()) ? 0.6 : 1,
                  fontWeight: 600
                }}
              >
                {buscandoCodigo ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Búsqueda manual */}
          <div style={{
            backgroundColor: theme.bg.card,
            padding: isMobile ? '0.625rem' : '0.75rem',
            borderRadius: '0.5rem',
            border: `2px solid ${theme.border.light}`,
            marginBottom: isMobile ? '0.5rem' : '0.75rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} style={{ color: theme.text.secondary }} />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input"
                style={{ 
                  border: 'none', 
                  outline: 'none', 
                  padding: '0.25rem', 
                  flex: 1,
                  fontSize: isMobile ? '16px' : '0.875rem',
                  backgroundColor: 'transparent',
                  color: theme.text.primary
                }}
              />
            </div>
          </div>

          {/* Cotizaciones en mobile */}
          {isMobile && cotizaciones.dolarPromedio && (
            <div style={{
              backgroundColor: theme.bg.tertiary,
              padding: '0.5rem',
              borderRadius: '0.375rem',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'space-around',
              fontSize: '0.75rem',
              color: theme.text.primary,
              fontWeight: 600,
              flexShrink: 0
            }}>
              <span>USD: ${cotizaciones.dolarPromedio.toFixed(2)}</span>
              <span>BRL: ${cotizaciones.realPromedio.toFixed(2)}</span>
            </div>
          )}

          {/* Grid de productos con scroll infinito */}
          <div style={{ 
            flex: 1, 
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {!mostrarProductos ? (
              <div style={{
                backgroundColor: theme.bg.card,
                padding: isMobile ? '1.5rem 1rem' : '2rem',
                borderRadius: '0.5rem',
                border: `2px solid ${theme.border.light}`,
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Search size={isMobile ? 40 : 48} style={{ color: theme.border.medium, marginBottom: '0.75rem' }} />
                <h3 style={{ 
                  fontSize: isMobile ? '1rem' : '1.125rem', 
                  fontWeight: 600, 
                  color: theme.text.secondary, 
                  marginBottom: '0.5rem' 
                }}>
                  Busque un producto para comenzar
                </h3>
                <p style={{ color: theme.text.tertiary, fontSize: isMobile ? '0.8125rem' : '0.875rem' }}>
                  Escanee un código o busque por nombre
                </p>
              </div>
            ) : productos.length === 0 && !loading ? (
              <div style={{
                backgroundColor: theme.bg.card,
                padding: isMobile ? '1.5rem 1rem' : '2rem',
                borderRadius: '0.5rem',
                border: `2px solid ${theme.border.light}`,
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <p style={{ color: theme.text.secondary, fontSize: isMobile ? '0.875rem' : '1rem' }}>
                  No se encontraron productos
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile 
                  ? 'repeat(auto-fill, minmax(140px, 1fr))' 
                  : 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: isMobile ? '0.5rem' : '0.5rem',
                overflowY: 'auto',
                overflowX: 'hidden',
                height: '100%',
                paddingRight: '0.5rem',
                willChange: 'transform',
                contain: 'layout style paint'
              }}>
                {loading && productos.length === 0 ? (
                  <>
                    {[...Array(isMobile ? 6 : 10)].map((_, index) => (
                      <ProductCardSkeleton key={`skeleton-${index}`} isMobile={isMobile} theme={theme} />
                    ))}
                  </>
                ) : (
                  <>
                    {productos.map((producto, index) => {
                      const isLast = index === productos.length - 1;
                      return (
                        <div key={producto.id} ref={isLast ? lastProductRef : null}>
                          <ProductCard
                            producto={producto}
                            onAgregar={agregarAlCarrito}
                            monedaSeleccionada={monedaSeleccionada}
                            cotizaciones={cotizaciones}
                            isMobile={isMobile}
                            theme={theme}
                          />
                        </div>
                      );
                    })}
                    
                    {loadingMore && (
                      <div style={{ 
                        gridColumn: '1 / -1',
                        padding: isMobile ? '0.75rem' : '1rem', 
                        textAlign: 'center',
                        color: theme.text.secondary,
                        fontSize: isMobile ? '0.8125rem' : '0.875rem'
                      }}>
                        <p>Cargando más productos...</p>
                      </div>
                    )}
                    
                    {!hasMore && productos.length > 0 && (
                      <div style={{ 
                        gridColumn: '1 / -1',
                        padding: isMobile ? '0.75rem' : '1rem', 
                        textAlign: 'center',
                        color: theme.text.secondary,
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                      }}>
                        <p>Todos los productos cargados ({total} total)</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel del carrito - Solo Desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '0.75rem' 
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme.text.primary }}>
                Carrito
              </h2>
              {cotizaciones.dolarPromedio && (
                <div style={{ fontSize: '0.75rem', color: theme.text.primary, textAlign: 'right' }}>
                  <div>USD: ${cotizaciones.dolarPromedio.toFixed(2)}</div>
                  <div>BRL: ${cotizaciones.realPromedio.toFixed(2)}</div>
                </div>
              )}
            </div>

            <div style={{
              backgroundColor: theme.bg.card,
              border: `2px solid ${theme.border.light}`,
              borderRadius: '0.5rem',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0
            }}>
              <CarritoContent />
            </div>
          </div>
        )}
      </div>

      {/* Modal del carrito en Mobile */}
      {isMobile && showCarritoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: theme.bg.card,
            borderRadius: '1rem 1rem 0 0',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: theme.shadow.xl,
            animation: 'slideUp 0.3s ease-out'
          }}>
            <style>
              {`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes slideUp {
                  from { transform: translateY(100%); }
                  to { transform: translateY(0); }
                }
              `}
            </style>
            
            {/* Header del modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderBottom: `2px solid ${theme.border.light}`,
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: theme.text.primary }}>
                Carrito ({carrito.length})
              </h2>
              <button
                onClick={() => setShowCarritoModal(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.375rem',
                  transition: 'background-color 0.2s',
                  color: theme.text.secondary
                }}
                onTouchStart={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                onTouchEnd={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenido del carrito */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem'
            }}>
              <CarritoContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;