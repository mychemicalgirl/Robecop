import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { apiGet } from '../../lib/apiClient'

export default function AuthCallback(){
  const router = useRouter()
  useEffect(()=>{
    // Backend callback should set HttpOnly cookies; just attempt to read user and redirect
    (async ()=>{
      try {
        await apiGet('/api/me')
      } catch (e) {}
      router.replace('/dashboard')
    })()
  }, [router])
  return <div className="container">Signing in...</div>
}
