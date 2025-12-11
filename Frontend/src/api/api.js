import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const getCurrentUser = () => api.get('/auth/me');

// Productos - CON PAGINACIÓN Y FILTROS
export const getProductos = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.skip !== undefined) queryParams.append('skip', params.skip);
  if (params.limit !== undefined) queryParams.append('limit', params.limit);
  if (params.busqueda) queryParams.append('busqueda', params.busqueda);
  if (params.categoria && params.categoria !== 'todas') queryParams.append('categoria', params.categoria);
  if (params.estado_stock && params.estado_stock !== 'todos') queryParams.append('estado_stock', params.estado_stock);
  
  return api.get(`/productos/?${queryParams.toString()}`);
};
export const getCategorias = () => api.get('/productos/categorias');
export const getProducto = (id) => api.get(`/productos/${id}`);
export const createProducto = (data) => api.post('/productos/', data);
export const updateProducto = (id, data) => api.put(`/productos/${id}`, data);
export const deleteProducto = (id) => api.delete(`/productos/${id}`);
export const getProductosStockBajo = () => api.get('/productos/stock/bajo');
export const getProductosStockCritico = () => api.get('/productos/stock/critico');
export const buscarPorCodigo = (codigo) => api.get(`/productos/buscar-codigo?codigo=${codigo}`);

// Ventas
export const getVentas = () => api.get('/ventas/');
export const getVenta = (id) => api.get(`/ventas/${id}`);
export const createVenta = (data) => api.post('/ventas/', data);

// Reportes
export const getDashboard = () => api.get('/reportes/dashboard');
export const getDashboardHoy = () => api.get('/reportes/dashboard-hoy');
export const getVentasMensuales = () => api.get('/reportes/ventas/mensuales');
export const getProductosRentabilidad = () => api.get('/reportes/productos/rentabilidad');

// Cotizaciones desde APIs oficiales con cache de 30 minutos
export const getCotizaciones = async () => {
  const CACHE_KEY = 'cotizaciones_oficial';
  const CACHE_TIME_KEY = 'cotizaciones_oficial_time';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

  try {
    // Verificar cache
    const cachedRates = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    
    if (cachedRates && cachedTime) {
      const timeSinceCache = Date.now() - parseInt(cachedTime);
      if (timeSinceCache < CACHE_DURATION) {
        console.log('✅ Usando cotizaciones en cache');
        return JSON.parse(cachedRates);
      }
    }

    console.log('🔄 Actualizando cotizaciones...');

    // Obtener cotizaciones en paralelo
    const [dolarData, realData] = await Promise.all([
      axios.get('https://dolarapi.com/v1/dolares/oficial'),
      axios.get('https://dolarapi.com/v1/cotizaciones/brl')
    ]);

    const dolarCompra = parseFloat(dolarData.data.compra);
    const dolarVenta = parseFloat(dolarData.data.venta);
    const dolarPromedio = (dolarCompra + dolarVenta) / 2;

    const realCompra = parseFloat(realData.data.compra);
    const realVenta = parseFloat(realData.data.venta);
    const realPromedio = (realCompra + realVenta) / 2;

    const rates = {
      USD: 1 / dolarPromedio,
      BRL: 1 / realPromedio,
      dolarCompra: dolarCompra,
      dolarVenta: dolarVenta,
      dolarPromedio: dolarPromedio,
      realCompra: realCompra,
      realVenta: realVenta,
      realPromedio: realPromedio,
      timestamp: Date.now(),
      fecha: new Date().toLocaleString('es-AR')
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

    console.log('✅ Cotizaciones actualizadas:', {
      'Dólar Promedio': `$${dolarPromedio.toFixed(2)}`,
      'Real Promedio': `$${realPromedio.toFixed(2)}`
    });

    return rates;

  } catch (error) {
    console.error('❌ Error obteniendo cotizaciones:', error.message);
    
    const cachedRates = localStorage.getItem(CACHE_KEY);
    if (cachedRates) {
      console.log('⚠️ Usando cotizaciones en cache (expiradas)');
      return JSON.parse(cachedRates);
    }
    
    console.log('⚠️ Usando valores por defecto');
    return { 
      USD: 1 / 1050,
      BRL: 1 / 210,
      dolarPromedio: 1050,
      realPromedio: 210,
      timestamp: Date.now(),
      error: true
    };
  }
};

export const getVentasPorPeriodo = (periodo) => api.get(`/reportes/ventas-por-periodo?periodo=${periodo}`);
export const getCategoriasVendidas = (limite = 10) => api.get(`/reportes/categorias-mas-vendidas?limite=${limite}`);
export const getProductosVendidos = (limite = 10) => api.get(`/reportes/productos-mas-vendidos?limite=${limite}`);
export const getVentasPorHorario = () => api.get('/reportes/ventas-por-horario');
export const getVentasPorHorarioFecha = (fecha) => api.get(`/reportes/ventas-por-horario?fecha=${fecha}`);
export const getGanancias = (periodo) => api.get(`/reportes/ganancias?periodo=${periodo}`);
export const getMetodosPago = () => api.get('/reportes/metodos-pago');

export default api;