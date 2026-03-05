/**
 * ============================================================================
 * CreateOrganizationModal - Organization Creation Interface
 * ============================================================================
 * 
 * Pure UI component for creating new organizations.
 * Integrates with the organization management system.
 * 
 * Features:
 * - Organization name validation
 * - Domain configuration (optional)
 * - Plan selection
 * - Initial settings configuration
 * - Real-time validation feedback
 */

import React, { useState, useCallback } from 'react';
import { createLogger } from '../../../utils/logger';

const log = createLogger('CreateOrganizationModal');

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  plan: 'startup' | 'business' | 'enterprise';
  billingEmail: string;
  settings?: Record<string, any>;
}

export interface CreateOrganizationModalProps {
  isOpen: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (data: CreateOrganizationData) => Promise<void>;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  isLoading,
  error,
  onClose,
  onCreate
}) => {
  // Form State
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState<'startup' | 'business' | 'enterprise'>('startup');
  const [billingEmail, setBillingEmail] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Validation
  const validateName = useCallback((value: string) => {
    if (!value.trim()) {
      return 'Organization name is required';
    }
    if (value.length < 3) {
      return 'Organization name must be at least 3 characters';
    }
    if (value.length > 50) {
      return 'Organization name must be less than 50 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(value)) {
      return 'Organization name can only contain letters, numbers, spaces, hyphens, underscores, and dots';
    }
    return '';
  }, []);

  const validateEmail = useCallback((value: string) => {
    if (!value.trim()) {
      return 'Billing email is required';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  }, []);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setNameError(validateName(value));
  }, [validateName]);

  const handleEmailChange = useCallback((value: string) => {
    setBillingEmail(value);
    setEmailError(validateEmail(value));
  }, [validateEmail]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    const nameValidationError = validateName(name);
    const emailValidationError = validateEmail(billingEmail);
    
    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }
    
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    try {
      await onCreate({
        name: name.trim(),
        domain: domain.trim() || undefined,
        plan,
        billingEmail: billingEmail.trim(),
        settings: description.trim() ? { description: description.trim() } : undefined
      });
      
      // Reset form on success
      setName('');
      setDomain('');
      setPlan('startup');
      setBillingEmail('');
      setDescription('');
      setNameError('');
      setEmailError('');
      
    } catch (error) {
      // Error is handled by parent component
      log.error('Create organization error:', error);
    }
  }, [name, domain, plan, billingEmail, description, validateName, validateEmail, onCreate]);

  const handleClose = useCallback(() => {
    // Reset form state on close
    setName('');
    setDomain('');
    setPlan('startup');
    setBillingEmail('');
    setDescription('');
    setNameError('');
    setEmailError('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'startup' as const,
      name: 'Startup',
      description: 'Perfect for small teams getting started',
      price: '$29/month',
      features: ['Up to 10 members', 'Basic support', '5,000 credits/month', 'Standard analytics']
    },
    {
      id: 'business' as const,
      name: 'Business',
      description: 'Advanced features for growing teams',
      price: '$99/month',
      features: ['Up to 50 members', 'Priority support', '25,000 credits/month', 'Advanced analytics', 'Custom domains']
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      description: 'Full features for large organizations',
      price: 'Custom pricing',
      features: ['Unlimited members', '24/7 support', 'Custom credits', 'Advanced security', 'Custom integrations', 'Dedicated account manager']
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl border border-white/10 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Create Organization</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                nameError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="Enter organization name"
              disabled={isLoading}
              maxLength={50}
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-400">{nameError}</p>
            )}
          </div>

          {/* Domain (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Domain (Optional)
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="company.com"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-400">
              Members with email addresses from this domain can join automatically
            </p>
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Brief description of your organization"
              rows={3}
              disabled={isLoading}
              maxLength={200}
            />
          </div>

          {/* Billing Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Billing Email *
            </label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                emailError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="billing@company.com"
              disabled={isLoading}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-400">{emailError}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              This email will receive billing notifications and invoices
            </p>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Plan
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map((planOption) => (
                <div
                  key={planOption.id}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    plan === planOption.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => !isLoading && setPlan(planOption.id)}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={planOption.id}
                    checked={plan === planOption.id}
                    onChange={() => setPlan(planOption.id)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <div className="text-white font-medium">{planOption.name}</div>
                  <div className="text-blue-400 text-sm font-medium">{planOption.price}</div>
                  <div className="text-gray-400 text-xs mt-1">{planOption.description}</div>
                  <ul className="mt-2 space-y-1">
                    {planOption.features.map((feature, index) => (
                      <li key={index} className="text-xs text-gray-300 flex items-center">
                        <svg className="w-3 h-3 text-green-400 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-red-400">❌</span>
                <span className="text-red-300 text-sm font-medium">Error</span>
              </div>
              <p className="text-red-200 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center"
              disabled={isLoading || !!nameError || !!emailError || !name.trim() || !billingEmail.trim()}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Organization'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrganizationModal;