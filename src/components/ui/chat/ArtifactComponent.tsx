import React, { useState, useCallback } from 'react';
import { AppArtifact } from '../../../types/appTypes';
import { ContentRenderer, StatusRenderer, Button } from '../../shared';

/**
 * Pure UI component for displaying artifacts
 * Only handles rendering - no hooks, no state, no business logic
 */
export interface ArtifactComponentProps {
  artifact: AppArtifact;
  onReopen: () => void;
}

export const ArtifactComponent: React.FC<ArtifactComponentProps> = ({ artifact, onReopen }) => {
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyContent = useCallback(async () => {
    if (!artifact.generatedContent?.content) return;
    const text = typeof artifact.generatedContent.content === 'string'
      ? artifact.generatedContent.content
      : JSON.stringify(artifact.generatedContent.content, null, 2);
    await navigator.clipboard.writeText(text);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  }, [artifact.generatedContent?.content]);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?artifact=${artifact.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [artifact.id]);

  return (
    <div className="my-4 max-w-sm">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-t-xl backdrop-blur-sm" style={{
        background: 'var(--glass-primary)',
        border: '1px solid var(--glass-border)',
        borderBottom: 'none'
      }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{artifact.appIcon}</span>
          <div>
            <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{artifact.title}</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{artifact.appName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={handleCopyContent}
            variant="ghost"
            size="xs"
            icon={copiedContent ? '✅' : '📋'}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none'
            }}
            title="Copy content"
          />
          <Button
            onClick={handleCopyLink}
            variant="ghost"
            size="xs"
            icon={copiedLink ? '✅' : '🔗'}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none'
            }}
            title="Copy share link"
          />
          <Button
            onClick={onReopen}
            variant="secondary"
            size="xs"
            icon="↗️"
            style={{
              background: 'var(--glass-secondary)',
              color: 'var(--accent-soft)',
              border: 'none'
            }}
            className="hover:shadow-lg"
          >
            Open
          </Button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="rounded-b-xl p-3 min-h-[100px]" style={{
        background: 'var(--glass-secondary)',
        border: '1px solid var(--glass-border)',
        borderTop: 'none'
      }}>
        {artifact.generatedContent && (
          <>
            {/* Loading state */}
            {artifact.generatedContent.content === 'Loading...' && (
              <div className="flex items-center justify-center py-8">
                <StatusRenderer
                  status="loading"
                  message="Loading..."
                  variant="inline"
                  size="sm"
                />
              </div>
            )}
            
            {/* Image content - Compact Thumbnail */}
            {artifact.generatedContent.type === 'image' && artifact.generatedContent.content !== 'Loading...' && (
              <div>
                <ContentRenderer
                  content={artifact.generatedContent.content}
                  type="image"
                  variant="widget"
                  size="sm"
                  features={{
                    imagePreview: true,
                    saveButton: true,
                    copyButton: true
                  }}
                  className="mb-2 max-w-[80px] max-h-[80px]"
                  onAction={(action, data) => {
                    if (action === 'preview-image') {
                      window.open(data.url, '_blank');
                    }
                  }}
                />
              </div>
            )}
            
            {/* Search Results content with Markdown Support */}
            {artifact.generatedContent.type === 'search_results' && artifact.generatedContent.content !== 'Loading...' && (
              <ContentRenderer
                content={artifact.generatedContent.content}
                type="search_results"
                variant="widget"
                size="xs"
                features={{
                  markdown: true,
                  truncate: 300
                }}
              />
            )}
            
            {/* Text content - Markdown Rendered */}
            {artifact.generatedContent.type === 'text' && artifact.generatedContent.content !== 'Loading...' && (
              <div>
                <div className="rounded-lg p-3 mb-2 max-h-96 overflow-y-auto" style={{
                  background: 'var(--glass-primary)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Content:</div>
                  <ContentRenderer
                    content={artifact.generatedContent.content}
                    type="markdown"
                    variant="widget"
                    size="xs"
                    features={{
                      markdown: true,
                      copyButton: false,
                      wordBreak: true
                    }}
                  />
                </div>
                
                {/* Quick Actions for Text */}
                <div className="flex gap-1">
                  <Button
                    onClick={handleCopyContent}
                    variant="secondary"
                    size="xs"
                    icon={copiedContent ? '✅' : '📋'}
                    className="flex-1"
                    style={{
                      background: 'var(--glass-secondary)',
                      color: 'var(--accent-soft)',
                      border: 'none'
                    }}
                  >
                    {copiedContent ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    onClick={handleCopyLink}
                    variant="ghost"
                    size="xs"
                    icon={copiedLink ? '✅' : '🔗'}
                    style={{
                      background: 'var(--glass-primary)',
                      color: 'var(--text-muted)',
                      border: 'none'
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Share'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Created: {new Date(artifact.createdAt).toLocaleString()}
      </div>
    </div>
  );
};