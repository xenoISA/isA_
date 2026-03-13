import React, { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useAnalytics } from '../src/hooks/useAnalytics'
import MarketingHeader from '../src/components/marketing/MarketingHeader'
import HeroSection from '../src/components/marketing/homepage/HeroSection'
import MainDemo from '../src/components/marketing/homepage/MainDemo'
import StatsPanel from '../src/components/marketing/homepage/StatsPanel'
import FeatureCards from '../src/components/marketing/homepage/FeatureCards'
import LiveActivity from '../src/components/marketing/homepage/LiveActivity'
import CTASection from '../src/components/marketing/homepage/CTASection'
import SocialProof from '../src/components/marketing/homepage/SocialProof'
import MarketingFooter from '../src/components/marketing/MarketingFooter'

/**
 * 营销首页 - 完全独立的静态页面
 * 样式与主应用隔离，避免冲突
 */
export default function MarketingHome() {
  const [activeDemo, setActiveDemo] = useState(0)
  const [currentTime, setCurrentTime] = useState('')
  const { trackMarketingPageView, trackContentEngagement, trackCTAClick } = useAnalytics()

  const demos = useMemo(() => [
    {
      user: "Sarah",
      action: "Automated entire workflow setup",
      time: "2s ago",
      color: "from-pink-400 to-rose-400",
      metric: "80% time saved",
      category: "Automation",
      icon: "⚡"
    },
    {
      user: "Mike",
      action: "AI remembered project context",
      time: "5s ago",
      color: "from-blue-400 to-cyan-400",
      metric: "100% accuracy",
      category: "Memory",
      icon: "🧠"
    },
    {
      user: "Anna",
      action: "Agents collaborated on strategy",
      time: "8s ago",
      color: "from-green-400 to-emerald-400",
      metric: "3x faster delivery",
      category: "Adaptive",
      icon: "👥"
    },
    {
      user: "Alex",
      action: "Proactive task completion",
      time: "12s ago",
      color: "from-purple-400 to-violet-400",
      metric: "15 tasks auto-done",
      category: "Proactive",
      icon: "⏱️"
    },
  ], [])

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }))
    }
    
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % demos.length)
    }, 3000)

    return () => clearInterval(timer)
  }, [demos.length])

  // 追踪营销首页访问
  useEffect(() => {
    trackMarketingPageView('home', {
      page_section: 'marketing_home',
      demo_count: demos.length,
      has_animations: true
    })
  }, [trackMarketingPageView, demos.length])

  // 追踪demo轮播互动
  useEffect(() => {
    if (activeDemo > 0) { // 跳过初始状态
      trackContentEngagement('demo', `demo_${activeDemo}`, 'auto_rotate', {
        demo_index: activeDemo,
        demo_user: demos[activeDemo]?.user,
        demo_category: demos[activeDemo]?.category
      })
    }
  }, [activeDemo, trackContentEngagement, demos])

  // CTA点击处理函数
  const handleCTAClick = (ctaName: string, location: string) => {
    trackCTAClick(ctaName, location, {
      page: 'home',
      demo_visible: demos[activeDemo]?.category,
      current_time: currentTime
    })
  }

  return (
    <>
      <Head>
        <title>iapro.ai - Intelligent AI Assistant Platform</title>
        <meta name="description" content="AI-powered assistant platform with multi-application support, intelligent automation, and comprehensive memory systems" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="marketing-home min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <MarketingHeader />

        <main className="pt-16 sm:pt-20 px-3 sm:px-4 lg:px-6 py-4 max-w-7xl mx-auto flex flex-col min-h-screen">
          <HeroSection currentTime={currentTime} />

          <div id="demo" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
            <MainDemo />
            <StatsPanel />
            <FeatureCards id="features" />
            <LiveActivity demos={demos} activeDemo={activeDemo} />
            <CTASection />
          </div>

          <SocialProof />
        </main>
        
        <MarketingFooter />

        <style jsx global>{`
          /* 营销页面全局样式，避免与主应用冲突 */
          .marketing-home {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
          }
          
          .marketing-home * {
            box-sizing: border-box;
          }
          
          .marketing-home a {
            text-decoration: none;
          }
          
          .marketing-home a:hover {
            text-decoration: none;
          }
          
          /* 确保不影响主应用样式 - 只对根容器应用 */
          .marketing-home > .bg-gradient-to-br {
            background: linear-gradient(to bottom right, rgb(250 245 255), rgb(239 246 255), rgb(253 242 248));
          }
        `}</style>
      </div>
    </>
  )
}