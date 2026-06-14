'use client'

import { useState } from 'react'
import {
  ChevronLeft, AlertCircle, ExternalLink, Search,
  CheckCircle2, XCircle, Newspaper, Twitter, Globe, Loader2,
} from 'lucide-react'
import { HistoryItem } from '../Dashboard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TextAnalysisProps {
  onBack: () => void
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void
}

interface RelatedData {
  query: string
  web_results: { title: string; url: string; source: string; date: string }[]
  search_links: Record<string, string>
}

const WHAT_TO_DO = {
  FAKE: [
    { icon: '🚫', text: 'Do NOT share this content — spreading misinformation causes real harm.' },
    { icon: '🔍', text: 'Search the exact headline on Google News or Reuters to see if credible outlets cover it.' },
    { icon: '✅', text: 'Check Snopes.com or PolitiFact.com — professional fact-checkers may have already debunked it.' },
    { icon: '👤', text: 'Look for named reporters, named institutions, and official quotes — anonymous sources are a red flag.' },
    { icon: '📅', text: 'Check the date — old news is often recycled without context to create false alarm.' },
    { icon: '📢', text: 'Report this as misinformation on the platform where you found it.' },
  ],
  REAL: [
    { icon: '✅', text: 'This appears credible — safe to share with proper context.' },
    { icon: '📖', text: 'Read the full original article before sharing — headlines can be misleading out of context.' },
    { icon: '🔗', text: 'Cross-reference with another major outlet (BBC, Reuters, AP) to confirm.' },
    { icon: '📅', text: 'Double-check the publication date — even real news can mislead if it is old.' },
    { icon: '📌', text: 'Save the source URL when sharing so others can read the original.' },
    { icon: '📰', text: 'See the related articles below for broader coverage of this topic.' },
  ],
}

const SEARCH_BUTTONS = [
  { key: 'google_fact_check', label: 'Google Fact Check', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: '🔍' },
  { key: 'snopes',            label: 'Snopes',            color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800', icon: '🕵️' },
  { key: 'politifact',        label: 'PolitiFact',        color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', icon: '📋' },
  { key: 'factcheck_org',     label: 'FactCheck.org',     color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: '✔️' },
  { key: 'twitter',           label: 'Search X/Twitter',  color: 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700', icon: '𝕏' },
  { key: 'google_news',       label: 'Google News',       color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', icon: '📰' },
  { key: 'reuters',           label: 'Reuters',           color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: '🌐' },
  { key: 'bbc',               label: 'BBC News',          color: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800', icon: '📡' },
]

export default function TextAnalysis({ onBack, onAddHistory }: TextAnalysisProps) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<{
    verdict: 'REAL' | 'FAKE'
    confidence: number
    explanation: string
    features?: {
      word_count: number
      has_attribution: boolean
      sensational_words: number
      caps_ratio: number
      exclamations: number
    }
  } | null>(null)
  const [relatedData, setRelatedData]       = useState<RelatedData | null>(null)
  const [isAnalyzing, setIsAnalyzing]       = useState(false)
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (text.trim().length === 0) return

    setIsAnalyzing(true)
    setError(null)
    setRelatedData(null)

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${response.status}`)
      }

      const data = await response.json()
      const resultData = {
        verdict:     data.verdict as 'REAL' | 'FAKE',
        confidence:  Math.round(data.confidence),
        explanation: data.explanation,
        features:    data.features,
      }
      setResult(resultData)
      onAddHistory({
        type:       'text',
        result:     data.verdict,
        confidence: Math.round(data.confidence),
        content:    text,
      })

      // Fetch related results in background (non-blocking)
      setIsLoadingRelated(true)
      fetch(`${API_URL}/api/related-results`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setRelatedData(d) })
        .catch(() => {})
        .finally(() => setIsLoadingRelated(false))

    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(
          'Cannot connect to the backend server. Make sure it is running:\n' +
          'cd backend → python -m uvicorn main:app --reload --port 8000'
        )
      } else {
        setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetForm = () => {
    setText('')
    setResult(null)
    setRelatedData(null)
    setError(null)
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-black p-6 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors mb-10"
        >
          <ChevronLeft size={18} />
          <span className="text-sm">Back</span>
        </button>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-light text-black dark:text-white mb-2 tracking-tight">
          Text Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base font-light mb-12">
          Paste news content to verify authenticity
        </p>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 text-sm font-light whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* ── INPUT ── */}
        {!result ? (
          <div className="mb-8">
            <label className="block text-gray-700 dark:text-gray-300 font-light text-sm mb-4">
              Content to analyze
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your news article or text here..."
              className="w-full h-56 p-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-white/20 transition-all duration-200 font-light resize-none backdrop-blur-sm"
            />
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-500 font-light">
                {text.length} characters
              </span>
              <button
                onClick={handleAnalyze}
                disabled={text.trim().length === 0 || isAnalyzing}
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : 'Analyze'}
              </button>
            </div>
          </div>
        ) : (

        /* ── RESULTS ── */
        <div className="space-y-5">

          {/* ── Verdict ── */}
          <div className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="mb-6">
              <p className="text-xs text-gray-600 dark:text-gray-500 font-light mb-2">VERDICT</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {result.verdict === 'REAL'
                    ? <CheckCircle2 size={28} className="text-green-500" />
                    : <XCircle     size={28} className="text-red-500"   />}
                  <h2 className="text-2xl font-light text-black dark:text-white">
                    {result.verdict === 'REAL' ? 'Authentic News' : 'Suspicious Content'}
                  </h2>
                </div>
                <span className={`text-4xl font-semibold tracking-tight ${result.verdict === 'REAL' ? 'text-green-500' : 'text-red-500'}`}>
                  {result.verdict}
                </span>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 dark:text-gray-500 font-light">CONFIDENCE</span>
                <span className="text-lg font-light text-black dark:text-white">{result.confidence}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${result.verdict === 'REAL' ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
              <p className="text-gray-700 dark:text-gray-400 text-sm font-light leading-relaxed">
                {result.explanation}
              </p>
            </div>
          </div>

          {/* ── Analysis Signals ── */}
          {result.features && (
            <div className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl backdrop-blur-sm">
              <p className="text-xs text-gray-600 dark:text-gray-500 font-light mb-4">ANALYSIS SIGNALS</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Word Count',         value: result.features.word_count,                              good: result.features.word_count > 80 },
                  { label: 'Source Attribution',  value: result.features.has_attribution ? 'Yes' : 'No',          good: result.features.has_attribution },
                  { label: 'Sensational Words',   value: result.features.sensational_words,                       good: result.features.sensational_words === 0 },
                  { label: 'Exclamation Marks',   value: result.features.exclamations,                            good: result.features.exclamations <= 1 },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-light mb-1">{item.label}</p>
                    <p className={`text-sm font-medium ${item.good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {String(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── What to Do ── */}
          <div className={`p-6 rounded-2xl border backdrop-blur-sm ${
            result.verdict === 'REAL'
              ? 'bg-green-50/60 dark:bg-green-900/10 border-green-200 dark:border-green-800/40'
              : 'bg-red-50/60 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'
          }`}>
            <p className={`text-xs font-semibold mb-4 tracking-wider ${result.verdict === 'REAL' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {result.verdict === 'REAL' ? '✅ WHAT TO DO' : '⚠️ WHAT TO DO'}
            </p>
            <div className="space-y-3">
              {WHAT_TO_DO[result.verdict].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{step.icon}</span>
                  <p className={`text-sm font-light leading-relaxed ${
                    result.verdict === 'REAL'
                      ? 'text-green-900 dark:text-green-200'
                      : 'text-red-900 dark:text-red-200'
                  }`}>{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Verify Online ── */}
          <div className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Search size={14} className="text-gray-500 dark:text-gray-400" />
              <p className="text-xs text-gray-600 dark:text-gray-500 font-light tracking-wider">VERIFY ONLINE</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-600 font-light mb-4">
              Click any button below to search for this topic on trusted fact-checking and news platforms:
            </p>
            <div className="flex flex-wrap gap-2">
              {SEARCH_BUTTONS.map(({ key, label, color, icon }) => {
                const url = relatedData?.search_links?.[key]
                if (!url) return null
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 hover:opacity-80 active:scale-[0.97] ${color}`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                    <ExternalLink size={10} className="opacity-60" />
                  </a>
                )
              })}
              {/* Show placeholder buttons while loading */}
              {isLoadingRelated && SEARCH_BUTTONS.map(({ key, label, color, icon }) => (
                <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium opacity-40 ${color}`}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
              ))}
            </div>
            {isLoadingRelated && (
              <p className="text-xs text-gray-400 dark:text-gray-600 font-light mt-3 flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" />
                Loading search links…
              </p>
            )}
          </div>

          {/* ── Related News Articles ── */}
          <div className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper size={14} className="text-gray-500 dark:text-gray-400" />
                <p className="text-xs text-gray-600 dark:text-gray-500 font-light tracking-wider">RELATED NEWS ARTICLES</p>
              </div>
              {relatedData?.query && (
                <span className="text-xs text-gray-400 dark:text-gray-600 font-light">
                  Query: <em>{relatedData.query}</em>
                </span>
              )}
            </div>

            {isLoadingRelated && !relatedData && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-sm font-light py-4">
                <Loader2 size={14} className="animate-spin" />
                Searching Google News for related articles…
              </div>
            )}

            {relatedData && relatedData.web_results.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-600 font-light py-2">
                No related articles found. Try searching manually using the buttons above.
              </p>
            )}

            {relatedData && relatedData.web_results.length > 0 && (
              <div className="space-y-3">
                {relatedData.web_results.map((article, i) => (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white leading-snug group-hover:underline underline-offset-2 line-clamp-2">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-500 font-light">{article.source}</span>
                        {article.date && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                            <span className="text-xs text-gray-400 dark:text-gray-600 font-light">{article.date}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" />
                  </a>
                ))}
                <p className="text-xs text-gray-400 dark:text-gray-600 font-light pt-1 flex items-center gap-1">
                  <Globe size={10} />
                  Articles sourced from Google News RSS — results may vary
                </p>
              </div>
            )}
          </div>

          {/* ── Analyzed Text ── */}
          <div className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl backdrop-blur-sm">
            <p className="text-xs text-gray-600 dark:text-gray-500 font-light mb-3">ANALYZED CONTENT</p>
            <p className="text-gray-700 dark:text-gray-400 text-sm font-light leading-relaxed max-h-40 overflow-y-auto">
              {text}
            </p>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2.5
                bg-black/90 dark:bg-white/90 backdrop-blur-sm
                text-white dark:text-black font-medium rounded-xl
                border border-white/10 dark:border-white/20
                shadow-[0_2px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]
                dark:shadow-[0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.35)]
                hover:bg-black dark:hover:bg-white active:scale-[0.98] transition-all duration-200 text-sm"
            >
              Analyze Another
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
