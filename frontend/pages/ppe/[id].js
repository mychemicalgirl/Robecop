import Layout from '../../components/Layout'
import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../lib/apiClient'

export default function PpeDetail({ query }){
  const [item, setItem] = useState(null)
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : query?.id

  const load = useCallback(async ()=>{
    try{
      const pRes = await apiGet('/api/ppe')
      const p = pRes.ok ? await pRes.json() : []
      const found = p.find(x=>String(x.id)===String(id))
      setItem(found)
      const fRes = await apiGet(`/api/ppe/${id}/files`)
      const filesList = fRes.ok ? await fRes.json() : []
      setFiles(filesList)
    }catch(e){ setError(e.message || 'Failed to load') }
  }, [id])

  useEffect(()=>{ if (id) load() }, [id, load])

  async function uploadFile(file){
    setError(null)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      const ct = await fetch(`${base}/csrf-token`, { credentials: 'include' })
      if (!ct.ok) throw new Error('Failed to get CSRF token')
      const cj = await ct.json()
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${base}/api/ppe/${id}/upload`, { method: 'POST', headers: { 'x-csrf-token': cj.csrfToken }, credentials: 'include', body: fd })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Upload failed')
      }
      const j = await res.json()
      setFiles(f=>[j, ...f])
    } catch (e) { throw e }
  }

  function handleDrop(e){
    e.preventDefault(); setDragOver(false)
    const list = Array.from(e.dataTransfer.files || [])
    for (const f of list) uploadFile(f).catch(e=>setError(e.message))
  }

  function handleFileInput(e){
    const list = Array.from(e.target.files || [])
    for (const f of list) uploadFile(f).catch(e=>setError(e.message))
  }

  if (!item) return <Layout><div>{error ? <div className="text-red-600">{error}</div> : <div>Loading...</div>}</div></Layout>

  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-4">{item.name}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Description</div>
            <div className="mt-2">{item.description}</div>
          </div>
          <div className="mt-4 p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500 mb-2">Upload photo or manual (jpg/png/pdf, max 5MB)</div>
            <div onDragOver={(e)=>{e.preventDefault(); setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} className={`border-dashed border-2 p-6 rounded ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
              <div className="text-center text-sm">Drag & drop files here, or</div>
              <div className="mt-2 text-center">
                <label className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded cursor-pointer">
                  <input type="file" multiple onChange={handleFileInput} className="hidden" />
                  Select files
                </label>
              </div>
              {error && <div className="mt-2 text-red-600">{error}</div>}
            </div>
          </div>
        </div>
        <div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Files</div>
            <div className="mt-3 space-y-3">
              {files.length===0 && <div className="text-sm text-gray-500">No files uploaded yet.</div>}
              {files.map(f=> (
                <div key={f.filename || f.name} className="flex items-center space-x-3">
                  {f.mimetype && f.mimetype.startsWith('image') ? (
                    <img src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}${f.url}`} alt="preview" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded">PDF</div>
                  )}
                  <div>
                    <div className="font-medium">{f.originalName || f.name}</div>
                    <a className="text-sm text-primary-700" href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}${f.url}`} target="_blank" rel="noreferrer">Open</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
