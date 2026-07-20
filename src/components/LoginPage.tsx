import React, { useState } from 'react';
import { Layers, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../services/sheets';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await loginUser(username.trim(), password);
      if (result.success && result.user) {
        // Save auth data to localStorage
        localStorage.setItem('contentlab_is_authenticated', 'true');
        localStorage.setItem('contentlab_logged_user', JSON.stringify(result.user));
        
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Username atau password salah.');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal menghubungi server untuk verifikasi login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Brand Logo header */}
        <div className="login-brand">
          <div className="login-logo-ring">
            <Layers size={24} />
          </div>
          <h2 className="login-title">ContentLab</h2>
          <span className="login-subtitle">
            Content Marketing Studio Planner & Tracker
          </span>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="login-error-banner">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Username atau Email</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nama atau email akun Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                style={{ paddingRight: '40px' }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            disabled={isSubmitting}
          >
            <KeyRound size={16} />
            <span>{isSubmitting ? 'Verifikasi...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '-8px', lineHeight: 1.4 }}>
          Gunakan nama atau email yang terdaftar di tab <code>Team</code>.
        </div>
      </div>
    </div>
  );
};
