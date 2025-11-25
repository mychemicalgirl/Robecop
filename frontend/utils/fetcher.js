export default async function fetcher(url, opts = {}) {
  const headers = opts.headers || {}
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('robecop_token') : null
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch (e) {}
  const res = await fetch(url, { ...opts, headers })
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`Request failed: ${res.status} ${res.statusText}`)
    err.status = res.status
    err.body = text
    throw err
  }
  return res.json()
}
