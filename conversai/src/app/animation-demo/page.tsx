'use client'

import dynamic from 'next/dynamic'

const AnimationDemoPage = dynamic(
  () => import('./animation'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Animation Demo...</h1>
          <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }
)

export default AnimationDemoPage