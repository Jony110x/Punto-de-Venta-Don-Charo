import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../api/api';
import ProductoForm from './ProductoForm';
import { useToast  } from '../Toast';

const Stock = () => {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [productoEdit, setProductoEdit] = useState(null);
  const [filtrosColapsados, setFiltrosColapsados] = useState(false);
   const toast = useToast();
  
  // Estados de filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [productos, busqueda, filtroCategoria, filtroEstado]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await getProductos();
      // Ordenar alfabéticamente por nombre
      const productosOrdenados = response.data.sort((a, b) => 
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      );
      setProductos(productosOrdenados);
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...productos];

    // Filtro por búsqueda (nombre, categoría o código)
    if (busqueda.trim() !== '') {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(busquedaLower) ||
        (p.categoria && p.categoria.toLowerCase().includes(busquedaLower)) ||
        (p.codigo_barras && p.codigo_barras.includes(busqueda))
      );
    }

    // Filtro por categoría
    if (filtroCategoria !== 'todas') {
      resultado = resultado.filter(p => 
        (p.categoria || 'Sin categoría') === filtroCategoria
      );
    }

    // Filtro por estado de stock
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(p => {
        const estado = getEstadoStock(p);
        return estado.text.toLowerCase() === filtroEstado;
      });
    }

    setProductosFiltrados(resultado);
  };

  const handleCrearProducto = async (data) => {
    try {
      await createProducto(data);
      toast.success('Producto creado exitosamente')
      setShowForm(false);
      cargarProductos();
    } catch (error) {
      console.error('Error creando producto:', error);
      toast.error('Error al crear producto')
    }
  };

  const handleActualizarProducto = async (data) => {
    try {
      await updateProducto(productoEdit.id, data);
      toast.success('Producto actualizado exitosamente')
      setShowForm(false);
      setProductoEdit(null);
      cargarProductos();
    } catch (error) {
      console.error('Error actualizando producto:', error);
      toast.error('Error al actualizar producto')
    }
  };

  const handleEliminarProducto = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      await deleteProducto(id);
      toast.success('Producto eliminado exitosamente')
      cargarProductos();
    } catch (error) {
      console.error('Error eliminando producto:', error);
      toast.error('Error al eliminar producto')
    }
  };

  const getEstadoStock = (producto) => {
    if (producto.stock < 10) return { text: 'Crítico', color: '#fee2e2', textColor: '#991b1b' };
    if (producto.stock < producto.stock_minimo) return { text: 'Bajo', color: '#fef3c7', textColor: '#92400e' };
    return { text: 'Normal', color: '#d1fae5', textColor: '#065f46' };
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('todas');
    setFiltroEstado('todos');
  };

  // Obtener categorías únicas
  const categorias = ['todas', ...new Set(productos.map(p => p.categoria || 'Sin categoría'))];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '0.5rem',
      height: 'calc(100vh - 140px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      
      {/* Barra de búsqueda y filtros - FIJA Y COLAPSABLE */}
      <div style={{
        backgroundColor: 'white',
        padding: filtrosColapsados ? '0.75rem' : '1rem', 
        borderRadius: '0.5rem',
        border: '2px solid #e5e7eb',
        marginBottom: '0.5rem', 
        flexShrink: 0,
        transition: 'padding 0.3s ease'
      }}>
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={cargarProductos} className="btn" style={{ backgroundColor: '#6b7280', color: 'white', padding: '0.5rem 0.75rem' }}>
              <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
              Actualizar
            </button>
            <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Filtros colapsables */}
        {!filtrosColapsados && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            {/* Búsqueda por texto */}
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
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                Categoría
              </label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="input"
                style={{ textTransform: 'capitalize', padding: '0.5rem' }}
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'todas' ? 'Todas las categorías' : cat}
                  </option>
                ))}
              </select>
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
                <option value="crítico">Crítico</option>
              </select>
            </div>

            {/* Botón limpiar filtros - SIEMPRE VISIBLE */}
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

      {/* Tabla de productos - CON SCROLL */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '2px solid #e5e7eb',
        flex: 1,
        overflow: 'auto',
        minHeight: 0
      }}>
        {productosFiltrados.length === 0 ? (
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead style={{ 
              backgroundColor: '#f3f4f6',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Producto</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Categoría</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>P. Costo</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>P. Venta</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Margen</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Stock</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Estado</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map(producto => {
                const estado = getEstadoStock(producto);
                const margen = producto.precio_costo > 0 
                  ? (((producto.precio_venta - producto.precio_costo) / producto.precio_costo) * 100).toFixed(1)
                  : 0;
                
                return (
                  <tr key={producto.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{producto.nombre}</div>
                        {producto.codigo_barras && (
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                            CB: {producto.codigo_barras}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textTransform: 'capitalize', fontSize: '0.875rem' }}>
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
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', fontSize: '0.875rem' }}>{producto.stock}</td>
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
                          onClick={() => handleEliminarProducto(producto.id)}
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
              })}
            </tbody>
          </table>
        )}
      </div>

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