'use client'

import Link from 'next/link'
import { Code } from 'lucide-react'

export default function DevModeLink() {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Link
        href="/dev"
        className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        title="Developer Mode"
      >
        <Code className="h-3 w-3" />
        <span className="font-mono">dev mode</span>
      </Link>
    </div>
  )
}
