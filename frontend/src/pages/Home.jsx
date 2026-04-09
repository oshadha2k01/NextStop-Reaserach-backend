import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Home() {
  const navigate = useNavigate();

  const handleLetsGo = () => {
    navigate('/access');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff4ec] via-[#fffaf7] to-[#f2d9cc] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-[#f2d9cc] shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6b35]/10 text-[#ff6b35] text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="h-4 w-4" />
              Smart Transit Control
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl font-bold text-[#2a1a15] leading-tight">
              Welcome to NextStop
            </h1>

            <p className="mt-4 text-[#6b4b3d] text-base md:text-lg">
              One platform for secure operations, live monitoring, and efficient city bus management.
            </p>

            <button
              onClick={handleLetsGo}
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-[#ff6b35] text-white text-lg font-semibold rounded-xl shadow-md hover:bg-[#cc562a] transition-all duration-200"
            >
              Let's Go
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-gradient-to-br from-[#ff6b35] to-[#ff8f66] p-8 md:p-12 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm p-1.5">
                <img src={logo} alt="NextStop logo" className="h-full w-full object-contain mix-blend-screen" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Operational Excellence</h2>
              <p className="mt-3 text-white/90 text-sm md:text-base max-w-xs">
                Navigate to dedicated Admin and SuperAdmin access with a single guided entry point.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
