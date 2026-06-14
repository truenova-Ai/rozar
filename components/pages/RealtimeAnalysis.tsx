'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, Zap, AlertCircle } from 'lucide-react'
import { HistoryItem } from '../Dashboard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface RealtimeAnalysisProps {
  onBack: () => void
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void
}

interface LiveData {
  verdict:           'REAL' | 'FAKE' | null
  confidence:        number
  word_count:        number
  caps_ratio:        number
  sensational_count: number
  exclamations:      number
  has_attribution:   boolean
  has_numbers:       boolean
  avg_sentence_length: number
  credible_sources:  number
}

const DEFAULT: LiveData = {
  verdict: null, confidence: 0, word_count: 0, caps_ratio: 0,
  sensational_count: 0, exclamations: 0, has_attribution: false,
  has_numbers: false, avg_sentence_length: 0, credible_sources: 0,
}

// ── Mini animated bar ────────────────────────────────────────────────────
function LiveBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ── Pill badge ────────────────────────────────────────────────────────────
function Pill({ good, label }: { good: boolean; label: string }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
      good
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    }`}>
      {label}
    </span>
  )
}

// ── Pulse dot ────────────────────────────────────────────────────────────
function PulseDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────
export default function RealtimeAnalysis({ onBack, onAddHistory }: RealtimeAnalysisProps) {
  const [text,      setText]      = useState('')
  const [live,      setLive]      = useState<LiveData>(DEFAULT)
  const [isLive,    setIsLive]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [saved,     setSaved]     = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLive = useCallback(async (t: string) => {
    if (t.trim().length < 3) {
      setLive(DEFAULT)
      setIsLive(false)
      return
    }
    setIsLive(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/realtime`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: t }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setLive(data)
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to backend (port 8000).')
      }
    } finally {
      setIsLive(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchLive(text), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text, fetchLive])

  const handleSave = () => {
    if (!live.verdict || !text.trim()) return
    onAddHistory({
      type:       'text',
      result:     live.verdict,
      confidence: Math.round(live.confidence),
      content:    text,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const verdictColor =
    live.verdict === 'REAL' ? 'text-green-500'
    : live.verdict === 'FAKE' ? 'text-red-500'
    : 'text-gray-400 dark:text-gray-600'

  const confidenceFill =
    live.verdict === 'REAL' ? '#22c55e' : live.verdict === 'FAKE' ? '#ef4444' : '#6b7280'

  return (
    <div className="w-full min-h-screen bg-white dark:bg-black p-6 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors mb-10"
        >
          <ChevronLeft size={18} />
          <span className="text-sm">Back</span>
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <Zap size={28} strokeWidth={1.5} className="text-amber-500" />
          <h1 className="text-3xl md:text-4xl font-light text-black dark:text-white tracking-tight">
            Real-time Analysis
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base font-light mb-10">
          Results update live as you type — no button needed
        </p>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 text-sm font-light">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left: Input */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="relative">
              {/* Live indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <PulseDot active={isLive} />
                <span className="text-[10px] text-gray-400 font-light">
                  {isLive ? 'analyzing...' : text.length > 3 ? 'live' : 'waiting'}
                </span>
              </div>

              <textarea
                value={text}
                onChange={e => { setText(e.target.value); setSaved(false) }}
                placeholder="Start typing or paste a news article here...&#10;&#10;Results update automatically as you type."
                className="w-full h-80 p-5 pr-28 bg-white dark:bg-white/5 backdrop-blur-sm
                  border border-gray-200 dark:border-white/10 rounded-2xl
                  text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600
                  focus:outline-none focus:border-gray-400 dark:focus:border-white/20
                  transition-all duration-200 font-light resize-none"
              />
            </div>

            {/* Word count */}
            <div className="flex items-center justify-between text-xs text-gray-500 font-light px-1">
              <span>{live.word_count} words</span>
              <span>{text.length} characters</span>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!live.verdict || !text.trim()}
              className="w-full px-4 py-2.5
                bg-black/90 dark:bg-white/90 backdrop-blur-sm
                text-white dark:text-black font-medium rounded-xl
                border border-white/10 dark:border-white/20
                shadow-[0_2px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]
                dark:shadow-[0_2px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.35)]
                hover:bg-black dark:hover:bg-white
                hover:shadow-[0_4px_24px_rgba(0,0,0,0.45)]
                active:scale-[0.98] transition-all duration-200 text-sm
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saved ? '✓ Saved to History' : 'Save to History'}
            </button>
          </div>

          {/* Right: Live metrics */}
          <div className="lg:col-span-2 space-y-4">

            {/* Verdict */}
            <div className="p-5 bg-white/60 dark:bg-white/5 backdrop-blur-sm
              border border-gray-200 dark:border-white/10 rounded-2xl">
              <p className="text-[10px] text-gray-500 font-light mb-3 uppercase tracking-wider">Live Verdict</p>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-3xl font-light transition-all duration-300 ${verdictColor}`}>
                  {live.verdict ?? '—'}
                </span>
                <span className="text-lg font-light text-black dark:text-white">
                  {live.confidence > 0 ? `${live.confidence}%` : '—'}
                </span>
              </div>
              <LiveBar value={live.confidence} max={100} color={confidenceFill} />
            </div>

            {/* Metrics */}
            <div className="p-5 bg-white/60 dark:bg-white/5 backdrop-blur-sm
              border border-gray-200 dark:border-white/10 rounded-2xl space-y-4">
              <p className="text-[10px] text-gray-500 font-light uppercase tracking-wider">Live Signals</p>

              {/* CAPS Ratio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-light">CAPS Ratio</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-black dark:text-white">{live.caps_ratio.toFixed(1)}%</span>
                    <Pill good={live.caps_ratio < 5} label={live.caps_ratio < 5 ? 'OK' : 'High'} />
                  </div>
                </div>
                <LiveBar value={live.caps_ratio} max={30} color={live.caps_ratio < 5 ? '#22c55e' : '#ef4444'} />
              </div>

              {/* Sensational words */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-light">Clickbait Terms</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-black dark:text-white">{live.sensational_count}</span>
                    <Pill good={live.sensational_count === 0} label={live.sensational_count === 0 ? 'None' : 'Detected'} />
                  </div>
                </div>
                <LiveBar value={live.sensational_count} max={8} color={live.sensational_count === 0 ? '#22c55e' : '#ef4444'} />
              </div>

              {/* Exclamations */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-light">Exclamation Marks</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-black dark:text-white">{live.exclamations}</span>
                    <Pill good={live.exclamations <= 1} label={live.exclamations <= 1 ? 'OK' : 'High'} />
                  </div>
                </div>
                <LiveBar value={live.exclamations} max={10} color={live.exclamations <= 1 ? '#22c55e' : '#ef4444'} />
              </div>

              {/* Sentence length */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-light">Avg Sentence Length</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-black dark:text-white">{live.avg_sentence_length} words</span>
                    <Pill good={live.avg_sentence_length >= 10} label={live.avg_sentence_length >= 10 ? 'Good' : 'Short'} />
                  </div>
                </div>
                <LiveBar value={live.avg_sentence_length} max={30} color={live.avg_sentence_length >= 10 ? '#22c55e' : '#f59e0b'} />
              </div>
            </div>

            {/* Boolean signals */}
            <div className="p-5 bg-white/60 dark:bg-white/5 backdrop-blur-sm
              border border-gray-200 dark:border-white/10 rounded-2xl">
              <p className="text-[10px] text-gray-500 font-light mb-3 uppercase tracking-wider">Credibility Signals</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Source Attribution',  value: live.has_attribution },
                  { label: 'Facts / Numbers',      value: live.has_numbers },
                  { label: 'Credible Sources',     value: (live.credible_sources ?? 0) > 0 },
                ].map(sig => (
                  <div key={sig.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-light">{sig.label}</span>
                    <span className={`text-xs font-medium ${sig.value ? 'text-green-500' : 'text-gray-400 dark:text-gray-600'}`}>
                      {sig.value ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="p-4 bg-amber-50/60 dark:bg-amber-900/10 backdrop-blur-sm
              border border-amber-200/50 dark:border-amber-800/30 rounded-2xl">
              <p className="text-[10px] text-amber-700 dark:text-amber-500 font-medium mb-2 uppercase tracking-wider">
                How it works
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/70 font-light leading-relaxed">
                Each keystroke triggers a debounced call to the ML backend.
                The TF-IDF model ({live.word_count >= 20 ? 'ML active' : 'needs 20+ words'}) analyses vocabulary patterns
                trained on 40,000+ real/fake news articles. Heuristic checks
                run in parallel for instant feedback.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
