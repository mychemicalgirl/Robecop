import Layout from '../../components/Layout'
import useSWR from 'swr'

const fetcher = (url) => fetch(url).then(r => r.json())

export default function Employees() {
  const { data, error } = useSWR('http://localhost:4000/api/employees', fetcher)
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
