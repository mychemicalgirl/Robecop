import Layout from '../../components/Layout'
import { useState, useEffect, useCallback } from 'react'
import fetcher from '../../utils/fetcher'

export default function PpeDetail({ query }){
  const [item, setItem] = useState(null)
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : query?.id

  const load = useCallback(async ()=>{
    try{
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      const p = await fetcher(`${base}/api/ppe`)
      const found = p.find(x=>String(x.id)===String(id))
      setItem(found)
      const f = await fetcher(`${base}/api/ppe/${id}/files`)
      setFiles(f)
    }catch(e){ setError(e.message || 'Failed to load') }
  }, [id])

  useEffect(()=>{ if (id) load() }, [id, load])

  async function uploadFile(file){
    setError(null)
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
    const token = localStorage.getItem('robecop_token')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${base}/api/ppe/${id}/upload`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Upload failed')
    }
    const j = await res.json()
    setFiles(f=>[j, ...f])
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
