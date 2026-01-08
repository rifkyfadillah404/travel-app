import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertTriangle } from 'lucide-react';
import './QRScanner.css'; // Import custom CSS

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Request camera permission explicitly
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      // First check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser tidak mendukung akses kamera. Gunakan browser modern seperti Chrome atau Firefox.');
        return false;
      }

      // Request permission by getting user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      setPermissionState('granted');
      return true;
    } catch (err: any) {
      console.error('Permission error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Tidak ada kamera yang ditemukan di perangkat ini.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Kamera sedang digunakan oleh aplikasi lain.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Kamera tidak memenuhi persyaratan.');
      } else if (err.name === 'SecurityError') {
        setError('Akses kamera diblokir. Pastikan menggunakan HTTPS atau localhost.');
      } else {
        setError(`Gagal mengakses kamera: ${err.message || 'Error tidak diketahui'}`);
      }
      return false;
    }
  };

  const startScanner = async () => {
    if (!containerRef.current || hasStartedRef.current) return;
    hasStartedRef.current = true;

    setIsStarting(true);
    setError(null);

    // First request permission
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setIsStarting(false);
      return;
    }

    try {
      // Clean up any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          // Ignore stop errors
        }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Detect iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      // For iOS, use facingMode constraint instead of cameraId (more reliable)
      // For Android, try to get specific back camera
      let cameraConfig: { facingMode: string } | string = { facingMode: 'environment' };

      if (!isIOS) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras.length > 0) {
            const backCamera = cameras.find(cam =>
              cam.label.toLowerCase().includes('back') ||
              cam.label.toLowerCase().includes('belakang') ||
              cam.label.toLowerCase().includes('rear') ||
              cam.label.toLowerCase().includes('environment')
            );
            if (backCamera) {
              cameraConfig = backCamera.id;
            }
          }
        } catch (e) {
          console.log('Could not enumerate cameras, using facingMode');
        }
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (scannerRef.current && scannerRef.current.getState() === 2) {
            try {
              await scannerRef.current.stop();
            } catch (e) {
              console.error('Failed to stop scanner:', e);
            }
          }
          onScan(decodedText);
        },
        () => {
          // QR code not found, continue scanning
        }
      );

      setIsStarting(false);
    } catch (err: any) {
      console.error('Scanner error:', err);

      // More helpful error messages for iOS
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        if (err.message?.includes('NotAllowedError')) {
          setError('Akses kamera ditolak. Di iOS, buka Settings > Safari > Camera dan pilih "Allow"');
        } else {
          setError(`iOS: ${err.message || 'Gagal mengakses kamera'}. Pastikan menggunakan Safari dan izinkan akses kamera.`);
        }
      } else {
        setError(`Gagal memulai scanner: ${err.message || 'Error tidak diketahui'}`);
      }
      setIsStarting(false);
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.getState() === 2) { // SCANNING
          scannerRef.current.stop().catch(console.error);
        }
        scannerRef.current = null;
      }
    };
  }, []);

  const handleRetry = async () => {
    hasStartedRef.current = false;
    setError(null);
    setIsStarting(true);
    await startScanner();
  };

  const handleOpenSettings = () => {
    // Show instructions for different browsers
    alert(
      'Untuk mengizinkan akses kamera:\n\n' +
      'Chrome/Edge:\n' +
      '1. Klik ikon gembok/info di address bar\n' +
      '2. Cari "Kamera" dan pilih "Izinkan"\n' +
      '3. Refresh halaman\n\n' +
      'Safari:\n' +
      '1. Buka Settings > Safari > Camera\n' +
      '2. Pilih "Allow"\n' +
      '3. Refresh halaman'
    );
  };

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        <div className="qr-scanner-header">
          <h3>Scan QR Code</h3>
          <button className="qr-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="qr-scanner-content">
          {isStarting && !error && (
            <div className="qr-scanner-loading">
              <Camera size={48} className="pulse" />
              <p>Mengaktifkan kamera...</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '8px' }}>
                Mohon izinkan akses kamera jika diminta
              </p>
            </div>
          )}

          {error && (
            <div className="qr-scanner-error">
              <AlertTriangle size={48} style={{ color: 'var(--danger-500)', marginBottom: '12px' }} />
              <p>{error}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="qr-retry-btn" onClick={handleRetry}>
                  <RefreshCw size={18} />
                  Coba Lagi
                </button>
                {permissionState === 'denied' && (
                  <button
                    className="qr-retry-btn"
                    onClick={handleOpenSettings}
                    style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}
                  >
                    Cara Izinkan
                  </button>
                )}
              </div>
            </div>
          )}

          <div
            id="qr-reader"
            ref={containerRef}
            className={`qr-reader ${isStarting || error ? 'hidden' : ''}`}
            style={{ width: '100%', maxWidth: '400px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px' }}
          />
        </div>

        <div className="qr-scanner-footer">
          <p>Arahkan kamera ke QR Code untuk login</p>
        </div>
      </div>
    </div>
  );
}
