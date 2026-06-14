'use client'

import { FileText, Image, Shield, Zap } from 'lucide-react'
import { Page } from '../Dashboard'

interface HomePageProps {
  onStartText:     () => void
  onStartOCR:      () => void
  onStartTrust:    () => void
  onStartRealtime: () => void
}

const CARDS = [
  {
    key:         'text' as Page,
    icon:        FileText,
    title:       'Text Analysis',
    desc:        'Paste any news article to detect misinformation with AI precision',
    badge:       null,
    accentLight: 'hover:border-gray-300',
    accentDark:  'dark:hover:border-white/20',
    clickable:   true,
  },
  {
    key:         'ocr' as Page,
    icon:        Image,
    title:       'Image Analysis',
    desc:        'Upload images with text — OCR extracts and verifies content authenticity',
    badge:       null,
    accentLight: 'hover:border-gray-300',
    accentDark:  'dark:hover:border-white/20',
    clickable:   true,
  },
  {
    key:         'trust' as Page,
    icon:        Shield,
    title:       'Trust Scoring',
    desc:        'Five-dimension credibility breakdown: source, emotion, facts, sensationalism, writing',
    badge:       'NEW',
    accentLight: 'hover:border-indigo-300',
    accentDark:  'dark:hover:border-indigo-500/40',
    clickable:   true,
  },
  {
    key:         'realtime' as Page,
    icon:        Zap,
    title:       'Real-time Analysis',
    desc:        'Live detection as you type — instant AI feedback with no button press needed',
    badge:       'LIVE',
    accentLight: 'hover:border-amber-300',
    accentDark:  'dark:hover:border-amber-500/40',
    clickable:   true,
  },
]

export default function HomePage({ onStartText, onStartOCR, onStartTrust, onStartRealtime }: HomePageProps) {
  const handlers: Record<string, () => void> = {
    text:     onStartText,
    ocr:      onStartOCR,
    trust:    onStartTrust,
    realtime: onStartRealtime,
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-6 py-12">

      {/* Hero */}
      <div className="text-center mb-16 max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-light text-black dark:text-white mb-4 tracking-tight">
          Analyze. Verify. Trust.
        </h1>
        <p className="text-base md:text-lg text-gray-700 dark:text-gray-400 font-light leading-relaxed">
          AI-powered fake news detection trained on 40,000+ articles. Select a tool below to get started.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl w-full">
        {CARDS.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.key}
              onClick={handlers[card.key]}
              className={`p-6 text-left group
                bg-white/60 dark:bg-white/5
                backdrop-blur-sm
                border border-gray-200 dark:border-white/10 rounded-2xl
                ${card.accentLight} ${card.accentDark}
                shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                dark:shadow-[0_1px_4px_rgba(255,255,255,0.02)]
                hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                dark:hover:shadow-[0_4px_20px_rgba(255,255,255,0.04)]
                hover:bg-gray-50/80 dark:hover:bg-white/[7%]
                active:scale-[0.99]
                transition-all duration-300 cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-black dark:text-white group-hover:scale-110 transition-transform duration-300">
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                {card.badge && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider
                    ${card.badge === 'LIVE'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                    }`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-light text-black dark:text-white mb-2">
                {card.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-500 text-sm font-light leading-relaxed">
                {card.desc}
              </p>
            </button>
          )
        })}
      </div>

      {/* Footer stat */}
      <p className="mt-12 text-xs text-gray-400 dark:text-gray-600 font-light">
        Model trained on WELFake · LIAR · FakeNewsNet · COVID datasets — 98% accuracy
      </p>
    </div>
  )
}
