import React, { useState } from 'react'
import Head from 'next/head'
import MarketingHeader from '../src/components/marketing/MarketingHeader'
import MarketingFooter from '../src/components/marketing/MarketingFooter'
import { GATEWAY_CONFIG } from '../src/config/gatewayConfig'
import { createLogger } from '@/utils/logger'

const log = createLogger('PricingPage')

// Define pricing plans
const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month' as const,
    credits: 1000,
    features: [
      '1,000 AI credits/month',
      'Basic AI models',
      'Email support',
      'Standard processing speed'
    ],
    stripePriceId: ''
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month' as const,
    credits: 10000,
    features: [
      '10,000 AI credits/month',
      'Advanced AI models',
      'Priority support',
      'Faster processing',
      'API access',
      'Custom integrations'
    ],
    stripePriceId: 'price_1RbchvL7y127fTKemRuw8Elz',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month' as const,
    credits: 50000,
    features: [
      '50,000 AI credits/month',
      'All AI models',
      'Dedicated support',
      'Fastest processing',
      'Custom AI training',
      'White-label options',
      'SLA guarantee'
    ],
    stripePriceId: 'price_1RbciEL7y127fTKexyDAX9JA'
  }
]

function PricingCard({ plan, isCurrentPlan, onSelectPlan, isLoading }: {
  plan: typeof pricingPlans[0]
  isCurrentPlan: boolean
  onSelectPlan: (stripePriceId: string) => void
  isLoading: boolean
}) {
  return (
    <div className={`pricing-card bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 relative border border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-105 ${plan.popular ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}>
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
            Most Popular
          </div>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <div className="mb-6">
          <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
          <span className="text-gray-500 ml-2">/{plan.interval}</span>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6 border border-purple-200">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">
            {plan.credits.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">AI credits per month</div>
        </div>
        
        <ul className="space-y-3 mb-8 text-left">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-500 mr-3 mt-1">✓</span>
              <span className="text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
        
        <button
          onClick={() => plan.stripePriceId && onSelectPlan(plan.stripePriceId)}
          disabled={isCurrentPlan || isLoading || !plan.stripePriceId}
          className={`pricing-button w-full py-3 px-6 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
            isCurrentPlan
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : plan.popular
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
              : 'bg-gradient-to-r from-gray-700 to-gray-900 text-white hover:shadow-lg'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading 
            ? 'Processing...' 
            : isCurrentPlan 
            ? 'Current Plan' 
            : plan.price === 0 
            ? 'Get Started' 
            : `Upgrade to ${plan.name}`
          }
        </button>
      </div>
    </div>
  )
}

/**
 * Pricing page - completely independent static page
 * Integrates with existing auth system
 */
export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectPlan = async (stripePriceId: string) => {
    // Pricing is a marketing page rendered outside AuthProvider.
    // Use centralized token key for presence check.
    let hasAuthToken = false
    try {
      hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem(GATEWAY_CONFIG.AUTH.TOKEN_KEY)
    } catch {
      // localStorage unavailable (private browsing, etc.)
    }
    if (!hasAuthToken) {
      // Redirect to main app which will handle login
      window.location.href = '/'
      return
    }

    setIsLoading(true)
    try {
      // This would integrate with your existing stripe checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId: stripePriceId })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      log.error('Error creating checkout session:', error)
      alert('Error creating checkout session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Pricing - iapro.ai</title>
        <meta name="description" content="Choose your perfect AI automation plan with multi-application support and comprehensive memory" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="pricing-page min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <MarketingHeader />
        
        <main className="pt-20">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white py-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
            <div className="max-w-7xl mx-auto px-6 text-center relative">
              <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">
                Choose Your Perfect Plan
              </h1>
              <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Scale your AI automation with plans that adapt to your workflow. Multi-application support, 
                comprehensive memory, and adaptive agents included.
              </p>
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-white/30 shadow-lg">
                <span className="text-yellow-300">✨</span>
                <span className="font-medium">Free trial • No credit card required • Cancel anytime</span>
              </div>
            </div>
          </section>

          {/* Pricing Table */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {pricingPlans.map((plan) => (
                  <PricingCard
                    key={plan.id}
                    plan={plan}
                    isCurrentPlan={false} // You can integrate with your user plan state
                    onSelectPlan={handleSelectPlan}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-3xl md:text-4xl font-black text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-12">
                Frequently Asked Questions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="faq-card bg-white/80 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-white/40">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">💳</span>
                    How do credits work?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Each AI generation uses credits based on complexity. Simple text generation uses 1 credit, 
                    while advanced features may use more. Credits reset monthly with your subscription.
                  </p>
                </div>

                <div className="faq-card bg-white/80 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-white/40">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🔄</span>
                    Can I change plans anytime?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                    and we'll prorate any billing differences.
                  </p>
                </div>

                <div className="faq-card bg-white/80 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-white/40">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">⚡</span>
                    What happens if I exceed my credits?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    You'll be notified when you're running low on credits. You can upgrade your plan 
                    or wait for your credits to reset next month.
                  </p>
                </div>

                <div className="faq-card bg-white/80 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-white/40">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🛡️</span>
                    Is there a refund policy?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    We offer a 14-day money-back guarantee for all paid plans. 
                    Contact support if you're not satisfied with our service.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 py-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
            <div className="max-w-4xl mx-auto text-center px-6 relative">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-xl text-purple-100 mb-8 leading-relaxed">
                Join 2.5M+ users already using AI automation to scale their productivity
              </p>
              <a 
                href="/"
                className="pricing-cta bg-white text-purple-600 font-bold py-4 px-8 rounded-full hover:shadow-xl transition-all duration-300 hover:scale-105 inline-flex items-center space-x-2 no-underline"
              >
                <span>Start Free Trial</span>
                <span>→</span>
              </a>
            </div>
          </section>
        </main>
        
        <MarketingFooter />

        <style jsx global>{`
          /* Pricing page styles, isolated from main app */
          .pricing-page {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
          }
          
          .pricing-page * {
            box-sizing: border-box;
          }
          
          .pricing-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
          }
          
          .pricing-button {
            text-decoration: none;
            border: none;
            cursor: pointer;
          }
          
          .pricing-button:hover {
            text-decoration: none;
          }
          
          .pricing-cta {
            text-decoration: none;
            display: inline-flex;
            align-items: center;
          }
          
          .pricing-cta:hover {
            text-decoration: none;
          }
          
          .faq-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
          }
        `}</style>
      </div>
    </>
  )
}
