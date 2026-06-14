'use client'

import { Plus, History, Info, LogOut, ChevronLeft, ChevronRight, Shield, Zap, FileText, Image } from 'lucide-react'
import Logo from './Logo'
import { HistoryItem, Page } from './Dashboard'
import { useState } from 'react'

interface SidebarProps {
  currentPage:    string
  onNavigate:     (page: Page) => void
  history:        HistoryItem[]
  onClearHistory: () => void
  onAbout:        () => void
}

export default function Sidebar({ currentPage, onNavigate, history, onClearHistory, onAbout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems: { page: Page; icon: React.ElementType; label: string }[] = [
    { page: 'text',     icon: FileText, label: 'Text Analysis'   },
    { page: 'ocr',      icon: Image,    label: 'Image Analysis'  },
    { page: 'trust',    icon: Shield,   label: 'Trust Scoring'   },
    { page: 'realtime', icon: Zap,      label: 'Real-time'       },
  ]

  return (
    <div className={`bg-white/95 dark:bg-black/95 backdrop-blur-md border-r border-gray-200 dark:border-white/10 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="h-screen flex flex-col">

        {/* Logo */}
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <div>
                <h1 className="text-black dark:text-white font-light text-sm">TrueNova</h1>
                <p className="text-gray-500 text-xs font-light">AI</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* New Scan button */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <button
            onClick={() => onNavigate('text')}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm
              bg-black/90 dark:bg-white/90 backdrop-blur-sm
              text-white dark:text-black
              border border-white/10 dark:border-white/20
              shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]
              dark:shadow-[0_2px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.35)]
              hover:bg-black dark:hover:bg-white
              hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]
              dark:hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)]
              active:scale-[0.98] transition-all duration-200`}
          >
            <Plus size={18} />
            {!isCollapsed && <span>New Scan</span>}
          </button>
        </div>

        {/* Nav items (collapsed only) */}
        {isCollapsed && (
          <div className="py-4 px-3 border-b border-gray-200 dark:border-white/10 space-y-2">
            {navItems.map(item => {
              const Icon = item.icon
              const active = currentPage === item.page
              return (
                <button key={item.page} onClick={() => onNavigate(item.page)} title={item.label}
                  className={`w-full flex justify-center p-2.5 rounded-lg transition-all duration-200
                    ${active
                      ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white'
                      : 'text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5'
                    }`}
                >
                  <Icon size={16} strokeWidth={1.5} />
                </button>
              )
            })}
          </div>
        )}

        {/* History */}
        <div className="flex-1 overflow-y-auto">
          {!isCollapsed && (
            <>
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-500 text-xs uppercase tracking-wider font-light">
                  <History size={14} />
                  <span>History</span>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-600 text-sm font-light">No scans yet</p>
                </div>
              ) : (
                <div className="px-4 space-y-2">
                  {history.slice(0, 10).map(item => (
                    <div key={item.id}
                      className="p-3
                        bg-white/60 dark:bg-white/5 backdrop-blur-sm
                        hover:bg-gray-100/80 dark:hover:bg-white/10
                        border border-gray-100 dark:border-transparent
                        hover:border-gray-200 dark:hover:border-white/10
                        rounded-xl cursor-pointer transition-all text-sm"
                    >
                      <p className="text-gray-900 dark:text-gray-300 truncate font-light text-xs">
                        {item.content.substring(0, 30)}...
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${item.result === 'REAL' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                          {item.result}
                        </span>
                        <span className="text-gray-500 dark:text-gray-600 text-xs">{item.confidence}%</span>
                      </div>
                    </div>
                  ))}
                  {history.length > 0 && (
                    <button
                      onClick={onClearHistory}
                      className="w-full py-2 text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 text-xs font-light mt-4 transition"
                    >
                      Clear History
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="border-t border-gray-200 dark:border-white/10 p-4 space-y-1">
            <button
              onClick={onAbout}
              className="w-full flex items-center gap-2 px-3 py-2
                bg-transparent hover:bg-gray-100/60 dark:hover:bg-white/5
                backdrop-blur-sm rounded-lg
                text-gray-600 dark:text-gray-500 hover:text-black dark:hover:text-white
                border border-transparent hover:border-gray-200/60 dark:hover:border-white/5
                active:scale-[0.98] transition-all duration-200 text-sm font-light"
            >
              <Info size={16} />
              <span>About</span>
            </button>
            <button
              onClick={() => { localStorage.removeItem('isLoggedIn'); window.location.reload() }}
              className="w-full flex items-center gap-2 px-3 py-2
                bg-transparent hover:bg-red-50/60 dark:hover:bg-red-900/10
                backdrop-blur-sm rounded-lg
                text-gray-600 dark:text-gray-500
                hover:text-red-600 dark:hover:text-red-500
                border border-transparent hover:border-red-200/40 dark:hover:border-red-800/20
                active:scale-[0.98] transition-all duration-200 text-sm font-light"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
