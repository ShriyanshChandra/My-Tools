import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Terminal, 
  Calculator, 
  FileText, 
  Lock, 
  QrCode,
  ArrowRight,
  Code
} from 'lucide-react';
import '../App.css'; // Path is now one level up

function Home() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const toolsPlaceholder = [
    {
      id: 'qr',
      title: 'QR Code Generator',
      desc: 'Instantly generate high-quality QR codes for URLs with custom domain labels.',
      icon: <QrCode size={28} color="#00FA9A" />,
      delay: '0.1s',
      color: '#00FA9A',
      path: '/qr'
    },
    {
      id: 'formatter',
      title: 'Text Formatter',
      desc: 'Convert, clean, and format your text with powerful regex and styling options.',
      icon: <FileText size={28} color="var(--accent-1)" />,
      delay: '0.2s',
      color: 'var(--accent-1)',
      path: '/'
    },
    {
      id: 'converter',
      title: 'Unit Converter',
      desc: 'Quickly convert between lengths, weights, temperatures, and more instantly.',
      icon: <Calculator size={28} color="var(--accent-3)" />,
      delay: '0.3s',
      color: 'var(--accent-3)',
      path: '/'
    },
    {
      id: 'password',
      title: 'Password Generator',
      desc: 'Create highly secure, customizable passwords that meet any requirement.',
      icon: <Lock size={28} color="var(--accent-2)" />,
      delay: '0.4s',
      color: 'var(--accent-2)',
      path: '/'
    },
    {
      id: 'regex',
      title: 'Regex Tester',
      desc: 'Test your regular expressions against sample text in real-time.',
      icon: <Code size={28} color="#FFD700" />,
      delay: '0.5s',
      color: '#FFD700',
      path: '/'
    }
  ];

  return (
    <>
      {/* Animated Background */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="app-container">
        {/* Header */}
        <nav className="navbar glass">
          <div className="logo">
            <Terminal className="logo-icon" size={32} />
            <span>Dev<span className="text-gradient">Tools</span></span>
          </div>
          <button className="btn btn-primary">Github</button>
        </nav>

        {/* Hero Section */}
        <header className="hero">
          <div className="hero-tag">
            <Sparkles size={16} />
            <span>v1.0 is now live</span>
          </div>
          <h1>
            Your Personal <br />
            <span className="text-gradient">Superpower Suite</span>
          </h1>
          <p>
            A collection of fast, beautiful, and secure utilities crafted 
            to boost your daily productivity. No ads, no tracking.
          </p>
        </header>

        {/* Tools Grid */}
        <main className="tools-grid">
          {toolsPlaceholder.map((tool, index) => (
            <Link 
              to={tool.path}
              key={tool.id} 
              className="tool-card"
              style={{ animationDelay: tool.delay, textDecoration: 'none' }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="card-content">
                <div 
                  className="card-icon-wrapper"
                  style={{ 
                    boxShadow: hoveredIndex === index ? `0 0 20px ${tool.color}40` : 'none',
                    borderColor: hoveredIndex === index ? `${tool.color}50` : 'rgba(255,255,255,0.05)'
                  }}
                >
                  {tool.icon}
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.desc}</p>
                <div className="card-action">
                  <span>Open Tool</span>
                  <ArrowRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </main>
      </div>
    </>
  );
}

export default Home;
