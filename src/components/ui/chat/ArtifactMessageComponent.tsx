import React, { useState, useCallback } from 'react';
import { ArtifactMessage } from '../../../types/chatTypes';
import { ContentRenderer, StatusRenderer, Button } from '../../shared';

/**
 * Pure UI component for displaying new Artifact Messages
 * Designed to work with the new ArtifactMessage type from chat system
 */
export interface ArtifactMessageComponentProps {
  artifactMessage: ArtifactMessage;
  onReopen: () => void;
}

export const ArtifactMessageComponent: React.FC<ArtifactMessageComponentProps> = ({ 
  artifactMessage, 
  onReopen 
}) => {
  const { artifact } = artifactMessage;
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyContent = useCallback(async () => {
    if (!artifact.content) return;
    const text = typeof artifact.content === 'string'
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2);
    await navigator.clipboard.writeText(text);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  }, [artifact.content]);

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
          <span className="text-lg">
            {artifact.widgetType === 'dream' ? '🎨' : 
             artifact.widgetType === 'hunt' ? '🔍' :
             artifact.widgetType === 'omni' ? '⚡' :
             artifact.widgetType === 'data_scientist' ? '📊' :
             artifact.widgetType === 'knowledge' ? '🧠' : '📄'}
          </span>
          <div>
            <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              {artifact.widgetName || artifact.widgetType}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              v{artifact.version} • {artifact.contentType}
            </p>
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
        {/* Loading state */}
        {artifact.content === 'Loading...' && (
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
        {artifact.contentType === 'image' && artifact.content !== 'Loading...' && (
          <div>
            <ContentRenderer
              content={artifact.content}
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
        
        {/* Search Results content - Parse JSON and display */}
        {(artifact.contentType === 'data' || artifact.contentType === 'analysis' || artifact.contentType === 'search_results') && artifact.content !== 'Loading...' && (
          <div>
            <ContentRenderer
              content={artifact.content}
              type="search_results"
              variant="widget"
              size="xs"
              features={{
                markdown: true,
                truncate: 300
              }}
            />
          </div>
        )}
        
        {/* Text content - Markdown Rendered */}
        {artifact.contentType === 'text' && artifact.content !== 'Loading...' && (
          <div>
            <div className="rounded-lg p-3 mb-2 max-h-96 overflow-y-auto" style={{
              background: 'var(--glass-primary)',
              border: '1px solid var(--glass-border)'
            }}>
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Content:</div>
              <ContentRenderer
                content={artifact.content}
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
        
        {/* Analysis/Knowledge content */}
        {(artifact.contentType === 'analysis' || artifact.contentType === 'knowledge') && artifact.content !== 'Loading...' && (
          <div>
            <div className="rounded-lg p-3 mb-2 max-h-96 overflow-y-auto" style={{
              background: 'var(--glass-primary)',
              border: '1px solid var(--glass-border)'
            }}>
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                {artifact.contentType === 'analysis' ? 'Analysis:' : 'Knowledge:'}
              </div>
              <ContentRenderer
                content={artifact.content}
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
          </div>
        )}
        
        {/* Fallback for unknown content types or empty content */}
        {artifact.content !== 'Loading...' && 
         !['image', 'data', 'text', 'analysis', 'knowledge', 'search_results'].includes(artifact.contentType) && (
          <div className="text-center py-4">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Unknown content type: {artifact.contentType}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Content: {JSON.stringify(artifact.content)}
            </div>
          </div>
        )}
        
        {/* Empty content fallback */}
        {!artifact.content && (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No content available
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Created: {new Date(artifactMessage.timestamp).toLocaleString()}
      </div>
    </div>
  );
};