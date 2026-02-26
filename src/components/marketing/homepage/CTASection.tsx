import { useState, useEffect } from 'react'
import { surfaceLinks } from '../../../config/surfaceConfig'

interface CTASectionProps {
  className?: string
}

/**
 * Marketing homepage CTA section component
 * Isolated styles to avoid conflicts with main app
 * No Auth0 dependency, direct links to main app
 */
export default function CTASection({ className = "" }: CTASectionProps) {
  const [valueIndex, setValueIndex] = useState(0)
  
  const valueProps = [
    {
      icon: '⚡',
      title: "Start Multi-App Automation",
      description: "Unite all your tools in one intelligent workspace",
      benefit: "Save 15+ hours weekly"
    },
    {
      icon: '🧠',
      title: "Activate Memory System",
      description: "AI that remembers your preferences and context",
      benefit: "100% personalized experience"
    },
    {
      icon: '🗄️',
      title: "Deploy Adaptive Agents",
      description: "Smart agents that learn and optimize for you",
      benefit: "3x faster task completion"
    }
  ]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setValueIndex((prev) => (prev + 1) % valueProps.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [valueProps.length])
  
  const currentValue = valueProps[valueIndex]

  return (
    <div className={`cta-section col-span-1 lg:col-span-7 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
      
      <div className="relative flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0 flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">{currentValue.icon}</span>
            <h3 className="text-xl font-bold transition-all duration-500">
              {currentValue.title}
            </h3>
          </div>
          <p className="text-purple-100 text-sm font-medium mb-1 transition-all duration-500">
            {currentValue.description}
          </p>
          <div className="text-xs text-purple-200 font-medium mb-2">
            {currentValue.benefit}
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span>🛡️</span>
              <span className="text-xs font-medium">Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>⏱️</span>
              <span className="text-xs font-medium">Instant Setup</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          <a 
            href={surfaceLinks.appEntry}
            className="cta-button bg-white text-purple-600 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transform hover:scale-105 transition-all shadow-xl duration-300 text-sm whitespace-nowrap no-underline"
          >
            Try Free Now
            <span className="inline ml-1">→</span>
          </a>
          <div className="text-xs text-purple-200 text-center">
            No credit card required
          </div>
        </div>
      </div>
      
      <div className="flex justify-center space-x-1 mt-4">
        {valueProps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === valueIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
      
      {/* Trust elements */}
      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-white/90 text-xs font-bold">✓ No Setup</div>
            <div className="text-white/60 text-xs">Ready in 30s</div>
          </div>
          <div>
            <div className="text-white/90 text-xs font-bold">✓ No Lock-in</div>
            <div className="text-white/60 text-xs">Cancel anytime</div>
          </div>
          <div>
            <div className="text-white/90 text-xs font-bold">✓ 24/7 Support</div>
            <div className="text-white/60 text-xs">Expert help</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cta-section {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .cta-section * {
          box-sizing: border-box;
        }
        .cta-button {
          text-decoration: none;
          display: inline-block;
        }
        .cta-button:hover {
          text-decoration: none;
        }
      `}</style>
    </div>
  )
}
