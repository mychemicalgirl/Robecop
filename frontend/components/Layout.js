import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Layout({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('robecop_user') || 'null')
      setUser(u)
    } catch (e) { setUser(null) }
  }, [])

  function logout() {
    localStorage.removeItem('robecop_token')
    localStorage.removeItem('robecop_user')
    setUser(null)
    // full reload to clear any cached requests
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary-700">Robecop PPE Portal</h1>
          <nav className="space-x-4 text-sm flex items-center">
            <Link href="/">Home</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/employees">Employees</Link>
            <Link href="/ppe">PPE Database</Link>
            <Link href="/assign">Assign</Link>
                {user ? (
                  <div className="flex items-center space-x-3 ml-4">
                    <span className="text-sm text-gray-600">{user.email}</span>
                    <button onClick={logout} className="text-sm text-primary-700">Logout</button>
                  </div>
                ) : (
                  <Link href="/login" className="ml-4">Sign in</Link>
                )}
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
      <footer className="bg-white border-t mt-12">
        <div className="container py-4 text-sm text-gray-500">© Robecop — Internal use only.</div>
      </footer>
    </div>
  )
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('robecop_user') || 'null')
      setUser(u)
    } catch (e) { setUser(null) }
  }, [])

  function logout() {
    localStorage.removeItem('robecop_token')
    localStorage.removeItem('robecop_user')
    setUser(null)
    // full reload to clear any cached requests
    window.location.href = '/'
  }
}
