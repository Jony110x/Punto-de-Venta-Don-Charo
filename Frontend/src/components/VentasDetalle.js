/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Download, 
  Calendar, 
  User, 
  Filter, 
  ChevronDown,
  ChevronUp,
  Search,
  Loader,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';

const VentasDetalle = () => {
  const { theme } = useTheme();
  
  // Estados principales
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    usuario_id: '',
    metodo_pago: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estados de UI
  const [ventaExpandida, setVentaExpandida] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  
  // Estado para detectar tamaño de pantalla
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const LIMIT = 50;
  const observerRef = useRef();
  const ventasContainerRef = useRef();

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

  // Cargar ventas con paginación
  const cargarVentas = useCallback(async (skipValue = 0, reset = false) => {
    if (!hasMore && !reset) return;
    
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = {
        skip: skipValue,
        limit: LIMIT,
        ...filtros
      };

      // Limpiar parámetros vacíos
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await api.get('/ventas-detalle/', { params });
      const { ventas: nuevasVentas, total: totalVentas, has_more } = response.data;

      if (reset) {
        setVentas(nuevasVentas);
      } else {
        setVentas(prev => [...prev, ...nuevasVentas]);
      }
      
      setTotal(totalVentas);
      setHasMore(has_more);
      setSkip(skipValue + LIMIT);

    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filtros, hasMore]);

  // Cargar estadísticas según filtros
  const cargarEstadisticas = useCallback(async () => {
    try {
      const params = {};
      if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;

      const response = await api.get('/ventas-detalle/estadisticas', { params });
      setEstadisticas(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, [filtros.fecha_desde, filtros.fecha_hasta]);

  // Carga inicial
  useEffect(() => {
    cargarVentas(0, true);
    cargarEstadisticas();
  }, []);

  // Aplicar filtros y recargar
  const aplicarFiltros = () => {
    setVentas([]);
    setSkip(0);
    setHasMore(true);
    cargarVentas(0, true);
    cargarEstadisticas();
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltros({
      fecha_desde: '',
      fecha_hasta: '',
      usuario_id: '',
      metodo_pago: ''
    });
    setVentas([]);
    setSkip(0);
    setHasMore(true);
    setTimeout(() => {
      cargarVentas(0, true);
      cargarEstadisticas();
    }, 100);
  };

  // Intersection Observer para scroll infinito
  const lastVentaRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        cargarVentas(skip);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, skip, cargarVentas]);

  // Exportar a Excel con descarga directa
  const exportarExcel = async () => {
    try {
      setExportando(true);
      
      const params = {};
      if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
      if (filtros.usuario_id) params.usuario_id = filtros.usuario_id;
      if (filtros.metodo_pago) params.metodo_pago = filtros.metodo_pago;

      const queryString = new URLSearchParams(params).toString();
      const url = `${api.defaults.baseURL}/ventas-detalle/exportar${queryString ? '?' + queryString : ''}`;
      
      const token = localStorage.getItem('token');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Obtener nombre del archivo
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'ventas_export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      console.log('Excel descargado exitosamente');
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar a Excel. Verifica la consola.');
    } finally {
      setExportando(false);
    }
  };

  // Alternar expansión de detalles de venta
  const toggleExpandir = (ventaId) => {
    setVentaExpandida(ventaExpandida === ventaId ? null : ventaId);
  };

  // Formatear fecha
  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    if (isMobile) {
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear moneda
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Componente de tarjeta de venta para mobile - CON DARK MODE
  const VentaCard = ({ venta, isLast }) => {
    const isExpanded = ventaExpandida === venta.id;
    
    return (
      <div
        ref={isLast ? lastVentaRef : null}
        style={{
          backgroundColor: theme.bg.card,
          border: `2px solid ${theme.border.light}`,
          borderRadius: '0.5rem',
          overflow: 'hidden',
          marginBottom: '0.5rem'
        }}
      >
        {/* Header de la venta */}
        <div
          onClick={() => toggleExpandir(venta.id)}
          style={{
            padding: '0.75rem',
            cursor: 'pointer',
            backgroundColor: isExpanded ? theme.bg.hover : theme.bg.card
          }}
        >
          {/* Primera fila: ID y Total */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#1e40af',
              fontSize: '1rem'
            }}>
              Venta #{venta.id}
            </div>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#10b981', 
              fontSize: '1.125rem' 
            }}>
              {formatMoney(venta.total)}
            </div>
          </div>

          {/* Segunda fila: Fecha y Usuario */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.375rem',
              fontSize: '0.8125rem',
              color: theme.text.primary
            }}>
              <Calendar size={14} style={{ color: theme.text.secondary, flexShrink: 0 }} />
              <span style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {formatFecha(venta.fecha)}
              </span>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.375rem',
              fontSize: '0.8125rem',
              color: theme.text.primary
            }}>
              <User size={14} style={{ color: theme.text.secondary, flexShrink: 0 }} />
              <span style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {venta.usuario_nombre_completo || venta.usuario_nombre}
              </span>
            </div>
          </div>

          {/* Tercera fila: Método de pago e items */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: venta.metodo_pago === 'efectivo' ? '#d1fae5' : '#dbeafe',
              color: venta.metodo_pago === 'efectivo' ? '#065f46' : '#1e40af',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <CreditCard size={12} />
              {venta.metodo_pago === 'efectivo' ? 'EFECTIVO -8%' : 'NORMAL'}
            </span>

            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem', 
              color: theme.text.secondary
            }}>
              <span>
                {venta.cantidad_items} item{venta.cantidad_items !== 1 ? 's' : ''}
              </span>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {/* Detalle expandido */}
        {isExpanded && (
          <div style={{
            padding: '0.75rem',
            borderTop: `1px solid ${theme.border.light}`,
            backgroundColor: theme.bg.secondary
          }}>
            <h4 style={{ 
              fontWeight: 600, 
              marginBottom: '0.75rem', 
              color: theme.text.primary,
              fontSize: '0.875rem'
            }}>
              Productos:
            </h4>
            
            {/* Lista de productos en formato compacto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {venta.items.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{
                    backgroundColor: theme.bg.card,
                    padding: '0.625rem',
                    borderRadius: '0.375rem',
                    border: `1px solid ${theme.border.light}`
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ 
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: theme.text.primary,
                      flex: 1
                    }}>
                      {item.producto_nombre}
                    </span>
                    <span style={{ 
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      color: '#10b981',
                      marginLeft: '0.5rem'
                    }}>
                      {formatMoney(item.subtotal)}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: theme.text.secondary
                  }}>
                    <span>Cant: {item.cantidad}</span>
                    <span>P.Unit: {formatMoney(item.precio_unitario)}</span>
                  </div>
                </div>
              ))}
            </div>

            {venta.observaciones && (
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.625rem', 
                backgroundColor: '#fef3c7', 
                borderRadius: '0.375rem' 
              }}>
                <span style={{ fontSize: '0.8125rem', color: '#92400e' }}>
                  <strong>Obs:</strong> {venta.observaciones}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 180px)', 
      display: 'flex', 
      flexDirection: 'column',
      padding: isMobile ? '0.5rem' : '0.5rem',
      overflow: 'hidden'
    }}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          /* Scrollbar personalizado con tema */
          div[style*="overflow"] {
            scrollbar-width: thin;
          }
          
          div[style*="overflow"]::-webkit-scrollbar {
            width: 8px;
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
        `}
      </style>

      {/* Header fijo */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '0.75rem' : '0',
        marginBottom: '0.5rem',
        flexShrink: 0
      }}>
        <h1 style={{ 
          fontSize: isMobile ? '1.5rem' : '1.875rem', 
          fontWeight: 'bold', 
          color: theme.brand.primary,
          margin: 0
        }}>
          Detalle de Ventas
        </h1>
        
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.625rem' : '0.625rem 1rem',
              backgroundColor: mostrarFiltros ? theme.brand.primary : theme.bg.card,
              color: mostrarFiltros ? theme.text.white : theme.brand.primary,
              border: `2px solid ${theme.brand.primary}`,
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
              flex: isMobile ? '1' : 'none',
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}
          >
            <Filter size={isMobile ? 16 : 18} />
            {!isMobile && 'Filtros'}
          </button>
          
          <button
            onClick={exportarExcel}
            disabled={exportando || ventas.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.625rem' : '0.625rem 1rem',
              backgroundColor: exportando ? theme.text.secondary : theme.brand.success,
              color: theme.text.white,
              border: 'none',
              borderRadius: '0.5rem',
              cursor: exportando || ventas.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
              flex: isMobile ? '1' : 'none',
              fontSize: isMobile ? '0.875rem' : '1rem',
              opacity: exportando || ventas.length === 0 ? 0.6 : 1
            }}
          >
            {exportando ? (
              <>
                <Loader size={isMobile ? 16 : 18} style={{ animation: 'spin 1s linear infinite' }} />
                {isMobile ? 'Exportando' : 'Exportando...'}
              </>
            ) : (
              <>
                <Download size={isMobile ? 16 : 18} />
                {isMobile ? 'Excel' : 'Exportar Excel'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div style={{
          backgroundColor: theme.bg.secondary,
          padding: isMobile ? '0.75rem' : '0.5rem',
          borderRadius: '0.5rem',
          marginBottom: '0.5rem',
          border: `2px solid ${theme.border.light}`,
          flexShrink: 0
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '0.75rem' : '1rem',
            marginBottom: isMobile ? '0.75rem' : '0.5rem'
          }}>
            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                display: 'block', 
                marginBottom: '0.5rem' 
              }}>
                Fecha Desde
              </label>
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${theme.input.border}`,
                  borderRadius: '0.375rem',
                  fontSize: isMobile ? '16px' : '0.875rem',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  maxWidth: '100%',
                  backgroundColor: theme.input.bg,
                  color: theme.text.primary
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                display: 'block', 
                marginBottom: '0.5rem' 
              }}>
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${theme.input.border}`,
                  borderRadius: '0.375rem',
                  fontSize: isMobile ? '16px' : '0.875rem',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  maxWidth: '100%',
                  backgroundColor: theme.input.bg,
                  color: theme.text.primary
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: theme.text.primary, 
                display: 'block', 
                marginBottom: '0.5rem' 
              }}>
                Método de Pago
              </label>
              <select
                value={filtros.metodo_pago}
                onChange={(e) => setFiltros({ ...filtros, metodo_pago: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${theme.input.border}`,
                  borderRadius: '0.375rem',
                  fontSize: isMobile ? '16px' : '0.875rem',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  maxWidth: '100%',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.25rem',
                  paddingRight: '2.5rem',
                  backgroundColor: theme.input.bg,
                  color: theme.text.primary
                }}
              >
                <option value="">Todos</option>
                <option value="normal">Normal</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: '0.75rem' 
          }}>
            <button
              onClick={aplicarFiltros}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: theme.brand.primary,
                color: theme.text.white,
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 600,
                flex: isMobile ? 1 : 'none'
              }}
            >
              Aplicar Filtros
            </button>
            <button
              onClick={limpiarFiltros}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: theme.bg.card,
                color: theme.text.primary,
                border: `1px solid ${theme.border.light}`,
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 600,
                flex: isMobile ? 1 : 'none'
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      {estadisticas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isMobile ? '0.5rem' : '1rem',
          marginBottom: '0.5rem',
          flexShrink: 0
        }}>
          <div style={{
            backgroundColor: theme.bg.card,
            padding: isMobile ? '0.75rem' : '1rem',
            borderRadius: '0.5rem',
            border: `2px solid ${theme.border.light}`
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem'
            }}>
              {isMobile && <ShoppingCart size={14} style={{ color: '#1e40af' }} />}
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: theme.text.secondary }}>
                Total Ventas
              </div>
            </div>
            <div style={{ 
              fontSize: isMobile ? '1.5rem' : '1.875rem', 
              fontWeight: 'bold', 
              color: '#1e40af' 
            }}>
              {estadisticas.total_ventas}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.bg.card,
            padding: isMobile ? '0.75rem' : '1rem',
            borderRadius: '0.5rem',
            border: `2px solid ${theme.border.light}`
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem'
            }}>
              {isMobile && <DollarSign size={14} style={{ color: '#10b981' }} />}
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: theme.text.secondary }}>
                Total Recaudado
              </div>
            </div>
            <div style={{ 
              fontSize: isMobile ? '1.25rem' : '1.875rem', 
              fontWeight: 'bold', 
              color: '#10b981' 
            }}>
              {formatMoney(estadisticas.total_recaudado)}
            </div>
          </div>

          {!isMobile && (
            <>
              <div style={{
                backgroundColor: theme.bg.card,
                padding: '1rem',
                borderRadius: '0.5rem',
                border: `2px solid ${theme.border.light}`
              }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem'
                }}>
                  <TrendingUp size={14} style={{ color: '#f59e0b' }} />
                  <div style={{ fontSize: '0.875rem', color: theme.text.secondary }}>
                    Promedio por Venta
                  </div>
                </div>
                <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {formatMoney(estadisticas.promedio_venta)}
                </div>
              </div>

              <div style={{
                backgroundColor: theme.bg.card,
                padding: '1rem',
                borderRadius: '0.5rem',
                border: `2px solid ${theme.border.light}`
              }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem'
                }}>
                  <CreditCard size={14} style={{ color: '#8b5cf6' }} />
                  <div style={{ fontSize: '0.875rem', color: theme.text.secondary }}>
                    Efectivo / Normal
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {estadisticas.ventas_efectivo} / {estadisticas.ventas_normal}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Container de ventas con scroll */}
      <div 
        ref={ventasContainerRef}
        style={{ 
          flex: 1,
          overflowY: 'auto',
          paddingRight: isMobile ? '0' : '0.5rem'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: isMobile ? '2rem 1rem' : '3rem' }}>
            <Loader 
              size={isMobile ? 40 : 48} 
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: theme.brand.primary }} 
            />
            <p style={{ marginTop: '1rem', color: theme.text.secondary, fontSize: isMobile ? '0.875rem' : '1rem' }}>
              Cargando ventas...
            </p>
          </div>
        ) : ventas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '2rem 1rem' : '3rem',
            backgroundColor: theme.bg.card,
            borderRadius: '0.5rem',
            border: `2px solid ${theme.border.light}`
          }}>
            <Search size={isMobile ? 40 : 48} style={{ margin: '0 auto', color: theme.border.medium }} />
            <p style={{ 
              marginTop: '1rem', 
              color: theme.text.secondary,
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}>
              No se encontraron ventas con los filtros aplicados
            </p>
          </div>
        ) : (
          <>
            {isMobile ? (
              // Vista Mobile: Cards
              <div>
                {ventas.map((venta, index) => (
                  <VentaCard 
                    key={venta.id} 
                    venta={venta} 
                    isLast={index === ventas.length - 1}
                  />
                ))}
              </div>
            ) : (
              // Vista Desktop: Lista expandible
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {ventas.map((venta, index) => {
                  const isLast = index === ventas.length - 1;
                  const isExpanded = ventaExpandida === venta.id;

                  return (
                    <div
                      key={venta.id}
                      ref={isLast ? lastVentaRef : null}
                      style={{
                        backgroundColor: theme.bg.card,
                        border: `2px solid ${theme.border.light}`,
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Header de la venta */}
                      <div
                        onClick={() => toggleExpandir(venta.id)}
                        style={{
                          padding: '0.5rem',
                          cursor: 'pointer',
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 150px 150px 120px 100px 50px',
                          alignItems: 'center',
                          gap: '1rem',
                          backgroundColor: isExpanded ? theme.bg.hover : theme.bg.card
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                          #{venta.id}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar size={16} style={{ color: theme.text.secondary }} />
                          <span style={{ fontSize: '0.875rem', color: theme.text.primary }}>
                            {formatFecha(venta.fecha)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={16} style={{ color: theme.text.secondary }} />
                          <span style={{ fontSize: '0.875rem', color: theme.text.primary }}>
                            {venta.usuario_nombre_completo || venta.usuario_nombre}
                          </span>
                        </div>

                        <div>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: venta.metodo_pago === 'efectivo' ? '#d1fae5' : '#dbeafe',
                            color: venta.metodo_pago === 'efectivo' ? '#065f46' : '#1e40af'
                          }}>
                            {venta.metodo_pago === 'efectivo' ? 'EFECTIVO -8%' : 'NORMAL'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.875rem', color: theme.text.secondary }}>
                          {venta.cantidad_items} item{venta.cantidad_items !== 1 ? 's' : ''}
                        </div>

                        <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.125rem' }}>
                          {formatMoney(venta.total)}
                        </div>

                        <div style={{ color: theme.text.secondary }}>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>

                      {/* Detalle expandido */}
                      {isExpanded && (
                        <div style={{
                          padding: '1rem',
                          borderTop: `1px solid ${theme.border.light}`,
                          backgroundColor: theme.bg.secondary
                        }}>
                          <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: theme.text.primary }}>
                            Productos:
                          </h4>
                          
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: `2px solid ${theme.border.light}` }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.875rem', color: theme.text.secondary }}>
                                  Producto
                                </th>
                                <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.875rem', color: theme.text.secondary }}>
                                  Cantidad
                                </th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem', color: theme.text.secondary }}>
                                  Precio Unit.
                                </th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.875rem', color: theme.text.secondary }}>
                                  Subtotal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {venta.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${theme.border.light}` }}>
                                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: theme.text.primary }}>
                                    {item.producto_nombre}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', color: theme.text.primary }}>
                                    {item.cantidad}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', color: theme.text.primary }}>
                                    {formatMoney(item.precio_unitario)}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: theme.text.primary }}>
                                    {formatMoney(item.subtotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {venta.observaciones && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '0.375rem' }}>
                              <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
                                <strong>Observaciones:</strong> {venta.observaciones}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {loadingMore && (
              <div style={{ textAlign: 'center', padding: isMobile ? '1.5rem' : '2rem' }}>
                <Loader 
                  size={isMobile ? 28 : 32} 
                  style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: theme.brand.primary }} 
                />
                <p style={{ 
                  marginTop: '0.5rem', 
                  color: theme.text.secondary, 
                  fontSize: isMobile ? '0.8125rem' : '0.875rem'
                }}>
                  Cargando más ventas...
                </p>
              </div>
            )}

            {!hasMore && ventas.length > 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: isMobile ? '1.5rem' : '2rem', 
                color: theme.text.secondary,
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}>
                Todas las ventas cargadas ({total} total)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VentasDetalle;