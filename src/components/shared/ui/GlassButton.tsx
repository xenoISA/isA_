/**
 * GlassButton Component - Ultra-modern glassmorphism button
 * Perfect for Glassmorphism Pro design system
 */
import React from 'react';

export interface GlassButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'success' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  style,
  title,
  onClick,
  type = 'button'
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'xs': return 'px-3 py-1.5 text-xs rounded-lg';
      case 'sm': return 'px-4 py-2 text-sm rounded-xl';
      case 'lg': return 'px-6 py-3.5 text-base rounded-2xl';
      case 'xl': return 'px-8 py-4 text-lg rounded-2xl';
      default: return 'px-5 py-3 text-sm rounded-xl';
    }
  };

  const getVariantStyles = () => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    
    switch (variant) {
      case 'primary':
        return `
          bg-gradient-to-r from-blue-500/80 via-purple-500/80 to-blue-600/80
          hover:from-blue-500/90 hover:via-purple-500/90 hover:to-blue-600/90
          text-white backdrop-blur-md
          border border-white/20 dark:border-white/10
          shadow-lg shadow-blue-500/25
          hover:shadow-xl hover:shadow-blue-500/35
          hover:scale-105
        `;
      case 'secondary':
        return `
          ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-white/30 hover:bg-white/40'}
          ${isDark ? 'text-gray-100' : 'text-gray-800'}
          backdrop-blur-md border border-white/20 dark:border-white/10
          shadow-lg shadow-black/10
          hover:shadow-xl hover:scale-105
        `;
      case 'ghost':
        return `
          ${isDark ? 'hover:bg-white/5' : 'hover:bg-white/20'}
          ${isDark ? 'text-gray-300' : 'text-gray-700'}
          backdrop-blur-sm border border-transparent
          hover:border-white/10 dark:hover:border-white/5
          hover:scale-105
        `;
      case 'accent':
        return `
          bg-gradient-to-r from-purple-500/80 to-pink-500/80
          hover:from-purple-500/90 hover:to-pink-500/90
          text-white backdrop-blur-md
          border border-white/20 dark:border-white/10
          shadow-lg shadow-purple-500/25
          hover:shadow-xl hover:shadow-purple-500/35
          hover:scale-105
        `;
      case 'success':
        return `
          bg-gradient-to-r from-green-500/80 to-emerald-500/80
          hover:from-green-500/90 hover:to-emerald-500/90
          text-white backdrop-blur-md
          border border-white/20 dark:border-white/10
          shadow-lg shadow-green-500/25
          hover:shadow-xl hover:shadow-green-500/35
          hover:scale-105
        `;
      case 'danger':
        return `
          bg-gradient-to-r from-red-500/80 to-rose-500/80
          hover:from-red-500/90 hover:to-rose-500/90
          text-white backdrop-blur-md
          border border-white/20 dark:border-white/10
          shadow-lg shadow-red-500/25
          hover:shadow-xl hover:shadow-red-500/35
          hover:scale-105
        `;
      default:
        return '';
    }
  };

  const getDisabledStyles = () => {
    return disabled ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-lg' : '';
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      style={style}
      className={`
        glass-button
        inline-flex items-center justify-center
        font-medium transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2
        ${getSizeStyles()}
        ${getVariantStyles()}
        ${getDisabledStyles()}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {/* Loading Spinner */}
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      
      {/* Left Icon */}
      {icon && iconPosition === 'left' && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      
      {/* Button Text */}
      <span className="relative">
        {children}
      </span>
      
      {/* Right Icon */}
      {icon && iconPosition === 'right' && !loading && (
        <span className="ml-2">{icon}</span>
      )}
      
      {/* Glass Overlay Effect */}
      <div className="absolute inset-0 rounded-inherit bg-gradient-to-r from-white/10 via-transparent to-white/5 pointer-events-none" />
    </button>
  );
};