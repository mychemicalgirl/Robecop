import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AuthCallback(){
  const router = useRouter()
  useEffect(()=>{
    const { token } = router.query
    if (token) {
      // store token securely (for demo we use localStorage)
      try { localStorage.setItem('token', token) } catch(e){}
      // redirect to dashboard
      router.replace('/dashboard')
    }
  }, [router])
  return <div className="container">Signing in...</div>
}
