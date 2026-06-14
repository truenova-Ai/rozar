'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import HomePage from './pages/HomePage'
import TextAnalysis from './pages/TextAnalysis'
import OCRAnalysis from './pages/OCRAnalysis'
import TrustScore from './pages/TrustScore'
import RealtimeAnalysis from './pages/RealtimeAnalysis'
import AboutModal from './AboutModal'

export type HistoryItem = {
  id:         string
  type:       'text' | 'ocr'
  result:     'REAL' | 'FAKE'
  confidence: number
  timestamp:  Date
  content:    string
}

export type Page = 'home' | 'text' | 'ocr' | 'trust' | 'realtime'

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [history,     setHistory]     = useState<HistoryItem[]>([])
  const [theme,       setTheme]       = useState<'light' | 'dark'>('dark')
  const [showAbout,   setShowAbout]   = useState(false)
  const [mounted,     setMounted]     = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedHistory = localStorage.getItem('truenova_history')
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory)
      setHistory(
        parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) }))
      )
    }
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.classList.toggle('light', next === 'light')
  }

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = { ...item, id: Date.now().toString(), timestamp: new Date() }
    const updated = [newItem, ...history]
    setHistory(updated)
    localStorage.setItem('truenova_history', JSON.stringify(updated))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('truenova_history')
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors">
      <div className="flex">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          history={history}
          onClearHistory={clearHistory}
          onAbout={() => setShowAbout(true)}
        />

        <div className="flex-1 flex flex-col">
          <Header theme={theme} onThemeToggle={toggleTheme} onLogout={onLogout} />

          <main className="flex-1 overflow-auto">
            {currentPage === 'home'     && (
              <HomePage
                onStartText={()    => setCurrentPage('text')}
                onStartOCR={()     => setCurrentPage('ocr')}
                onStartTrust={()   => setCurrentPage('trust')}
                onStartRealtime={() => setCurrentPage('realtime')}
              />
            )}
            {currentPage === 'text'     && <TextAnalysis      onBack={() => setCurrentPage('home')} onAddHistory={addToHistory} />}
            {currentPage === 'ocr'      && <OCRAnalysis       onBack={() => setCurrentPage('home')} onAddHistory={addToHistory} />}
            {currentPage === 'trust'    && <TrustScore        onBack={() => setCurrentPage('home')} onAddHistory={addToHistory} />}
            {currentPage === 'realtime' && <RealtimeAnalysis  onBack={() => setCurrentPage('home')} onAddHistory={addToHistory} />}
          </main>
        </div>
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
