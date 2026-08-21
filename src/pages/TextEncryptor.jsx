import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Key,
  Lock,
  Unlock,
  Copy,
  Check,
  RefreshCw,
  Hash,
  Binary,
  Code2
} from 'lucide-react';
import '../App.css';

const TextEncryptor = () => {
  const [activeTab, setActiveTab] = useState('aes'); // 'aes', 'base64', 'hash', 'hex'
  const [inputText, setInputText] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [hashType, setHashType] = useState('SHA-256');

  // Simple AES-GCM / WebCrypto helper
  const deriveKey = async (password, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const handleEncryptAES = async () => {
    if (!inputText) return setStatusMsg('Please enter text to encrypt');
    if (!secretKey) return setStatusMsg('Please enter a secret key');
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(secretKey, salt);
      const enc = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(inputText)
      );

      // Pack salt + iv + encrypted bytes into base64
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      const base64 = btoa(String.fromCharCode(...combined));
      setOutputText(base64);
      setStatusMsg('🔒 Text encrypted successfully with AES-256!');
    } catch (err) {
      setStatusMsg('❌ Encryption failed: ' + err.message);
    }
  };

  const handleDecryptAES = async () => {
    if (!inputText) return setStatusMsg('Please enter ciphertext to decrypt');
    if (!secretKey) return setStatusMsg('Please enter the secret key');
    try {
      const combinedStr = atob(inputText.trim());
      const combined = new Uint8Array(combinedStr.length);
      for (let i = 0; i < combinedStr.length; i++) {
        combined[i] = combinedStr.charCodeAt(i);
      }

      if (combined.length < 28) throw new Error('Invalid encrypted payload');

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);

      const key = await deriveKey(secretKey, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      const dec = new TextDecoder();
      setOutputText(dec.decode(decrypted));
      setStatusMsg('🔓 Text decrypted successfully!');
    } catch {
      setStatusMsg('❌ Decryption failed. Incorrect key or corrupted payload.');
    }
  };

  const handleBase64 = (mode) => {
    try {
      if (!inputText) return setStatusMsg('Please enter text');
      if (mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(inputText)));
        setOutputText(encoded);
        setStatusMsg('Base64 encoded successfully');
      } else {
        const decoded = decodeURIComponent(escape(atob(inputText.trim())));
        setOutputText(decoded);
        setStatusMsg('Base64 decoded successfully');
      }
    } catch {
      setStatusMsg('❌ Invalid Base64 string');
    }
  };

  const handleHash = async () => {
    try {
      if (!inputText) return setStatusMsg('Please enter text to hash');
      const enc = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(hashType, enc.encode(inputText));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setOutputText(hashHex);
      setStatusMsg(`${hashType} hash generated`);
    } catch (err) {
      setStatusMsg('❌ Hashing failed: ' + err.message);
    }
  };

  const handleHex = (mode) => {
    try {
      if (!inputText) return setStatusMsg('Please enter text');
      if (mode === 'encode') {
        let hex = '';
        for (let i = 0; i < inputText.length; i++) {
          hex += inputText.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
        }
        setOutputText(hex.trim());
        setStatusMsg('Hex encoded');
      } else {
        const hexClean = inputText.replace(/\s+/g, '');
        let str = '';
        for (let i = 0; i < hexClean.length; i += 2) {
          str += String.fromCharCode(parseInt(hexClean.substr(i, 2), 16));
        }
        setOutputText(str);
        setStatusMsg('Hex decoded');
      }
    } catch {
      setStatusMsg('❌ Invalid Hex string');
    }
  };

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <nav className="navbar glass">
        <Link to="/" className="icon-btn" title="Back to Tools">
          <ArrowLeft size={20} />
        </Link>
        <div className="logo">
          <Shield className="logo-icon" size={28} />
          <span>Secret <span className="text-gradient">Crypt Suite</span></span>
        </div>
        <div style={{ width: 40 }}></div>
      </nav>

      <div className="encryptor-container glass-panel">
        <div className="encryptor-tabs">
          <button
            className={`tab-btn ${activeTab === 'aes' ? 'active' : ''}`}
            onClick={() => { setActiveTab('aes'); setStatusMsg(''); }}
          >
            <Lock size={16} />
            <span>AES-256 Vault</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'base64' ? 'active' : ''}`}
            onClick={() => { setActiveTab('base64'); setStatusMsg(''); }}
          >
            <Code2 size={16} />
            <span>Base64</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'hash' ? 'active' : ''}`}
            onClick={() => { setActiveTab('hash'); setStatusMsg(''); }}
          >
            <Hash size={16} />
            <span>Hash Generator</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'hex' ? 'active' : ''}`}
            onClick={() => { setActiveTab('hex'); setStatusMsg(''); }}
          >
            <Binary size={16} />
            <span>Hex Converter</span>
          </button>
        </div>

        <div className="encryptor-body">
          {/* Input Section */}
          <div className="field-block">
            <label className="field-label">Input Text / Payload</label>
            <textarea
              className="text-area-box"
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or paste your text here..."
            />
          </div>

          {/* Key input for AES */}
          {activeTab === 'aes' && (
            <div className="field-block">
              <label className="field-label">Secret Encryption Key / Passphrase</label>
              <div className="key-input-wrap">
                <Key size={18} className="key-icon" />
                <input
                  type="password"
                  className="key-input"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter private secret key..."
                />
              </div>
            </div>
          )}

          {/* Hash options */}
          {activeTab === 'hash' && (
            <div className="field-block">
              <label className="field-label">Hash Algorithm</label>
              <div className="hash-select-pills">
                {['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`hash-pill ${hashType === type ? 'active' : ''}`}
                    onClick={() => setHashType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="actions-bar">
            {activeTab === 'aes' && (
              <>
                <button className="btn btn-primary" onClick={handleEncryptAES}>
                  <Lock size={16} />
                  <span>Encrypt AES-256</span>
                </button>
                <button className="btn btn-secondary" onClick={handleDecryptAES}>
                  <Unlock size={16} />
                  <span>Decrypt AES-256</span>
                </button>
              </>
            )}

            {activeTab === 'base64' && (
              <>
                <button className="btn btn-primary" onClick={() => handleBase64('encode')}>
                  Encode to Base64
                </button>
                <button className="btn btn-secondary" onClick={() => handleBase64('decode')}>
                  Decode from Base64
                </button>
              </>
            )}

            {activeTab === 'hash' && (
              <button className="btn btn-primary" onClick={handleHash}>
                <Hash size={16} />
                <span>Compute {hashType} Digest</span>
              </button>
            )}

            {activeTab === 'hex' && (
              <>
                <button className="btn btn-primary" onClick={() => handleHex('encode')}>
                  Convert to Hex
                </button>
                <button className="btn btn-secondary" onClick={() => handleHex('decode')}>
                  Decode from Hex
                </button>
              </>
            )}

            <button
              className="btn btn-icon-only"
              title="Clear all"
              onClick={() => {
                setInputText('');
                setOutputText('');
                setStatusMsg('');
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {statusMsg && <div className="status-banner">{statusMsg}</div>}

          {/* Output Section */}
          <div className="field-block output-block">
            <div className="output-header">
              <label className="field-label">Result Output</label>
              {outputText && (
                <button className="copy-action-btn" onClick={copyToClipboard}>
                  {copied ? <Check size={14} color="#00FA9A" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Result'}</span>
                </button>
              )}
            </div>
            <textarea
              className="text-area-box output-area"
              rows={4}
              readOnly
              value={outputText}
              placeholder="Output result will appear here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextEncryptor;
