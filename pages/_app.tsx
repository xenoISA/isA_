import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { AnalyticsProvider } from '../src/providers/AnalyticsProvider'
import { isMarketingHostname } from '../src/config/surfaceConfig'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // 检测是否为营销站点
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const isMarketing = isMarketingHostname(hostname)
      console.log(`🌍 _app.tsx: hostname=${hostname}, isMarketing=${isMarketing}`)
    }
  }, [])

  // 移除重复的 Auth0Provider 包装
  // Auth0Provider 现在只在 src/app.tsx 中使用，避免双重包装
  // Rendering with AnalyticsProvider
  
  return (
    <AnalyticsProvider>
      <Component {...pageProps} />
    </AnalyticsProvider>
  )
}
