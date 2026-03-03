'use client'

import { useState, useEffect } from 'react'

/**
 * 营销页面专用Header组件
 * 样式完全独立，避免与主应用样式冲突
 * 不依赖认证，直接提供链接到主应用
 */
export default function MarketingHeader() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header 
      className={`marketing-header fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/98 backdrop-blur-lg shadow-lg' 
          : 'bg-white/95 backdrop-blur-md'
      }`}
      style={{
        // 内联样式确保不受主应用样式影响
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <a 
            href="/home" 
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent no-underline"
          >
            iapro.ai
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a 
              href="/home#features" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors no-underline"
            >
              Features
            </a>
            <a 
              href="/home#demo" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors no-underline"
            >
              Demo
            </a>
            <a 
              href="/pricing" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors no-underline"
            >
              Pricing
            </a>
            <a 
              href="/enterprise" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors no-underline"
            >
              Enterprise
            </a>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <a 
                href="https://app.iapro.ai"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors no-underline"
              >
                Sign In
              </a>
              <a 
                href="https://app.iapro.ai"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 no-underline"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <style jsx>{`
        /* 营销页面专用样式，避免与主应用冲突 */
        .marketing-header {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .marketing-header * {
          box-sizing: border-box;
        }
        .marketing-header a {
          text-decoration: none;
        }
        .marketing-header a:hover {
          text-decoration: none;
        }
      `}</style>
    </header>
  )
}