import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const handleLetsGo = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-8">
          Welcome to NextStop
        </h1>
        <button
          onClick={handleLetsGo}
          className="px-8 py-4 bg-indigo-600 text-white text-xl font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transform hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-300"
        >
          Let's go
        </button>
      </div>
    </div>
  );
}
