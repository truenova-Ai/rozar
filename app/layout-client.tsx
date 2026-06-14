'use client'

import { useEffect, useState } from 'react'

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme, mounted])

  return <>{children}</>
}

