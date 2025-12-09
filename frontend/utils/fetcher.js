import { apiGet } from '../lib/apiClient'

export default async function fetcher(url, opts = {}) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  try {
    if (typeof url === 'string' && url.startsWith(base)) {
      const path = url.slice(base.length)
      const r = await apiGet(path)
      if (!r.ok) {
        const text = await r.text()
        const err = new Error(`Request failed: ${r.status} ${r.statusText}`)
        err.status = r.status
        err.body = text
        throw err
      }
      return r.json()
    }
  } catch (e) {
    // fallthrough to fetch for non-api urls
  }
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`Request failed: ${res.status} ${res.statusText}`)
    err.status = res.status
    err.body = text
    throw err
  }
  return res.json()
}
