import { useState, useEffect } from 'react'

interface StatsPanelProps {
  className?: string
}

/**
 * Marketing homepage stats panel component
 * Isolated styles to avoid conflicts with main app
 */
export default function StatsPanel({ className = "" }: StatsPanelProps) {
  const [statIndex, setStatIndex] = useState(0)
  
  const stats = [
    {
      value: "2.5M+",
      label: "Workflows Automated",
      description: "Cross-platform automation"
    },
    {
      value: "99.9%",
      label: "Memory Retention",
      description: "Context across sessions"
    },
    {
      value: "15+",
      label: "Applications Supported",
      description: "Unified workspace"
    },
    {
      value: "300%",
      label: "Efficiency Boost",
      description: "Adaptive agent selection"
    }
  ]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStatIndex((prev) => (prev + 1) % stats.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [stats.length])

  const currentStat = stats[statIndex]

  return (
    <div className={`stats-panel col-span-1 lg:col-span-5 bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/40 shadow-lg ${className}`}>
      <div className="text-center">
        <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1 transition-all duration-500">
          {currentStat.value}
        </div>
        <div className="text-gray-800 mb-2 font-medium text-sm transition-all duration-500">
          {currentStat.label}
        </div>
        <div className="text-gray-600 text-xs mb-4 transition-all duration-500">
          {currentStat.description}
        </div>
        
        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-700 font-medium">User Impact</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xs">⭐</span>
                ))}
              </div>
            </div>
            <div className="mt-1 bg-yellow-200 rounded-full h-2">
              <div className="bg-yellow-400 h-2 rounded-full w-full transition-all duration-1000"></div>
            </div>
          </div>
          
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-700 font-medium">Task Speed</span>
              <span className="text-xs font-bold text-green-600 flex items-center">
                <span className="mr-1">⏱️</span>
                10x faster
              </span>
            </div>
            <div className="mt-1 bg-green-200 rounded-full h-2">
              <div className="bg-green-400 h-2 rounded-full w-5/6 transition-all duration-1000"></div>
            </div>
          </div>
          
          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-700 font-medium">ROI</span>
              <span className="text-xs font-bold text-purple-600 flex items-center">
                <span className="mr-1">📈</span>
                $2.8M saved
              </span>
            </div>
            <div className="mt-1 bg-purple-200 rounded-full h-2">
              <div className="bg-purple-400 h-2 rounded-full w-full transition-all duration-1000"></div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center space-x-1 mt-3">
          {stats.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === statIndex ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .stats-panel {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .stats-panel * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}