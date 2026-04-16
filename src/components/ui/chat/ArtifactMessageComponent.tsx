import React, { useState, useCallback, useMemo } from 'react';
import { ArtifactMessage } from '../../../types/chatTypes';
import { ContentRenderer, StatusRenderer, Button } from '../../shared';
import { FileCreationPanel } from './FileCreationPanel';

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

  // Derive downloadable files from artifact metadata (#201)
  const downloadableFiles = useMemo(() => {
    const files: Array<{ id: string; filename: string; type: string; size?: number; url: string }> = [];
    const meta = artifact.metadata;

    // Single file URL in metadata (from ArtifactCreatedEvent.artifact.url)
    if (meta?.url && typeof meta.url === 'string') {
      const url = meta.url as string;
      const filename = (meta.filename as string) || url.split('/').pop() || 'download';
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      files.push({
        id: artifact.id,
        filename,
        type: ext,
        size: typeof meta.fileSize === 'number' ? meta.fileSize : undefined,
        url,
      });
    }

    // Array of files in metadata (e.g. metadata.files)
    if (Array.isArray(meta?.files)) {
      for (const f of meta.files as Array<Record<string, unknown>>) {
        if (f && typeof f.url === 'string') {
          const fname = (f.filename as string) || (f.name as string) || (f.url as string).split('/').pop() || 'download';
          const ext = fname.split('.').pop()?.toLowerCase() || '';
          files.push({
            id: (f.id as string) || `${artifact.id}-${files.length}`,
            filename: fname,
            type: ext,
            size: typeof f.size === 'number' ? f.size : undefined,
            url: f.url as string,
          });
        }
      }
    }

    return files;
  }, [artifact.id, artifact.metadata]);

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
        
        {/* Code content - Syntax-highlighted code block */}
        {artifact.contentType === 'code' && artifact.content !== 'Loading...' && (
          <div>
            <div className="rounded-lg mb-2 max-h-96 overflow-y-auto" style={{
              background: 'var(--glass-primary)',
              border: '1px solid var(--glass-border)'
            }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-soft)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {artifact.metadata?.language || 'Code'}
                  </span>
                </div>
                <Button
                  onClick={onReopen}
                  variant="ghost"
                  size="xs"
                  style={{ background: 'transparent', color: 'var(--accent-soft)', border: 'none' }}
                  title="Run in sandbox"
                >
                  Run
                </Button>
              </div>
              <pre className="p-3 text-xs font-mono overflow-x-auto" style={{ color: 'var(--text-primary)' }}>
                <code>{typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content, null, 2)}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Fallback for unknown content types or empty content */}
        {artifact.content !== 'Loading...' &&
         !['image', 'data', 'text', 'code', 'analysis', 'knowledge', 'search_results'].includes(artifact.contentType) && (
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

      {/* Downloadable files panel (#201) */}
      {downloadableFiles.length > 0 && (
        <FileCreationPanel files={downloadableFiles} />
      )}

      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Created: {new Date(artifactMessage.timestamp).toLocaleString()}
      </div>
    </div>
  );
};