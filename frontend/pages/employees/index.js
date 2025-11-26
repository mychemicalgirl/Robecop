import Layout from '../../components/Layout'
import { useEffect } from 'react'
import useSWR from 'swr'
import fetcher from '../../utils/fetcher'

export default function Employees() {
  const { data, error } = useSWR(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/api/employees`, fetcher)
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('robecop_user') || 'null')
      if (!u || (u.role !== 'Admin' && u.role !== 'Supervisor')) {
        window.location.href = '/login'
      }
    } catch (e) { window.location.href = '/login' }
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
