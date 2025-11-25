import Link from 'next/link'

export default function Layout({ children }) {
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
            <a className="ml-4 inline-flex items-center px-3 py-1 border rounded text-sm bg-blue-600 text-white" href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/auth/entra/login`}>
              Sign in with Microsoft
            </a>
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
