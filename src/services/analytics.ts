
import { RudderAnalytics } from '@rudderstack/analytics-js';

interface AnalyticsConfig {
  writeKey: string;
  dataPlaneUrl: string;
  debugMode?: boolean;
}

class AnalyticsService {
  private analytics: RudderAnalytics | null = null;
  private isInitialized = false;
  private config: AnalyticsConfig;

  constructor() {
    this.config = {
      writeKey: process.env.NEXT_PUBLIC_RUDDERSTACK_WRITE_KEY || '',
      dataPlaneUrl: process.env.NEXT_PUBLIC_RUDDERSTACK_DATA_PLANE_URL || '',
      debugMode: process.env.NODE_ENV === 'development',
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    try {
      if (!this.config.writeKey || !this.config.dataPlaneUrl) {
        console.warn('RudderStack not configured: missing write key or data plane URL');
        return;
      }

      this.analytics = new RudderAnalytics();
      
      // 对于本地 RudderStack，使用本地控制平面URL
      this.analytics.load(this.config.writeKey, this.config.dataPlaneUrl, {
        // 基础配置
        logLevel: this.config.debugMode ? 'DEBUG' : 'ERROR',
        
        // 本地控制平面配置 - 指向我们的 Next.js API
        configUrl: `${window.location.origin}/api/rudderstack`,
        
        // 会话跟踪
        sessions: {
          autoTrack: true,
          timeout: 30 * 60 * 1000, // 30分钟
        }
      });

      this.isInitialized = true;
      console.log('RudderStack Analytics initialized successfully');
      
      // 如果是营销页面，初始化营销会话追踪
      if (this.isMarketingPage()) {
        this.initializeMarketingSession();
      } else {
        // 发送页面浏览事件
        this.page();
      }
      
    } catch (error) {
      console.error('Failed to initialize RudderStack:', error);
    }
  }

  // 页面浏览事件
  page(name?: string, properties?: Record<string, any>): void {
    if (!this.isInitialized || !this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    if (name) {
      this.analytics.page(name, {
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title,
        ...properties,
      });
    } else {
      this.analytics.page({
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title,
        ...properties,
      });
    }
  }

  // 事件追踪
  track(event: string, properties?: Record<string, any>): void {
    if (!this.isInitialized || !this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    this.analytics.track(event, {
      timestamp: new Date().toISOString(),
      ...properties,
    });
  }

  // 用户识别
  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.isInitialized || !this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    this.analytics.identify(userId, {
      ...traits,
      identifiedAt: new Date().toISOString(),
    });
  }

  // 用户组
  group(groupId: string, traits?: Record<string, any>): void {
    if (!this.isInitialized || !this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    this.analytics.group(groupId, traits);
  }

  // 别名
  alias(newId: string, previousId?: string): void {
    if (!this.isInitialized || !this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    this.analytics.alias(newId, previousId);
  }

  // 重置用户
  reset(): void {
    if (!this.isInitialized || !this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    this.analytics.reset();
  }

  // 获取匿名ID
  getAnonymousId(): string | undefined {
    if (!this.isInitialized || !this.analytics) {
      return undefined;
    }

    const anonymousId = this.analytics.getAnonymousId();
    return anonymousId || undefined;
  }

  // 获取用户ID
  getUserId(): string | undefined {
    if (!this.isInitialized || !this.analytics) {
      return undefined;
    }

    const userId = this.analytics.getUserId();
    return userId || undefined;
  }

  // =====================================================
  // Marketing Analytics 扩展方法
  // =====================================================

  /**
   * 追踪营销页面浏览
   */
  trackMarketingPageView(pageName: string, properties?: Record<string, any>): void {
    const utmParams = this.getUTMParams();
    
    this.track('marketing_page_viewed', {
      page_name: pageName,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_term: utmParams.utm_term,
      utm_content: utmParams.utm_content,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
      landing_page: this.getLandingPage(),
      session_duration: this.getSessionDuration(),
      ...properties
    });
  }

  /**
   * 追踪CTA点击
   */
  trackCTAClick(ctaName: string, location: string, properties?: Record<string, any>): void {
    this.track('cta_clicked', {
      cta_name: ctaName,
      cta_location: location,
      page_name: this.getCurrentPageName(),
      utm_params: this.getUTMParams(),
      ...properties
    });
  }

  /**
   * 追踪定价计划选择
   */
  trackPricingPlanSelected(planId: string, planName: string, price: number, properties?: Record<string, any>): void {
    this.track('pricing_plan_selected', {
      plan_id: planId,
      plan_name: planName,
      plan_price: price,
      page_name: 'pricing',
      utm_params: this.getUTMParams(),
      ...properties
    });
  }

  /**
   * 追踪注册意图
   */
  trackSignupIntent(trigger: string, properties?: Record<string, any>): void {
    this.track('signup_intent', {
      trigger: trigger,
      page_name: this.getCurrentPageName(),
      utm_params: this.getUTMParams(),
      session_duration: this.getSessionDuration(),
      ...properties
    });
  }

  /**
   * 追踪用户注册完成（营销转化事件）
   */
  trackMarketingConversion(userId: string, registrationMethod: string, properties?: Record<string, any>): void {
    const utmParams = this.getUTMParams();
    
    this.track('user_registered', {
      user_id: userId,
      registration_method: registrationMethod,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      landing_page: this.getLandingPage(),
      session_duration: this.getSessionDuration(),
      conversion_page: this.getCurrentPageName(),
      ...properties
    });

    // 用户身份识别
    this.identify(userId, {
      registration_date: new Date().toISOString(),
      registration_utm: utmParams,
      landing_page: this.getLandingPage(),
      registration_method: registrationMethod
    });
  }

  /**
   * 追踪内容互动
   */
  trackContentEngagement(contentType: string, contentName: string, action: string, properties?: Record<string, any>): void {
    this.track('content_engagement', {
      content_type: contentType,
      content_name: contentName,
      action: action,
      page_name: this.getCurrentPageName(),
      utm_params: this.getUTMParams(),
      ...properties
    });
  }

  /**
   * 追踪社交分享
   */
  trackSocialShare(platform: string, contentType: string, properties?: Record<string, any>): void {
    this.track('social_share', {
      platform: platform,
      content_type: contentType,
      page_name: this.getCurrentPageName(),
      utm_params: this.getUTMParams(),
      ...properties
    });
  }

  // =====================================================
  // 辅助方法
  // =====================================================

  /**
   * 获取UTM参数
   */
  private getUTMParams(): Record<string, string | null> {
    if (typeof window === 'undefined') return {};
    
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content')
    };
  }

  /**
   * 获取当前页面名称
   */
  private getCurrentPageName(): string {
    if (typeof window === 'undefined') return '';
    return window.location.pathname.replace('/', '') || 'home';
  }

  /**
   * 获取落地页
   */
  private getLandingPage(): string | null {
    if (typeof window === 'undefined') return null;
    // 从sessionStorage获取落地页（会话级别存储）
    try {
      return sessionStorage.getItem('landing_page') || window.location.pathname + window.location.search;
    } catch {
      return window.location.pathname + window.location.search;
    }
  }

  /**
   * 获取会话持续时间
   */
  private getSessionDuration(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const sessionStart = sessionStorage.getItem('session_start_time');
      if (sessionStart) {
        return Date.now() - parseInt(sessionStart);
      }
    } catch {}
    return 0;
  }

  /**
   * 初始化会话追踪
   */
  initializeMarketingSession(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // 记录会话开始时间
      if (!sessionStorage.getItem('session_start_time')) {
        sessionStorage.setItem('session_start_time', Date.now().toString());
      }
      
      // 记录落地页
      if (!sessionStorage.getItem('landing_page')) {
        sessionStorage.setItem('landing_page', window.location.pathname + window.location.search);
      }

      // 追踪落地页访问
      this.trackLandingPageEntry();
    } catch (error) {
      console.warn('Failed to initialize marketing session:', error);
    }
  }

  /**
   * 追踪落地页进入
   */
  private trackLandingPageEntry(): void {
    const utmParams = this.getUTMParams();
    
    this.track('landing_page_entered', {
      page_url: window.location.href,
      page_path: window.location.pathname,
      referrer: document.referrer,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_term: utmParams.utm_term,
      utm_content: utmParams.utm_content,
      user_agent: navigator.userAgent,
      screen_size: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`
    });
  }

  /**
   * 判断是否为营销页面
   */
  private isMarketingPage(): boolean {
    if (typeof window === 'undefined') return false;
    
    const marketingPages = ['/', '/home', '/pricing', '/enterprise', '/demo'];
    const currentPath = window.location.pathname;
    
    return marketingPages.includes(currentPath) || 
           window.location.hostname.includes('www.') ||
           window.location.hostname === 'www.iapro.ai';
  }
}

// 创建单例实例
const analytics = new AnalyticsService();

export default analytics;
export { AnalyticsService };
