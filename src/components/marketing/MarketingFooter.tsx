import React from 'react'
import { surfaceLinks } from '../../config/surfaceConfig'

interface MarketingFooterProps {
  className?: string
}

/**
 * 营销页面专用Footer组件
 * 样式完全独立，避免与主应用样式冲突
 */
export default function MarketingFooter({ className = "" }: MarketingFooterProps) {
  const homeLink = surfaceLinks.marketingHome
  const featuresLink = `${homeLink}#features`

  return (
    <footer className={`marketing-footer bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 border-t border-white/40 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              iapro.ai
            </div>
            <p className="text-gray-600 leading-relaxed max-w-md">
              AI-powered assistant platform with multi-application support, intelligent automation, and comprehensive memory systems for more efficient teamwork.
            </p>
            <div className="flex items-center space-x-2 text-purple-600">
              <span className="text-lg">✨</span>
              <span className="text-sm font-medium">Join 2.5M+ users transforming productivity</span>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Links</h3>
            <div className="space-y-3">
              <a href={featuresLink} className="marketing-link flex items-center text-gray-600 hover:text-purple-600 transition-colors group">
                <span>Features</span>
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </a>
              <a href={surfaceLinks.marketingPricing} className="marketing-link flex items-center text-gray-600 hover:text-purple-600 transition-colors group">
                <span>Pricing</span>
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </a>
              <a href={surfaceLinks.marketingEnterprise} className="marketing-link flex items-center text-gray-600 hover:text-purple-600 transition-colors group">
                <span>Enterprise</span>
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </a>
              <a href={homeLink} className="marketing-link flex items-center text-gray-600 hover:text-purple-600 transition-colors group">
                <span>About Us</span>
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </a>
            </div>
          </div>
          
          {/* Contact & Social */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 mb-4">Connect</h3>
            <div className="space-y-3">
              <a 
                href="mailto:hello@iapro.ai" 
                className="marketing-link flex items-center text-gray-600 hover:text-purple-600 transition-colors group"
              >
                <span className="mr-2">📧</span>
                <span>hello@iapro.ai</span>
              </a>
              <div className="flex space-x-3">
                <a 
                  href="https://twitter.com/iapro_ai" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="marketing-social-link w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-white/80 transition-all"
                >
                  <span>🐦</span>
                </a>
                <a 
                  href="https://github.com/iapro-ai" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="marketing-social-link w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-white/80 transition-all"
                >
                  <span>🐙</span>
                </a>
                <a 
                  href="https://linkedin.com/company/iapro-ai" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="marketing-social-link w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-white/80 transition-all"
                >
                  <span>💼</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className="border-t border-white/40 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-500">
              © 2025 iapro.ai. Built with AI for teams who want to achieve more.
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="marketing-link text-gray-500 hover:text-purple-600 transition-colors">Privacy</a>
              <a href="#" className="marketing-link text-gray-500 hover:text-purple-600 transition-colors">Terms</a>
              <a href="mailto:hello@iapro.ai" className="marketing-link text-gray-500 hover:text-purple-600 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* 营销页面专用样式，避免与主应用冲突 */
        .marketing-footer {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .marketing-footer * {
          box-sizing: border-box;
        }
        .marketing-link {
          text-decoration: none;
        }
        .marketing-link:hover {
          text-decoration: none;
        }
        .marketing-social-link {
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </footer>
  )
}
