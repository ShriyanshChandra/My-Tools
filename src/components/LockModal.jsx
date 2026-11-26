import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Eye, EyeOff, X, ShieldAlert, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

const isLocalHostname = () => (
  typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'
  )
);

const LockModal = ({ isOpen, onClose, isUnlocked, onUnlockSuccess, onLock, onResetVisibility }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setIsWakingServer(false);
      setJustUnlocked(false);

      // Warm up remote Render backend while user types password in production
      const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      if (remoteBackend && !isUnlocked && !isLocalHostname()) {
        fetch(`${remoteBackend}/api/health`, { method: 'GET' }).catch(() => {});
      }

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, isUnlocked]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const inputPassword = password.trim();
    if (!inputPassword) {
      setError('Please enter a password');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setIsWakingServer(false);
    setError('');
    const wakingTimer = setTimeout(() => setIsWakingServer(true), 3500);

    const isLocal = isLocalHostname();

    const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
    const clientMasterPass = (import.meta.env.VITE_TOOLS_PASSWORD || '').trim();

    // Sequence of endpoints to query: Local proxy first on localhost, remote backend first in production
    const endpointsToTry = [];
    if (isLocal) {
      endpointsToTry.push('/api/verify-password');
      if (remoteBackend) endpointsToTry.push(`${remoteBackend}/api/verify-password`);
    } else {
      if (remoteBackend) endpointsToTry.push(`${remoteBackend}/api/verify-password`);
      endpointsToTry.push('/api/verify-password');
    }

    let verified = false;
    let verifiedToken = null;
    let serverReturnedError = '';
    let reachedAnyServer = false;

    for (const endpoint of endpointsToTry) {
      try {
        const controller = new AbortController();
        // Remote backends (e.g. Render free tier) can take ~30-45s to cold-start
        const timeoutMs = endpoint.startsWith('http') ? 45000 : 8000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: inputPassword }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : null;

        if (!data || typeof data !== 'object') {
          continue;
        }

        reachedAnyServer = true;

        if (response.ok && data.success) {
          verified = true;
          verifiedToken = data.token || 'session-token';
          break;
        } else if (response.status === 401 || response.status === 429 || data.message) {
          serverReturnedError = data.message || 'Incorrect password. Access denied.';
        }
      } catch {
        // Endpoint unreachable or timed out, attempt next target
      }
    }

    // Client-side environment fallback
    if (!verified && clientMasterPass && inputPassword === clientMasterPass) {
      verified = true;
      verifiedToken = 'client-verified-session';
    }

    clearTimeout(wakingTimer);
    setIsWakingServer(false);

    if (verified) {
      setJustUnlocked(true);
      setTimeout(() => {
        onUnlockSuccess(verifiedToken);
        onClose();
      }, 600);
    } else {
      setError(
        serverReturnedError ||
        (reachedAnyServer || clientMasterPass
          ? 'Incorrect password. Access denied.'
          : (!remoteBackend && !isLocal
              ? 'Authentication server is not configured (VITE_BACKEND_URL is missing in the deployed build).'
              : 'Cannot reach authentication server. If Render backend is sleeping, wait ~30-50s and try again (or verify CORS_ORIGIN on Render).'))
      );
      triggerShake();
    }
    setIsLoading(false);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleLockAgain = () => {
    onLock();
    onClose();
  };

  return (
    <div className="lock-modal-backdrop" onClick={onClose}>
      <div
        className={`lock-modal-card glass ${isShaking ? 'shake-anim' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="lock-modal-header">
          <div className="lock-modal-title">
            <div className={`lock-header-icon-wrap ${isUnlocked ? 'unlocked-glow' : ''}`}>
              {isUnlocked ? <Unlock size={22} /> : <Lock size={22} />}
            </div>
            <div>
              <h3>{isUnlocked ? 'Secret Tools Active' : 'Unlock Secret Tools'}</h3>
              <p className="lock-modal-subtitle">
                {isUnlocked
                  ? 'Hidden tools are currently visible across the app'
                  : 'Enter password to reveal hidden utilities'}
              </p>
            </div>
          </div>
          <button className="lock-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {isUnlocked ? (
          <div className="lock-unlocked-body">
            <div className="unlocked-status-pill">
              <CheckCircle2 size={20} className="status-success-icon" />
              <span>All secret tools are unlocked and ready to use.</span>
            </div>

            <div className="lock-modal-actions">
              {onResetVisibility && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    onResetVisibility();
                    setResetSuccess(true);
                    setTimeout(() => setResetSuccess(false), 2000);
                  }}
                  title="Reset custom card visibility back to defaults"
                >
                  <Sparkles size={16} />
                  <span>{resetSuccess ? 'Reset Done!' : 'Reset Visibility Defaults'}</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-lock-again"
                onClick={handleLockAgain}
              >
                <Lock size={16} />
                <span>Hide & Lock Tools</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="lock-form">
            <div className="password-input-group">
              <label htmlFor="secret-password-input">Master Password</label>
              <div className={`password-field-wrap ${error ? 'input-error' : ''}`}>
                <input
                  id="secret-password-input"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter secret password..."
                  disabled={isLoading || justUnlocked}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div className="error-message">
                  <ShieldAlert size={15} />
                  <span>{error}</span>
                </div>
              )}

              {justUnlocked && (
                <div className="success-message">
                  <Sparkles size={15} />
                  <span>Access granted! Unlocking hidden tools...</span>
                </div>
              )}
            </div>

            <div className="lock-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary unlock-submit-btn ${justUnlocked ? 'success' : ''}`}
                disabled={isLoading || justUnlocked}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>{isWakingServer ? 'Waking server...' : 'Verifying...'}</span>
                  </>
                ) : justUnlocked ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Unlocked!</span>
                  </>
                ) : (
                  <>
                    <Unlock size={18} />
                    <span>Unlock Tools</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LockModal;
