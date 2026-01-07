/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, Package, ShoppingCart, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { getDashboardHoy, getProductosStockBajo, getProductosStockCritico } from '../api/api';
import { useToast } from '../Toast';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const toast = useToast();
  const { theme } = useTheme();
  
  // Estados principales
  const [stats, setStats] = useState({
    ganancia_hoy: 0,
    ventas_hoy: 0,
    cantidad_ventas_hoy: 0,
    productos_vendidos_hoy: 0,
    productos_stock_bajo: 0,
    productos_stock_critico: 0
  });
  const [productosStockBajo, setProductosStockBajo] = useState([]);
  const [productosStockCritico, setProductosStockCritico] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de paginación para stock bajo
  const [skipBajo, setSkipBajo] = useState(0);
  const [hasMoreBajo, setHasMoreBajo] = useState(true);
  const [totalBajo, setTotalBajo] = useState(0);
  const [loadingMoreBajo, setLoadingMoreBajo] = useState(false);
  const LIMIT_BAJO = 20;
  
  // Estados de paginación para stock crítico
  const [skipCritico, setSkipCritico] = useState(0);
  const [hasMoreCritico, setHasMoreCritico] = useState(true);
  const [totalCritico, setTotalCritico] = useState(0);
  const [loadingMoreCritico, setLoadingMoreCritico] = useState(false);
  const LIMIT_CRITICO = 20;
  
  // Estados de colapso - Crítico expandido por defecto
  const [criticoColapsado, setCriticoColapsado] = useState(true);
  const [bajoColapsado, setBajoColapsado] = useState(true);
  
  // Refs para Intersection Observer
  const observerBajoRef = useRef(null);
  const observerCriticoRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const dashboardRes = await getDashboardHoy();
      setStats(dashboardRes.data);
      
      await Promise.allSettled([
        cargarStockBajo(0, true),
        cargarStockCritico(0, true)
      ]).then(results => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Falló carga ${index === 0 ? 'stock bajo' : 'stock crítico'}:`, result.reason);
          }
        });
      });
      
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const cargarStockBajo = async (skipValue, reset = false) => {
    const currentSkip = skipValue !== undefined ? skipValue : skipBajo;

    if (!hasMoreBajo && !reset) return;
    
    try {
      if (!reset) setLoadingMoreBajo(true);
      
      const response = await getProductosStockBajo({
        skip: currentSkip,
        limit: LIMIT_BAJO
      });
      
      const { productos, total, has_more } = response.data;
      
      if (reset) {
        setProductosStockBajo(productos || []);
        setSkipBajo(LIMIT_BAJO);
      } else {
        setProductosStockBajo(prev => [...prev, ...(productos || [])]);
        setSkipBajo(currentSkip + LIMIT_BAJO);
      }
      
      setTotalBajo(total || 0);
      setHasMoreBajo(has_more || false);
      
      if (reset && total > 0) {
        const mensaje = total === 1 
          ? '1 producto con stock bajo'
          : `${total} productos con stock bajo`;
        toast.warning(mensaje);
      }
      
    } catch (error) {
      console.error('Error cargando stock bajo:', error);
    } finally {
      setLoadingMoreBajo(false);
    }
  };

  const cargarStockCritico = async (skipValue, reset = false) => {
    const currentSkip = skipValue !== undefined ? skipValue : skipCritico;
    
    if (!hasMoreCritico && !reset) return;
    
    try {
      if (!reset) setLoadingMoreCritico(true);
      
      const response = await getProductosStockCritico({
        skip: currentSkip,
        limit: LIMIT_CRITICO
      });
      
      const { productos, total, has_more } = response.data;
  
      if (reset) {
        setProductosStockCritico(productos || []);
        setSkipCritico(LIMIT_CRITICO);
      } else {
        setProductosStockCritico(prev => [...prev, ...(productos || [])]);
        setSkipCritico(currentSkip + LIMIT_CRITICO);
      }
      
      setTotalCritico(total || 0);
      setHasMoreCritico(has_more || false);
      
      if (reset && total > 0) {
        const mensaje = total === 1 
          ? '1 producto en stock CRÍTICO'
          : `${total} productos en stock CRÍTICO`;
        toast.error(mensaje);
      }
      
    } catch (error) {
      console.error('Error cargando stock crítico:', error);
    } finally {
      setLoadingMoreCritico(false);
    }
  };

  const toggleCritico = () => {
    if (criticoColapsado) {
      setBajoColapsado(true);
    }
    setCriticoColapsado(!criticoColapsado);
  };

  const toggleBajo = () => {
    if (bajoColapsado) {
      setCriticoColapsado(true);
    }
    setBajoColapsado(!bajoColapsado);
  };

  const lastProductBajoRef = useCallback(node => {
    if (loading || loadingMoreBajo) return;
    if (observerBajoRef.current) observerBajoRef.current.disconnect();
    
    observerBajoRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreBajo) {
        cargarStockBajo(skipBajo);
      }
    });
    
    if (node) observerBajoRef.current.observe(node);
  }, [loading, loadingMoreBajo, hasMoreBajo, skipBajo]);

  const lastProductCriticoRef = useCallback(node => {
    if (loading || loadingMoreCritico) return;
    if (observerCriticoRef.current) observerCriticoRef.current.disconnect();
    
    observerCriticoRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreCritico) {
        cargarStockCritico(skipCritico);
      }
    });
    
    if (node) observerCriticoRef.current.observe(node);
  }, [loading, loadingMoreCritico, hasMoreCritico, skipCritico]);

  // Skeleton para tarjetas
  const StatCardSkeleton = () => (
    <div style={{
      backgroundColor: theme.bg.tertiary,
      padding: 'clamp(0.75rem, 2vw, 1.25rem)',
      borderRadius: '0.5rem',
      border: `2px solid ${theme.border.light}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            height: '0.875rem',
            width: '60%',
            backgroundColor: theme.border.medium,
            borderRadius: '0.25rem',
            marginBottom: '0.75rem',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{ 
            height: 'clamp(1.25rem, 4vw, 1.75rem)',
            width: '80%',
            backgroundColor: theme.border.medium,
            borderRadius: '0.25rem',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
        <div style={{ 
          width: 'clamp(32px, 8vw, 44px)',
          height: 'clamp(32px, 8vw, 44px)',
          backgroundColor: theme.border.medium,
          borderRadius: '0.375rem',
          animation: 'pulse 1.5s ease-in-out infinite',
          flexShrink: 0
        }} />
      </div>
    </div>
  );

  // Skeleton para productos
  const ProductoSkeleton = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 'clamp(0.5rem, 2vw, 0.75rem)',
      backgroundColor: theme.bg.hover,
      borderRadius: '0.375rem',
      border: `1px solid ${theme.border.light}`,
      gap: '0.5rem'
    }}>
      <div style={{ 
        height: '1rem',
        flex: 1,
        backgroundColor: theme.border.medium,
        borderRadius: '0.25rem',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{ 
        height: '1.5rem',
        width: 'clamp(60px, 25%, 100px)',
        backgroundColor: theme.border.medium,
        borderRadius: '0.25rem',
        animation: 'pulse 1.5s ease-in-out infinite',
        flexShrink: 0
      }} />
    </div>
  );

  return (
    <div style={{ 
      padding: 'clamp(0.5rem, 2vw, 1.25rem)',
      height: 'calc(100vh - 140px)', 
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Estilos CSS */}
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
          
          /* Mejorar scroll en móviles */
          @media (max-width: 768px) {
            * {
              -webkit-overflow-scrolling: touch;
            }
          }
        `}
      </style>

      {/* Título */}
      <h2 style={{ 
        fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', 
        fontWeight: 'bold', 
        marginBottom: 'clamp(0.75rem, 2vw, 1rem)', 
        flexShrink: 0,
        lineHeight: 1.2,
        color: theme.text.primary
      }}>
        Panel de Control - Hoy
      </h2>

      {/* Grid de tarjetas de estadísticas - Responsive */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: 'clamp(0.5rem, 2vw, 1rem)',
        marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
        flexShrink: 0
      }}>
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {/* Tarjeta de ganancias */}
            <div style={{
              backgroundColor: '#d1fae5',
              padding: 'clamp(0.75rem, 2vw, 1.25rem)',
              borderRadius: '0.5rem',
              border: '2px solid #86efac'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ 
                    fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', 
                    color: '#15803d', 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Ganancias Hoy
                  </p>
                  <p style={{ 
                    fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', 
                    fontWeight: 'bold', 
                    color: '#166534',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    ${stats.ganancia_hoy.toFixed(2)}
                  </p>
                </div>
                <TrendingUp size={window.innerWidth < 640 ? 32 : 44} style={{ color: '#22c55e', flexShrink: 0 }} />
              </div>
            </div>

            {/* Tarjeta de ventas */}
            <div style={{
              backgroundColor: '#dbeafe',
              padding: 'clamp(0.75rem, 2vw, 1.25rem)',
              borderRadius: '0.5rem',
              border: '2px solid #93c5fd'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ 
                    fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', 
                    color: '#1e40af', 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Ventas Hoy
                  </p>
                  <p style={{ 
                    fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', 
                    fontWeight: 'bold', 
                    color: '#1e3a8a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    ${stats.ventas_hoy.toFixed(2)}
                  </p>
                </div>
                <DollarSign size={window.innerWidth < 640 ? 32 : 44} style={{ color: '#3b82f6', flexShrink: 0 }} />
              </div>
            </div>

            {/* Tarjeta de productos vendidos */}
            <div style={{
              backgroundColor: '#fce7f3',
              padding: 'clamp(0.75rem, 2vw, 1.25rem)',
              borderRadius: '0.5rem',
              border: '2px solid #fbcfe8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ 
                    fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', 
                    color: '#9f1239', 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Productos Vendidos
                  </p>
                  <p style={{ 
                    fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', 
                    fontWeight: 'bold', 
                    color: '#881337',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {stats.productos_vendidos_hoy}
                  </p>
                </div>
                <Package size={window.innerWidth < 640 ? 32 : 44} style={{ color: '#ec4899', flexShrink: 0 }} />
              </div>
            </div>

            {/* Tarjeta de transacciones */}
            <div style={{
              backgroundColor: '#f3e8ff',
              padding: 'clamp(0.75rem, 2vw, 1.25rem)',
              borderRadius: '0.5rem',
              border: '2px solid #d8b4fe'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ 
                    fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', 
                    color: '#6b21a8', 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Transacciones Hoy
                  </p>
                  <p style={{ 
                    fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', 
                    fontWeight: 'bold', 
                    color: '#581c87',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {stats.cantidad_ventas_hoy}
                  </p>
                </div>
                <ShoppingCart size={window.innerWidth < 640 ? 32 : 44} style={{ color: '#a855f7', flexShrink: 0 }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Secciones de alertas de stock */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: criticoColapsado ? 'flex-start' : 'space-between',
        gap: 'clamp(0.5rem, 2vw, 1rem)',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        
        {loading ? (
          <>
            {/* Skeletons */}
            <div style={{
              backgroundColor: theme.bg.tertiary,
              padding: 'clamp(0.75rem, 2vw, 1.25rem)',
              borderRadius: '0.5rem',
              border: `2px solid ${theme.border.light}`,
              flexShrink: 0
            }}>
              <div style={{ 
                height: 'clamp(1.25rem, 3vw, 1.5rem)',
                width: '60%',
                backgroundColor: theme.border.medium,
                borderRadius: '0.25rem',
                marginBottom: '1rem',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <ProductoSkeleton />
                <ProductoSkeleton />
                <ProductoSkeleton />
              </div>
            </div>

            <div style={{
              backgroundColor: theme.bg.tertiary,
              padding: 'clamp(0.75rem, 2vw, 1.25rem)',
              borderRadius: '0.5rem',
              border: `2px solid ${theme.border.light}`,
              flexShrink: 0
            }}>
              <div style={{ 
                height: 'clamp(1.25rem, 3vw, 1.5rem)',
                width: '60%',
                backgroundColor: theme.border.medium,
                borderRadius: '0.25rem',
                marginBottom: '1rem',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <ProductoSkeleton />
                <ProductoSkeleton />
                <ProductoSkeleton />
                <ProductoSkeleton />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sección de productos con stock crítico */}
            {(totalCritico > 0) && (
              <div style={{
                backgroundColor: '#fee2e2',
                borderRadius: '0.5rem',
                border: '2px solid #fca5a5',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                ...(!criticoColapsado ? { 
                  flex: '1 1 0',
                  minHeight: 0 
                } : { 
                  flexShrink: 0,
                  flexGrow: 0
                })
              }}>
                {/* Header colapsable */}
                <div 
                  onClick={toggleCritico}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 2vw, 1.25rem)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <AlertTriangle size={window.innerWidth < 640 ? 18 : 22} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <h3 style={{ 
                      fontSize: 'clamp(0.875rem, 3vw, 1.25rem)', 
                      fontWeight: 'bold', 
                      color: '#991b1b', 
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: window.innerWidth < 640 ? 'normal' : 'nowrap'
                    }}>
                      Stock CRÍTICO {window.innerWidth >= 640 && '(menos de 5 unidades)'}
                    </h3>
                    <span style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {totalCritico}
                    </span>
                  </div>
                  {criticoColapsado ? (
                    <ChevronDown size={window.innerWidth < 640 ? 20 : 24} style={{ color: '#991b1b', flexShrink: 0 }} />
                  ) : (
                    <ChevronUp size={window.innerWidth < 640 ? 20 : 24} style={{ color: '#991b1b', flexShrink: 0 }} />
                  )}
                </div>

                {/* Lista de productos críticos */}
                {!criticoColapsado && (
                  <div style={{ 
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0 clamp(0.75rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.25rem)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 'clamp(0.375rem, 1vw, 0.5rem)',
                      flex: 1,
                      overflowY: 'auto',
                      paddingRight: '0.5rem'
                    }}>
                      {productosStockCritico?.map((producto, index) => {
                        const isLast = index === productosStockCritico.length - 1;
                        return (
                          <div
                            key={producto.id}
                            ref={isLast ? lastProductCriticoRef : null}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                              backgroundColor: '#fff',
                              borderRadius: '0.375rem',
                              border: '2px solid #dc2626',
                              flexShrink: 0,
                              gap: '0.5rem',
                              flexWrap: window.innerWidth < 640 ? 'wrap' : 'nowrap'
                            }}
                          >
                            <span style={{ 
                              fontWeight: 600,
                              fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
                              flex: window.innerWidth < 640 ? '1 1 100%' : '1 1 auto',
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: window.innerWidth < 640 ? 'normal' : 'nowrap'
                            }}>
                              {producto.nombre}
                            </span>
                            <span style={{ 
                              color: '#dc2626', 
                              fontWeight: 'bold',
                              backgroundColor: '#fee2e2',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              Stock: {producto.stock}
                            </span>
                          </div>
                        );
                      })}
                      
                      {loadingMoreCritico && (
                        <div style={{ 
                          padding: 'clamp(0.5rem, 2vw, 0.75rem)', 
                          textAlign: 'center',
                          color: '#991b1b',
                          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                          flexShrink: 0
                        }}>
                          Cargando más...
                        </div>
                      )}
                      
                      {!hasMoreCritico && (productosStockCritico?.length > 0) && (
                        <div style={{ 
                          padding: 'clamp(0.5rem, 2vw, 0.75rem)', 
                          textAlign: 'center',
                          color: '#991b1b',
                          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                          flexShrink: 0
                        }}>
                          Todos los productos cargados
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección de productos con stock bajo */}
            {(totalBajo > 0) && (
              <div style={{
                backgroundColor: theme.bg.card,
                borderRadius: '0.5rem',
                border: `2px solid ${theme.border.light}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                ...(!bajoColapsado ? { 
                  flex: '1 1 0',
                  minHeight: 0 
                } : { 
                  flexShrink: 0,
                  flexGrow: 0
                })
              }}>
                {/* Header colapsable */}
                <div 
                  onClick={toggleBajo}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 2vw, 1.25rem)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <AlertTriangle size={window.innerWidth < 640 ? 18 : 22} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <h3 style={{ 
                      fontSize: 'clamp(0.875rem, 3vw, 1.25rem)', 
                      fontWeight: 'bold', 
                      margin: 0,
                      color: theme.text.primary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: window.innerWidth < 640 ? 'normal' : 'nowrap'
                    }}>
                      Stock Bajo
                    </h3>
                    <span style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {totalBajo}
                    </span>
                  </div>
                  {bajoColapsado ? (
                    <ChevronDown size={window.innerWidth < 640 ? 20 : 24} style={{ color: theme.text.secondary, flexShrink: 0 }} />
                  ) : (
                    <ChevronUp size={window.innerWidth < 640 ? 20 : 24} style={{ color: theme.text.secondary, flexShrink: 0 }} />
                  )}
                </div>

                {/* Lista de productos con stock bajo */}
                {!bajoColapsado && (
                  <div style={{ 
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0 clamp(0.75rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.25rem)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 'clamp(0.375rem, 1vw, 0.5rem)',
                      flex: 1,
                      overflowY: 'auto',
                      paddingRight: '0.5rem'
                    }}>
                      {productosStockBajo?.map((producto, index) => {
                        const isLast = index === productosStockBajo.length - 1;
                        return (
                          <div
                            key={producto.id}
                            ref={isLast ? lastProductBajoRef : null}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                              backgroundColor: '#fef3c7',
                              borderRadius: '0.375rem',
                              border: '1px solid #fcd34d',
                              flexShrink: 0,
                              gap: '0.5rem',
                              flexWrap: window.innerWidth < 640 ? 'wrap' : 'nowrap'
                            }}
                          >
                            <span style={{ 
                              fontWeight: 600,
                              fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
                              flex: window.innerWidth < 640 ? '1 1 100%' : '1 1 auto',
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: window.innerWidth < 640 ? 'normal' : 'nowrap'
                            }}>
                              {producto.nombre}
                            </span>
                            <span style={{ 
                              color: '#92400e', 
                              fontWeight: 'bold',
                              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              Stock: {producto.stock} / Mín: {producto.stock_minimo}
                            </span>
                          </div>
                        );
                      })}
                      
                      {loadingMoreBajo && (
                        <div style={{ 
                          padding: 'clamp(0.5rem, 2vw, 0.75rem)', 
                          textAlign: 'center',
                          color: '#92400e',
                          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                          flexShrink: 0
                        }}>
                          Cargando más...
                        </div>
                      )}
                      
                      {!hasMoreBajo && (productosStockBajo?.length > 0) && (
                        <div style={{ 
                          padding: 'clamp(0.5rem, 2vw, 0.75rem)', 
                          textAlign: 'center',
                          color: '#92400e',
                          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                          flexShrink: 0
                        }}>
                          Todos los productos cargados
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mensaje cuando no hay alertas de stock */}
            {totalCritico === 0 && totalBajo === 0 && (
              <div style={{
                backgroundColor: '#d1fae5',
                padding: 'clamp(1rem, 3vw, 2rem)',
                borderRadius: '0.5rem',
                border: '2px solid #86efac',
                textAlign: 'center',
                flexShrink: 0
              }}>
                <p style={{ 
                  fontSize: 'clamp(0.875rem, 3vw, 1.125rem)', 
                  fontWeight: 600, 
                  color: '#065f46',
                  margin: 0
                }}>
                  No hay productos con stock bajo o crítico
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;