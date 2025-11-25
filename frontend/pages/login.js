import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const router = useRouter()

  async function submit(e){
    e.preventDefault()
    setErr(null)
    try{
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/auth/login`,{
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password })
      })
      if (!res.ok) throw new Error('Login failed')
      const data = await res.json()
      // store token and user
      localStorage.setItem('robecop_token', data.token)
      localStorage.setItem('robecop_user', JSON.stringify(data.user))
      router.push('/dashboard')
    }catch(e){
      setErr(e.message || 'Login failed')
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Sign in</h2>
        <form onSubmit={submit} className="space-y-4">
          <label className="block"><span className="text-sm">Email</span><input className="mt-1 block w-full p-2 border rounded" value={email} onChange={e=>setEmail(e.target.value)} /></label>
          <label className="block"><span className="text-sm">Password</span><input type="password" className="mt-1 block w-full p-2 border rounded" value={password} onChange={e=>setPassword(e.target.value)} /></label>
          {err && <div className="text-red-600">{err}</div>}
          <div><button className="px-4 py-2 bg-primary-500 text-white rounded">Sign in</button></div>
        </form>
      </div>
    </Layout>
  )
}
