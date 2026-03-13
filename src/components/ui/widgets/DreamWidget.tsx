/**
 * ============================================================================
 * Dream Widget UI (DreamWidget.tsx) - Refactored to use BaseWidget
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Atomic Image Intelligence Service interface using standardized BaseWidget layout
 * - 9 image processing modes with smart mode detection
 * - File upload and image editing functionality
 * - Pure UI component with business logic handled by module
 * 
 * Benefits of BaseWidget integration:
 * - Standardized three-area layout (Output, Input, Management)
 * - Built-in image output history management
 * - Consistent edit and management actions for images
 * - Streaming status display support for generation progress
 * - Image-specific actions (download, share, transform)
 */
import React, { useState } from 'react';
import { createLogger } from '../../../utils/logger';
import { DreamWidgetParams } from '../../../types/widgetTypes';
import { BaseWidget, OutputHistoryItem, EditAction, ManagementAction, EmptyStateConfig } from './BaseWidget';
import { useTranslation } from '../../../hooks/useTranslation';
const log = createLogger('DreamWidget');

// Atomic Image Intelligence Service modes (copied from dream_sidebar.tsx)
interface ImageMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: string;
  estimatedTime: string;
  useCase: string;
  keywords: string[];
  requiresImage: boolean;
}

// Create a factory function that uses translation
const createImageModes = (t: any): ImageMode[] => [
  {
    id: 'text_to_image',
    name: t('dreamWidget.modes.textToImage.name'),
    description: t('dreamWidget.modes.textToImage.description'),
    icon: '✨',
    cost: '$3/1000 images',
    estimatedTime: '10-15 seconds',
    useCase: t('dreamWidget.modes.textToImage.useCase'),
    keywords: ['create', 'generate', 'new', 'imagine', 'design', 'art'],
    requiresImage: false
  },
  {
    id: 'image_to_image',
    name: t('dreamWidget.modes.imageToImage.name'),
    description: t('dreamWidget.modes.imageToImage.description'),
    icon: '🔄',
    cost: '$0.04/image',
    estimatedTime: '15-20 seconds',
    useCase: t('dreamWidget.modes.imageToImage.useCase'),
    keywords: ['modify', 'change', 'edit', 'transform', 'improve'],
    requiresImage: true
  },
  {
    id: 'style_transfer',
    name: t('dreamWidget.modes.styleTransfer.name'),
    description: t('dreamWidget.modes.styleTransfer.description'),
    icon: '🎨',
    cost: '$0.04/image',
    estimatedTime: '15-20 seconds',
    useCase: t('dreamWidget.modes.styleTransfer.useCase'),
    keywords: ['style', 'artistic', 'painting', 'effect', 'filter'],
    requiresImage: true
  },
  {
    id: 'sticker_generation',
    name: t('dreamWidget.modes.stickerGeneration.name'),
    description: t('dreamWidget.modes.stickerGeneration.description'),
    icon: '🏷️',
    cost: '$0.0024/image',
    estimatedTime: '10 seconds',
    useCase: t('dreamWidget.modes.stickerGeneration.useCase'),
    keywords: ['sticker', 'emoji', 'cute', 'cartoon', 'fun'],
    requiresImage: false
  },
  {
    id: 'face_swap',
    name: t('dreamWidget.modes.faceSwap.name'),
    description: t('dreamWidget.modes.faceSwap.description'),
    icon: '👥',
    cost: '$0.04/image',
    estimatedTime: '20-25 seconds',
    useCase: t('dreamWidget.modes.faceSwap.useCase'),
    keywords: ['face', 'swap', 'replace', 'person', 'character'],
    requiresImage: true
  },
  {
    id: 'professional_headshot',
    name: t('dreamWidget.modes.professionalHeadshot.name'),
    description: t('dreamWidget.modes.professionalHeadshot.description'),
    icon: '👔',
    cost: '$0.04/image',
    estimatedTime: '20-25 seconds',
    useCase: t('dreamWidget.modes.professionalHeadshot.useCase'),
    keywords: ['professional', 'headshot', 'business', 'linkedin', 'formal'],
    requiresImage: true
  },
  {
    id: 'photo_inpainting',
    name: t('dreamWidget.modes.photoInpainting.name'),
    description: t('dreamWidget.modes.photoInpainting.description'),
    icon: '🔧',
    cost: '$0.04/image',
    estimatedTime: '15-20 seconds',
    useCase: t('dreamWidget.modes.photoInpainting.useCase'),
    keywords: ['remove', 'erase', 'clean', 'fix', 'repair', 'fill'],
    requiresImage: true
  },
  {
    id: 'photo_outpainting',
    name: t('dreamWidget.modes.photoOutpainting.name'),
    description: t('dreamWidget.modes.photoOutpainting.description'),
    icon: '📐',
    cost: '$0.04/image',
    estimatedTime: '20-25 seconds',
    useCase: t('dreamWidget.modes.photoOutpainting.useCase'),
    keywords: ['extend', 'expand', 'widen', 'enlarge', 'border'],
    requiresImage: true
  },
  {
    id: 'emoji_generation',
    name: t('dreamWidget.modes.emojiGeneration.name'),
    description: t('dreamWidget.modes.emojiGeneration.description'),
    icon: '😊',
    cost: '$0.0024/image',
    estimatedTime: '8-10 seconds',
    useCase: t('dreamWidget.modes.emojiGeneration.useCase'),
    keywords: ['emoji', 'reaction', 'expression', 'custom', 'face'],
    requiresImage: false
  }
];

// Smart mode detection based on user input (exact copy from dream_sidebar.tsx)
const detectBestMode = (input: string, hasImage: boolean, modes: ImageMode[]): ImageMode => {
  const lowerInput = input.toLowerCase();
  
  // Find modes that match keywords and image requirements
  const possibleModes = modes.filter(mode => {
    const keywordMatch = mode.keywords.some(keyword => lowerInput.includes(keyword));
    const imageRequirementMet = !mode.requiresImage || hasImage;
    return keywordMatch && imageRequirementMet;
  });
  
  // Return best match or default to text-to-image
  return possibleModes[0] || modes[0];
};

interface DreamWidgetProps {
  isGenerating: boolean;
  generatedImage: string | null;
  lastParams: DreamWidgetParams | null;
  triggeredInput?: string;
  outputHistory?: OutputHistoryItem[];
  currentOutput?: OutputHistoryItem | null;
  isStreaming?: boolean;
  streamingContent?: string;
  onGenerateImage: (params: DreamWidgetParams) => Promise<void>;
  onClearImage: () => void;
  onSelectOutput?: (item: OutputHistoryItem) => void;
  onClearHistory?: () => void;
  onBack?: () => void;
}


/**
 * Dream Widget Input Area - Content that goes inside BaseWidget
 */
const DreamInputArea: React.FC<DreamWidgetProps> = ({
  isGenerating,
  generatedImage,
  lastParams,
  triggeredInput,
  onGenerateImage,
  onClearImage
}) => {
  const { t } = useTranslation();
  
  // Get localized image modes
  const imageModes = createImageModes(t);
  
  // Modern state management with enhanced parameters
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<ImageMode>(imageModes[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [stylePreset, setStylePreset] = useState('photorealistic');
  const [quality, setQuality] = useState('high');
  const [strength, setStrength] = useState('medium');
  const [hairSource, setHairSource] = useState('preserve');
  const [industry, setIndustry] = useState('corporate');
  const [expression, setExpression] = useState('happy');
  const [colorScheme, setColorScheme] = useState('vibrant');
  const [theme, setTheme] = useState('cute_animal');
  const [fillMethod, setFillMethod] = useState('content_aware');
  const [direction, setDirection] = useState('all_sides');

  // Real-time mode recommendations (exact copy from dream_sidebar.tsx)
  React.useEffect(() => {
    if (prompt.trim()) {
      const bestMode = detectBestMode(prompt, !!uploadedImage, imageModes);
      if (bestMode.id !== selectedMode.id) {
        setSelectedMode(bestMode);
        log.debug('Mode recommendation updated', bestMode.id);
      }
    }
  }, [prompt, uploadedImage, selectedMode.id, imageModes]);

  // Handle image processing (adapted from dream_sidebar.tsx)
  const handleImageProcessing = async () => {
    if (!prompt.trim() || !onGenerateImage || isGenerating) return;
    
    // Check if mode requires image but none is uploaded
    if (selectedMode.requiresImage && !uploadedImage) {
      alert(`${selectedMode.name} ${t('dreamWidget.ui.noImageSelected')}`);
      return;
    }

    log.info('Starting image processing with mode', selectedMode.name);
    
    try {
      const params: DreamWidgetParams = {
        prompt: prompt,
        style: selectedMode.id,
        size: '1024x1024',
        // MCP-specific parameters - 包含所有需要的参数
        stylePreset,
        quality,
        strength,
        hairSource,
        industry,
        expression,
        colorScheme,
        theme,
        fillMethod,
        direction
      };
      
      await onGenerateImage(params);
      
      log.info('Image processing request sent with mode', selectedMode.name);
    } catch (error) {
      log.error('Image processing failed', error);
    }
  };

  // Handle file upload with smart mode detection (exact copy from dream_sidebar.tsx)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      log.info('Image file uploaded', file.name);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        
        // Update mode recommendation based on having an image
        if (prompt.trim()) {
          const bestMode = detectBestMode(prompt, true, imageModes);
          setSelectedMode(bestMode);
          log.debug('Mode updated after image upload', bestMode.id);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4 p-3">
      {/* Compact Mode Header */}
      <div className="flex items-center gap-3 p-2 rounded" style={{
        background: 'var(--glass-primary)',
        border: '1px solid var(--glass-border)'
      }}>
        <span className="text-lg">{selectedMode.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{selectedMode.name}</div>
          <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{selectedMode.cost}</span>
            <span>{selectedMode.estimatedTime}</span>
          </div>
        </div>
      </div>

      {/* Compact Input Area */}
      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue !== prompt) {
              log.debug('Prompt text changed');
            }
            setPrompt(newValue);
          }}
          placeholder={selectedMode.requiresImage 
            ? t('dreamWidget.ui.placeholderImage')
            : t('dreamWidget.ui.placeholderText')}
          className="w-full p-2 bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-blue-500 resize-none text-sm"
          rows={2}
        />

        {/* Compact Upload - Only show when image is uploaded */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          id="image-upload"
        />
        {uploadedImage && (
          <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded">
            <img src={uploadedImage} alt="Uploaded" className="w-6 h-6 object-cover rounded" />
            <span className="text-xs text-white/60">{t('dreamWidget.ui.uploadImage')}</span>
            <button 
              onClick={() => setUploadedImage(null)}
              className="ml-auto text-xs text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Compact Mode Selector */}
      <div>
        <div className="text-xs text-white/60 mb-2">🎯 Select Mode</div>
        <div className="grid grid-cols-3 gap-1">
          {imageModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                if (mode.requiresImage && !uploadedImage) {
                  // Trigger file upload for modes that need images
                  document.getElementById('image-upload')?.click();
                }
                setSelectedMode(mode);
                log.debug('Mode selected', mode.name);
              }}
              className={`p-1.5 rounded border transition-all text-center cursor-pointer ${
                selectedMode.id === mode.id
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
              }`}
              title={`${mode.name} - ${mode.description}`}
            >
              <div className="text-xs mb-0.5">{mode.icon}</div>
              <div className="text-xs font-medium truncate leading-tight">{mode.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options based on MCP prompts */}
      {selectedMode && (
        <div className="space-y-2">
          <div className="text-xs text-white/60">⚙️ Options</div>
          
          {/* text_to_image_prompt: style_preset, quality */}
          {selectedMode.id === 'text_to_image' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Style</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={stylePreset} onChange={(e) => setStylePreset(e.target.value)}>
                  <option value="photorealistic">Photorealistic</option>
                  <option value="artistic">Artistic</option>
                  <option value="cinematic">Cinematic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Quality</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>
            </>
          )}

          {/* image_to_image_prompt: style_preset, strength */}
          {selectedMode.id === 'image_to_image' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Style</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={stylePreset} onChange={(e) => setStylePreset(e.target.value)}>
                  <option value="enhanced">Enhanced</option>
                  <option value="artistic">Artistic</option>
                  <option value="dramatic">Dramatic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Strength</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={strength} onChange={(e) => setStrength(e.target.value)}>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </>
          )}

          {/* style_transfer_prompt: style_preset, strength */}
          {selectedMode.id === 'style_transfer' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Art Style</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={stylePreset} onChange={(e) => setStylePreset(e.target.value)}>
                  <option value="impressionist">Impressionist</option>
                  <option value="renaissance">Renaissance</option>
                  <option value="abstract">Abstract</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Intensity</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={strength} onChange={(e) => setStrength(e.target.value)}>
                  <option value="subtle">Subtle</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </>
          )}

          {/* face_swap_prompt: hair_source, quality */}
          {selectedMode.id === 'face_swap' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Hair</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={hairSource} onChange={(e) => setHairSource(e.target.value)}>
                  <option value="preserve">Preserve</option>
                  <option value="adapt">Adapt</option>
                  <option value="blend">Blend</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Quality</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </>
          )}

          {/* professional_headshot_prompt: industry, quality */}
          {selectedMode.id === 'professional_headshot' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Industry</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="corporate">Corporate</option>
                  <option value="creative">Creative</option>
                  <option value="tech">Tech</option>
                  <option value="healthcare">Healthcare</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Level</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
            </>
          )}

          {/* emoji_generation_prompt: expression, style_preset, color_scheme */}
          {selectedMode.id === 'emoji_generation' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Expression</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={expression} onChange={(e) => setExpression(e.target.value)}>
                  <option value="happy">Happy</option>
                  <option value="sad">Sad</option>
                  <option value="excited">Excited</option>
                  <option value="surprised">Surprised</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Style</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={stylePreset} onChange={(e) => setStylePreset(e.target.value)}>
                  <option value="kawaii">Kawaii</option>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Colors</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={colorScheme} onChange={(e) => setColorScheme(e.target.value)}>
                  <option value="vibrant">Vibrant</option>
                  <option value="pastel">Pastel</option>
                  <option value="monochrome">Monochrome</option>
                  <option value="rainbow">Rainbow</option>
                </select>
              </div>
            </>
          )}

          {/* photo_inpainting_prompt: fill_method, strength */}
          {selectedMode.id === 'photo_inpainting' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Method</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={fillMethod} onChange={(e) => setFillMethod(e.target.value)}>
                  <option value="content_aware">Content Aware</option>
                  <option value="texture_synthesis">Texture Synthesis</option>
                  <option value="smart_fill">Smart Fill</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Quality</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={strength} onChange={(e) => setStrength(e.target.value)}>
                  <option value="seamless">Seamless</option>
                  <option value="natural">Natural</option>
                  <option value="enhanced">Enhanced</option>
                </select>
              </div>
            </>
          )}

          {/* photo_outpainting_prompt: direction, strength */}
          {selectedMode.id === 'photo_outpainting' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Direction</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="all_sides">All Sides</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                  <option value="specific">Specific</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Quality</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={strength} onChange={(e) => setStrength(e.target.value)}>
                  <option value="natural">Natural</option>
                  <option value="enhanced">Enhanced</option>
                  <option value="dramatic">Dramatic</option>
                </select>
              </div>
            </>
          )}

          {/* sticker_generation_prompt: style_preset, theme */}
          {selectedMode.id === 'sticker_generation' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">Style</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={stylePreset} onChange={(e) => setStylePreset(e.target.value)}>
                  <option value="kawaii">Kawaii</option>
                  <option value="chibi">Chibi</option>
                  <option value="modern">Modern</option>
                  <option value="vintage">Vintage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Theme</label>
                <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="cute_animal">Cute Animal</option>
                  <option value="food">Food</option>
                  <option value="nature">Nature</option>
                  <option value="emoji">Emoji</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Enhanced Process Button */}
      <button
        onClick={handleImageProcessing}
        disabled={isGenerating || !prompt.trim() || (selectedMode.requiresImage && !uploadedImage)}
        className={`w-full p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded text-white font-medium transition-all hover:from-green-600 hover:to-blue-600 flex items-center justify-center gap-2 text-sm ${
          isGenerating ? 'animate-pulse' : ''
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isGenerating ? (
          <>
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {t('common.loading')}
          </>
        ) : (
          <>
            <span>{selectedMode.icon}</span>
            {t('dreamWidget.ui.generateButton')} {selectedMode.name}
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Dream Widget with BaseWidget - New standardized layout
 */
export const DreamWidget: React.FC<DreamWidgetProps> = ({
  isGenerating,
  generatedImage,
  lastParams,
  triggeredInput,
  outputHistory = [],
  currentOutput = null,
  isStreaming = false,
  streamingContent = '',
  onGenerateImage,
  onClearImage,
  onSelectOutput,
  onClearHistory,
  onBack
}) => {
  const { t } = useTranslation();
  
  // Get localized image modes
  const imageModes = createImageModes(t);
  
  // Simplified edit actions for generated images - only essential ones
  const editActions: EditAction[] = [
    {
      id: 'download',
      label: t('dreamWidget.ui.downloadImage'),
      icon: '💾',
      onClick: (content) => {
        if (typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'))) {
          const link = document.createElement('a');
          link.href = content;
          link.download = `dream-${Date.now()}.jpg`;
          link.click();
        }
      }
    },
    {
      id: 'open',
      label: 'View',
      icon: '🔍',
      onClick: (content) => {
        if (typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'))) {
          window.open(content, '_blank');
        }
      }
    }
  ];

  // Media type management actions
  const managementActions: ManagementAction[] = [
    {
      id: 'image',
      label: 'Image',
      icon: '🖼️',
      onClick: () => {
        log.info('Image mode selected (already active)');
      },
      variant: 'primary' as const,
      disabled: false // Current active mode
    },
    {
      id: 'video',
      label: 'Video',
      icon: '🎬',
      onClick: () => {
        log.info('Video mode - not implemented yet');
      },
      disabled: true // Not yet implemented
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: '🎵',
      onClick: () => {
        log.info('Audio mode - not implemented yet');
      },
      disabled: true // Not yet implemented
    },
    {
      id: 'others',
      label: 'Others',
      icon: '📄',
      onClick: () => {
        log.info('Others mode - not implemented yet');
      },
      disabled: true // Not yet implemented
    }
  ];

  // Custom empty state for Dream Widget
  const dreamEmptyState: EmptyStateConfig = {
    icon: '🎨',
    title: 'Ready to Create Art',
    description: 'Transform your ideas into stunning images with AI. Choose from 9 different creation modes including text-to-image, style transfer, and more.',
    actionText: 'Upload Image',
    onAction: () => {
      document.getElementById('image-upload')?.click();
    }
  };

  return (
    <BaseWidget
      title="DreamForge AI"
      icon="🎨"
      isProcessing={isGenerating}
      outputHistory={outputHistory}
      currentOutput={currentOutput}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      editActions={editActions}
      managementActions={managementActions}
      onSelectOutput={onSelectOutput}
      onClearHistory={onClearHistory}
      onBack={onBack}
      showBackButton={true}
      emptyStateConfig={dreamEmptyState}
    >
      <DreamInputArea
        isGenerating={isGenerating}
        generatedImage={generatedImage}
        lastParams={lastParams}
        triggeredInput={triggeredInput}
        onGenerateImage={onGenerateImage}
        onClearImage={onClearImage}
      />
    </BaseWidget>
  );
};