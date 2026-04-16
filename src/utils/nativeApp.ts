/**
 * ============================================================================
 * Native App Compatibility Layer
 * ============================================================================
 * 
 * Provides compatibility for:
 * - React Native
 * - Cordova/PhoneGap
 * - Capacitor
 * - PWA (Progressive Web App)
 * - Electron
 */

export interface NativeAppInfo {
  isNativeApp: boolean;
  platform: 'web' | 'ios' | 'android' | 'windows' | 'macos' | 'linux';
  framework: 'none' | 'react-native' | 'cordova' | 'capacitor' | 'electron' | 'pwa';
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  statusBarHeight: number;
  keyboardHeight: number;
  capabilities: {
    camera: boolean;
    microphone: boolean;
    location: boolean;
    push: boolean;
    storage: boolean;
    fileSystem: boolean;
  };
}

// Global native app detection
export const detectNativeApp = (): NativeAppInfo => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isStandalone = typeof window !== 'undefined' && (window as any).navigator?.standalone;
  const isInWebAppiOS = typeof window !== 'undefined' && (window as any).navigator?.standalone;
  const isInWebAppChrome = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

  // Check for React Native
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  
  // Check for Cordova
  const isCordova = typeof window !== 'undefined' && !!(window as any).cordova;
  
  // Check for Capacitor
  const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
  
  // Check for Electron — detect via preload-injected flag (sandbox disables window.require)
  const isElectron = typeof window !== 'undefined' && (
    !!(window as any).isElectron ||
    !!(window as any).electronAPI ||
    userAgent.includes('Electron')
  );
  
  // Check for PWA
  const isPWA = isStandalone || isInWebAppiOS || isInWebAppChrome;

  // Determine platform
  let platform: NativeAppInfo['platform'] = 'web';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    platform = 'ios';
  } else if (userAgent.includes('Android')) {
    platform = 'android';
  } else if (userAgent.includes('Windows')) {
    platform = 'windows';
  } else if (userAgent.includes('Mac')) {
    platform = 'macos';
  } else if (userAgent.includes('Linux')) {
    platform = 'linux';
  }

  // Determine framework
  let framework: NativeAppInfo['framework'] = 'none';
  if (isReactNative) framework = 'react-native';
  else if (isCordova) framework = 'cordova';
  else if (isCapacitor) framework = 'capacitor';
  else if (isElectron) framework = 'electron';
  else if (isPWA) framework = 'pwa';

  // Get safe area insets
  const getSafeAreaInsets = () => {
    if (typeof window === 'undefined') {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--sat') || style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
      bottom: parseInt(style.getPropertyValue('--sab') || style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
      left: parseInt(style.getPropertyValue('--sal') || style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
      right: parseInt(style.getPropertyValue('--sar') || style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    };
  };

  // Get status bar height
  const getStatusBarHeight = () => {
    if (platform === 'ios') {
      return isReactNative ? 44 : 20; // iPhone status bar
    } else if (platform === 'android') {
      return 24; // Android status bar
    }
    return 0;
  };

  // Check capabilities
  const getCapabilities = () => {
    const caps = {
      camera: false,
      microphone: false,
      location: false,
      push: false,
      storage: true,
      fileSystem: false,
    };

    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      caps.camera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      caps.microphone = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      caps.location = !!navigator.geolocation;
      caps.push = 'serviceWorker' in navigator && 'PushManager' in window;
      caps.storage = 'localStorage' in window;
      caps.fileSystem = 'webkitRequestFileSystem' in window || 'requestFileSystem' in window;
    }

    // Native app capabilities
    if (isReactNative || isCordova || isCapacitor) {
      caps.camera = true;
      caps.microphone = true;
      caps.location = true;
      caps.push = true;
      caps.fileSystem = true;
    }

    return caps;
  };

  return {
    isNativeApp: framework !== 'none',
    platform,
    framework,
    safeAreaInsets: getSafeAreaInsets(),
    statusBarHeight: getStatusBarHeight(),
    keyboardHeight: 0, // Will be updated dynamically
    capabilities: getCapabilities(),
  };
};

// Native app utilities
export class NativeAppUtils {
  private static info: NativeAppInfo | null = null;

  static getInfo(): NativeAppInfo {
    if (!this.info) {
      this.info = detectNativeApp();
    }
    return this.info;
  }

  static isNativeApp(): boolean {
    return this.getInfo().isNativeApp;
  }

  static getPlatform(): NativeAppInfo['platform'] {
    return this.getInfo().platform;
  }

  static getFramework(): NativeAppInfo['framework'] {
    return this.getInfo().framework;
  }

  // Keyboard handling
  static setupKeyboardHandling(callback: (height: number) => void): () => void {
    const info = this.getInfo();
    
    if (info.framework === 'capacitor') {
      // Capacitor keyboard handling
      const { Keyboard } = (window as any).Capacitor?.Plugins || {};
      if (Keyboard) {
        const showListener = Keyboard.addListener('keyboardWillShow', (info: any) => {
          callback(info.keyboardHeight);
        });
        const hideListener = Keyboard.addListener('keyboardWillHide', () => {
          callback(0);
        });
        
        return () => {
          showListener.remove();
          hideListener.remove();
        };
      }
    } else if (info.framework === 'cordova') {
      // Cordova keyboard handling
      const onShow = (e: any) => callback(e.keyboardHeight);
      const onHide = () => callback(0);
      
      window.addEventListener('keyboardWillShow', onShow);
      window.addEventListener('keyboardWillHide', onHide);
      
      return () => {
        window.removeEventListener('keyboardWillShow', onShow);
        window.removeEventListener('keyboardWillHide', onHide);
      };
    } else if (info.framework === 'react-native') {
      // React Native keyboard handling would be handled differently
      // This is a placeholder for when running in RN environment
    }

    // Web fallback - visual viewport API
    if (typeof window !== 'undefined' && (window as any).visualViewport) {
      const viewport = (window as any).visualViewport;
      const onResize = () => {
        const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
        callback(keyboardHeight);
      };
      
      viewport.addEventListener('resize', onResize);
      return () => viewport.removeEventListener('resize', onResize);
    }

    return () => {};
  }

  // Status bar handling
  static setStatusBarStyle(style: 'light' | 'dark', animated = true): void {
    const info = this.getInfo();
    
    if (info.framework === 'capacitor') {
      const { StatusBar } = (window as any).Capacitor?.Plugins || {};
      if (StatusBar) {
        StatusBar.setStyle({ style: style === 'light' ? 'LIGHT' : 'DARK' });
      }
    } else if (info.framework === 'cordova') {
      const StatusBar = (window as any).StatusBar;
      if (StatusBar) {
        if (style === 'light') {
          StatusBar.styleLightContent();
        } else {
          StatusBar.styleDefault();
        }
      }
    }
  }

  // Safe area CSS variables
  static applySafeAreaCSS(): void {
    if (typeof document === 'undefined') return;
    
    const info = this.getInfo();
    const root = document.documentElement;
    
    root.style.setProperty('--sat', `${info.safeAreaInsets.top}px`);
    root.style.setProperty('--sab', `${info.safeAreaInsets.bottom}px`);
    root.style.setProperty('--sal', `${info.safeAreaInsets.left}px`);
    root.style.setProperty('--sar', `${info.safeAreaInsets.right}px`);
    root.style.setProperty('--status-bar-height', `${info.statusBarHeight}px`);
  }

  // Haptic feedback
  static vibrate(pattern: number | number[] = 50): void {
    const info = this.getInfo();
    
    if (info.framework === 'capacitor') {
      const { Haptics } = (window as any).Capacitor?.Plugins || {};
      if (Haptics) {
        Haptics.vibrate();
      }
    } else if (info.framework === 'cordova') {
      const navigator = window.navigator as any;
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  // File system access
  static async pickFile(options: { accept?: string; multiple?: boolean } = {}): Promise<File[]> {
    const info = this.getInfo();
    
    if (info.framework === 'capacitor') {
      const { FilePicker } = (window as any).Capacitor?.Plugins || {};
      if (FilePicker) {
        const result = await FilePicker.pickFiles({
          types: options.accept,
          multiple: options.multiple,
        });
        return result.files || [];
      }
    }
    
    // Web fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept || '*';
      input.multiple = options.multiple || false;
      input.style.display = 'none';
      
      input.addEventListener('change', (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        resolve(files);
        document.body.removeChild(input);
      });
      
      document.body.appendChild(input);
      input.click();
    });
  }
}

// Initialize native app utilities
if (typeof window !== 'undefined') {
  // Apply safe area CSS on load
  document.addEventListener('DOMContentLoaded', () => {
    NativeAppUtils.applySafeAreaCSS();
  });
  
  // Update on orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      NativeAppUtils.applySafeAreaCSS();
    }, 100);
  });
}