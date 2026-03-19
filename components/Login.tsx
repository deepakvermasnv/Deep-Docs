'use client';

import React from 'react';
import { auth, provider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { LogIn } from 'lucide-react';

const Login = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F8F9FA] dark:bg-[#0E1113]">
      <div className="bg-white dark:bg-[#1A1C1E] p-10 rounded-2xl shadow-xl flex flex-col items-center gap-6">
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Docs Clone</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to start creating documents</p>
        </div>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-blue-500/30"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;
