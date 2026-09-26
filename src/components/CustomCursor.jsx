import React, { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMagnetic, setIsMagnetic] = useState(false);
  const [isTextInput, setIsTextInput] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Check if device supports hover/fine pointer
    const isPointerSupported = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isPointerSupported) return;

    document.documentElement.classList.add('custom-cursor-active');

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let ringW = 34;
    let ringH = 34;
    let ringRadius = '50%';
    let animId = null;

    // Currently active magnetized or text element
    let activeMagneticEl = null;
    let activeTextEl = null;

    const handlePointerMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) setIsVisible(true);

      // Inner dot strictly tracks the exact mouse position
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      const target = e.target;
      if (!target) return;

      // 1. Interactive color swatches or eye toggles inside input wrappers
      const colorSwatch = target.closest('input[type="color"]');
      if (colorSwatch) {
        activeTextEl = null;
        activeMagneticEl = colorSwatch;
        setIsTextInput(false);
        setIsMagnetic(true);
        setIsHovered(true);
        return;
      }

      const eyeToggle = target.closest('.eye-toggle-btn');
      if (eyeToggle) {
        activeTextEl = null;
        activeMagneticEl = eyeToggle;
        setIsTextInput(false);
        setIsMagnetic(true);
        setIsHovered(true);
        return;
      }

      // 2. Detect text inputs, textareas, contenteditable fields and their enclosing styled containers
      const inputContainer = target.closest(
        '.color-input-wrapper, .key-input-wrap, .password-field-wrap, .input-wrap, .input-container'
      );

      const textEl = target.closest(
        'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]), textarea, [contenteditable="true"], .qr-input, .encryptor-textarea, .password-input, .hex-text-input'
      );

      if (inputContainer || textEl) {
        activeTextEl = inputContainer || textEl;
        activeMagneticEl = null;
        setIsTextInput(true);
        setIsMagnetic(false);
        setIsHovered(true);
        return;
      } else {
        activeTextEl = null;
        setIsTextInput(false);
      }

      // Detect tool cards and interactive magnetic elements
      const magneticTarget = target.closest(
        '.tool-card, button, .icon-btn, .btn, .tab-btn, .lock-btn, .type-btn, .preset-chip, .channel-btn, .remove-btn, .upload-btn, .download-btn, .ios-toggle-switch, .custom-checkbox-label, .checkbox-label, .sync-checkbox-label, .section-enable-toggle, .back-link, a, [role="button"]'
      );

      const interactiveTarget = magneticTarget || target.closest(
        'select, .custom-select-trigger, .custom-select-option, .clickable, .switch-toggle, .custom-checkbox-box, .sync-checkbox-custom, input[type="range"], input[type="color"], input[type="file"]'
      ) || (window.getComputedStyle(target).cursor === 'pointer');

      setIsHovered(Boolean(interactiveTarget));

      if (magneticTarget) {
        activeMagneticEl = magneticTarget;
        setIsMagnetic(true);
      } else {
        activeMagneticEl = null;
        setIsMagnetic(false);
      }
    };

    const handlePointerDown = () => setIsClicking(true);
    const handlePointerUp = () => setIsClicking(false);
    const handleMouseLeave = () => {
      setIsVisible(false);
      activeMagneticEl = null;
      activeTextEl = null;
      setIsMagnetic(false);
      setIsTextInput(false);
    };
    const handleMouseEnter = () => setIsVisible(true);

    // Smooth physics loop
    const render = () => {
      let targetRingX = mouseX;
      let targetRingY = mouseY;
      let targetW = 34;
      let targetH = 34;
      let targetRadius = '50%';

      if (activeTextEl) {
        const rect = activeTextEl.getBoundingClientRect();
        // Snap outer circle center to exact text-box center
        targetRingX = rect.left + rect.width / 2;
        targetRingY = rect.top + rect.height / 2;

        // Take the exact shape and size of the text-box
        targetW = rect.width;
        targetH = rect.height;

        const computed = window.getComputedStyle(activeTextEl);
        targetRadius = computed.borderRadius && computed.borderRadius !== '0px'
          ? computed.borderRadius
          : '12px';
      } else if (activeMagneticEl) {
        const rect = activeMagneticEl.getBoundingClientRect();
        // Snap outer circle center to exact element center
        targetRingX = rect.left + rect.width / 2;
        targetRingY = rect.top + rect.height / 2;

        // Take the exact shape and size of the element
        targetW = rect.width;
        targetH = rect.height;

        const computed = window.getComputedStyle(activeMagneticEl);
        targetRadius = computed.borderRadius && computed.borderRadius !== '0px'
          ? computed.borderRadius
          : '14px';
      }

      // Smooth interpolation for position and shape
      const posEase = activeTextEl ? 0.28 : activeMagneticEl ? 0.22 : 0.18;
      ringX += (targetRingX - ringX) * posEase;
      ringY += (targetRingY - ringY) * posEase;

      const sizeEase = activeTextEl ? 0.26 : activeMagneticEl ? 0.22 : 0.20;
      ringW += (targetW - ringW) * sizeEase;
      ringH += (targetH - ringH) * sizeEase;
      ringRadius = targetRadius;

      // Position inner dot strictly at mouse pointer
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      // Update outer circle position, size, and border radius
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        ringRef.current.style.width = `${ringW}px`;
        ringRef.current.style.height = `${ringH}px`;
        ringRef.current.style.marginTop = `${-ringH / 2}px`;
        ringRef.current.style.marginLeft = `${-ringW / 2}px`;
        ringRef.current.style.borderRadius = ringRadius;
      }

      animId = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible]);

  return (
    <div
      className={`custom-cursor-container ${isVisible ? 'visible' : ''} ${isHovered ? 'hovered' : ''} ${isMagnetic ? 'magnetic' : ''} ${isTextInput ? 'text-mode' : ''} ${isClicking ? 'clicking' : ''}`}
      aria-hidden="true"
    >
      <div ref={ringRef} className="cursor-ring" />
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
};

export default CustomCursor;
