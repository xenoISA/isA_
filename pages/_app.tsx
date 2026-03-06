import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { AnalyticsProvider } from '../src/providers/AnalyticsProvider'
import { isMarketingHostname } from '../src/config/surfaceConfig'
import { createLogger } from '@/utils/logger'

const log = createLogger('App')

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // 检测是否为营销站点
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const isMarketing = isMarketingHostname(hostname)
      log.info(`_app.tsx: hostname=${hostname}, isMarketing=${isMarketing}`)
    }
  }, [])

  // Auth is handled by AuthProvider in src/app.tsx — not duplicated here
  
  return (
    <AnalyticsProvider>
      <Component {...pageProps} />
    </AnalyticsProvider>
  )
}
