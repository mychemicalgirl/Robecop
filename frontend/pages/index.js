import Link from 'next/link'
import Layout from '../components/Layout'

export default function Home() {
  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/ppe" className="p-6 bg-white rounded-lg shadow hover:shadow-md">
          <h2 className="text-lg font-semibold text-primary-700">PPE Database</h2>
          <p className="mt-2 text-sm text-gray-600">Manage PPE items, manuals and photos.</p>
        </Link>
        <Link href="/ppe" className="p-6 bg-white rounded-lg shadow hover:shadow-md">
          <h2 className="text-lg font-semibold text-primary-700">PPE Stock</h2>
          <p className="mt-2 text-sm text-gray-600">Track inventory and prepare orders.</p>
        </Link>
        <Link href="/assign" className="p-6 bg-white rounded-lg shadow hover:shadow-md">
          <h2 className="text-lg font-semibold text-primary-700">Assign New PPE</h2>
          <p className="mt-2 text-sm text-gray-600">Quickly assign PPE to employees.</p>
        </Link>
      </div>
    </Layout>
  )
}
