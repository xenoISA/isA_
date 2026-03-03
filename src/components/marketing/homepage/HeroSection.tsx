'use client'

import { useState, useEffect } from 'react'

interface HeroSectionProps {
  currentTime: string
  className?: string
}

/**
 * 营销首页Hero区域组件
 * 独立样式避免与主应用冲突
 * 不依赖认证，直接提供链接到主应用
 */
export default function HeroSection({ currentTime, className = "" }: HeroSectionProps) {
  const [taglineIndex, setTaglineIndex] = useState(0)
  
  const taglines = [
    "Multi-Application Support • Automated Planning • Comprehensive Memory",
    "AGI Agents • Proactive Task Management • E-commerce Integration", 
    "100+ Tools • Deep Search • Adaptive Intelligence"
  ]
  
  const valueProps = [
    "Generate text, create images, analyze files, and build e-commerce solutions in one unified workspace",
    "Let AI break down complex projects into actionable steps with intelligent automation",
    "AI remembers context across sessions for truly personalized assistance"
  ]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`marketing-hero text-center mb-8 ${className}`}>
      <div className="inline-flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-purple-200 shadow-sm">
        <span className="text-purple-600 text-sm">✨</span>
        <span className="text-xs font-semibold text-purple-700">AI-Powered • Real-time • {currentTime}</span>
      </div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent leading-tight tracking-tight">
          Your Intelligent
        </h1>
        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-1 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent leading-none tracking-tight">
          AI Assistant
        </h1>
      </div>
      <div className="h-6 sm:h-6 mb-4 overflow-hidden">
        <div 
          className="text-xs sm:text-sm font-medium text-purple-600 transition-all duration-1000 ease-in-out transform" 
          style={{ transform: `translateY(-${taglineIndex * 24}px)` }}
        >
          {taglines.map((tagline, index) => (
            <div key={index} className="h-6 flex items-center justify-center px-2">
              {tagline}
            </div>
          ))}
        </div>
      </div>
      <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
        {valueProps[taglineIndex]}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
        <a 
          href="https://app.iapro.ai" 
          className="marketing-cta-button bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-full text-sm font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-center no-underline"
        >
          Start Free Trial
        </a>
        <a 
          href="https://app.iapro.ai" 
          className="marketing-cta-button bg-white/80 backdrop-blur-sm text-gray-700 px-6 py-3 rounded-full text-sm font-semibold hover:bg-white transition-all border border-gray-200 hover:shadow-lg text-center no-underline"
        >
          Sign In
        </a>
      </div>

      <style jsx>{`
        .marketing-hero {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .marketing-hero * {
          box-sizing: border-box;
        }
        .marketing-cta-button {
          text-decoration: none;
          display: inline-block;
        }
        .marketing-cta-button:hover {
          text-decoration: none;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-fade-in-delayed {
          animation: fade-in 0.8s ease-out 0.2s both;
        }
      `}</style>
    </div>
  )
}