import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
  const { theme } = useTheme();
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "barcode-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.7777778,
          formatsToSupport: [
            0,  // QR_CODE
            8,  // EAN_13
            9,  // EAN_8
            13, // CODE_128
            14, // CODE_39
            15, // ITF
          ],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          console.log(`Código escaneado: ${decodedText}`);
          onScanSuccess(decodedText);
          scanner.clear().catch(err => console.error('Error limpiando scanner:', err));
          setIsScanning(false);
        },
        (errorMessage) => {
          // Errores de escaneo se pueden ignorar
        }
      );

      scannerRef.current = scanner;
      setIsScanning(true);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Error al limpiar scanner:", error);
        });
      }
    };
  }, [onScanSuccess]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: theme.bg.card,
        borderRadius: '0.75rem',
        padding: '1.5rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: theme.shadow.xl
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={24} color={theme.brand.primary} />
            <h3 style={{
              color: theme.text.primary,
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 600
            }}>
              Escanear Código de Barras
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.text.secondary,
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '0.25rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Scanner */}
        <div id="barcode-reader" style={{
          borderRadius: '0.5rem',
          overflow: 'hidden'
        }}></div>

        {/* Instrucciones */}
        <div style={{
          marginTop: '1rem',
          textAlign: 'center',
          color: theme.text.secondary,
          fontSize: '0.875rem'
        }}>
          <p style={{ margin: '0.25rem 0' }}>
            Coloca el código de barras dentro del marco
          </p>
          <p style={{
            margin: '0.25rem 0',
            fontSize: '0.8125rem',
            fontStyle: 'italic',
            opacity: 0.8
          }}>
            Asegúrate de tener buena iluminación
          </p>
        </div>

        {/* Botón cancelar */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.625rem',
            backgroundColor: theme.text.secondary,
            color: theme.text.white,
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;