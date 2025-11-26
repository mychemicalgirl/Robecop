import Layout from '../../components/Layout'
import useSWR from 'swr'
import fetcher from '../../utils/fetcher'

export default function Ppe() {
  const { data, error } = useSWR(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/api/ppe`, fetcher)
  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-4">PPE Database</h2>
      {!data ? <div>Loading...</div> : (
        <div className="grid md:grid-cols-3 gap-4">
          {data.map(item => (
            <a key={item.id} href={`/ppe/${item.id}`} className="p-4 bg-white rounded shadow block hover:shadow-md">
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-gray-500">SKU: {item.sku || '—'}</div>
              <div className="mt-2 text-sm">{item.description}</div>
            </a>
          ))}
        </div>
      )}
    </Layout>
  )
}
