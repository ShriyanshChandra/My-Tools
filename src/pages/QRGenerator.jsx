import React, { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Wifi, Link2, Mail, MessageSquare, Type, Image as ImageIcon, Palette, QrCode } from 'lucide-react';
import './QRGenerator.css';

const QRGenerator = () => {
    // State for QR Types and Data
    const [qrType, setQrType] = useState('url'); // 'url', 'wifi', 'email', 'sms', 'text'
    
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

    // Styling states
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#FFFFFF');
    const [logoUrl, setLogoUrl] = useState('');
    const [logoSize, setLogoSize] = useState(10); // 10%
    const [showDomainText, setShowDomainText] = useState(true);

    const canvasRef = useRef(null);

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
        } catch (e) {
            return '';
        }
    };

    const domain = showDomainText ? getDomain(url) : '';

    // Logic to download image
    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const canvasSize = 1024;
        const downloadCanvas = document.createElement('canvas');
        downloadCanvas.width = canvasSize;
        downloadCanvas.height = canvasSize;
        const ctx = downloadCanvas.getContext('2d');

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const qrCanvas = document.querySelector('.qr-canvas-element');

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

    const imageSettings = logoUrl ? {
        src: logoUrl,
        height: (logoSize / 100) * 1024,
        width: (logoSize / 100) * 1024,
        excavate: true, // clears background behind the logo
    } : undefined;

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
                            <h1>Pro QR Generator</h1>
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
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={showDomainText} onChange={(e) => setShowDomainText(e.target.checked)} />
                                        Show website name under QR Code
                                    </label>
                                </div>
                            )}
                            
                            {qrType === 'text' && (
                                <textarea placeholder="Enter your plain text here..." className="qr-input qr-textarea" value={text} onChange={(e) => setText(e.target.value)} />
                            )}
                            
                            {qrType === 'wifi' && (
                                <div className="grid-inputs">
                                    <input type="text" placeholder="Network Name (SSID)" className="qr-input" value={wifiSSID} onChange={(e) => setWifiSSID(e.target.value)} />
                                    <input type="password" placeholder="Password" className="qr-input" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} />
                                    <select className="qr-input" value={wifiType} onChange={(e) => setWifiType(e.target.value)}>
                                        <option value="WPA">WPA/WPA2/WPA3</option>
                                        <option value="WEP">WEP</option>
                                        <option value="nopass">None</option>
                                    </select>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={wifiHidden} onChange={(e) => setWifiHidden(e.target.checked)} />
                                        Hidden Network
                                    </label>
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

                        {/* Design Customization */}
                        <div className="design-section">
                            <h3 className="section-title"><Palette size={18}/> Design & Colors</h3>
                            <div className="color-pickers">
                                <div className="color-picker-group">
                                    <label>Foreground</label>
                                    <div className="color-input-wrapper">
                                        <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} />
                                        <span>{fgColor}</span>
                                    </div>
                                </div>
                                <div className="color-picker-group">
                                    <label>Background</label>
                                    <div className="color-input-wrapper">
                                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                                        <span>{bgColor}</span>
                                    </div>
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
                        <div className="qr-display-area" style={{ backgroundColor: bgColor }} ref={canvasRef}>
                            {qrValue ? (
                                <>
                                    <div className="qr-code-wrapper">
                                        <QRCodeCanvas
                                            value={qrValue}
                                            size={1024} 
                                            level={"H"}
                                            includeMargin={false}
                                            fgColor={fgColor}
                                            bgColor={bgColor}
                                            imageSettings={imageSettings}
                                            className="qr-canvas-element"
                                            style={{ width: '280px', height: '280px' }} 
                                        />
                                    </div>
                                    {domain && <div className="qr-domain-tag" style={{ color: fgColor }}>{domain}</div>}
                                </>
                            ) : (
                                <div className="qr-placeholder">
                                    <QrCode size={48} color="rgba(0,0,0,0.1)" />
                                    <p>Enter data to generate QR</p>
                                </div>
                            )}
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
