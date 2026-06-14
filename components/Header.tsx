'use client'

import { Moon, Sun } from 'lucide-react'

interface HeaderProps {
  theme:         'light' | 'dark'
  onThemeToggle: () => void
  onLogout:      () => void
}

export default function Header({ theme, onThemeToggle, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-end gap-3">
        {/* Theme toggle — glass */}
        <button
          onClick={onThemeToggle}
          aria-label="Toggle theme"
          className="p-2 rounded-lg
            bg-gray-100/80 dark:bg-white/10 backdrop-blur-sm
            border border-gray-200/60 dark:border-white/10
            shadow-[0_1px_6px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_6px_rgba(255,255,255,0.03)]
            hover:bg-gray-200/80 dark:hover:bg-white/15
            text-gray-700 dark:text-gray-400
            active:scale-95 transition-all duration-200"
        >
          {theme === 'dark'
            ? <Sun  size={18} strokeWidth={1.5} />
            : <Moon size={18} strokeWidth={1.5} />}
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full
          bg-black/90 dark:bg-white/90 backdrop-blur-sm
          border border-white/10 dark:border-white/20
          shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]
          dark:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.35)]
          text-white dark:text-black
          flex items-center justify-center font-light text-sm
          cursor-pointer hover:opacity-80 active:scale-95 transition-all duration-200"
        >
          G
        </div>
      </div>
    </header>
  )
}
