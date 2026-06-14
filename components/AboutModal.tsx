'use client'

import { X, Shield, Eye, Zap, Database } from 'lucide-react'
import Logo from './Logo'

interface AboutModalProps {
  onClose: () => void
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto
        border border-gray-200 dark:border-white/10
        shadow-[0_20px_60px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">

        {/* Header */}
        <div className="sticky top-0 bg-white/90 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-xl font-light text-black dark:text-white flex items-center gap-3">
            <Logo size={28} />
            TrueNova AI
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg
              hover:bg-gray-100/80 dark:hover:bg-white/10
              text-gray-500 dark:text-gray-600 hover:text-black dark:hover:text-white
              active:scale-95 transition-all duration-200"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <div>
            <p className="text-gray-700 dark:text-gray-400 text-center leading-relaxed font-light">
              An AI-powered platform for detecting fake news and analysing images.
              Built to help users verify information and combat misinformation
              with precision and transparency.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {[
              { Icon: Shield, title: 'Fake News Detection',    desc: 'ML model trained on 40,000+ articles from WELFake, LIAR, FakeNewsNet and COVID datasets — 98% accuracy.' },
              { Icon: Eye,    title: 'Image & OCR Analysis',   desc: 'Tesseract + EasyOCR extract text from uploaded images for full fake news verification.' },
              { Icon: Zap,    title: 'Real-time Analysis',     desc: 'Live detection that updates as you type with debounced AI calls — no button press needed.' },
              { Icon: Database, title: 'Trust Scoring',        desc: '5-dimension credibility breakdown: Source, Emotion, Factual Density, Sensationalism, Writing Quality.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title}
                className="flex gap-4 p-4
                  bg-gray-50/80 dark:bg-white/5 backdrop-blur-sm
                  border border-gray-200 dark:border-white/10
                  rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/8
                  transition-colors"
              >
                <Icon size={20} className="text-gray-700 dark:text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h4 className="font-medium text-black dark:text-white text-sm">{title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-500 font-light mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Version */}
          <div className="border-t border-gray-200 dark:border-white/10 pt-6 text-center space-y-1">
            <p className="text-gray-600 dark:text-gray-500 text-xs font-light">Version 2.0.0</p>
            <p className="text-gray-800 dark:text-gray-300 font-light text-sm">All Rights Reserved by Gul Mohammed and Fazil</p>
            <p className="text-gray-500 dark:text-gray-600 text-xs font-light">© 2026 TrueNova AI</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/90 dark:bg-black/80 backdrop-blur-md border-t border-gray-200 dark:border-white/10 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5
              bg-black/90 dark:bg-white/90 backdrop-blur-sm
              text-white dark:text-black font-medium rounded-xl
              border border-white/10 dark:border-white/20
              shadow-[0_2px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]
              dark:shadow-[0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.35)]
              hover:bg-black dark:hover:bg-white
              active:scale-[0.98] transition-all duration-200 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
