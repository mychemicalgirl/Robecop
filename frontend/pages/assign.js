import Layout from '../components/Layout'
import { useState, useEffect } from 'react'

export default function Assign() {
  const [employees, setEmployees] = useState([])
  const [ppe, setPpe] = useState([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [selectedPpe, setSelectedPpe] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [suggested, setSuggested] = useState([])
  const [selectedList, setSelectedList] = useState([])

  useEffect(()=>{
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
    try {
      const u = JSON.parse(localStorage.getItem('robecop_user') || 'null')
      if (!u || (u.role !== 'Admin' && u.role !== 'Supervisor')) {
        window.location.href = '/login'
        return
      }
    } catch (e) { window.location.href = '/login'; return }
    fetch(`${base}/api/employees`).then(r=>r.json()).then(setEmployees)
    fetch(`${base}/api/ppe`).then(r=>r.json()).then(setPpe)
  }, [])

  useEffect(() => {
    // When selectedEmp changes, fetch suggestions for their role
    if (!selectedEmp) { setSuggested([]); return }
    const emp = employees.find(e => String(e.id) === String(selectedEmp))
    if (!emp) return
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
    const token = localStorage.getItem('robecop_token')
    fetch(`${base}/api/suggestions/for-role/${emp.roleId}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      .then(r => r.json()).then(list => {
        const arr = list || []
        setSuggested(arr)
        setSelectedList(arr.map(s => s.id || s.ppeId))
      }).catch(()=>{ setSuggested([]); setSelectedList([]) })
  }, [selectedEmp, employees])

  async function submit(e){
    e.preventDefault()
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
    const token = localStorage.getItem('robecop_token')
    const unique = Array.from(new Set(selectedList.map(Number)))
    if (!unique.length) return alert('No PPE selected')
    const res = await fetch(`${base}/api/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ ppeIds: unique, employeeId: Number(selectedEmp), expiresAt }) })
    if (res.ok) alert('Assigned successfully')
    else alert('Assign failed')
  }

  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-4">Assign New PPE</h2>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <label className="block">
          <span className="text-sm">Employee</span>
          <select className="mt-1 block w-full p-2 border rounded" value={selectedEmp} onChange={e=>setSelectedEmp(e.target.value)}>
            <option value="">Select</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Suggested PPE (preselected)</span>
          <div className="mt-1 p-2 border rounded bg-white">
            {suggested.length ? suggested.map(s => {
              const id = s.id || s.ppeId
              const checked = selectedList.includes(id)
              return (
                <div key={id} className="flex items-center justify-between py-1">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={checked} onChange={(e)=>{
                      if (e.target.checked) setSelectedList(prev=>[...prev, id])
                      else setSelectedList(prev=>prev.filter(x=>x!==id))
                    }} />
                    <div>{s.name} <span className="text-xs text-gray-400">{s.risk ? `(${s.risk})` : ''}</span></div>
                  </label>
                </div>
              )
            }) : <div className="text-sm text-gray-500">No suggestions for this role</div>}
          </div>
        </label>
        <label className="block">
          <span className="text-sm">Add Additional PPE</span>
          <div className="flex space-x-2 mt-1">
            <select className="flex-1 p-2 border rounded" value={selectedPpe} onChange={e=>setSelectedPpe(e.target.value)}>
              <option value="">Select</option>
              {ppe.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button type="button" onClick={()=>{
              if (!selectedPpe) return
              const id = Number(selectedPpe)
              setSelectedList(prev => Array.from(new Set([...prev, id])))
              setSelectedPpe('')
            }} className="px-3 bg-primary-500 text-white rounded">Add</button>
          </div>
        </label>
        <label className="block">
          <span className="text-sm">Expires At</span>
          <input type="date" className="mt-1 block w-full p-2 border rounded" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} />
        </label>
        <div>
          <button className="px-4 py-2 bg-primary-500 text-white rounded">Assign</button>
        </div>
      </form>
    </Layout>
  )
}
