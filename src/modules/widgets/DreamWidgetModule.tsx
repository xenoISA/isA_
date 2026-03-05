/**
 * ============================================================================
 * Dream Widget Module (DreamWidgetModule.tsx) - Refactored with BaseWidgetModule
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Uses BaseWidgetModule for standardized widget management
 * - Provides Dream-specific configuration and customizations
 * - Manages AI image generation business logic with enhanced UI features
 * - Integrates seamlessly with BaseWidget UI components
 * 
 * Benefits of BaseWidgetModule integration:
 * - Automatic output history management for generated images
 * - Built-in edit and management actions
 * - Streaming status display
 * - Standard error handling and logging
 * - Consistent UI patterns across all widgets
 */
import React, { ReactNode } from 'react';
import { BaseWidgetModule, createWidgetConfig } from './BaseWidgetModule';
import { DreamWidgetParams, DreamWidgetResult } from '../../types/widgetTypes';
import { EditAction, ManagementAction } from '../../components/ui/widgets/BaseWidget';
import { useDreamGeneratedImage, useDreamIsGenerating, useDreamLastParams } from '../../stores/useWidgetStores';

// Dream mode to MCP template mapping (based on the 9 MCP prompts)
const DREAM_TEMPLATE_MAPPING = {
  'text_to_image': {
    template_id: 'text_to_image_prompt',
    defaultArgs: { style_preset: 'photorealistic', quality: 'high' }
  },
  'image_to_image': {
    template_id: 'image_to_image_prompt', 
    defaultArgs: { style_preset: 'enhanced', strength: 'medium' }
  },
  'style_transfer': {
    template_id: 'style_transfer_prompt',
    defaultArgs: { style_preset: 'impressionist', strength: 'medium' }
  },
  'face_swap': {
    template_id: 'face_swap_prompt',
    defaultArgs: { hair_source: 'preserve', quality: 'professional' }
  },
  'professional_headshot': {
    template_id: 'professional_headshot_prompt',
    defaultArgs: { industry: 'corporate', quality: 'executive' }
  },
  'emoji_generation': {
    template_id: 'emoji_generation_prompt',
    defaultArgs: { expression: 'happy', style_preset: 'kawaii', color_scheme: 'vibrant' }
  },
  'photo_inpainting': {
    template_id: 'photo_inpainting_prompt',
    defaultArgs: { fill_method: 'content_aware', strength: 'seamless' }
  },
  'photo_outpainting': {
    template_id: 'photo_outpainting_prompt', 
    defaultArgs: { direction: 'all_sides', strength: 'natural' }
  },
  'sticker_generation': {
    template_id: 'sticker_generation_prompt',
    defaultArgs: { style_preset: 'kawaii', theme: 'cute_animal' }
  }
};

// Prepare template parameters based on dream mode and user params
const prepareDreamTemplateParams = (params: DreamWidgetParams) => {
  const mode = params.style || 'text_to_image'; // Use 'style' field as mode
  const mapping = DREAM_TEMPLATE_MAPPING[mode as keyof typeof DREAM_TEMPLATE_MAPPING] || DREAM_TEMPLATE_MAPPING['text_to_image'];
  
  // Build prompt_args based on MCP prompt requirements
  let prompt_args: Record<string, any> = {};
  
  // Apply mode-specific parameter mapping based on actual MCP prompt requirements
  switch (mode) {
    case 'text_to_image':
      prompt_args = {
        prompt: params.prompt, // Don't use fallback
        style_preset: params.stylePreset || 'photorealistic',
        quality: params.quality || 'high'
      };
      break;
      
    case 'image_to_image':
      prompt_args = {
        prompt: params.prompt || 'Transform this image',
        style_preset: params.stylePreset || 'enhanced',
        strength: params.strength || 'medium'
      };
      break;
      
    case 'style_transfer':
      prompt_args = {
        prompt: params.prompt || 'Apply artistic style',
        style_preset: params.stylePreset || 'impressionist',
        strength: params.strength || 'medium'
      };
      break;
      
    case 'face_swap':
      // ⚠️ face_swap_prompt 不需要 prompt 参数！
      prompt_args = {
        hair_source: params.hairSource || 'preserve',
        quality: params.quality || 'professional'
      };
      break;
      
    case 'professional_headshot':
      prompt_args = {
        prompt: params.prompt || 'Create professional headshot',
        industry: params.industry || 'corporate',
        quality: params.quality || 'executive'
      };
      break;
      
    case 'emoji_generation':
      prompt_args = {
        prompt: params.prompt || 'Create custom emoji',
        expression: params.expression || 'happy',
        style_preset: params.stylePreset || 'kawaii',
        color_scheme: params.colorScheme || 'vibrant'
      };
      break;
      
    case 'photo_inpainting':
      prompt_args = {
        prompt: params.prompt || 'Remove unwanted objects',
        fill_method: params.fillMethod || 'content_aware',
        strength: params.strength || 'seamless'
      };
      break;
      
    case 'photo_outpainting':
      prompt_args = {
        prompt: params.prompt || 'Expand image boundaries',
        direction: params.direction || 'all_sides',
        strength: params.strength || 'natural'
      };
      break;
      
    case 'sticker_generation':
      prompt_args = {
        prompt: params.prompt || 'Create cute sticker',
        style_preset: params.stylePreset || 'kawaii',
        theme: params.theme || 'cute_animal'
      };
      break;
      
    default:
      // Fallback to text_to_image
      prompt_args = {
        prompt: params.prompt || 'Generate an image',
        style_preset: params.stylePreset || 'photorealistic',
        quality: params.quality || 'high'
      };
  }
  
  console.log('🎨 DREAM_MODULE: Prepared template params for mode', mode, ':', {
    template_id: mapping.template_id,
    prompt_args
  });
  
  return {
    template_id: mapping.template_id,
    prompt_args
  };
};

// Dream-specific edit actions
const dreamEditActions: EditAction[] = [
  {
    id: 'download_image',
    label: 'Download',
    icon: '💾',
    onClick: (content) => {
      // Download generated image
      if (typeof content === 'string' && content.startsWith('http')) {
        const link = document.createElement('a');
        link.href = content;
        link.download = `dream_image_${Date.now()}.png`;
        link.target = '_blank';
        link.click();
      } else if (content?.imageUrl) {
        const link = document.createElement('a');
        link.href = content.imageUrl;
        link.download = `dream_image_${Date.now()}.png`;
        link.target = '_blank';
        link.click();
      }
      console.log('🎨 DREAM: Image download initiated');
    }
  },
  {
    id: 'view_full',
    label: 'View',
    icon: '🔍',
    onClick: (content) => {
      // Open image in new tab for full view
      const imageUrl = typeof content === 'string' ? content : content?.imageUrl;
      if (imageUrl) {
        window.open(imageUrl, '_blank');
        console.log('🎨 DREAM: Image opened in new tab');
      }
    }
  },
  {
    id: 'copy_url',
    label: 'Copy URL',
    icon: '🔗',
    onClick: (content) => {
      // Copy image URL to clipboard
      const imageUrl = typeof content === 'string' ? content : content?.imageUrl;
      if (imageUrl) {
        navigator.clipboard.writeText(imageUrl);
        console.log('🎨 DREAM: Image URL copied to clipboard');
      }
    }
  }
];

// Dream-specific management actions
const dreamManagementActions: ManagementAction[] = [
  {
    id: 'create_variation',
    label: 'Create',
    icon: '🎨',
    onClick: () => {
      console.log('🎨 DREAM: Creating new image variation');
      // Could trigger a variation of the last generated image
    }
  },
  {
    id: 'transform_style',
    label: 'Transform',
    icon: '✨',
    onClick: () => {
      console.log('🎨 DREAM: Transforming image style');
      // Could apply style transformations
    }
  },
  {
    id: 'enhance_quality',
    label: 'Enhance',
    icon: '⚡',
    onClick: () => {
      console.log('🎨 DREAM: Enhancing image quality');
      // Could trigger image enhancement
    }
  }
];

// Create Dream widget configuration
const dreamConfig = createWidgetConfig<DreamWidgetParams, DreamWidgetResult>({
  type: 'dream',
  title: 'AI Image Generator',
  icon: '🎨',
  sessionIdPrefix: 'dream_widget',
  maxHistoryItems: 30, // Keep more images for inspiration
  
  // Result extraction configuration
  resultExtractor: {
    outputType: 'image',
    extractResult: (widgetData: any) => {
      if (widgetData?.generatedImage) {
        return {
          finalResult: { 
            imageUrl: widgetData.generatedImage, 
            prompt: widgetData.params?.prompt 
          },
          outputContent: widgetData.generatedImage,
          title: 'AI Image Generated'
        };
      }
      return null;
    }
  },
  
  // Extract parameters from triggered input
  extractParamsFromInput: (input: string): DreamWidgetParams | null => {
    const trimmedInput = input?.trim();
    if (!trimmedInput) {
      return null; // Don't process empty input
    }
    return {
      prompt: trimmedInput,
      mode: 'smart', // Default to smart mode
      style: 'photographic' // Default style
    };
  },
  
  // Lifecycle callbacks
  onProcessStart: (params: DreamWidgetParams) => {
    console.log('🎨 DREAM_MODULE: Starting image generation:', params.prompt);
  },
  
  onProcessComplete: (result: DreamWidgetResult) => {
    console.log('🎨 DREAM_MODULE: Image generation completed:', {
      hasImageUrl: !!result.data?.imageUrl,
      prompt: result.data?.prompt?.substring(0, 50)
    });
  },
  
  onProcessError: (error: Error) => {
    console.error('🎨 DREAM_MODULE: Image generation failed:', error.message);
  },
  
  // Custom actions
  editActions: dreamEditActions,
  managementActions: dreamManagementActions
});

// Module props interface
interface DreamWidgetModuleProps {
  triggeredInput?: string;
  children: (moduleProps: {
    isGenerating: boolean;
    generatedImage: string | null;
    lastParams: DreamWidgetParams | null;
    onGenerateImage: (params: DreamWidgetParams) => Promise<void>;
    onClearImage: () => void;
    // Add BaseWidget props for UI display
    outputHistory: any[];
    currentOutput: any | null;
    isStreaming: boolean;
    streamingContent: string;
    onSelectOutput: (item: any) => void;
    onClearHistory: () => void;
  }) => ReactNode;
}

/**
 * Dream Widget Module - Now powered by BaseWidgetModule
 * 
 * This module now:
 * - Uses BaseWidgetModule for standardized widget management
 * - Provides Dream-specific configuration and customizations
 * - Automatically handles output history, streaming, and UI actions
 * - Maintains all original functionality while adding new features
 */
export const DreamWidgetModule: React.FC<DreamWidgetModuleProps> = ({
  triggeredInput,
  children
}) => {
  // Read state from store directly (like HuntWidgetModule)
  const generatedImage = useDreamGeneratedImage();
  const lastParams = useDreamLastParams();
  
  console.log('🎨 DREAM_MODULE: Initializing with BaseWidgetModule architecture', {
    hasTriggeredInput: !!triggeredInput,
    hasGeneratedImage: !!generatedImage,
    generatedImageUrl: generatedImage?.substring(0, 80)
  });

  // Convert generatedImage to outputHistory format for BaseWidget display (like HuntWidgetModule)
  const outputHistory = React.useMemo(() => {
    if (!generatedImage) {
      return [];
    }
    
    return [{
      id: `dream_result_${Date.now()}`,
      timestamp: new Date(),
      type: 'image' as const,
      title: 'Generated Image',
      content: generatedImage,
      metadata: {
        prompt: lastParams?.prompt,
        style: lastParams?.style,
        originalType: 'image_generation'
      }
    }];
  }, [generatedImage, lastParams]);
  
  console.log('🎨 DREAM_MODULE: Converting image to output history:', {
    hasGeneratedImage: !!generatedImage,
    outputHistoryCount: outputHistory.length,
    generatedImageUrl: generatedImage?.substring(0, 80)
  });

  return (
    <BaseWidgetModule 
      config={dreamConfig}
      triggeredInput={triggeredInput}
    >
      {(moduleProps) => {
        // Transform BaseWidgetModule props to match original DreamWidgetModule interface
        console.log('🎨 DREAM_MODULE: Module props:', {
          isProcessing: moduleProps.isProcessing,
          currentOutput: moduleProps.currentOutput,
          hasOutputContent: !!moduleProps.currentOutput?.content,
          storeGeneratedImage: generatedImage?.substring(0, 80)
        });
        
        const legacyProps = {
          isGenerating: moduleProps.isProcessing, // Use BaseWidgetModule's processing state
          generatedImage: generatedImage, // Use store state directly
          lastParams: lastParams, // Use store state directly
          onGenerateImage: async (params: DreamWidgetParams) => {
            // Prepare template parameters based on the selected mode
            const templateParams = prepareDreamTemplateParams(params);
            
            // Add template information to params before sending to store
            const enrichedParams = {
              ...params,
              templateParams // Add template configuration
            };
            
            console.log('🔥MODULE_DATA_FLOW🔥 DreamWidgetModule 发送数据到 BaseWidgetModule:', enrichedParams);
            await moduleProps.startProcessing(enrichedParams);
          },
          onClearImage: () => {
            moduleProps.onClearHistory();
          },
          // Use converted data instead of moduleProps (like HuntWidgetModule)
          outputHistory: outputHistory, // Use converted data
          currentOutput: moduleProps.currentOutput, // Use BaseWidgetModule's currentOutput // Show latest image as current
          isStreaming: moduleProps.isStreaming,
          streamingContent: moduleProps.streamingContent,
          onSelectOutput: moduleProps.onSelectOutput,
          onClearHistory: moduleProps.onClearHistory
        };
        
        return children(legacyProps);
      }}
    </BaseWidgetModule>
  );
};

// Export the config for potential reuse
export { dreamConfig };