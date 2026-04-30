import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageBackButton({ to = '/access', label = 'Back', className = '' }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[#ff6b35] font-medium hover:bg-[#ff6b35]/10 transition-colors cursor-pointer ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
