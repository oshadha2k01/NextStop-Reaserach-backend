import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png'; 

export default function AppBrandLogo() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label="Go to Home"
      onClick={() => navigate('/')}
      className="fixed top-4 left-4 z-[1000] h-14 w-14 rounded-full overflow-hidden hover:scale-105 transition-transform bg-transparent p-0 border-0"
      title="NextStop Home"
    >
      <img
        src={logo}
        alt="NextStop logo"
        className="h-full w-full object-contain mix-blend-screen"
      />
    </button>
  );
}
