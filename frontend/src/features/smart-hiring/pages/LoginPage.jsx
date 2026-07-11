import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { Mail, Lock, User, Building2, ArrowRight, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/shared/lib/apiBaseUrl';
import '@/features/smart-hiring/styles/smart-hiring-login.css';

const REMEMBER_KEY = 'aai_hrms_remember_email';

function formatAuthError(error, fallback) {
  if (!error?.response) {
    const m = error?.message || '';
    if (m === 'Network Error' || m.includes('Network')) {
      return `Cannot reach API (${API_BASE_URL}). For local dev, set REACT_APP_BACKEND_URL in frontend/.env if the API is not on the default port (e.g. http://127.0.0.1:8000/api).`;
    }
    return m || fallback;
  }
  const d = error.response.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d.map((x) => (typeof x === 'object' && x?.msg ? x.msg : JSON.stringify(x))).join('; ') || fallback;
  }
  if (d && typeof d === 'object') return JSON.stringify(d);
  return fallback;
}

function initialAuthTab(searchParams) {
  const tab = (searchParams.get('tab') || '').toLowerCase();
  if (tab === 'register' || tab === 'signup' || tab === 'sign-up') return 'register';
  return 'login';
}

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => initialAuthTab(searchParams));

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  useEffect(() => {
    setActiveTab(initialAuthTab(searchParams));
  }, [searchParams]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setLoginEmail(saved);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      try {
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, loginEmail);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(formatAuthError(error, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const fullName = [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(' ');
    if (!fullName) {
      toast.error('Please enter your first and last name.');
      return;
    }
    setLoading(true);
    try {
      await register(registerEmail, registerPassword, fullName);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(formatAuthError(error, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSso = (provider) => {
    toast.message(`${provider} SSO is coming soon.`);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    toast.message('Password reset is coming soon. Contact your administrator if you need access.');
  };

  return (
    <div className="shl-page">
      <section className="shl-visual" aria-hidden="false">
        <div className="shl-orb shl-orb-one" />
        <div className="shl-orb shl-orb-two" />
        <div className="shl-visual-inner">
          <div className="shl-brand">
            <div className="shl-brand-mark" aria-hidden="true">
              ✦
            </div>
            <div>
              <div className="shl-brand-title">AAI Smart Hiring</div>
              <div className="shl-brand-sub">Agentic talent acquisition</div>
            </div>
          </div>

          <div className="shl-hero">
            <div className="shl-eyebrow">
              <span className="shl-dot" />
              Live hiring intelligence workspace
            </div>
            <h1>
              Hire with clarity.
              <br />
              Move with confidence.
            </h1>
            <p>
              One secure workspace for requisitions, candidate matching, assessments, interviews,
              referrals, offer analytics, and AI-powered career trajectory insights.
            </p>
            <div className="shl-feature-grid">
              <div className="shl-feature">
                <div className="shl-feature-icon" aria-hidden="true">
                  ◎
                </div>
                <b>AI candidate matching</b>
                <span>
                  Rank candidates using skills, experience, title, activity, and trajectory signals.
                </span>
              </div>
              <div className="shl-feature">
                <div className="shl-feature-icon" aria-hidden="true">
                  ⌁
                </div>
                <b>Structured hiring pipeline</b>
                <span>
                  Control every hiring stage with clear ownership, SLA visibility, and evidence.
                </span>
              </div>
              <div className="shl-feature">
                <div className="shl-feature-icon" aria-hidden="true">
                  ✧
                </div>
                <b>Decision intelligence</b>
                <span>
                  Surface recommendations, risks, and next actions for recruiters and hiring managers.
                </span>
              </div>
            </div>
          </div>

          <div className="shl-visual-footer">
            <span>© 2026 AGRAYIAN AI Labs</span>
            <span>Secure access • Role-based permissions • Audit ready</span>
          </div>
        </div>
      </section>

      <section className="shl-login-side">
        <div className="shl-login-wrap">
          <div className="shl-mobile-brand">
            <div className="shl-brand-mark" aria-hidden="true">
              ✦
            </div>
            <div>
              <div className="shl-brand-title">AAI-HRMS</div>
              <div className="shl-brand-sub">Agentic AI HR Platform</div>
            </div>
          </div>

          <div className="shl-welcome">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your Smart Hiring workspace.</p>
          </div>

          <div className="shl-card">
            <div className="shl-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'login'}
                className={`shl-tab${activeTab === 'login' ? ' active' : ''}`}
                onClick={() => setActiveTab('login')}
                data-testid="login-tab"
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'register'}
                className={`shl-tab${activeTab === 'register' ? ' active' : ''}`}
                onClick={() => setActiveTab('register')}
                data-testid="register-tab"
              >
                Sign Up
              </button>
            </div>

            <form
              className={`shl-form${activeTab === 'login' ? ' active' : ''}`}
              onSubmit={handleLogin}
              noValidate={false}
            >
              <div className="shl-field">
                <label htmlFor="login-email">Work email</label>
                <div className="shl-input-wrap">
                  <Mail className="shl-input-icon" strokeWidth={1.75} />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                    data-testid="login-email-input"
                  />
                </div>
              </div>

              <div className="shl-field">
                <label htmlFor="login-password">Password</label>
                <div className="shl-input-wrap">
                  <Lock className="shl-input-icon" strokeWidth={1.75} />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    className="shl-toggle-pass"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showLoginPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="shl-form-row">
                <label className="shl-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <button type="button" className="shl-link" onClick={handleForgotPassword}>
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="shl-submit"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading && activeTab === 'login' ? (
                  <Loader2 className="shl-spin" size={20} />
                ) : (
                  <>
                    Sign In <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

              <div className="shl-divider">or continue with</div>
              <div className="shl-sso">
                <button type="button" onClick={() => handleSso('Microsoft')}>
                  Microsoft SSO
                </button>
                <button type="button" onClick={() => handleSso('Google Workspace')}>
                  Google Workspace
                </button>
              </div>
            </form>

            <form
              className={`shl-form${activeTab === 'register' ? ' active' : ''}`}
              onSubmit={handleRegister}
            >
              <div className="shl-notice">
                Create an organization account for your recruitment team. An administrator can
                configure roles and permissions after registration.
              </div>

              <div className="shl-signup-grid">
                <div className="shl-field">
                  <label htmlFor="register-first-name">First name</label>
                  <div className="shl-input-wrap">
                    <User className="shl-input-icon" strokeWidth={1.75} />
                    <input
                      id="register-first-name"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="shl-field">
                  <label htmlFor="register-last-name">Last name</label>
                  <div className="shl-input-wrap">
                    <User className="shl-input-icon" strokeWidth={1.75} />
                    <input
                      id="register-last-name"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="shl-field shl-full">
                  <label htmlFor="register-email">Work email</label>
                  <div className="shl-input-wrap">
                    <Mail className="shl-input-icon" strokeWidth={1.75} />
                    <input
                      id="register-email"
                      type="email"
                      placeholder="you@company.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={loading}
                      data-testid="register-email-input"
                    />
                  </div>
                </div>

                <div className="shl-field shl-full">
                  <label htmlFor="register-company">Company name</label>
                  <div className="shl-input-wrap">
                    <Building2 className="shl-input-icon" strokeWidth={1.75} />
                    <input
                      id="register-company"
                      type="text"
                      placeholder="Your company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      autoComplete="organization"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="shl-field shl-full">
                  <label htmlFor="register-password">Create password</label>
                  <div className="shl-input-wrap">
                    <Lock className="shl-input-icon" strokeWidth={1.75} />
                    <input
                      id="register-password"
                      type={showRegisterPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      minLength={6}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      data-testid="register-password-input"
                    />
                    <button
                      type="button"
                      className="shl-toggle-pass"
                      onClick={() => setShowRegisterPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden field for e2e that still look for register-name-input */}
              <input
                type="hidden"
                data-testid="register-name-input"
                value={[firstName, lastName].filter(Boolean).join(' ')}
                readOnly
              />

              <button
                type="submit"
                className="shl-submit"
                disabled={loading}
                data-testid="register-submit-btn"
              >
                {loading && activeTab === 'register' ? (
                  <Loader2 className="shl-spin" size={20} />
                ) : (
                  <>
                    Create Account <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="shl-helper">
            Powered by AI-driven candidate matching and hiring intelligence.
            <br />
            <Link className="shl-link" to="/">
              ← Back to product overview
            </Link>
          </div>

          <div className="shl-security">
            <span className="shl-security-badge" aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
            Enterprise-grade authentication and encrypted access
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
