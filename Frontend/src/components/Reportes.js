import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Package, Clock, RefreshCw } from 'lucide-react';
import { getDashboard, getVentasPorPeriodo, getCategoriasVendidas, getProductosVendidos, getVentasPorHorario, getGanancias, getMetodosPago } from '../api/api';

// Tooltip personalizado para mostrar valores correctamente
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

const Reportes = () => {
  const [loading, setLoading] = useState(false);
  const [vistaActual, setVistaActual] = useState('ventas');
  const [periodoVentas, setPeriodoVentas] = useState('dia');
  const [periodoGanancias, setPeriodoGanancias] = useState('mes');
  
  const [datosVentas, setDatosVentas] = useState([]);
  const [datosCategorias, setDatosCategorias] = useState([]);
  const [datosProductos, setDatosProductos] = useState([]);
  const [datosHorarios, setDatosHorarios] = useState([]);
  const [datosGanancias, setDatosGanancias] = useState([]);
  const [datosMetodosPago, setDatosMetodosPago] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [vistaActual, periodoVentas, periodoGanancias]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const dashRes = await getDashboard();
      setDashboard(dashRes.data);

      if (vistaActual === 'ventas') {
        const ventasRes = await getVentasPorPeriodo(periodoVentas);
        setDatosVentas(ventasRes.data);
      } else if (vistaActual === 'categorias') {
        const catRes = await getCategoriasVendidas(10);
        setDatosCategorias(catRes.data);
        
        const prodRes = await getProductosVendidos(10);
        setDatosProductos(prodRes.data);
        
        const metRes = await getMetodosPago();
        setDatosMetodosPago(metRes.data);
      } else if (vistaActual === 'horarios') {
        const horRes = await getVentasPorHorario();
        setDatosHorarios(horRes.data);
      } else if (vistaActual === 'ganancias') {
        const ganRes = await getGanancias(periodoGanancias);
        setDatosGanancias(ganRes.data);
      }
    } catch (error) {
      console.error('Error cargando reportes:', error);
      alert('Error al cargar los datos de reportes');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (!dashboard) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><p>Cargando reportes...</p></div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Reportes y Estadísticas</h2>
        <button onClick={cargarDatos} className="btn" style={{ backgroundColor: '#6b7280', color: 'white' }} disabled={loading}>
          <RefreshCw size={18} style={{ marginRight: '0.5rem' }} />
          Actualizar
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#dbeafe', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #93c5fd' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: 600 }}>Total Ventas</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a' }}>${dashboard.total_ventas.toFixed(2)}</p>
            </div>
            <DollarSign size={48} style={{ color: '#3b82f6' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#d1fae5', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #86efac' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 600 }}>Ganancia Total</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#166534' }}>${dashboard.ganancia_total.toFixed(2)}</p>
            </div>
            <TrendingUp size={48} style={{ color: '#22c55e' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f3e8ff', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #d8b4fe' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b21a8', fontWeight: 600 }}>Transacciones</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#581c87' }}>{dashboard.cantidad_ventas}</p>
            </div>
            <ShoppingCart size={48} style={{ color: '#a855f7' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#fef3c7', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #fcd34d' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>Productos Vendidos</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#78350f' }}>{dashboard.productos_vendidos}</p>
            </div>
            <Package size={48} style={{ color: '#f59e0b' }} />
          </div>
        </div>
      </div>

      {/* Selector de vista */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '2px solid #e5e7eb', marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setVistaActual('ventas')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: vistaActual === 'ventas' ? '#3b82f6' : '#f3f4f6',
              color: vistaActual === 'ventas' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <TrendingUp size={18} />
            Ventas por Período
          </button>
          <button
            onClick={() => setVistaActual('categorias')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: vistaActual === 'categorias' ? '#3b82f6' : '#f3f4f6',
              color: vistaActual === 'categorias' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Package size={18} />
            Productos y Categorías
          </button>
          <button
            onClick={() => setVistaActual('horarios')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: vistaActual === 'horarios' ? '#3b82f6' : '#f3f4f6',
              color: vistaActual === 'horarios' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Clock size={18} />
            Ventas por Horario
          </button>
          <button
            onClick={() => setVistaActual('ganancias')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: vistaActual === 'ganancias' ? '#3b82f6' : '#f3f4f6',
              color: vistaActual === 'ganancias' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <DollarSign size={18} />
            Análisis de Ganancias
          </button>
        </div>
      </div>

      {/* Contenido según la vista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '0.5rem' }}>
          <p>Cargando datos...</p>
        </div>
      ) : (
        <>
          {/* VISTA: Ventas por Período */}
          {vistaActual === 'ventas' && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Ventas por Período</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['dia', 'semana', 'mes', 'año'].map(periodo => (
                    <button
                      key={periodo}
                      onClick={() => setPeriodoVentas(periodo)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: periodoVentas === periodo ? '#3b82f6' : '#e5e7eb',
                        color: periodoVentas === periodo ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {periodo}
                    </button>
                  ))}
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={datosVentas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total ($)" />
                  <Line type="monotone" dataKey="cantidad" stroke="#10b981" strokeWidth={2} name="Cantidad" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* VISTA: Categorías y Productos */}
          {vistaActual === 'categorias' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Categorías Más Vendidas</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={datosCategorias}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="cantidad" fill="#3b82f6" name="Unidades" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Métodos de Pago</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={datosMetodosPago}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.metodo}: ${entry.cantidad}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="cantidad"
                    >
                      {datosMetodosPago.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb', gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Top 10 Productos Más Vendidos</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={datosProductos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={120} interval={0} style={{ fontSize: '0.75rem' }} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="cantidad" fill="#10b981" name="Unidades Vendidas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VISTA: Horarios */}
          {vistaActual === 'horarios' && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Ventas por Horario del Día</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={datosHorarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#8b5cf6" name="Cantidad de Ventas" />
                  <Bar dataKey="total" fill="#f59e0b" name="Total ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* VISTA: Ganancias */}
          {vistaActual === 'ganancias' && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Análisis de Ganancias</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['dia', 'semana', 'mes'].map(periodo => (
                    <button
                      key={periodo}
                      onClick={() => setPeriodoGanancias(periodo)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: periodoGanancias === periodo ? '#10b981' : '#e5e7eb',
                        color: periodoGanancias === periodo ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {periodo}
                    </button>
                  ))}
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={datosGanancias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} name="Ventas ($)" />
                  <Line type="monotone" dataKey="ganancia" stroke="#10b981" strokeWidth={2} name="Ganancia ($)" />
                  <Line type="monotone" dataKey="margen" stroke="#f59e0b" strokeWidth={2} name="Margen (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reportes;