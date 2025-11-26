import Layout from '../components/Layout'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(30)
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
    const token = localStorage.getItem('robecop_token')
    setLoading(true)
    fetch(`${base}/api/dashboard/status?thresholdDays=${threshold}${roleFilter ? `&roleId=${roleFilter}` : ''}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      .then(r => r.json()).then(setData).catch(()=>setData(null)).finally(()=>setLoading(false))
  }, [threshold, roleFilter])

  function colorFor(status) {
    if (status === 'red') return 'bg-red-100 border-red-400'
    if (status === 'yellow') return 'bg-yellow-100 border-yellow-400'
    return 'bg-green-100 border-green-400'
  }

  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <div className="mb-4 flex items-center space-x-4">
        <label className="flex items-center space-x-2"><span className="text-sm">Threshold (days)</span>
          <input type="number" value={threshold} onChange={e=>setThreshold(Number(e.target.value))} className="ml-2 p-1 border rounded w-20" />
        </label>
        <label className="flex items-center space-x-2"><span className="text-sm">Role</span>
          <input type="text" placeholder="roleId" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="ml-2 p-1 border rounded w-28" />
        </label>
      </div>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Red</div>
              <div className="text-2xl font-bold">{data?.counts?.red || 0}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Yellow</div>
              <div className="text-2xl font-bold">{data?.counts?.yellow || 0}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Green</div>
              <div className="text-2xl font-bold">{data?.counts?.green || 0}</div>
            </div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold mb-2">Employees</h3>
            <div className="space-y-2">
              {data?.results?.map(r => (
                <div key={r.employee.id} className={`p-3 border-l-4 ${colorFor(r.status)}`}>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{r.employee.firstName} {r.employee.lastName} <span className="text-xs text-gray-500">{r.employee.role}</span></div>
                      <div className="text-sm text-gray-600">Status: {r.status}</div>
                    </div>
                    <div className="text-sm text-gray-500">{r.nearestExpires ? new Date(r.nearestExpires).toLocaleDateString() : ''}</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">Assigned: {r.assigned.map(a=>a.name).join(', ') || '—'}</div>
                  <div className="mt-1 text-sm text-gray-500">Recommended: {r.recommended.map(x=>x.name).join(', ') || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
