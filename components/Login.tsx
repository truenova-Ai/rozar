'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Logo from './Logo'

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) onLogin()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Background blur orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/3 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="flex justify-center mb-6">
            <Logo size={48} />
          </div>
          <h1 className="text-4xl font-light text-white mb-2 tracking-tight">Welcome back</h1>
          <p className="text-base text-gray-500 font-light">Sign in to your TrueNova AI account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2 font-light">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3
                bg-white/5 backdrop-blur-sm
                border border-white/10
                rounded-xl text-white placeholder-gray-600
                focus:outline-none focus:border-white/30 focus:bg-white/8
                transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 font-light">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3
                  bg-white/5 backdrop-blur-sm
                  border border-white/10
                  rounded-xl text-white placeholder-gray-600
                  focus:outline-none focus:border-white/30 focus:bg-white/8
                  transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Glass sign-in button */}
          <button
            type="submit"
            className="w-full py-3 mt-8
              bg-white/90 backdrop-blur-md
              text-black font-medium rounded-xl
              border border-white/30
              shadow-[0_4px_24px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.5)]
              hover:bg-white
              hover:shadow-[0_8px_40px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]
              active:scale-[0.98]
              transition-all duration-300 text-base"
          >
            Sign in
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-center text-gray-500 text-sm font-light">
            Don't have an account?{' '}
            <a href="#" className="text-gray-400 hover:text-gray-300 transition">Sign up</a>
          </p>
          <p className="text-center text-gray-600 text-xs mt-6 font-light leading-relaxed">
            By continuing, you agree to TrueNova AI's Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
