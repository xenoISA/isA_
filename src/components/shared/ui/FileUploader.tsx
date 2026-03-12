/**
 * ============================================================================
 * FileUploader Component - 流程自动化文件上传组件
 * ============================================================================
 * 
 * 支持多种文件格式的上传组件，适用于流程自动化场景
 * 
 * Features:
 * - 拖拽上传支持
 * - 多文件上传
 * - 文件类型限制
 * - 文件大小限制
 * - 上传进度显示
 * - 文件预览缩略图
 * - 错误处理
 */

import React, { useState, useCallback, useRef } from 'react';
import { createLogger } from '../../../utils/logger';
import { Button } from './Button';

const log = createLogger('FileUploader');

export interface FileUploadResult {
  file: File;
  preview?: string;
  content?: string; // For text files
  data?: any; // For parsed data
  status: 'uploading' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

export interface FileUploaderProps {
  // Basic config
  accept?: string; // File types, e.g., ".pdf,.jpg,.png,.csv"
  multiple?: boolean;
  maxSize?: number; // In bytes
  maxFiles?: number;
  
  // UI customization
  title?: string;
  description?: string;
  className?: string;
  
  // Processing config
  autoProcess?: boolean; // Auto process files after upload
  processingType?: 'ocr' | 'csv_parse' | 'image_analyze' | 'text_extract';
  
  // Callbacks
  onFilesChange?: (files: FileUploadResult[]) => void;
  onFileProcess?: (file: File, type: string) => Promise<any>;
  onError?: (error: string, file?: File) => void;
  
  // State
  files?: FileUploadResult[];
  isProcessing?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = "*/*",
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  title = "Upload Files",
  description = "Drag and drop files here, or click to select",
  className = "",
  autoProcess = false,
  processingType = 'text_extract',
  onFilesChange,
  onFileProcess,
  onError,
  files = [],
  isProcessing = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate file preview
  const generatePreview = useCallback(async (file: File): Promise<string | undefined> => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
    return undefined;
  }, []);

  // Process files after upload
  const processFile = useCallback(async (file: File): Promise<FileUploadResult> => {
    const preview = await generatePreview(file);
    
    let result: FileUploadResult = {
      file,
      preview,
      status: 'uploading',
      progress: 0
    };

    try {
      if (autoProcess && onFileProcess) {
        result.status = 'uploading';
        result.progress = 50;
        
        // Simulate processing progress
        const processedData = await onFileProcess(file, processingType);
        
        result = {
          ...result,
          data: processedData,
          status: 'completed',
          progress: 100
        };
      } else {
        result.status = 'completed';
        result.progress = 100;
      }
    } catch (error) {
      result = {
        ...result,
        status: 'error',
        error: error instanceof Error ? error.message : 'Processing failed'
      };
      onError?.(result.error!, file);
    }

    return result;
  }, [autoProcess, onFileProcess, processingType, generatePreview, onError]);

  // Handle files selection
  const handleFiles = useCallback(async (fileList: FileList) => {
    // File validation (moved inside useCallback to avoid stale closure)
    const validateFile = (file: File): string | null => {
      if (file.size > maxSize) {
        return `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`;
      }
      if (accept !== "*/*") {
        const allowedTypes = accept.split(',').map(type => type.trim());
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type;
        const isAllowed = allowedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExtension === type.toLowerCase();
          }
          return mimeType.includes(type.replace('*', ''));
        });
        if (!isAllowed) {
          return `File type not supported. Allowed: ${accept}`;
        }
      }
      return null;
    };

    const newFiles: FileUploadResult[] = [...files];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Check if we've reached max files limit
      if (newFiles.length >= maxFiles) {
        onError?.(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        onError?.(validationError, file);
        continue;
      }
      
      // Check for duplicates
      const isDuplicate = newFiles.some(f => 
        f.file.name === file.name && 
        f.file.size === file.size &&
        f.file.lastModified === file.lastModified
      );
      
      if (isDuplicate) {
        onError?.(`File "${file.name}" already uploaded`, file);
        continue;
      }
      
      // Process file
      try {
        const processedFile = await processFile(file);
        newFiles.push(processedFile);
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Failed to process file', file);
      }
    }
    
    onFilesChange?.(newFiles);
  }, [files, maxFiles, maxSize, accept, processFile, onFilesChange, onError]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  // Click to upload
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // File input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    onFilesChange?.(updatedFiles);
  }, [files, onFilesChange]);

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('csv') || type.includes('excel')) return '📊';
    if (type.includes('text')) return '📝';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📄';
  };

  // Get status color
  const getStatusColor = (status: FileUploadResult['status']) => {
    switch (status) {
      case 'uploading': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 hover:bg-gray-800/40
          ${isDragOver 
            ? 'border-blue-400 bg-blue-500/10 scale-[1.02]' 
            : 'border-gray-600/50 bg-gray-800/20'
          }
        `}
      >
        <div className="space-y-3">
          <div className="text-4xl mb-2">
            {isDragOver ? '📤' : '📁'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
          
          {/* File constraints info */}
          <div className="text-xs text-gray-500 space-y-1">
            {accept !== "*/*" && (
              <div>Supported: {accept.replace(/\./g, '').toUpperCase()}</div>
            )}
            <div>Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB per file</div>
            <div>Max files: {maxFiles}</div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>📋</span>
            Uploaded Files ({files.length}/{maxFiles})
          </h4>
          
          <div className="space-y-2">
            {files.map((fileResult, index) => (
              <div
                key={`${fileResult.file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {fileResult.preview ? (
                    <img 
                      src={fileResult.preview} 
                      alt={fileResult.file.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-700/50 rounded-lg text-lg">
                      {getFileIcon(fileResult.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white text-sm truncate">
                      {fileResult.file.name}
                    </p>
                    <span className={`text-xs ${getStatusColor(fileResult.status)}`}>
                      {fileResult.status === 'uploading' && '⏳'}
                      {fileResult.status === 'completed' && '✅'}
                      {fileResult.status === 'error' && '❌'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{(fileResult.file.size / 1024).toFixed(1)} KB</span>
                    <span>{fileResult.file.type || 'Unknown type'}</span>
                    
                    {fileResult.status === 'uploading' && fileResult.progress !== undefined && (
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${fileResult.progress}%` }}
                          />
                        </div>
                        <span>{fileResult.progress}%</span>
                      </div>
                    )}
                    
                    {fileResult.error && (
                      <span className="text-red-400 text-xs">{fileResult.error}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {autoProcess && fileResult.status === 'completed' && fileResult.data && (
                    <Button
                      variant="ghost"
                      size="xs"
                      icon="👁️"
                      onClick={() => log.debug('Preview data:', fileResult.data)}
                      tooltipText="Preview processed data"
                    />
                  )}
                  
                  <Button
                    variant="ghost" 
                    size="xs"
                    icon="🗑️"
                    onClick={() => removeFile(index)}
                    tooltipText="Remove file"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-blue-300 font-medium text-sm">Processing files...</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;