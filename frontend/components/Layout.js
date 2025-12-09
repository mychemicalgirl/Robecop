import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiGet, apiMutate } from '../lib/apiClient'

export default function Layout({ children }) {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet('/api/me')
        if (!r.ok) { setUser(null); return }
        const u = await r.json()
        setUser(u)
      } catch (e) { setUser(null) }
    })()
  }, [])

  async function logout() {
    try {
      await apiMutate('/auth/logout', 'POST')
    } catch (e) {}
    setUser(null)
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary-700">Robecop PPE Portal</h1>
          <nav className="space-x-4 text-sm flex items-center">
            <Link href="/">Home</Link>
            <Link href="/dashboard">Dashboard</Link>
            {user && (user.role === 'Admin' || user.role === 'Supervisor') && (
              <Link href="/employees">Employees</Link>
            )}
            <Link href="/ppe">PPE Database</Link>
            {user && (user.role === 'Admin' || user.role === 'Supervisor') && (
              <Link href="/assign">Assign</Link>
            )}
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
}

