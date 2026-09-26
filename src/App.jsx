import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AnimatedBackground from './components/AnimatedBackground';
import MapleBackground from './components/MapleBackground';
import SnowBackground from './components/SnowBackground';
import HeisenbergBackground from './components/HeisenbergBackground';
import GhibliBackground from './components/GhibliBackground';
import TokyoBackground from './components/TokyoBackground';
import CustomCursor from './components/CustomCursor';
import Home from './pages/Home';
import QRGenerator from './pages/QRGenerator';
import SoundGenerator from './pages/SoundGenerator';
import TextEncryptor from './pages/TextEncryptor';
import NetworkMap from './pages/NetworkMap';

function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <AnimatedBackground />
      <MapleBackground />
      <SnowBackground />
      <HeisenbergBackground />
      <GhibliBackground />
      <TokyoBackground />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/qr" element={<QRGenerator />} />
        <Route path="/sound" element={<SoundGenerator />} />
        <Route path="/encrypt" element={<TextEncryptor />} />
        <Route path="/network-map" element={<NetworkMap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
