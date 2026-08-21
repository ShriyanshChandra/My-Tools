import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import QRGenerator from './pages/QRGenerator';
import SoundGenerator from './pages/SoundGenerator';
import TextEncryptor from './pages/TextEncryptor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/qr" element={<QRGenerator />} />
        <Route path="/sound" element={<SoundGenerator />} />
        <Route path="/encrypt" element={<TextEncryptor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
