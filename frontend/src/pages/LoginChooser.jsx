import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserSquare, ArrowLeft } from 'lucide-react';

export default function LoginChooser() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff4ec] via-[#fff9f6] to-[#f2d9cc] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[#ff6b35] font-medium hover:bg-[#cc562a] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <div className="bg-white rounded-3xl border border-[#f2d9cc] shadow-xl overflow-hidden">
          <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#f2d9cc] bg-[#fffaf7] p-6 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-[#ff6b35]/10 text-[#ff6b35] flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[#2a1a15]">SuperAdmin Login</h2>
              <p className="mt-2 text-sm text-[#6b4b3d]">
                Monitor the full fleet, manage governance actions, and control system-level operations.
              </p>
              <button
                onClick={() => navigate('/superadminlogin')}
                className="mt-6 w-full py-3 rounded-xl bg-[#ff6b35] text-white font-semibold hover:bg-[#cc562a] transition-colors"
              >
                Continue as SuperAdmin
              </button>
            </div>

            <div className="rounded-2xl border border-[#f2d9cc] bg-[#fffaf7] p-6 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-[#ff6b35]/10 text-[#ff6b35] flex items-center justify-center">
                <UserSquare className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[#2a1a15]">Admin Login</h2>
              <p className="mt-2 text-sm text-[#6b4b3d]">
                Manage buses, drivers, devices, complaints, and daily operations from your dashboard.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-3 rounded-xl bg-[#ff6b35] text-white font-semibold hover:bg-[#cc562a] transition-colors"
              >
                Continue as Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
