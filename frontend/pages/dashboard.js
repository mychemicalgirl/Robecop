import Layout from '../components/Layout'
import useSWR from 'swr'

const fetcher = (url) => fetch(url).then(r => r.json())

export default function Dashboard() {
  const { data, error } = useSWR('http://localhost:4000/api/reports/summary', fetcher)
  if (error) return <Layout><div>Error loading</div></Layout>
  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      {!data ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Employees</div>
            <div className="text-2xl font-bold">{data.totalEmployees}</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">PPE Items</div>
            <div className="text-2xl font-bold">{data.totalPpe}</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Expiring Soon</div>
            <div className="text-2xl font-bold">{data.expiringSoon}</div>
          </div>
        </div>
      )}
    </Layout>
  )
}
