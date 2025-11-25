import Layout from '../components/Layout'
import { useState, useEffect } from 'react'

export default function Assign() {
  const [employees, setEmployees] = useState([])
  const [ppe, setPpe] = useState([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [selectedPpe, setSelectedPpe] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(()=>{
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
    fetch(`${base}/api/employees`).then(r=>r.json()).then(setEmployees)
    fetch(`${base}/api/ppe`).then(r=>r.json()).then(setPpe)
  }, [])

  async function submit(e){
    e.preventDefault()
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
    const token = localStorage.getItem('robecop_token')
    await fetch(`${base}/api/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ ppeId: Number(selectedPpe), employeeId: Number(selectedEmp), expiresAt }) })
    alert('Assigned (check backend logs).')
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
          <span className="text-sm">PPE Item</span>
          <select className="mt-1 block w-full p-2 border rounded" value={selectedPpe} onChange={e=>setSelectedPpe(e.target.value)}>
            <option value="">Select</option>
            {ppe.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
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
