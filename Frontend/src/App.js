import React, { useState, useEffect } from "react";
import {
  Home,
  ShoppingCart,
  Package,
  BarChart3,
  LogOut,
  User as UserIcon,
  Smartphone,
  FileText,
  Users as UsersIcon,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import Ventas from "./components/Ventas";
import Stock from "./components/Stock";
import Reportes from "./components/Reportes";
import Login from "./components/Login";
import Profile from "./components/Profile";
import Users from "./components/Users";
import { OfflineProvider, useOffline } from "./context/OfflineContext";
import { useTheme } from "./context/ThemeContext";
import VentasDetalle from "./components/VentasDetalle";

window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
    const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
    if (resizeObserverErr) {
      resizeObserverErr.setAttribute('style', 'display: none');
    }
    if (resizeObserverErrDiv) {
      resizeObserverErrDiv.setAttribute('style', 'display: none');
    }
    e.stopImmediatePropagation();
  }
});

// Banner de estado offline/online - CON DARK MODE
const OfflineBanner = () => {
  const { isOnline, isSyncing, ventasPendientes, triggerSync, isLoadingProducts, productosProgress } = useOffline();
  const { theme } = useTheme();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.rol !== 'CAJERO' && user.rol !== 'cajero') {
    return null;
  }

  // Banner de carga de productos
  if (isLoadingProducts) {
    const percentage = productosProgress.total > 0 
      ? Math.round((productosProgress.current / productosProgress.total) * 100)
      : 0;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: theme.brand.info,
        color: theme.text.white,
        padding: '0.5rem',
        boxShadow: theme.shadow.md,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontSize: '0.75rem',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <span style={{ textAlign: 'center' }}>
            📦 Cargando: {productosProgress.current.toLocaleString()} / {productosProgress.total.toLocaleString()} ({percentage}%)
          </span>
        </div>
        <div style={{
          width: '90%',
          maxWidth: '300px',
          height: '6px',
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: theme.text.white,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (isOnline && !isSyncing && ventasPendientes === 0) {
    return null;
  }

  const bannerBg = isSyncing 
    ? theme.status.syncing 
    : !isOnline 
      ? theme.status.offline 
      : theme.status.syncing;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: bannerBg,
      color: theme.text.white,
      padding: '0.5rem',
      boxShadow: theme.shadow.md,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      flexWrap: 'wrap'
    }}>
      {isSyncing ? (
        <>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <span>Sincronizando...</span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff size={16} style={{ flexShrink: 0 }} />
          <span style={{ textAlign: 'center' }}>MODO OFFLINE</span>
          {ventasPendientes > 0 && (
            <span style={{ 
              backgroundColor: 'rgba(0,0,0,0.3)', 
              color: 'white', 
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              flexShrink: 0
            }}>
              {ventasPendientes} pendiente{ventasPendientes !== 1 ? 's' : ''}
            </span>
          )}
        </>
      ) : ventasPendientes > 0 ? (
        <>
          <Wifi size={16} style={{ flexShrink: 0 }} />
          <span>{ventasPendientes} pendiente{ventasPendientes !== 1 ? 's' : ''}</span>
          <button
            onClick={triggerSync}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: 'rgba(0,0,0,0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0
            }}
          >
            <RefreshCw size={12} />
            Sincronizar
          </button>
        </>
      ) : null}
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

// Componente interno que usa el contexto
function AppContent() {
  const [vistaActual, setVistaActual] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOnline, ventasPendientes, precargarProductos } = useOffline(); 
  const { isDark, toggleTheme, theme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    setIsAuthenticated(true);

    if (userData.rol === 'CAJERO' || userData.rol === 'cajero') {
      try {
        const result = await precargarProductos();
        if (result.success) {
          console.log('Productos precargados');
        } else {
          console.log('No se pudieron precargar productos:', result.message);
        }
      } catch (error) {
        console.error('Error en precarga:', error);
      }
    } 
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    setVistaActual("dashboard");
    setMobileMenuOpen(false);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ============================================
  // VISTA CAJERO - CON DARK MODE
  // ============================================
  if (user.rol === "cajero" || user.rol === "CAJERO") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: theme.bg.secondary }}>
        <OfflineBanner />
        
        {/* Header CAJERO - Responsive */}
        <div
          style={{
            background: theme.bg.header,
            color: theme.text.white,
            padding: "0.75rem",
            boxShadow: theme.shadow.md,
            marginTop: (!isOnline || ventasPendientes > 0) ? '50px' : '0',
            transition: 'margin-top 0.3s ease'
          }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            {/* Logo + Título - Responsive */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
              <img 
                src="/logos/DonCharoLogo.png" 
                alt="Don Charo"
                style={{
                  height: "40px",
                  width: "auto",
                  objectFit: "contain",
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <h1 style={{ 
                  fontSize: "clamp(0.9rem, 3vw, 1.5rem)", 
                  fontWeight: "bold", 
                  margin: 0,
                  color: theme.text.white,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  Don Charo - Ventas
                </h1>
                {!isOnline && (
                  <div style={{ fontSize: "0.7rem", marginTop: "0.25rem", opacity: 0.9 }}>
                    🔴 Offline
                  </div>
                )}
              </div>
            </div>

            {/* Botones - Responsive */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
              {/* Botones Claro y AFIP - Ocultos en móvil pequeño */}
              {/* Botones Claro y AFIP - Ocultos en móvil pequeño */}
              <div className="hide-on-mobile" style={{ 
                display: "flex", 
                gap: "0.5rem"
              }}>      
                <a
                  href="https://clarocomercios.claro.com.ar/main/recargas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-claro"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    transition: "background-color 0.2s",
                  }}
                >
                  <img
                    src="/logos/claro-logo.png" 
                    alt="Claro"
                    style={{
                      width: "16px",
                      height: "16px",
                      objectFit: "contain",
                    }}
                  />
                  <span style={{ display: 'none' }}>Claro</span>
                </a>

                <a
                  href="https://www.afip.gob.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-afip"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "#0891b2",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    transition: "background-color 0.2s",
                  }}
                >
                  <img
                    src="https://www.afip.gob.ar/images/logos/afip-blanco.svg"
                    alt="AFIP"
                    style={{
                      width: "18px",
                      height: "18px",
                      filter: "brightness(0) invert(1)",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling.style.display = "inline";
                    }}
                  />
                  <FileText size={14} style={{ display: "none" }} />
                  <span style={{ display: 'none' }}>ARCA</span>
                </a>
              </div>

              {/* Botón Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.5rem",
                  backgroundColor: theme.button.transparentBg,
                  color: theme.text.white,
                  border: `1px solid ${theme.button.transparentBorder}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentBg}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Botón Usuario */}
              <button
                onClick={() => setShowUserProfile(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor: theme.button.transparentBg,
                  color: theme.text.white,
                  border: `1px solid ${theme.button.transparentBorder}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentBg}
              >
                <UserIcon size={18} />
                <span className="hide-mobile" style={{ display: 'none' }}>
                  {user.nombre_completo || user.username}
                </span>
              </button>

              {/* Botón Salir */}
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor: theme.button.transparentBg,
                  color: theme.text.white,
                  border: `1px solid ${theme.button.transparentBorder}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentBg}
              >
                <LogOut size={16} />
                <span className="hide-mobile" style={{ display: 'none' }}>Salir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido - Ventas */}
        <div style={{ 
          maxWidth: "1280px", 
          margin: "0 auto",
          padding: "0 0.5rem"
        }}>
          <Ventas />
        </div>

        {showUserProfile && (
          <Profile
            onClose={() => setShowUserProfile(false)}
            currentUser={user}
            onUserUpdate={handleUserUpdate}
          />
        )}

        {/* Estilos responsive */}
        <style>{`
          @media (min-width: 640px) {
            .btn-claro span, .btn-afip span, .hide-mobile {
              display: inline !important;
            }
          }
          
          .btn-claro:hover {
            background-color: #dc2626 !important;
          }
          
          .btn-afip:hover {
            background-color: #0e7490 !important;
          }
        `}</style>
      </div>
    );
  }

  // ============================================
  // VISTA ADMIN/SUPERADMIN - CON DARK MODE
  // ============================================
  const menuItems = [
    { id: "dashboard", nombre: "Inicio", icono: Home, componente: Dashboard },
    { id: "stock", nombre: "Stock", icono: Package, componente: Stock },
    { id: "reportes", nombre: "Reportes", icono: BarChart3, componente: Reportes },
  ];

  if (user.rol === "superadmin" || user.rol === "SUPERADMIN") {
    menuItems.push({
      id: "users",
      nombre: "Usuarios",
      icono: UsersIcon,
      componente: Users,
    });
    menuItems.push({
      id: "ventas",
      nombre: "Ventas",
      icono: ShoppingCart,
      componente: Ventas,
    });
  }
  
  if (user.rol === "admin" || user.rol === "ADMIN" || 
      user.rol === "superadmin" || user.rol === "SUPERADMIN") {
    menuItems.push({
      id: "ventas-detalle",
      nombre: "Detalle Ventas",
      icono: BarChart3,  
      componente: VentasDetalle,
    });
  }

  const ComponenteActual = menuItems.find(
    (item) => item.id === vistaActual
  )?.componente;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.bg.secondary }}>
      <OfflineBanner />
      
      {/* Header ADMIN - Responsive */}
      <div
        style={{
          background: theme.bg.header,
          color: theme.text.white,
          padding: "0.75rem",
          boxShadow: theme.shadow.md,
          marginTop: (!isOnline || ventasPendientes > 0) ? '50px' : '0',
          transition: 'margin-top 0.3s ease'
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem"
          }}
        >
          {/* Logo + Título - Responsive */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
            <img 
              src="/logos/DonCharoLogo.png" 
              alt="Don Charo"
              style={{
                height: "clamp(40px, 8vw, 60px)",
                width: "auto",
                objectFit: "contain",
                flexShrink: 0
              }}
            />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ 
                fontSize: "clamp(1rem, 4vw, 2rem)", 
                fontWeight: "bold", 
                margin: 0,
                color: theme.text.white,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                Autoservicio Don Charo
              </h1>
              {!isOnline && (
                <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.9 }}>
                  🔴 Modo Offline
                </div>
              )}
            </div>
          </div>

          {/* User Actions - Responsive */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {/* Botón Dark Mode - Desktop */}
            <button
              onClick={toggleTheme}
              className="desktop-theme-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: theme.button.transparentBg,
                color: theme.text.white,
                border: `1px solid ${theme.button.transparentBorder}`,
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentBg}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
              <span>{isDark ? 'Oscuro' : 'Claro'}</span>
            </button>

            {/* Menú hamburguesa para móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem",
                backgroundColor: theme.button.transparentBg,
                color: theme.text.white,
                border: `1px solid ${theme.button.transparentBorder}`,
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Botones desktop */}
            <button
              onClick={() => setShowUserProfile(true)}
              className="desktop-user-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: theme.button.transparentBg,
                color: theme.text.white,
                border: `1px solid ${theme.button.transparentBorder}`,
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentBg}
            >
              <UserIcon size={20} />
              <span>{user.nombre_completo || user.username}</span>
            </button>

            {/* Botón usuario móvil */}
            <button
              onClick={() => setShowUserProfile(true)}
              className="mobile-user-btn"
              style={{
                display: "none",
                alignItems: "center",
                padding: "0.5rem",
                backgroundColor: theme.button.transparentBg,
                color: theme.text.white,
                border: `1px solid ${theme.button.transparentBorder}`,
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              <UserIcon size={20} />
            </button>

            <button
              onClick={handleLogout}
              className="desktop-logout-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: theme.button.transparentBg,
                color: theme.text.white,
                border: `1px solid ${theme.button.transparentBorder}`,
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.button.transparentBg}
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Desktop */}
      <div
        className="desktop-nav"
        style={{
          backgroundColor: theme.bg.primary,
          boxShadow: theme.shadow.sm,
        }}
      >
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}
        >
          <nav style={{ display: "flex", gap: "0.25rem", overflowX: "auto" }}>
            {menuItems.map((item) => {
              const Icono = item.icono;
              const activo = vistaActual === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setVistaActual(item.id);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1.25rem",
                    fontWeight: 600,
                    border: "none",
                    backgroundColor: activo ? theme.bg.active : "transparent",
                    color: activo ? theme.brand.primary : theme.text.secondary,
                    borderBottom: activo
                      ? `4px solid ${theme.brand.primary}`
                      : "4px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                    fontSize: "0.875rem"
                  }}
                  onMouseEnter={(e) => {
                    if (!activo)
                      e.currentTarget.style.backgroundColor = theme.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    if (!activo)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Icono size={18} />
                  {item.nombre}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Overlay oscuro cuando el menú está abierto */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
            display: "none"
          }}
          className="mobile-menu-overlay"
        />
      )}

      {/* Navigation Mobile - Menú desplegable */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav"
          style={{
            position: "fixed",
            top: "calc(60px + (var(--banner-height, 0px)))",
            right: 0,
            width: "280px",
            maxWidth: "80vw",
            backgroundColor: theme.bg.primary,
            boxShadow: theme.shadow.xl,
            zIndex: 1000,
            maxHeight: "calc(100vh - 60px - var(--banner-height, 0px))",
            overflowY: "auto",
            display: "none",
            animation: "slideInRight 0.3s ease"
          }}
        >
          {menuItems.map((item) => {
            const Icono = item.icono;
            const activo = vistaActual === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setVistaActual(item.id);
                  setMobileMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.5rem",
                  fontWeight: 600,
                  border: "none",
                  backgroundColor: activo ? theme.bg.active : theme.bg.primary,
                  color: activo ? theme.brand.primary : theme.text.secondary,
                  borderLeft: activo ? `4px solid ${theme.brand.primary}` : "4px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: "1rem",
                  textAlign: "left"
                }}
              >
                <Icono size={20} />
                {item.nombre}
              </button>
            );
          })}
          
          {/* Botón logout en menú móvil */}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem 1.5rem",
              fontWeight: 600,
              border: "none",
              backgroundColor: theme.bg.primary,
              color: theme.brand.danger,
              cursor: "pointer",
              fontSize: "1rem",
              textAlign: "left",
              borderTop: `1px solid ${theme.border.light}`
            }}
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      )}

      {/* Main Content - Responsive */}
      <div style={{ 
        maxWidth: "1280px", 
        margin: "0 auto",
        padding: "0 0.5rem"
      }}>
        {ComponenteActual && <ComponenteActual />}
      </div>

      {showUserProfile && (
        <Profile
          onClose={() => setShowUserProfile(false)}
          currentUser={user}
          onUserUpdate={handleUserUpdate}
        />
      )}

      {/* Estilos Responsive */}
      <style>{`
        /* Mobile First */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          
          .desktop-user-btn,
          .desktop-logout-btn,
          .desktop-theme-btn {
            display: none !important;
          }
          
          .mobile-user-btn {
            display: flex !important;
          }
          
          .desktop-nav {
            display: none !important;
          }
          
          .mobile-nav {
            display: block !important;
          }
          
          .mobile-menu-overlay {
            display: block !important;
          }
        }
        
        /* Animación de entrada del menú */
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        /* Tablet */
        @media (min-width: 769px) and (max-width: 1024px) {
          .desktop-nav nav {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          .desktop-nav nav::-webkit-scrollbar {
            height: 4px;
          }
          
          .desktop-nav nav::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 2px;
          }
        }
        
        /* Ocultar scrollbar en navegación móvil pero permitir scroll */
        .desktop-nav nav::-webkit-scrollbar {
          height: 4px;
        }
        
        .desktop-nav nav::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .desktop-nav nav::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        /* Efectos hover */
        button:hover {
          opacity: 0.9;
        }
        
        /* Ajuste para banner en altura total */
        :root {
          --banner-height: 0px;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Componente principal con Provider
function App() {
  return (
    <OfflineProvider>
      <AppContent />
    </OfflineProvider>
  );
}

export default App;