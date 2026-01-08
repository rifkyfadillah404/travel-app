import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plane, Loader2, QrCode, Eye, EyeOff, Smartphone, Lock } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { QRScanner } from '../components/QRScanner';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithQR, isLoading, error, clearError } = useAppStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [autoLoginMessage, setAutoLoginMessage] = useState<string | null>(null);

  // Extract QR token from either raw token or URL with ?qr= parameter
  const extractQRToken = (scannedValue: string): string => {
    // If it looks like a URL, extract the qr parameter
    if (scannedValue.includes('?qr=') || scannedValue.includes('&qr=')) {
      try {
        const url = new URL(scannedValue);
        const token = url.searchParams.get('qr');
        if (token) return token;
      } catch (e) {
        // Not a valid URL, use as-is
      }
    }
    // Otherwise return as-is (raw token)
    return scannedValue;
  };

  // Auto-login if qr parameter is present in URL (from iOS Camera scanning QR)
  useEffect(() => {
    const qrToken = searchParams.get('qr');
    if (qrToken && !autoLoginAttempted && !isLoading) {
      setAutoLoginAttempted(true);
      setAutoLoginMessage('Memproses login...');

      // Perform login
      loginWithQR(qrToken).then((success) => {
        if (success) {
          navigate('/');
        } else {
          setAutoLoginMessage(null);
        }
      });
    }
  }, [searchParams, autoLoginAttempted, isLoading, loginWithQR, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login(phone, password);
    if (success) {
      navigate('/');
    }
  };

  const handleQRScan = async (scannedValue: string) => {
    setShowQRScanner(false);
    clearError();

    const qrToken = extractQRToken(scannedValue);
    console.log('QR Scanned:', scannedValue, '-> Token:', qrToken);

    const success = await loginWithQR(qrToken);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Plane size={40} strokeWidth={1.5} />
          </div>
          <h1>ITJ Travel</h1>
          <p>Aplikasi Monitoring Jamaah</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {autoLoginMessage && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--accent-50)',
              borderRadius: '8px',
              color: 'var(--accent-700)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <Loader2 size={20} className="spin" />
              {autoLoginMessage}
            </div>
          )}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="input-group">
            <div className="input-wrapper">
              <Smartphone className="input-icon" size={20} />
              <input
                type="tel"
                className="styled-input"
                placeholder="Nomor Telepon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                className="styled-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={20} className="spin" />
            ) : (
              'Masuk'
            )}
          </button>

          <button
            type="button"
            className="btn-outline qr-btn"
            onClick={() => setShowQRScanner(true)}
            disabled={isLoading}
          >
            <QrCode size={18} strokeWidth={1.5} />
            Scan QR Code
          </button>
        </form>

        <div className="login-footer">
          <p>Elegance in Monitoring</p>
        </div>
      </div>

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}
