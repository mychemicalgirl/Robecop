import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/apiClient'

export default function Employees() {
  const [data, setData] = useState(null)
  useEffect(() => {
    (async () => {
      try {
        const mu = await apiGet('/api/me')
        if (!mu.ok) { window.location.href = '/login'; return }
        const user = await mu.json()
        if (!user || (user.role !== 'Admin' && user.role !== 'Supervisor')) { window.location.href = '/login'; return }
        const r = await apiGet('/api/employees')
        if (r.ok) setData(await r.json())
      } catch (e) { window.location.href = '/login' }
    })()
  }, [])
  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-4">Employees</h2>
      {!data ? <div>Loading...</div> : (
        <div className="grid gap-4">
          {data.map(emp => (
            <div key={emp.id} className="p-4 bg-white rounded shadow">
              <div className="font-semibold">{emp.firstName} {emp.lastName}</div>
              <div className="text-sm text-gray-500">{emp.email}</div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
