'use client'

import { useState, useEffect } from 'react'
import Login from '@/components/Login'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  if (!mounted) return null

  return isLoggedIn ? (
    <Dashboard onLogout={() => {
      localStorage.removeItem('isLoggedIn')
      setIsLoggedIn(false)
    }} />
  ) : (
    <Login onLogin={() => {
      localStorage.setItem('isLoggedIn', 'true')
      setIsLoggedIn(true)
    }} />
  )
}
