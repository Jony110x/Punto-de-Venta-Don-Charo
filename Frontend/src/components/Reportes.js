/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Package, Clock, RefreshCw, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { getDashboard, getVentasPorPeriodo, getCategoriasVendidas, getProductosVendidos, getVentasPorHorario, getVentasPorHorarioFecha, getGanancias, getMetodosPago } from '../api/api';
import { useToast } from '../Toast';

// Tooltip personalizado para gráficos
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '0.75rem',
        border: '2px solid #e5e7eb',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '0.875rem', margin: '0.25rem 0' }}>
            {entry.name}: {typeof entry.value === 'number' ? 
              (entry.name.includes('%') ? `${entry.value.toFixed(1)}%` : `${entry.value.toFixed(2)}`) 
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Componente skeleton para estado de carga
const ChartSkeleton = ({ height = 180 }) => (
  <div style={{ 
    width: '100%', 
    height: `${height}px`,
    backgroundColor: '#f3f4f6',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulse 1.5s ease-in-out infinite'
  }}>
    <div style={{ textAlign: 'center', color: '#9ca3af' }}>
      <div style={{ 
        width: '60px', 
        height: '60px', 
        margin: '0 auto',
        backgroundColor: '#e5e7eb',
        borderRadius: '0.5rem',
        marginBottom: '0.5rem',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <p style={{ fontSize: '0.75rem' }}>Cargando datos...</p>
    </div>
  </div>
);

const Reportes = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vistaActual, setVistaActual] = useState('ventas');
  const [periodoVentas, setPeriodoVentas] = useState('dia');
  const [periodoGanancias, setPeriodoGanancias] = useState('mes');
  const [graficoVentas, setGraficoVentas] = useState('cantidad');
  const [fechaHorario, setFechaHorario] = useState('');
  const [filtrosColapsados, setFiltrosColapsados] = useState(false);
  
  // Estados para datos de gráficos
  const [datosVentas, setDatosVentas] = useState([]);
  const [datosVentasGanancia, setDatosVentasGanancia] = useState([]);
  const [datosCategorias, setDatosCategorias] = useState([]);
  const [datosProductos, setDatosProductos] = useState([]);
  const [datosHorarios, setDatosHorarios] = useState([]);
  const [datosGanancias, setDatosGanancias] = useState([]);
  const [datosMetodosPago, setDatosMetodosPago] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  // Estado para detectar tamaño de pantalla
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

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

  // Inicializar fecha y cargar datos
  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setFechaHorario(hoy);
    cargarDatos();
  }, [periodoVentas, periodoGanancias]);

  // Cargar todos los datos de reportes en paralelo
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const dashRes = await getDashboard();
      setDashboard(dashRes.data);

      const [ventasRes, ganVentasRes, catRes, prodRes, metRes, horRes, ganRes] = await Promise.all([
        getVentasPorPeriodo(periodoVentas),
        getGanancias(periodoVentas),
        getCategoriasVendidas(10),
        getProductosVendidos(10),
        getMetodosPago(),
        getVentasPorHorarioFecha(fechaHorario),
        getGanancias(periodoGanancias)
      ]);

      setDatosVentas(ventasRes.data);
      setDatosVentasGanancia(ganVentasRes.data);
      setDatosCategorias(catRes.data);
      setDatosProductos(prodRes.data);
      setDatosMetodosPago(metRes.data);
      setDatosHorarios(horRes.data);
      setDatosGanancias(ganRes.data);
    } catch (error) {
      console.error('Error cargando reportes:', error);
      toast.error('Error al cargar los datos de reportes');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos de horarios para fecha específica
  const cargarDatosHorarios = async (nuevaFecha) => {
    try {
      const horRes = await getVentasPorHorarioFecha(nuevaFecha);
      setDatosHorarios(horRes.data);
    } catch (error) {
      console.error('Error cargando horarios:', error);
      toast.error('Error al cargar datos de horarios');
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Determinar columnas del grid según tamaño de pantalla
  const getGridColumns = () => {
    if (isMobile) return '1fr';
    if (isTablet) return '1fr 1fr';
    return '1fr 1fr 1fr';
  };

  // Altura de gráficos según tamaño de pantalla
  const getChartHeight = () => {
    if (isMobile) return 200;
    if (isTablet) return 180;
    return 180;
  };

  return (
    <div style={{ 
      padding: isMobile ? '0.5rem' : '0.75rem',
      height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)',
      display: 'flex',
      flexDirection: 'column',
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
          
          /* Scrollbar personalizado */
          div[style*="overflow"] {
            scrollbar-width: thin;
            scrollbar-gutter: stable;
          }
          
          div[style*="overflow"]::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          div[style*="overflow"]::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          
          div[style*="overflow"]::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 10px;
          }
          
          div[style*="overflow"]::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `}
      </style>

      {/* Header con controles */}
      <div style={{ 
        backgroundColor: 'white',
        padding: isMobile ? '0.75rem' : '1rem',
        borderRadius: '0.5rem',
        border: '2px solid #e5e7eb',
        marginBottom: '0.75rem',
        flexShrink: 0
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '0.75rem' : '0',
          marginBottom: filtrosColapsados ? 0 : (isMobile ? '0.75rem' : 0)
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ 
              fontSize: isMobile ? '1.25rem' : '1.5rem', 
              fontWeight: 'bold',
              margin: 0
            }}>
              Dashboard de Reportes
            </h2>
            {isMobile && (
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
              >
                {filtrosColapsados ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                {filtrosColapsados ? 'Mostrar filtros' : 'Ocultar filtros'}
              </button>
            )}
          </div>
          
          {(!isMobile || !filtrosColapsados) && (
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: '0.5rem', 
              alignItems: isMobile ? 'stretch' : 'center' 
            }}>
              {/* Selector de período */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(4, auto)',
                gap: '0.25rem'
              }}>
                {['dia', 'semana', 'mes', 'año'].map(periodo => (
                  <button
                    key={periodo}
                    onClick={() => {
                      setPeriodoVentas(periodo);
                      setPeriodoGanancias(periodo);
                    }}
                    style={{
                      padding: isMobile ? '0.5rem 0.375rem' : '0.375rem 0.75rem',
                      backgroundColor: periodoVentas === periodo ? '#3b82f6' : '#e5e7eb',
                      color: periodoVentas === periodo ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontSize: isMobile ? '0.75rem' : '0.8125rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {periodo}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={cargarDatos} 
                className="btn" 
                style={{ 
                  backgroundColor: '#6b7280', 
                  color: 'white', 
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: isMobile ? '0.8125rem' : '0.875rem'
                }} 
                disabled={loading}
              >
                <RefreshCw size={14} />
                {!isMobile && 'Actualizar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid de gráficos con scroll */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        minHeight: 0,
        paddingRight: isMobile ? '0' : '0.5rem'
      }}>
        {/* Fila 1: Ventas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: getGridColumns(),
          gap: isMobile ? '0.5rem' : '0.75rem', 
          marginBottom: isMobile ? '0.5rem' : '0.75rem' 
        }}>
          {/* Cantidad de Ventas */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '0.75rem' : '0.75rem', 
            borderRadius: '0.5rem', 
            border: '2px solid #e5e7eb' 
          }}>
            <h3 style={{ 
              fontSize: isMobile ? '0.9375rem' : '1rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem', 
              color: '#000000ff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {isMobile && <ShoppingCart size={16} />}
              Cantidad de Ventas
            </h3>
            {loading ? (
              <ChartSkeleton height={getChartHeight()} />
            ) : (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <LineChart data={datosVentas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="periodo" 
                    style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 60 : 30}
                  />
                  <YAxis style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="cantidad" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ r: isMobile ? 2 : 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Total en Ventas */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '0.75rem' : '0.75rem', 
            borderRadius: '0.5rem', 
            border: '2px solid #e5e7eb' 
          }}>
            <h3 style={{ 
              fontSize: isMobile ? '0.9375rem' : '1rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem', 
              color: '#010705ff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {isMobile && <DollarSign size={16} />}
              Total en Ventas
            </h3>
            {loading ? (
              <ChartSkeleton height={getChartHeight()} />
            ) : (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <LineChart data={datosVentas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="periodo" 
                    style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 60 : 30}
                  />
                  <YAxis style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={{ r: isMobile ? 2 : 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ganancias */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '0.75rem' : '0.75rem', 
            borderRadius: '0.5rem', 
            border: '2px solid #e5e7eb' 
          }}>
            <h3 style={{ 
              fontSize: isMobile ? '0.9375rem' : '1rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem', 
              color: '#000000ff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {isMobile && <TrendingUp size={16} />}
              Ganancias
            </h3>
            {loading ? (
              <ChartSkeleton height={getChartHeight()} />
            ) : (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <LineChart data={datosVentasGanancia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="periodo" 
                    style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 60 : 30}
                  />
                  <YAxis style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="ganancia" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={{ r: isMobile ? 2 : 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fila 2: Categorías, Métodos Pago, Horarios */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: getGridColumns(),
          gap: isMobile ? '0.5rem' : '0.75rem', 
          marginBottom: isMobile ? '0.5rem' : '0.75rem' 
        }}>
          {/* Top Categorías */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '0.75rem' : '0.75rem', 
            borderRadius: '0.5rem', 
            border: '2px solid #e5e7eb' 
          }}>
            <h3 style={{ 
              fontSize: isMobile ? '0.9375rem' : '1rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {isMobile && <Package size={16} />}
              Top {isMobile ? '5' : '10'} Categorías
            </h3>
            {loading ? (
              <ChartSkeleton height={getChartHeight()} />
            ) : (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <BarChart data={datosCategorias.slice(0, isMobile ? 5 : 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="categoria" 
                    style={{ fontSize: isMobile ? '0.55rem' : '0.65rem' }} 
                    angle={-45} 
                    textAnchor="end" 
                    height={isMobile ? 80 : 60} 
                  />
                  <YAxis style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cantidad" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Métodos de Pago */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '0.75rem' : '0.75rem', 
            borderRadius: '0.5rem', 
            border: '2px solid #e5e7eb' 
          }}>
            <h3 style={{ 
              fontSize: isMobile ? '0.9375rem' : '1rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {isMobile && <DollarSign size={16} />}
              Métodos de Pago
            </h3>
            {loading ? (
              <ChartSkeleton height={getChartHeight()} />
            ) : (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <PieChart>
                  <Pie
                    data={datosMetodosPago}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => {
                      const total = datosMetodosPago.reduce((sum, item) => sum + item.cantidad, 0);
                      const porcentaje = ((entry.cantidad / total) * 100).toFixed(1);
                      return isMobile ? `${porcentaje}%` : `${entry.metodo}: ${porcentaje}%`;
                    }}
                    outerRadius={isMobile ? 50 : 60}
                    fill="#8884d8"
                    dataKey="cantidad"
                    style={{ fontSize: isMobile ? '0.625rem' : '0.75rem' }}
                  >
                    {datosMetodosPago.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const total = datosMetodosPago.reduce((sum, item) => sum + item.cantidad, 0);
                      const porcentaje = ((value / total) * 100).toFixed(1);
                      return [`${value} (${porcentaje}%)`, 'Ventas'];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ventas por Horario */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '0.75rem' : '0.75rem', 
            borderRadius: '0.5rem', 
            border: '2px solid #e5e7eb' 
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between', 
              alignItems: isMobile ? 'stretch' : 'center', 
              marginBottom: '0.5rem',
              gap: isMobile ? '0.5rem' : '0'
            }}>
              <h3 style={{ 
                fontSize: isMobile ? '0.9375rem' : '1rem', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0
              }}>
                {isMobile && <Clock size={16} />}
                Ventas por Horario
              </h3>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {isMobile && (
                  <Calendar size={14} style={{ 
                    position: 'absolute', 
                    left: '0.5rem', 
                    color: '#6b7280',
                    pointerEvents: 'none',
                    zIndex: 1
                  }} />
                )}
                <input
                  type="date"
                  value={fechaHorario}
                  onChange={(e) => {
                    setFechaHorario(e.target.value);
                    cargarDatosHorarios(e.target.value);
                  }}
                  style={{
                    padding: isMobile ? '0.375rem 0.5rem 0.375rem 2rem' : '0.25rem 0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: isMobile ? '0.8125rem' : '0.8125rem',
                    cursor: 'pointer',
                    width: isMobile ? '100%' : 'auto'
                  }}
                />
              </div>
            </div>
            {loading ? (
              <ChartSkeleton height={getChartHeight()} />
            ) : (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <BarChart data={datosHorarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hora" 
                    style={{ fontSize: isMobile ? '0.625rem' : '0.65rem' }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 50 : 30}
                  />
                  <YAxis style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cantidad" fill="#8b5cf6" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fila 3: Top Productos (ancho completo) */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: isMobile ? '0.75rem' : '0.75rem', 
          borderRadius: '0.5rem', 
          border: '2px solid #e5e7eb',
          marginBottom: isMobile ? '0.5rem' : '0'
        }}>
          <h3 style={{ 
            fontSize: isMobile ? '0.9375rem' : '1rem', 
            fontWeight: 'bold', 
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {isMobile && <Package size={16} />}
            Top {isMobile ? '5' : '10'} Productos Más Vendidos
          </h3>
          {loading ? (
            <ChartSkeleton height={isMobile ? 250 : 220} />
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 220}>
              <BarChart data={datosProductos.slice(0, isMobile ? 5 : 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nombre" 
                  angle={-45} 
                  textAnchor="end" 
                  height={isMobile ? 100 : 80} 
                  interval={0} 
                  style={{ fontSize: isMobile ? '0.55rem' : '0.65rem' }} 
                />
                <YAxis style={{ fontSize: isMobile ? '0.625rem' : '0.7rem' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" fill="#87408dff" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leyenda para métodos de pago en mobile */}
        {isMobile && datosMetodosPago.length > 0 && !loading && (
          <div style={{
            backgroundColor: 'white',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '2px solid #e5e7eb',
            marginTop: '0.5rem'
          }}>
            <h4 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Leyenda Métodos de Pago
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem'
            }}>
              {datosMetodosPago.map((metodo, index) => {
                const total = datosMetodosPago.reduce((sum, item) => sum + item.cantidad, 0);
                const porcentaje = ((metodo.cantidad / total) * 100).toFixed(1);
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: COLORS[index % COLORS.length],
                      borderRadius: '0.125rem',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>
                      {metodo.metodo}: {porcentaje}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reportes;