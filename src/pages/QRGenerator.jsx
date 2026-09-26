import React, { useState, useRef, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Wifi, Link2, Mail, MessageSquare, Type, Image as ImageIcon, Palette, QrCode, LayoutGrid, Check } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import './QRGenerator.css';

const CustomCheckbox = ({ checked, onChange, label, style }) => {
    return (
        <label className={`custom-checkbox-label ${checked ? 'checked' : ''}`} style={style}>
            <input 
                type="checkbox" 
                className="custom-checkbox-input"
                checked={checked} 
                onChange={onChange} 
            />
            <span className="custom-checkbox-box">
                <Check size={12} strokeWidth={3} className="custom-checkbox-icon" />
            </span>
            <span className="custom-checkbox-text">{label}</span>
        </label>
    );
};

const HexColorPicker = ({ value, onChange, label, defaultValue = '#000000' }) => {
    const [inputValue, setInputValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!isFocused) {
            setInputValue(value);
        }
    }, [value, isFocused]);

    const handleTextChange = (e) => {
        let val = e.target.value;
        if (val.startsWith('##')) {
            val = val.replace(/^#+/, '#');
        } else if (val.length > 0 && !val.startsWith('#')) {
            val = '#' + val;
        }
        setInputValue(val);

        // Check if user typed invalid non-hex characters
        const isHexCharsOnly = /^#[0-9A-Fa-f]*$/.test(val);
        if (!isHexCharsOnly && val.length > 1) {
            setErrorMsg('! Invalid Hex colour');
        } else {
            setErrorMsg('');
        }

        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            setErrorMsg('');
            onChange(val.toLowerCase());
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        let val = inputValue.trim();
        if (val.length > 0 && !val.startsWith('#')) {
            val = '#' + val;
        }

        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            const formatted = val.toLowerCase();
            setInputValue(formatted);
            setErrorMsg('');
            onChange(formatted);
        } else if (/^#[0-9A-Fa-f]{3}$/.test(val)) {
            const expanded = ('#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]).toLowerCase();
            setInputValue(expanded);
            setErrorMsg('');
            onChange(expanded);
        } else {
            // Reset to default on invalid or incomplete hex input and show error badge
            const fallback = defaultValue.toLowerCase();
            setInputValue(fallback);
            setErrorMsg('! Invalid Hex colour');
            setTimeout(() => {
                setErrorMsg('');
            }, 2500);
            onChange(fallback);
        }
    };

    const textInputRef = useRef(null);

    return (
        <div 
            className={`color-input-wrapper ${errorMsg ? 'has-error' : ''}`}
            onClick={(e) => {
                if (e.target.tagName !== 'INPUT') {
                    textInputRef.current?.focus();
                }
            }}
        >
            <input 
                type="color" 
                value={value && value.length === 7 && value.startsWith('#') ? value : defaultValue} 
                onChange={(e) => {
                    const newColor = e.target.value.toLowerCase();
                    setInputValue(newColor);
                    setErrorMsg('');
                    onChange(newColor);
                }} 
                aria-label={label || 'Color picker'}
            />
            <input
                ref={textInputRef}
                type="text"
                className="hex-text-input"
                value={inputValue}
                onFocus={() => {
                    setIsFocused(true);
                    setErrorMsg('');
                }}
                onChange={handleTextChange}
                onBlur={handleBlur}
                maxLength={7}
                placeholder={defaultValue}
                spellCheck={false}
                aria-label={label || 'Hex color code'}
            />
            {errorMsg && <span className="hex-error-badge">{errorMsg}</span>}
        </div>
    );
};

const QRGenerator = () => {
    // State for QR Types and Data
    const [qrType, setQrType] = useState('url'); // 'url', 'wifi', 'email', 'sms', 'text'
    
    // Add page-specific body class for backgrounds
    useEffect(() => {
        document.body.classList.add('qr-page-active');
        return () => {
            document.body.classList.remove('qr-page-active');
        };
    }, []);
    
    // Inputs based on type
    const [url, setUrl] = useState('');
    const [text, setText] = useState('');
    const [wifiSSID, setWifiSSID] = useState('');
    const [wifiPass, setWifiPass] = useState('');
    const [wifiType, setWifiType] = useState('WPA');
    const [wifiHidden, setWifiHidden] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailSub, setEmailSub] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [smsPhone, setSmsPhone] = useState('');
    const [smsMsg, setSmsMsg] = useState('');

    // Final string passed to QRCode
    const [qrValue, setQrValue] = useState('');

    const [logoUrl, setLogoUrl] = useState('');
    const [logoSize, setLogoSize] = useState(15); // 15%
    const [showDomainText, setShowDomainText] = useState(false);

    // Styling states
    // Advanced Styling
    const [dotsType, setDotsType] = useState('square');
    const [cornersSquareType, setCornersSquareType] = useState('square');
    const [cornersDotType, setCornersDotType] = useState('square');
    
    // Foreground Colors
    const [fgColor, setFgColor] = useState('#000000');
    const [useGradient, setUseGradient] = useState(false);
    const [gradientColor, setGradientColor] = useState('#00d2ff');
    const [gradientAngle, setGradientAngle] = useState(45);
    const [fgGradientType, setFgGradientType] = useState('linear'); // 'linear', 'radial'

    // Background Colors
    const [bgColor, setBgColor] = useState('#FFFFFF');
    const [useBgGradient, setUseBgGradient] = useState(false);
    const [bgGradientColor, setBgGradientColor] = useState('#f0f0f0');
    const [bgGradientAngle, setBgGradientAngle] = useState(45);
    const [bgGradientType, setBgGradientType] = useState('linear'); // 'linear', 'radial'

    const qrRef = useRef(null);
    const qrCode = useRef(null);

    // Initialize QR Code Styling instance ONCE
    useEffect(() => {
        qrCode.current = new QRCodeStyling({
            width: 1024,
            height: 1024,
            type: 'canvas',
            margin: 0,
            qrOptions: {
                errorCorrectionLevel: 'H'
            }
        });
        
        if (qrRef.current) {
            qrCode.current.append(qrRef.current);
            // Apply initial CSS to the injected canvas
            const canvas = qrRef.current.querySelector('canvas');
            if(canvas) {
                canvas.style.width = '17.5rem';
                canvas.style.height = '17.5rem';
                canvas.style.borderRadius = '0.75rem';
                canvas.classList.add('qr-canvas-element');
            }
        }
    }, []);

    // Update QR Value when inputs change
    useEffect(() => {
        let val = '';
        if (qrType === 'url') val = url;
        else if (qrType === 'text') val = text;
        else if (qrType === 'wifi') {
            const h = wifiHidden ? 'true' : 'false';
            val = `WIFI:T:${wifiType};S:${wifiSSID};P:${wifiPass};H:${h};;`;
        }
        else if (qrType === 'email') val = `mailto:${emailTo}?subject=${encodeURIComponent(emailSub)}&body=${encodeURIComponent(emailBody)}`;
        else if (qrType === 'sms') val = `smsto:${smsPhone}:${smsMsg}`;
        
        setQrValue(val);
    }, [qrType, url, text, wifiSSID, wifiPass, wifiType, wifiHidden, emailTo, emailSub, emailBody, smsPhone, smsMsg]);

    // Update the QR Code styling and data
    useEffect(() => {
        if (!qrCode.current) return;
        
        const dotsOptions = { type: dotsType };
        if (useGradient) {
            dotsOptions.gradient = {
                type: fgGradientType,
                colorStops: [
                    { offset: 0, color: fgColor }, 
                    { offset: 1, color: gradientColor }
                ]
            };
            if (fgGradientType === 'linear') {
                dotsOptions.gradient.rotation = (gradientAngle * Math.PI) / 180;
            }
        } else {
            dotsOptions.color = fgColor;
            // Provide a solid-color gradient to safely 'clear' any previous gradient without crashing
            dotsOptions.gradient = {
                type: 'linear',
                rotation: 0,
                colorStops: [
                    { offset: 0, color: fgColor }, 
                    { offset: 1, color: fgColor }
                ]
            };
        }

        const backgroundOptions = {};
        if (useBgGradient) {
            backgroundOptions.gradient = {
                type: bgGradientType,
                colorStops: [
                    { offset: 0, color: bgColor }, 
                    { offset: 1, color: bgGradientColor }
                ]
            };
            if (bgGradientType === 'linear') {
                backgroundOptions.gradient.rotation = (bgGradientAngle * Math.PI) / 180;
            }
        } else {
            backgroundOptions.color = bgColor;
            // Provide a solid-color gradient to safely 'clear' any previous gradient without crashing
            backgroundOptions.gradient = {
                type: 'linear',
                rotation: 0,
                colorStops: [
                    { offset: 0, color: bgColor }, 
                    { offset: 1, color: bgColor }
                ]
            };
        }

        qrCode.current.update({
            data: qrValue || "https://example.com", // Prevent empty crashes
            dotsOptions: dotsOptions,
            backgroundOptions: backgroundOptions,
            cornersSquareOptions: { type: cornersSquareType, color: fgColor },
            cornersDotOptions: { type: cornersDotType, color: fgColor },
            image: logoUrl,
            imageOptions: {
                crossOrigin: "anonymous",
                margin: 10,
                imageSize: logoSize / 100
            }
        });

        // Ensure canvas CSS remains correct after update redraws it
        if (qrRef.current) {
            const canvas = qrRef.current.querySelector('canvas');
            if(canvas) {
                canvas.style.width = '17.5rem';
                canvas.style.height = '17.5rem';
                canvas.classList.add('qr-canvas-element');
            }
        }
    }, [qrValue, fgColor, bgColor, logoUrl, logoSize, dotsType, cornersSquareType, cornersDotType, useGradient, gradientColor, gradientAngle, fgGradientType, useBgGradient, bgGradientColor, bgGradientAngle, bgGradientType]);


    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => setLogoUrl('');

    // Helpers to extract domain for the bottom tag if it's a URL
    const getDomain = (link) => {
        if (qrType !== 'url' || !link) return '';
        try {
            const safeLink = link.startsWith('http') ? link : `https://${link}`;
            const hostname = new URL(safeLink).hostname;
            return hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    };

    const domain = showDomainText ? getDomain(url) : '';

    // Logic to download image
    const handleDownload = () => {
        const canvasSize = 1024;
        const downloadCanvas = document.createElement('canvas');
        downloadCanvas.width = canvasSize;
        downloadCanvas.height = canvasSize;
        const ctx = downloadCanvas.getContext('2d');

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const qrCanvas = qrRef.current.querySelector('canvas');

        const qrSize = domain ? 800 : 880;
        const gap = domain ? 30 : 0;
        const totalContentHeight = qrSize + gap + (domain ? 40 : 0);
        const startY = (canvasSize - totalContentHeight) / 2;
        const startX = (canvasSize - qrSize) / 2;

        if (qrCanvas) {
            ctx.drawImage(qrCanvas, startX, startY, qrSize, qrSize);
        }

        // Draw Text if Domain
        if (domain) {
            ctx.font = 'bold 48px "Space Grotesk", sans-serif';
            ctx.fillStyle = fgColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(domain, canvasSize / 2, startY + qrSize + gap);
        }

        const pngUrl = downloadCanvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `qr-code-${domain || qrType}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <>
            <div className="blob-container">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <div className="qr-generator-page">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    Back to Dashboard
                </Link>

                <div className="qr-container">
                    
                    {/* Left Panel: Settings */}
                    <div className="qr-settings-panel glass">
                        <div className="qr-header">
                            <h1>QR Generator</h1>
                        </div>

                        {/* Type Selector */}
                        <div className="type-selector">
                            <button className={`type-btn ${qrType === 'url' ? 'active' : ''}`} onClick={() => setQrType('url')}><Link2 size={16}/> URL</button>
                            <button className={`type-btn ${qrType === 'wifi' ? 'active' : ''}`} onClick={() => setQrType('wifi')}><Wifi size={16}/> Wi-Fi</button>
                            <button className={`type-btn ${qrType === 'email' ? 'active' : ''}`} onClick={() => setQrType('email')}><Mail size={16}/> Email</button>
                            <button className={`type-btn ${qrType === 'sms' ? 'active' : ''}`} onClick={() => setQrType('sms')}><MessageSquare size={16}/> SMS</button>
                            <button className={`type-btn ${qrType === 'text' ? 'active' : ''}`} onClick={() => setQrType('text')}><Type size={16}/> Text</button>
                        </div>

                        {/* Input Fields */}
                        <div className="input-group-container">
                            {qrType === 'url' && (
                                <div className="grid-inputs-vertical">
                                    <input type="text" placeholder="Enter URL (e.g., https://example.com)" className="qr-input" value={url} onChange={(e) => setUrl(e.target.value)} />
                                    <CustomCheckbox 
                                        checked={showDomainText} 
                                        onChange={(e) => setShowDomainText(e.target.checked)} 
                                        label="Show website name under QR Code" 
                                    />
                                </div>
                            )}
                            
                            {qrType === 'text' && (
                                <textarea placeholder="Enter your plain text here..." className="qr-input qr-textarea" value={text} onChange={(e) => setText(e.target.value)} />
                            )}
                            
                            {qrType === 'wifi' && (
                                <div className="grid-inputs">
                                    <input type="text" placeholder="Network Name (SSID)" className="qr-input" value={wifiSSID} onChange={(e) => setWifiSSID(e.target.value)} />
                                    <input type="password" placeholder="Password" className="qr-input" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} />
                                    <CustomSelect 
                                        value={wifiType} 
                                        onChange={setWifiType}
                                        options={[
                                            { value: 'WPA', label: 'WPA/WPA2/WPA3' },
                                            { value: 'WEP', label: 'WEP' },
                                            { value: 'nopass', label: 'None' }
                                        ]}
                                    />
                                    <CustomCheckbox 
                                        checked={wifiHidden} 
                                        onChange={(e) => setWifiHidden(e.target.checked)} 
                                        label="Hidden Network" 
                                    />
                                </div>
                            )}

                            {qrType === 'email' && (
                                <div className="grid-inputs-vertical">
                                    <input type="email" placeholder="To: (Email Address)" className="qr-input" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
                                    <input type="text" placeholder="Subject" className="qr-input" value={emailSub} onChange={(e) => setEmailSub(e.target.value)} />
                                    <textarea placeholder="Message body..." className="qr-input qr-textarea" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
                                </div>
                            )}

                            {qrType === 'sms' && (
                                <div className="grid-inputs-vertical">
                                    <input type="tel" placeholder="Phone Number" className="qr-input" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} />
                                    <textarea placeholder="Message..." className="qr-input qr-textarea" value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} />
                                </div>
                            )}
                        </div>

                        {/* Patterns & Shapes */}
                        <div className="design-section">
                            <h3 className="section-title"><LayoutGrid size={18}/> Patterns & Shapes</h3>
                            <div className="shape-selectors">
                                <div className="shape-group">
                                    <label>Dots Style</label>
                                    <CustomSelect 
                                        value={dotsType} 
                                        onChange={setDotsType}
                                        options={[
                                            { value: 'square', label: 'Square' },
                                            { value: 'dots', label: 'Dots' },
                                            { value: 'rounded', label: 'Rounded' },
                                            { value: 'extra-rounded', label: 'Extra Rounded' },
                                            { value: 'classy', label: 'Classy' },
                                            { value: 'classy-rounded', label: 'Classy Rounded' }
                                        ]}
                                    />
                                </div>
                                <div className="shape-group">
                                    <label>Corner Squares</label>
                                    <CustomSelect 
                                        value={cornersSquareType} 
                                        onChange={setCornersSquareType}
                                        options={[
                                            { value: 'square', label: 'Square' },
                                            { value: 'extra-rounded', label: 'Rounded' },
                                            { value: 'dot', label: 'Dot' }
                                        ]}
                                    />
                                </div>
                                <div className="shape-group">
                                    <label>Corner Dots</label>
                                    <CustomSelect 
                                        value={cornersDotType} 
                                        onChange={setCornersDotType}
                                        options={[
                                            { value: 'square', label: 'Square' },
                                            { value: 'dot', label: 'Dot' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Design Customization */}
                        <div className="design-section">
                            <h3 className="section-title"><Palette size={18}/> Design & Colors</h3>
                            
                            <div className="color-pickers" style={{ gridTemplateColumns: '1fr', gap: '1.875rem' }}>
                                {/* Foreground Colors */}
                                <div className="color-picker-group">
                                    <label style={{fontWeight: '700', borderBottom: '0.0625rem solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.75rem'}}>Foreground</label>
                                    <HexColorPicker value={fgColor} onChange={setFgColor} label="Foreground Color" defaultValue="#000000" />
                                    <CustomCheckbox 
                                        checked={useGradient} 
                                        onChange={(e) => setUseGradient(e.target.checked)} 
                                        label="Use Gradient?" 
                                        style={{ marginTop: '0.75rem' }} 
                                    />
                                    
                                    {useGradient && (
                                        <div style={{ padding: '0.9375rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', marginTop: '0.75rem' }}>
                                             <label style={{marginBottom: '0.375rem', display: 'block', fontSize: '0.85rem'}}>Gradient Color</label>
                                             <HexColorPicker value={gradientColor} onChange={setGradientColor} label="Foreground Gradient Color" defaultValue="#000000" />
                                             
                                             <div style={{ display: 'flex', gap: '0.9375rem', marginTop: '0.9375rem' }}>
                                                 <div style={{ flex: 1 }}>
                                                     <label style={{marginBottom: '0.375rem', display: 'block', fontSize: '0.85rem'}}>Type</label>
                                                     <CustomSelect 
                                                         value={fgGradientType} 
                                                         onChange={setFgGradientType}
                                                         options={[
                                                             { value: 'linear', label: 'Linear' },
                                                             { value: 'radial', label: 'Radial' }
                                                         ]}
                                                     />
                                                 </div>
                                                 
                                                 {fgGradientType === 'linear' && (
                                                     <div style={{ flex: 1 }}>
                                                         <div className="slider-header" style={{marginBottom: '0.375rem'}}>
                                                             <label style={{margin: 0}}>Angle</label>
                                                             <span>{gradientAngle}°</span>
                                                         </div>
                                                         <input 
                                                             type="range" 
                                                             min="0" max="360" 
                                                             value={gradientAngle} 
                                                             onChange={(e) => setGradientAngle(Number(e.target.value))}
                                                             className="styled-slider"
                                                         />
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     )}
                                </div>

                                {/* Background Colors */}
                                <div className="color-picker-group">
                                    <label style={{fontWeight: '700', borderBottom: '0.0625rem solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.75rem'}}>Background</label>
                                    <HexColorPicker value={bgColor} onChange={setBgColor} label="Background Color" defaultValue="#ffffff" />
                                    <CustomCheckbox 
                                        checked={useBgGradient} 
                                        onChange={(e) => setUseBgGradient(e.target.checked)} 
                                        label="Use Gradient?" 
                                        style={{ marginTop: '0.75rem' }} 
                                    />
                                    
                                    {useBgGradient && (
                                        <div style={{ padding: '0.9375rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', marginTop: '0.75rem' }}>
                                             <label style={{marginBottom: '0.375rem', display: 'block', fontSize: '0.85rem'}}>Gradient Color</label>
                                             <HexColorPicker value={bgGradientColor} onChange={setBgGradientColor} label="Background Gradient Color" defaultValue="#ffffff" />
                                             
                                             <div style={{ display: 'flex', gap: '0.9375rem', marginTop: '0.9375rem' }}>
                                                 <div style={{ flex: 1 }}>
                                                     <label style={{marginBottom: '0.375rem', display: 'block', fontSize: '0.85rem'}}>Type</label>
                                                     <CustomSelect 
                                                         value={bgGradientType} 
                                                         onChange={setBgGradientType}
                                                         options={[
                                                             { value: 'linear', label: 'Linear' },
                                                             { value: 'radial', label: 'Radial' }
                                                         ]}
                                                     />
                                                 </div>
                                                
                                                {bgGradientType === 'linear' && (
                                                    <div style={{ flex: 1 }}>
                                                        <div className="slider-header" style={{marginBottom: '0.375rem'}}>
                                                            <label style={{margin: 0}}>Angle</label>
                                                            <span>{bgGradientAngle}°</span>
                                                        </div>
                                                        <input 
                                                            type="range" 
                                                            min="0" max="360" 
                                                            value={bgGradientAngle} 
                                                            onChange={(e) => setBgGradientAngle(Number(e.target.value))}
                                                            className="styled-slider"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="design-section">
                            <h3 className="section-title"><ImageIcon size={18}/> Logo Embed</h3>
                            <div className="logo-upload-group">
                                <label className="upload-btn">
                                    Upload Image
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                                </label>
                                {logoUrl && <button className="remove-btn" onClick={handleRemoveLogo}>Remove</button>}
                            </div>
                            {logoUrl && (
                                <div className="slider-group">
                                    <div className="slider-header">
                                        <label>Logo Size</label>
                                        <span>{logoSize}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="8" 
                                        max="30" 
                                        value={logoSize} 
                                        onChange={(e) => setLogoSize(Number(e.target.value))}
                                        className="styled-slider"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="qr-preview-panel">
                        <div className="qr-display-area" style={{ backgroundColor: bgColor }}>
                            <div className="qr-code-wrapper" ref={qrRef} style={{ display: qrValue ? 'block' : 'none' }}></div>
                            
                            {!qrValue && (
                                <div className="qr-placeholder">
                                    <QrCode size={48} color="rgba(0,0,0,0.1)" />
                                    <p>Enter data to generate QR</p>
                                </div>
                            )}
                            
                            {qrValue && domain && <div className="qr-domain-tag" style={{ color: fgColor }}>{domain}</div>}
                        </div>

                        <button 
                            className="download-btn" 
                            onClick={handleDownload}
                            disabled={!qrValue}
                        >
                            <Download size={20} />
                            Download HQ Image
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default QRGenerator;
