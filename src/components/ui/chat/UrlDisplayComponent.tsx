/**
 * UrlDisplayComponent - Displays URLs from tool results in a user-friendly format
 * Extracts and renders URLs with proper styling and click handling
 */
import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

export interface UrlDisplayComponentProps {
  content: string;
  className?: string;
}

interface ExtractedUrl {
  url: string;
  displayText: string;
  isPlainUrl: boolean;
}

export const UrlDisplayComponent: React.FC<UrlDisplayComponentProps> = ({
  content,
  className = ''
}) => {
  const { t } = useTranslation();
  // Extract URLs from content
  const extractUrls = (text: string): ExtractedUrl[] => {
    const urls: ExtractedUrl[] = [];
    
    // Pattern 1: Markdown-style links [text](url)
    const markdownPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = markdownPattern.exec(text)) !== null) {
      urls.push({
        url: match[2],
        displayText: match[1] || match[2],
        isPlainUrl: false
      });
    }
    
    // Pattern 2: Plain URLs (not already captured by markdown)
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const plainUrls = text.match(urlPattern) || [];
    
    // Filter out URLs already captured as markdown links
    const capturedUrls = new Set(urls.map(u => u.url));
    
    plainUrls.forEach(url => {
      if (!capturedUrls.has(url)) {
        // Try to extract a meaningful display name from the URL
        let displayText = url;
        try {
          const urlObj = new URL(url);
          if (urlObj.hostname) {
            displayText = urlObj.hostname.replace('www.', '');
          }
        } catch (e) {
          // Keep original URL as display text
        }
        
        urls.push({
          url,
          displayText,
          isPlainUrl: true
        });
      }
    });
    
    return urls;
  };

  const urls = extractUrls(content);
  
  if (urls.length === 0) {
    return null;
  }

  return (
    <div className={`url-display-component ${className}`}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          📎 {t('chat.relatedLinks')}
        </h4>
        <div className="space-y-2">
          {urls.map((urlData, index) => (
            <div
              key={index}
              className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex-shrink-0 mr-3">
                <svg 
                  className="w-4 h-4 text-blue-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={urlData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  <div className="font-medium text-sm truncate">
                    {urlData.displayText}
                  </div>
                  {!urlData.isPlainUrl && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {urlData.url}
                    </div>
                  )}
                </a>
              </div>
              <div className="flex-shrink-0 ml-2">
                <button
                  onClick={() => navigator.clipboard.writeText(urlData.url)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  title={t('chat.copyLink')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UrlDisplayComponent;