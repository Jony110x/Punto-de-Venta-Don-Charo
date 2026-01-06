/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, Edit2, Trash2, X, Save, Shield, CheckCircle, XCircle, Mail, User, Key, AlertTriangle } from 'lucide-react';
import { getAllUsers, createUser, updateUser, deleteUser } from '../api/api';
import { useToast } from '../Toast';

const Users = () => {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    nombre_completo: '',
    rol: 'CAJERO',
    activo: true
  });

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

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Cargar lista de usuarios desde el API
  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      
      const usuariosData = response.data.usuarios || [];
    
      setUsuarios(usuariosData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      console.error('Error response:', error.response);
      toast.error('Error al cargar usuarios');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear o editar usuario
  const handleOpenModal = (mode, user = null) => {
    setModalMode(mode);
    setSelectedUser(user);
    
    if (mode === 'edit' && user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        password_confirm: '',
        nombre_completo: user.nombre_completo || '',
        rol: user.rol,
        activo: user.activo
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        nombre_completo: '',
        rol: 'CAJERO',
        activo: true
      });
    }
    
    setShowModal(true);
  };

  // Cerrar modal y limpiar formulario
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      password_confirm: '',
      nombre_completo: '',
      rol: 'CAJERO',
      activo: true
    });
  };

  // Actualizar campos del formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Validar y enviar formulario (crear o actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (modalMode === 'create' || formData.password) {
      if (formData.password !== formData.password_confirm) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
      
      if (formData.password && formData.password.length < 4) {
        toast.error('La contraseña debe tener al menos 4 caracteres');
        return;
      }
    }

    try {
      setSaving(true);
      
      const dataToSend = {
        username: formData.username,
        email: formData.email,
        nombre_completo: formData.nombre_completo,
        rol: formData.rol,
        activo: formData.activo
      };
      
      if (modalMode === 'create') {
        dataToSend.password = formData.password;
      } else if (formData.password) {
        dataToSend.password = formData.password;
      }

      if (modalMode === 'create') {
        await createUser(dataToSend);
        toast.success('Usuario creado exitosamente');
      } else {
        await updateUser(selectedUser.id, dataToSend);
        toast.success('Usuario actualizado exitosamente');
      }
      
      handleCloseModal();
      cargarUsuarios();
      
    } catch (error) {
      console.error('Error guardando usuario:', error);
      const errorMessage = error.response?.data?.detail || 'Error al guardar usuario';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal de confirmación de eliminación
  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Eliminar usuario
  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.id);
      toast.success('Usuario eliminado exitosamente');
      setShowDeleteModal(false);
      setUserToDelete(null);
      cargarUsuarios();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      const errorMessage = error.response?.data?.detail || 'Error al eliminar usuario';
      toast.error(errorMessage);
    }
  };

  // Obtener estilos del badge según el rol
  const getRoleBadge = (rol) => {
    const roleUpper = (rol || '').toUpperCase();
    switch (roleUpper) {
      case 'SUPERADMIN':
        return { bg: '#fef3c7', color: '#92400e', text: 'Super Admin' };
      case 'ADMIN':
        return { bg: '#dbeafe', color: '#1e40af', text: 'Administrador' };
      case 'CAJERO':
        return { bg: '#d1fae5', color: '#065f46', text: 'Cajero' };
      default:
        return { bg: '#f3f4f6', color: '#374151', text: rol };
    }
  };

  // Formatear fecha de último acceso
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Componente de tarjeta de usuario para mobile
  const UserCard = ({ user }) => {
    const roleBadge = getRoleBadge(user.rol);
    
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {/* Header de la tarjeta */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '0.75rem'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              marginBottom: '0.25rem'
            }}>
              <User size={16} style={{ color: '#6b7280', flexShrink: 0 }} />
              <span style={{ 
                fontWeight: 600, 
                fontSize: '0.9375rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.username}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <Mail size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
              <span style={{ 
                fontSize: '0.8125rem', 
                color: '#6b7280',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.email}
              </span>
            </div>
          </div>
          
          {/* Badge de estado */}
          {user.activo ? (
            <span style={{
              backgroundColor: '#d1fae5',
              color: '#065f46',
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              <CheckCircle size={12} />
              Activo
            </span>
          ) : (
            <span style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              <XCircle size={12} />
              Inactivo
            </span>
          )}
        </div>

        {/* Información adicional */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.125rem' }}>
              Nombre Completo
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
              {user.nombre_completo || '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.125rem' }}>
              Rol
            </div>
            <span style={{
              backgroundColor: roleBadge.bg,
              color: roleBadge.color,
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Shield size={10} />
              {roleBadge.text}
            </span>
          </div>
        </div>

        {/* Último acceso */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.125rem' }}>
            Último Acceso
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#374151' }}>
            {formatDate(user.ultimo_acceso)}
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleOpenModal('edit', user)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem'
            }}
          >
            <Edit2 size={14} />
            Editar
          </button>
          <button
            onClick={() => confirmDelete(user)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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

  // Pantalla de carga
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: isMobile ? '1rem' : '1.5rem',
      height: isMobile ? 'calc(100vh - 120px)' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <style>
        {`
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
        `}
      </style>

      {/* Header con título y botón de nuevo usuario */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '1rem' : '0',
        marginBottom: isMobile ? '1rem' : '2rem',
        flexShrink: 0
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.75rem' : '1rem' 
        }}>
          <UsersIcon size={isMobile ? 28 : 32} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div>
            <h2 style={{ 
              fontSize: isMobile ? '1.5rem' : '1.875rem', 
              fontWeight: 'bold', 
              margin: 0 
            }}>
              Gestión de Usuarios
            </h2>
            <p style={{ 
              color: '#6b7280', 
              margin: '0.25rem 0 0 0',
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}>
              {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => handleOpenModal('create')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            fontSize: isMobile ? '0.9375rem' : '1rem'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
        >
          <UserPlus size={isMobile ? 18 : 20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Contenedor de usuarios - Vista Mobile (Cards) o Desktop (Tabla) */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        flex: isMobile ? 1 : 'none',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isMobile ? (
          // Vista Mobile: Cards
          <div style={{ 
            overflowY: 'auto',
            flex: 1
          }}>
            {usuarios.length === 0 ? (
              <div style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                <UsersIcon size={48} style={{ margin: '0 auto', marginBottom: '1rem', color: '#d1d5db' }} />
                <p>No hay usuarios registrados</p>
              </div>
            ) : (
              usuarios.map((user) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </div>
        ) : (
          // Vista Desktop: Tabla
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    letterSpacing: '0.05em'
                  }}>Usuario</th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    letterSpacing: '0.05em'
                  }}>Email</th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    letterSpacing: '0.05em'
                  }}>Nombre Completo</th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    letterSpacing: '0.05em'
                  }}>Rol</th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    letterSpacing: '0.05em'
                  }}>Estado</th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    letterSpacing: '0.05em'
                  }}>Último Acceso</th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    letterSpacing: '0.05em'
                  }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{
                      padding: '3rem',
                      textAlign: 'center',
                      color: '#9ca3af'
                    }}>
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  usuarios.map((user) => {
                    const roleBadge = getRoleBadge(user.rol);
                    return (
                      <tr key={user.id} style={{
                        borderTop: '1px solid #f3f4f6',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          <span style={{ fontWeight: 600 }}>{user.username}</span>
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>{user.email}</td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>{user.nombre_completo || '-'}</td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          <span style={{
                            backgroundColor: roleBadge.bg,
                            color: roleBadge.color,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Shield size={12} />
                            {roleBadge.text}
                          </span>
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          {user.activo ? (
                            <span style={{
                              color: '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontWeight: 600
                            }}>
                              <CheckCircle size={16} />
                              Activo
                            </span>
                          ) : (
                            <span style={{
                              color: '#dc2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontWeight: 600
                            }}>
                              <XCircle size={16} />
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatDate(user.ultimo_acceso)}
                          </span>
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenModal('edit', user)}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bfdbfe'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => confirmDelete(user)}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: isMobile ? '1rem' : '0'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            width: isMobile ? '100%' : '90%',
            maxWidth: isMobile ? '100%' : '600px',
            maxHeight: isMobile ? '100%' : '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            {/* Header del modal */}
            <div style={{
              padding: isMobile ? '1rem' : '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}>
              <h3 style={{ 
                fontSize: isMobile ? '1.125rem' : '1.25rem', 
                fontWeight: 'bold', 
                margin: 0 
              }}>
                {modalMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={isMobile ? 20 : 24} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.25rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    Nombre de Usuario <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                    placeholder="usuario123"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>Nombre Completo</label>
                  <input
                    type="text"
                    name="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    Rol <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    name="rol"
                    value={formData.rol}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  >
                    <option value="CAJERO">Cajero</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleChange}
                      style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>Usuario Activo</span>
                  </label>
                </div>

                {modalMode === 'edit' && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '0.5rem'
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                      Deja los campos de contraseña vacíos si no deseas cambiarla
                    </p>
                  </div>
                )}

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    Contraseña {modalMode === 'create' && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={modalMode === 'create'}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                    placeholder={modalMode === 'edit' ? 'Dejar vacío para no cambiar' : 'Mínimo 4 caracteres'}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    Confirmar Contraseña {modalMode === 'create' && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <input
                    type="password"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    required={modalMode === 'create'}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                    placeholder={modalMode === 'edit' ? 'Dejar vacío para no cambiar' : 'Repite la contraseña'}
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column-reverse' : 'row',
                gap: isMobile ? '0.75rem' : '1rem', 
                marginTop: isMobile ? '1.5rem' : '2rem' 
              }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.9375rem' : '1rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: saving ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.9375rem' : '1rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) e.currentTarget.style.backgroundColor = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) e.currentTarget.style.backgroundColor = '#10b981';
                  }}
                >
                  <Save size={18} />
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && userToDelete && (
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
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: isMobile ? '1.25rem' : '1.5rem',
            maxWidth: isMobile ? '100%' : '450px',
            width: isMobile ? '100%' : '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
                color: '#111827' 
              }}>
                Eliminar Usuario
              </h3>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ 
                color: '#6b7280', 
                marginBottom: '1rem', 
                lineHeight: '1.5',
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}>
                ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
              </p>
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ 
                  fontWeight: 600, 
                  fontSize: isMobile ? '0.9375rem' : '1rem', 
                  marginBottom: '0.25rem', 
                  color: '#111827' 
                }}>
                  {userToDelete.username}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  {userToDelete.email}
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column-reverse' : 'row',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                style={{
                  flex: 1,
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
                onClick={handleDelete}
                style={{
                  flex: 1,
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
    </div>
  );
};

export default Users;