/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Lock, Mail, Shield, Save, Edit2 } from 'lucide-react';
import { getUserProfile, updateUserProfile } from '../api/api';
import { useToast } from '../Toast';
import { useTheme } from '../context/ThemeContext';

const Profile = ({ onClose, currentUser, onUserUpdate }) => {
  const toast = useToast();
  const { theme } = useTheme();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    nombre_completo: '',
    password: '',
    password_confirm: ''
  });

  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  // Cargar datos del perfil del usuario
  const cargarDatosUsuario = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile();
      setUserData(response.data);
      setFormData({
        username: response.data.username || '',
        nombre_completo: response.data.nombre_completo || '',
        password: '',
        password_confirm: ''
      });
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
      toast.error('Error al cargar datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validar y enviar actualización de perfil
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || formData.username.trim().length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    
    if (formData.password || formData.password_confirm) {
      if (formData.password !== formData.password_confirm) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
      
      if (formData.password.length < 4) {
        toast.error('La contraseña debe tener al menos 4 caracteres');
        return;
      }
    }

    try {
      setSaving(true);
      
      const dataToSend = {
        username: formData.username,
        nombre_completo: formData.nombre_completo
      };
      
      if (formData.password) {
        dataToSend.password = formData.password;
      }

      const response = await updateUserProfile(dataToSend);
      
      // Actualizar usuario en localStorage
      const savedUser = JSON.parse(localStorage.getItem('user'));
      savedUser.username = response.data.username;
      savedUser.nombre_completo = response.data.nombre_completo;
      localStorage.setItem('user', JSON.stringify(savedUser));
      
      if (onUserUpdate) {
        onUserUpdate(savedUser);
      }
      
      toast.success('Perfil actualizado exitosamente');
      setUserData(response.data);
      setEditMode(false);
      
      setFormData(prev => ({
        ...prev,
        password: '',
        password_confirm: ''
      }));
      
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      const errorMessage = error.response?.data?.detail || 'Error al actualizar el perfil';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Obtener color y texto del badge según el rol
  const getRoleBadgeColor = (rol) => {
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

  // Pantalla de carga
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: theme.bg.card,
          borderRadius: '0.5rem',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: theme.shadow.lg
        }}>
          <p style={{ color: theme.text.primary }}>Cargando...</p>
        </div>
      </div>
    );
  }

  const roleBadge = getRoleBadgeColor(userData?.rol);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.bg.card,
        borderRadius: '0.75rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: theme.shadow.xl
      }}>
        {/* Header */}
        <div style={{
          padding: '0.5rem',
          borderBottom: `1px solid ${theme.border.light}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.bg.secondary,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              backgroundColor: theme.brand.primary,
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserIcon size={24} style={{ color: theme.text.white }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: theme.text.primary }}>
              Mi Perfil
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              transition: 'background-color 0.2s',
              color: theme.text.secondary
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div style={{ 
          padding: '0.8rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {!editMode ? (
            // Modo Vista
            <div>
              {/* Avatar y rol */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: theme.bg.secondary,
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: theme.brand.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  boxShadow: theme.shadow.md
                }}>
                  <UserIcon size={36} style={{ color: theme.text.white }} />
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                  textAlign: 'center',
                  margin: '0 0 0.5rem 0',
                  color: theme.text.primary
                }}>
                  {userData?.nombre_completo || userData?.username}
                </h3>
                <span style={{
                  backgroundColor: roleBadge.bg,
                  color: roleBadge.color,
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}>
                  <Shield size={14} />
                  {roleBadge.text}
                </span>
              </div>

              {/* Información del usuario */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.bg.secondary,
                  borderRadius: '0.5rem',
                  border: `1px solid ${theme.border.light}`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <UserIcon size={16} style={{ color: theme.text.secondary }} />
                    <span style={{ fontSize: '0.75rem', color: theme.text.secondary, fontWeight: 600 }}>
                      Usuario
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: theme.text.primary,
                    marginLeft: '1.5rem',
                    margin: 0
                  }}>
                    {userData?.username}
                  </p>
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.bg.secondary,
                  borderRadius: '0.5rem',
                  border: `1px solid ${theme.border.light}`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <Mail size={16} style={{ color: theme.text.secondary }} />
                    <span style={{ fontSize: '0.75rem', color: theme.text.secondary, fontWeight: 600 }}>
                      Email
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: theme.text.primary,
                    marginLeft: '1.5rem',
                    margin: 0
                  }}>
                    {userData?.email}
                  </p>
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.bg.secondary,
                  borderRadius: '0.5rem',
                  border: `1px solid ${theme.border.light}`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <Lock size={16} style={{ color: theme.text.secondary }} />
                    <span style={{ fontSize: '0.75rem', color: theme.text.secondary, fontWeight: 600 }}>
                      Contraseña
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: theme.text.primary,
                    marginLeft: '1.5rem',
                    margin: 0
                  }}>
                    ••••••••
                  </p>
                </div>
              </div>

              {/* Botón Editar */}
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    backgroundColor: theme.brand.primary,
                    color: theme.text.white,
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Edit2 size={16} />
                  Editar Perfil
                </button>
              </div>
            </div>
          ) : (
            // Modo Edición
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: theme.text.primary
                  }}>
                    Nombre de Usuario <span style={{ color: theme.brand.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="input"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      border: `1px solid ${theme.input.border}`,
                      borderRadius: '0.375rem',
                      fontSize: '0.95rem',
                      backgroundColor: theme.input.bg,
                      color: theme.text.primary
                    }}
                    placeholder="Usuario para iniciar sesión"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: theme.text.primary
                  }}>
                    Nombre Completo <span style={{ color: theme.brand.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={handleChange}
                    required
                    className="input"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      border: `1px solid ${theme.input.border}`,
                      borderRadius: '0.375rem',
                      fontSize: '0.95rem',
                      backgroundColor: theme.input.bg,
                      color: theme.text.primary
                    }}
                  />
                </div>

                <div style={{
                  padding: '0.65rem',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>
                    Deja los campos de contraseña vacíos si no deseas cambiarla
                  </p>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: theme.text.primary
                  }}>
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Dejar vacío para no cambiar"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      border: `1px solid ${theme.input.border}`,
                      borderRadius: '0.375rem',
                      fontSize: '0.95rem',
                      backgroundColor: theme.input.bg,
                      color: theme.text.primary
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: theme.text.primary
                  }}>
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    placeholder="Dejar vacío para no cambiar"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      border: `1px solid ${theme.input.border}`,
                      borderRadius: '0.375rem',
                      fontSize: '0.95rem',
                      backgroundColor: theme.input.bg,
                      color: theme.text.primary
                    }}
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    backgroundColor: saving ? theme.text.secondary : theme.brand.success,
                    color: theme.text.white,
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setFormData({
                      username: userData?.username || '',
                      nombre_completo: userData?.nombre_completo || '',
                      password: '',
                      password_confirm: ''
                    });
                  }}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) e.currentTarget.style.backgroundColor = theme.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) e.currentTarget.style.backgroundColor = theme.bg.tertiary;
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;