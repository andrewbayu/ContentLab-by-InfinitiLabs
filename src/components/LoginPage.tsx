import React, { useState } from 'react';
import { Layers, KeyRound, AlertCircle, Eye, EyeOff, Sparkles, BarChart3, Users } from 'lucide-react';
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
    <div className="login-split">
      {/* ===== LEFT SECTION — Animated Brand & Headline ===== */}
      <div className="login-left">
        {/* Animated gradient blobs */}
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />

        {/* Floating particles */}
        <div className="login-particles">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="login-particle" style={{
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${12 + (i % 5) * 2}s`,
            }} />
          ))}
        </div>

        {/* Grid overlay */}
        <div className="login-grid-overlay" />

        {/* Brand header */}
        <div className="login-brand-hero">
          <div className="login-logo-ring-large">
            <Layers size={32} />
          </div>
          <div className="login-brand-text">
            <h1 className="login-brand-name">ContentLab</h1>
            <span className="login-brand-tag">Studio Planner</span>
          </div>
        </div>

        {/* Headline */}
        <div className="login-headline">
          <h2 className="login-headline-title">
            Plan. Create. <span className="login-headline-accent">Publish.</span>
          </h2>
          <p className="login-headline-desc">
            The all-in-one content marketing studio for teams who ship faster —
            kanban boards, calendar scheduling, real-time collaboration, and analytics in one place.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon"><BarChart3 size={18} /></div>
            <span>Visual Kanban & Calendar</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon"><Users size={18} /></div>
            <span>Team Collaboration & @mentions</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon"><Sparkles size={18} /></div>
            <span>Real-time Sync & Analytics</span>
          </div>
        </div>

        <div className="login-footer-badge">by InfinitiLabs</div>
      </div>

      {/* ===== RIGHT SECTION — Login Form ===== */}
      <div className="login-right">
        <div className="login-card">
          {/* Brand Logo header */}
          <div className="login-brand">
            <div className="login-logo-ring">
              <Layers size={24} />
            </div>
            <h2 className="login-title">Welcome Back</h2>
            <span className="login-subtitle">Sign in to access your workspace</span>
          </div>

          {/* Error message banner */}
          {error && (
            <div className="login-error-banner" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username atau Email</label>
              <input
                id="login-username"
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

            <div className="form-group login-password-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="login-password-wrapper">
                <input
                  id="login-password"
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
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="login-password-toggle"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={isSubmitting}
            >
              <KeyRound size={16} />
              <span>{isSubmitting ? 'Verifikasi...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="login-hint">
            Gunakan nama atau email yang terdaftar di tab <code>Team</code>.
          </div>
        </div>
      </div>
    </div>
  );
};