'use client'

import { useState } from 'react'
import { ChevronLeft, Shield, AlertCircle } from 'lucide-react'
import { HistoryItem } from '../Dashboard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TrustScoreProps {
  onBack: () => void
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void
}

interface Dimension {
  score:  number
  label:  string
  weight: string
  detail: string
}

interface TrustResult {
  overall_score: number
  verdict:       'REAL' | 'FAKE'
  confidence:    number
  explanation:   string
  breakdown: {
    source_attribution: Dimension
    emotional_language: Dimension
    factual_density:    Dimension
    sensationalism:     Dimension
    writing_quality:    Dimension
  }
}

// ── Gauge SVG ──────────────────────────────────────────────────────────
function GaugeChart({ score }: { score: number }) {
  const r  = 68
  const cx = 88, cy = 88
  const toXY = (angleDeg: number) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy + r * Math.sin((angleDeg * Math.PI) / 180),
  })

  const startAngle = 180
  const span = 180
  const endAngle = startAngle - span * (score / 100)

  const p0   = toXY(startAngle)
  const p1   = toXY(endAngle)
  const arc0 = toXY(0)

  const largeArcFull = 1
  const largeArcData = score > 50 ? 1 : 0

  const color =
    score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444'

  return (
    <svg viewBox="0 0 176 100" className="w-52 mx-auto">
      {/* Track */}
      <path
        d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArcFull} 0 ${arc0.x} ${arc0.y}`}
        fill="none"
        stroke="rgba(128,128,128,0.15)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Score arc */}
      {score > 0 && (
        <path
          d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArcData} 0 ${p1.x} ${p1.y}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      )}
      {/* Number */}
      <text
        x={cx} y={cy - 8}
        textAnchor="middle"
        fontSize="32"
        fontWeight="300"
        fill={color}
      >
        {score}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="rgb(107,114,128)">
        Trust Score
      </text>
    </svg>
  )
}

// ── Radar / Spider Chart ────────────────────────────────────────────────
function RadarChart({ data }: { data: { label: string; score: number }[] }) {
  const n = data.length
  const cx = 110, cy = 110, maxR = 80

  const toXY = (i: number, val: number) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const r = (val / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const outerPts = data.map((_, i) => toXY(i, 100))
  const dataPts  = data.map((d, i) => toXY(i, d.score))

  const poly = (pts: { x: number; y: number }[]) =>
    pts.map(p => `${p.x},${p.y}`).join(' ')

  const dataPath = dataPts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
  ).join(' ') + 'Z'

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[220px] mx-auto">
      {/* Grid rings */}
      {[20, 40, 60, 80, 100].map(pct => (
        <polygon
          key={pct}
          points={outerPts.map(p => {
            const s = pct / 100
            return `${cx + (p.x - cx) * s},${cy + (p.y - cy) * s}`
          }).join(' ')}
          fill="none"
          stroke="rgba(128,128,128,0.15)"
          strokeWidth="1"
        />
      ))}
      {/* Spokes */}
      {outerPts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(128,128,128,0.15)" strokeWidth="1"
        />
      ))}
      {/* Data polygon */}
      <path d={dataPath}
        fill="rgba(99,102,241,0.18)"
        stroke="rgba(99,102,241,0.85)"
        strokeWidth="2"
      />
      {/* Data dots */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5"
          fill="rgb(99,102,241)"
          stroke="white" strokeWidth="1.5"
        />
      ))}
      {/* Labels */}
      {data.map((d, i) => {
        const lp = toXY(i, 130)
        return (
          <text key={i} x={lp.x} y={lp.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="9.5"
            fill="rgb(107,114,128)"
          >
            {d.label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Progress bar ────────────────────────────────────────────────────────
function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  )
}

const DIM_META: Record<string, { icon: string; color: string }> = {
  source_attribution: { icon: '📋', color: '#6366f1' },
  emotional_language: { icon: '💬', color: '#f59e0b' },
  factual_density:    { icon: '📊', color: '#22c55e' },
  sensationalism:     { icon: '🔥', color: '#ef4444' },
  writing_quality:    { icon: '✍️', color: '#8b5cf6' },
}

const DIM_LABELS: Record<string, string> = {
  source_attribution: 'Source Attribution',
  emotional_language: 'Emotional Language',
  factual_density:    'Factual Density',
  sensationalism:     'Sensationalism',
  writing_quality:    'Writing Quality',
}

// ─────────────────────────────────────────────
export default function TrustScore({ onBack, onAddHistory }: TrustScoreProps) {
  const [text,        setText]        = useState('')
  const [result,      setResult]      = useState<TrustResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const res  = await fetch(`${API_URL}/api/trust-score`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.detail || `Server error ${res.status}`)
      }
      const data: TrustResult = await res.json()
      setResult(data)
      onAddHistory({
        type:       'text',
        result:     data.verdict,
        confidence: Math.round(data.confidence),
        content:    text,
      })
    } catch (err) {
      setError(
        err instanceof TypeError && err.message.includes('fetch')
          ? 'Cannot connect to backend. Make sure it is running on port 8000.'
          : err instanceof Error ? err.message : 'Analysis failed.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const radarData = result
    ? Object.entries(result.breakdown).map(([key, dim]) => ({
        label: DIM_LABELS[key]?.split(' ')[0] ?? key,
        score: dim.score,
      }))
    : []

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
          <Shield size={28} strokeWidth={1.5} className="text-indigo-500" />
          <h1 className="text-3xl md:text-4xl font-light text-black dark:text-white tracking-tight">
            Trust Scoring
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base font-light mb-10">
          Five-dimension credibility analysis with weighted trust score
        </p>

        {/* How it works strip */}
        <div className="mb-10 grid grid-cols-3 md:grid-cols-5 gap-2">
          {Object.entries(DIM_META).map(([key, meta]) => (
            <div key={key}
              className="flex flex-col items-center gap-1 p-3
                bg-white/60 dark:bg-white/5 backdrop-blur-sm
                border border-gray-100 dark:border-white/10 rounded-xl text-center"
            >
              <span className="text-xl">{meta.icon}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-500 font-light leading-tight">
                {DIM_LABELS[key]}
              </span>
              <span className="text-[9px] text-gray-400 dark:text-gray-600">
                {result?.breakdown[key as keyof typeof result.breakdown]?.weight ?? '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 text-sm font-light">{error}</p>
          </div>
        )}

        {/* Input */}
        {!result ? (
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-light text-sm mb-4">
              Paste news content to score
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste a news article, social media post, or any content..."
              className="w-full h-52 p-5 bg-white dark:bg-white/5 backdrop-blur-sm
                border border-gray-200 dark:border-white/10 rounded-2xl
                text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600
                focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500
                transition-all duration-200 font-light resize-none"
            />
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-light">{text.length} characters</span>
              <button
                onClick={handleAnalyze}
                disabled={!text.trim() || isAnalyzing}
                className="px-6 py-2.5
                  bg-black/90 dark:bg-white/90 backdrop-blur-sm
                  text-white dark:text-black font-medium rounded-xl
                  border border-white/10 dark:border-white/20
                  shadow-[0_2px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]
                  dark:shadow-[0_2px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.35)]
                  hover:bg-black dark:hover:bg-white
                  hover:shadow-[0_4px_24px_rgba(0,0,0,0.45)]
                  dark:hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)]
                  active:scale-[0.98] transition-all duration-200 text-sm
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Scoring...
                  </span>
                ) : 'Score Trust'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Top row: Gauge + Radar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Gauge */}
              <div className="p-6 bg-white/60 dark:bg-white/5 backdrop-blur-sm
                border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center gap-4">
                <GaugeChart score={result.overall_score} />
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-light mb-1">VERDICT</p>
                  <span className={`text-2xl font-light ${result.verdict === 'REAL' ? 'text-green-500' : 'text-red-500'}`}>
                    {result.verdict}
                  </span>
                  <p className="text-xs text-gray-500 font-light mt-1">{result.confidence}% confidence</p>
                </div>
              </div>

              {/* Radar */}
              <div className="p-6 bg-white/60 dark:bg-white/5 backdrop-blur-sm
                border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center">
                <p className="text-xs text-gray-500 dark:text-gray-500 font-light mb-4 self-start">DIMENSION MAP</p>
                <RadarChart data={radarData} />
              </div>
            </div>

            {/* Five dimension cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(result.breakdown).map(([key, dim]) => {
                const meta = DIM_META[key]
                return (
                  <div key={key}
                    className="p-5 bg-white/60 dark:bg-white/5 backdrop-blur-sm
                      border border-gray-200 dark:border-white/10 rounded-2xl
                      hover:border-gray-300 dark:hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{DIM_LABELS[key]}</p>
                      </div>
                      <span className="text-xs text-gray-400 font-light">{dim.weight}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-light" style={{ color: meta.color }}>{dim.score}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-light"
                        style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                        {dim.label}
                      </span>
                    </div>
                    <ScoreBar score={dim.score} color={meta.color} />
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-light mt-3 leading-relaxed">
                      {dim.detail}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Explanation */}
            <div className="p-6 bg-white/60 dark:bg-white/5 backdrop-blur-sm
              border border-gray-200 dark:border-white/10 rounded-2xl">
              <p className="text-xs text-gray-500 font-light mb-3">AI EXPLANATION</p>
              <p className="text-gray-700 dark:text-gray-400 text-sm font-light leading-relaxed">
                {result.explanation}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setResult(null); setError(null) }}
                className="flex-1 px-4 py-2.5
                  bg-black/90 dark:bg-white/90 backdrop-blur-sm
                  text-white dark:text-black font-medium rounded-xl
                  border border-white/10 dark:border-white/20
                  shadow-[0_2px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]
                  dark:shadow-[0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.35)]
                  hover:bg-black dark:hover:bg-white active:scale-[0.98] transition-all duration-200 text-sm"
              >
                Score Another
              </button>
              <button
                onClick={onBack}
                className="flex-1 px-4 py-2.5
                  bg-white/70 dark:bg-white/10 backdrop-blur-sm
                  text-black dark:text-white font-medium rounded-xl
                  border border-gray-200/60 dark:border-white/10
                  hover:bg-white/90 dark:hover:bg-white/15 active:scale-[0.98] transition-all duration-200 text-sm"
              >
                Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
