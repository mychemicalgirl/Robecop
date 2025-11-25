import Layout from '../../components/Layout'
import useSWR from 'swr'

const fetcher = (url) => fetch(url).then(r => r.json())

export default function Ppe() {
  const { data, error } = useSWR('http://localhost:4000/api/ppe', fetcher)
  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-4">PPE Database</h2>
      {!data ? <div>Loading...</div> : (
        <div className="grid md:grid-cols-3 gap-4">
          {data.map(item => (
            <div key={item.id} className="p-4 bg-white rounded shadow">
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-gray-500">SKU: {item.sku || '—'}</div>
              <div className="mt-2 text-sm">{item.description}</div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
