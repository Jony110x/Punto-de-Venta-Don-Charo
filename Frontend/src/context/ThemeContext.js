import React, { createContext, useContext, useState, useEffect } from 'react';
import { updateUserTheme } from '../api/api';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // PRIORIDAD 1: Cargar desde el usuario en localStorage
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        console.log('Usuario cargado:', user); // Debug
        console.log('Dark mode del usuario:', user.dark_mode); // Debug
        if (user.dark_mode !== undefined && user.dark_mode !== null) {
          return user.dark_mode;
        }
      } catch (e) {
        console.error('Error parseando usuario:', e);
      }
    }
    
    // PRIORIDAD 2: Fallback a preferencia del sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sincronizar con el backend cuando cambie el tema
  const syncThemeToBackend = async (newTheme) => {
    try {
      const userString = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (userString && token) {
        const user = JSON.parse(userString);
        
        console.log('Sincronizando tema al backend:', newTheme); // Debug
        
        // Actualizar en el backend
        await updateUserTheme(user.id, newTheme);
        
        // Actualizar el objeto user en localStorage
        user.dark_mode = newTheme;
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('Tema sincronizado exitosamente'); // Debug
      }
    } catch (error) {
      console.error('Error sincronizando tema con backend:', error);
    }
  };

  // Aplicar tema al body
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDark]);

  // Escuchar cambios en el usuario (cuando se hace login)
  useEffect(() => {
    const handleStorageChange = () => {
      const userString = localStorage.getItem('user');
      if (userString) {
        try {
          const user = JSON.parse(userString);
          if (user.dark_mode !== undefined && user.dark_mode !== null) {
            console.log('Usuario actualizado, cargando tema:', user.dark_mode); // Debug
            setIsDark(user.dark_mode);
          }
        } catch (e) {
          console.error('Error parseando usuario:', e);
        }
      }
    };

    // Escuchar cambios en localStorage
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // Sincronizar con backend
    await syncThemeToBackend(newTheme);
  };

  // Paleta de colores centralizada (mantener igual)
  const theme = {
    bg: {
      primary: isDark ? '#1a1a1a' : '#ffffff',
      secondary: isDark ? '#2d2d2d' : '#f3f4f6',
      tertiary: isDark ? '#3a3a3a' : '#e5e7eb',
      header: isDark 
        ? 'linear-gradient(to right, #1e3a8a, #1e40af)' 
        : 'linear-gradient(to right, #2563eb, #1e40af)',
      card: isDark ? '#2d2d2d' : '#ffffff',
      hover: isDark ? '#3a3a3a' : '#f9fafb',
      active: isDark ? '#1e293b' : '#eff6ff',
    },
    text: {
      primary: isDark ? '#e5e7eb' : '#111827',
      secondary: isDark ? '#9ca3af' : '#6b7280',
      tertiary: isDark ? '#6b7280' : '#9ca3af',
      inverse: isDark ? '#111827' : '#ffffff',
      white: '#ffffff',
      link: isDark ? '#60a5fa' : '#2563eb',
      linkHover: isDark ? '#93c5fd' : '#1e40af',
    },
    border: {
      light: isDark ? '#3a3a3a' : '#e5e7eb',
      medium: isDark ? '#4b5563' : '#d1d5db',
      dark: isDark ? '#6b7280' : '#9ca3af',
      focus: isDark ? '#60a5fa' : '#2563eb',
    },
    brand: {
      primary: isDark ? '#3b82f6' : '#2563eb',
      primaryHover: isDark ? '#60a5fa' : '#1e40af',
      secondary: isDark ? '#10b981' : '#059669',
      danger: isDark ? '#ef4444' : '#dc2626',
      warning: isDark ? '#f59e0b' : '#d97706',
      success: isDark ? '#10b981' : '#059669',
      info: isDark ? '#3b82f6' : '#2563eb',
    },
    status: {
      online: isDark ? '#10b981' : '#059669',
      offline: isDark ? '#ef4444' : '#dc2626',
      syncing: isDark ? '#f59e0b' : '#d97706',
    },
    shadow: {
      sm: isDark ? '0 1px 2px rgba(0, 0, 0, 0.5)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: isDark ? '0 4px 6px rgba(0, 0, 0, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: isDark ? '0 10px 15px rgba(0, 0, 0, 0.5)' : '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: isDark ? '0 20px 25px rgba(0, 0, 0, 0.6)' : '0 20px 25px rgba(0, 0, 0, 0.15)',
    },
    input: {
      bg: isDark ? '#2d2d2d' : '#ffffff',
      border: isDark ? '#4b5563' : '#d1d5db',
      focus: isDark ? '#3b82f6' : '#2563eb',
      disabled: isDark ? '#1a1a1a' : '#f3f4f6',
      placeholder: isDark ? '#6b7280' : '#9ca3af',
    },
    button: {
      transparentBg: 'rgba(255, 255, 255, 0.1)',
      transparentHover: 'rgba(255, 255, 255, 0.2)',
      transparentBorder: 'rgba(255, 255, 255, 0.2)',
    },
    chart: {
      grid: isDark ? '#3a3a3a' : '#e5e7eb',
      text: isDark ? '#9ca3af' : '#6b7280',
      tooltip: {
        bg: isDark ? '#2d2d2d' : '#ffffff',
        border: isDark ? '#4b5563' : '#d1d5db',
        text: isDark ? '#e5e7eb' : '#111827',
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};