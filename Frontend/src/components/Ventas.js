import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, ShoppingCart, Trash2, Scan, DollarSign, Banknote } from 'lucide-react';
import { getProductos, createVenta, buscarPorCodigo, getCotizaciones } from '../api/api';

// Componente memoizado con props mínimas
const ProductCard = React.memo(({ producto, onAgregar, monedaSeleccionada, cotizaciones }) => {
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
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        padding: '0.5rem',
        borderRadius: '0.375rem',
        transition: 'border-color 0.2s',
        cursor: 'pointer',
        height: 'fit-content',
        willChange: 'border-color',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
    >
      <div style={{ marginBottom: '0.375rem' }}>
        <h3 style={{ 
          fontWeight: 'bold', 
          marginBottom: '0.125rem', 
          fontSize: '0.8125rem',
          lineHeight: '1.2'
        }}>
          {producto.nombre}
        </h3>
        <p style={{ fontSize: '0.6875rem', color: '#6b7280', lineHeight: '1.2' }}>
          {producto.categoria || 'Sin categoría'}
        </p>
        {producto.codigo_barras && (
          <p style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: '0.125rem' }}>
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
          <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1e40af', lineHeight: '1' }}>
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
          <div style={{ fontSize: '0.8125rem', fontWeight: 'bold', color: '#059669', lineHeight: '1' }}>
            {getSimbolo()} {precioEfectivo.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
          Stock: {producto.stock}
        </span>
        <button
          onClick={() => onAgregar(producto)}
          className="btn btn-primary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem', 
            padding: '0.25rem 0.5rem', 
            fontSize: '0.75rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Plus size={12} />
          Agregar
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación manual: solo re-renderizar si cambian producto, moneda o cotizaciones
  return prevProps.producto.id === nextProps.producto.id &&
         prevProps.monedaSeleccionada === nextProps.monedaSeleccionada &&
         prevProps.cotizaciones.USD === nextProps.cotizaciones.USD &&
         prevProps.cotizaciones.BRL === nextProps.cotizaciones.BRL;
});

const Ventas = () => {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [loading, setLoading] = useState(true);
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState('ARS');
  const [metodoPago, setMetodoPago] = useState('normal'); // 'normal' o 'efectivo'
  const [cotizaciones, setCotizaciones] = useState({ USD: 1, BRL: 1 });
  const codigoInputRef = useRef(null);

  useEffect(() => {
    cargarProductos();
    cargarCotizaciones();
    if (codigoInputRef.current) {
      codigoInputRef.current.focus();
    }

    // Listener para Enter que finaliza venta cuando hay items en carrito
    const handleGlobalKeyPress = (e) => {
      if (e.key === 'Enter' && carrito.length > 0) {
        // Solo finalizar si NO estamos en el input de código de barras
        if (document.activeElement !== codigoInputRef.current) {
          e.preventDefault();
          finalizarVenta();
        }
      }
    };

    document.addEventListener('keypress', handleGlobalKeyPress);
    return () => document.removeEventListener('keypress', handleGlobalKeyPress);
  }, [carrito]);

  const cargarCotizaciones = async () => {
    try {
      const rates = await getCotizaciones();
      setCotizaciones(rates);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await getProductos();
      setProductos(response.data.filter(p => p.stock > 0));
    } catch (error) {
      console.error('Error cargando productos:', error);
      alert('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const convertirPrecio = (precioARS) => {
    if (monedaSeleccionada === 'USD') {
      return precioARS * cotizaciones.USD;
    } else if (monedaSeleccionada === 'BRL') {
      return precioARS * cotizaciones.BRL;
    }
    return precioARS;
  };

  const calcularPrecioEfectivo = (precio) => {
    return precio * 0.92; // 8% de descuento
  };

  const getSimbolo = () => {
    if (monedaSeleccionada === 'USD') return 'US$';
    if (monedaSeleccionada === 'BRL') return 'R$';
    return '$';
  };

  const getPrecioFinal = (precio) => {
    const precioConvertido = convertirPrecio(precio);
    return metodoPago === 'efectivo' ? calcularPrecioEfectivo(precioConvertido) : precioConvertido;
  };

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
      if (codigoInputRef.current) {
        codigoInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error buscando producto:', error);
      alert(error.response?.data?.detail || 'Producto no encontrado');
      setCodigoBarras('');
      if (codigoInputRef.current) {
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

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const agregarAlCarrito = useCallback((producto) => {
    setCarrito(prevCarrito => {
      const itemExistente = prevCarrito.find(item => item.producto_id === producto.id);
      
      if (itemExistente) {
        if (itemExistente.cantidad >= producto.stock) {
          alert('No hay suficiente stock');
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
  }, []);

  const modificarCantidad = (producto_id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(producto_id);
      return;
    }

    const item = carrito.find(i => i.producto_id === producto_id);
    if (nuevaCantidad > item.stock_disponible) {
      alert('No hay suficiente stock');
      return;
    }

    setCarrito(carrito.map(item =>
      item.producto_id === producto_id
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  const eliminarDelCarrito = (producto_id) => {
    setCarrito(carrito.filter(item => item.producto_id !== producto_id));
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
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

      await createVenta(ventaData);
      alert('Venta registrada exitosamente!');
      setCarrito([]);
      cargarProductos();
      
      if (codigoInputRef.current) {
        codigoInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error creando venta:', error);
      alert(error.response?.data?.detail || 'Error al registrar la venta');
    }
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (getPrecioFinal(item.precio_unitario) * item.cantidad), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <p>Cargando productos...</p>
      </div>
    );
  }

  // Solo mostrar productos si hay búsqueda
  const mostrarProductos = busqueda.length > 0 || codigoBarras.length > 0;

  return (
    <div style={{ 
      padding: '1rem',
      height: 'calc(100vh - 70px)', // Altura total menos header
      overflow: 'hidden'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', // 50/50
        gap: '1rem',
        height: '100%'
      }}>
        {/* Panel de búsqueda */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
            Nueva Venta
          </h2>

          {/* Lector de Código de Barras - MÁS COMPACTO */}
          <div style={{
            backgroundColor: '#dbeafe',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '2px solid #3b82f6',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Scan size={20} style={{ color: '#1e40af' }} />
              <label style={{ fontWeight: 600, color: '#1e40af', fontSize: '0.875rem' }}>
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
                  fontSize: '1rem',
                  backgroundColor: 'white',
                  padding: '0.5rem'
                }}
              />
              <button
                onClick={() => buscarProductoPorCodigo(codigoBarras)}
                disabled={buscandoCodigo || !codigoBarras.trim()}
                className="btn btn-primary"
                style={{ minWidth: '80px', padding: '0.5rem' }}
              >
                {buscandoCodigo ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Búsqueda manual - MÁS COMPACTA */}
          <div style={{
            backgroundColor: 'white',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '2px solid #e5e7eb',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} style={{ color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input"
                style={{ border: 'none', outline: 'none', padding: '0.25rem' }}
              />
            </div>
          </div>

          {/* Productos - SCROLL INDIVIDUAL */}
          {!mostrarProductos ? (
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Search size={48} style={{ color: '#d1d5db', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                Busque un producto para comenzar
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                Escanee un código o busque por nombre
              </p>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <p style={{ color: '#6b7280' }}>No se encontraron productos</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.5rem',
              overflowY: 'auto',
              flex: 1,
              paddingRight: '0.5rem',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {productosFiltrados.map(producto => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  onAgregar={agregarAlCarrito}
                  monedaSeleccionada={monedaSeleccionada}
                  cotizaciones={cotizaciones}
                />
              ))}
            </div>
          )}
        </div>

        {/* Carrito - MÁS GRANDE Y COMPACTO */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              Carrito
            </h2>
            {/* Mostrar cotizaciones */}
            {cotizaciones.dolarPromedio && (
              <div style={{ fontSize: '0.75rem', color: '#000000ff', textAlign: 'right' }}>
                <div>USD: ${cotizaciones.dolarPromedio.toFixed(2)}</div>
                <div>BRL: ${cotizaciones.realPromedio.toFixed(2)}</div>
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            willChange: 'contents',
            transform: 'translateZ(0)', // GPU acceleration
            backfaceVisibility: 'hidden' // Anti-flashing
          }}>
            {carrito.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af'
              }}>
                <ShoppingCart size={48} />
                <p style={{ marginTop: '1rem' }}>El carrito está vacío</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Agregue productos para comenzar
                </p>
              </div>
            ) : (
              <>
                {/* Selectores - MÁS COMPACTOS */}
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>
                  {/* Selector de Moneda */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                      Moneda:
                    </label>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {['ARS', 'USD', 'BRL'].map(moneda => (
                        <button
                          key={moneda}
                          onClick={() => setMonedaSeleccionada(moneda)}
                          style={{
                            flex: 1,
                            padding: '0.375rem',
                            backgroundColor: monedaSeleccionada === moneda ? '#3b82f6' : '#e5e7eb',
                            color: monedaSeleccionada === moneda ? 'white' : '#374151',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          {moneda === 'ARS' ? 'ARS $' : moneda}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Método de Pago */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                      Método de Pago:
                    </label>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={() => setMetodoPago('normal')}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: metodoPago === 'normal' ? '#3b82f6' : '#e5e7eb',
                          color: metodoPago === 'normal' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <DollarSign size={16} />
                        Normal
                      </button>
                      <button
                        onClick={() => setMetodoPago('efectivo')}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: metodoPago === 'efectivo' ? '#10b981' : '#e5e7eb',
                          color: metodoPago === 'efectivo' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <Banknote size={16} />
                        Efectivo (-8%)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items del carrito - SCROLL INDEPENDIENTE */}
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
                          borderBottom: '1px solid #e5e7eb',
                          paddingBottom: '0.5rem',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.375rem' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.nombre}</h4>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
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
                              color: '#ef4444'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => modificarCantidad(item.producto_id, item.cantidad - 1)}
                            style={{
                              padding: '0.25rem 0.625rem',
                              backgroundColor: '#e5e7eb',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.875rem'
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 'bold', minWidth: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => modificarCantidad(item.producto_id, item.cantidad + 1)}
                            style={{
                              padding: '0.25rem 0.625rem',
                              backgroundColor: '#e5e7eb',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.875rem'
                            }}
                          >
                            +
                          </button>
                          <span style={{ marginLeft: 'auto', fontWeight: 'bold', fontSize: '0.875rem' }}>
                            {getSimbolo()}{(precioFinal * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total y finalizar - COMPACTO */}
                <div style={{
                  backgroundColor: metodoPago === 'efectivo' ? '#d1fae5' : '#dbeafe',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${metodoPago === 'efectivo' ? '#86efac' : '#93c5fd'}`
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total a pagar:</span>
                    <span style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold', 
                      color: metodoPago === 'efectivo' ? '#059669' : '#1e40af' 
                    }}>
                      {getSimbolo()}{totalCarrito.toFixed(2)}
                    </span>
                  </div>
                  {metodoPago === 'efectivo' && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#059669', 
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      textAlign: 'center'
                    }}>
                      🎉 Ahorro: {getSimbolo()}{(totalCarrito / 0.92 * 0.08).toFixed(2)}
                    </div>
                  )}
                  <button
                    onClick={finalizarVenta}
                    className="btn"
                    style={{ 
                      width: '100%', 
                      padding: '0.625rem', 
                      fontSize: '1rem',
                      backgroundColor: metodoPago === 'efectivo' ? '#10b981' : '#3b82f6',
                      color: 'white'
                    }}
                  >
                    Finalizar Venta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ventas;