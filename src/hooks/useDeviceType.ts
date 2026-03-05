/**
 * Device Type Detection Hook
 * Detects device type and screen characteristics for responsive design
 */
import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  touchSupport: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export const useDeviceType = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop' as const,
        screenWidth: 1920,
        screenHeight: 1080,
        pixelRatio: 1,
        touchSupport: false,
        isLandscape: true,
        isPortrait: false,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Device type detection based on screen width and touch support
    // Treat classic phone widths as mobile; reserve 769–1024 touch devices for tablets
    const isMobile = width <= 768;
    const isTablet = width > 768 && width <= 1024 && touchSupport;
    const isDesktop = !isMobile && !isTablet;
    
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const isLandscape = width > height;
    const isPortrait = !isLandscape;

    // Safe area insets (for notched devices)
    const getSafeAreaInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      return {
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
      };
    };

    return {
      isMobile,
      isTablet,
      isDesktop,
      deviceType,
      screenWidth: width,
      screenHeight: height,
      pixelRatio,
      touchSupport,
      isLandscape,
      isPortrait,
      safeAreaInsets: getSafeAreaInsets()
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isMobile = width <= 768;
      const isTablet = width > 768 && width <= 1024 && touchSupport;
      const isDesktop = !isMobile && !isTablet;
      
      const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      const isLandscape = width > height;
      const isPortrait = !isLandscape;

      const getSafeAreaInsets = () => {
        const computedStyle = getComputedStyle(document.documentElement);
        return {
          top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
          bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
          left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
          right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
        };
      };

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        deviceType,
        screenWidth: width,
        screenHeight: height,
        pixelRatio,
        touchSupport,
        isLandscape,
        isPortrait,
        safeAreaInsets: getSafeAreaInsets()
      });
    };

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};