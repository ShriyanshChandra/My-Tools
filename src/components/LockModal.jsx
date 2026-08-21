import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Eye, EyeOff, X, ShieldAlert, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

const LockModal = ({ isOpen, onClose, isUnlocked, onUnlockSuccess, onLock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setJustUnlocked(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

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
    if (!password.trim()) {
      setError('Please enter a password');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      let response = null;

      // 1. Attempt primary backend URL
      if (remoteBackend) {
        try {
          response = await fetch(`${remoteBackend}/api/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
          });
        } catch {
          // If remote backend failed or is asleep, attempt local proxy
          response = null;
        }
      }

      // 2. Fallback to local endpoint if remote was not set or failed
      if (!response) {
        response = await fetch('/api/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setJustUnlocked(true);
        setTimeout(() => {
          onUnlockSuccess(data.token);
          onClose();
        }, 600);
      } else {
        setError(data.message || 'Incorrect password. Access denied.');
        triggerShake();
      }
    } catch {
      setError('Cannot reach authentication server. If Render backend is sleeping, it may take ~30s to wake up.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
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
                    <span>Verifying...</span>
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
