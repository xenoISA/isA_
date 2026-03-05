/**
 * ============================================================================
 * Content Parser - 内容类型识别和解析器
 * ============================================================================
 * 
 * 核心功能:
 * - 自动识别消息内容类型 (文本、图片、代码、markdown等)
 * - 将内容解析为结构化格式，供UI组件直接使用
 * - 支持混合内容类型处理 (如文本+图片)
 * - 提供内容元数据和渲染提示
 * 
 * 设计原则:
 * - 数据与UI分离: 解析逻辑与UI渲染完全分离
 * - 类型安全: 强类型定义确保数据一致性
 * - 可扩展: 易于添加新的内容类型识别
 * - 高性能: 缓存和优化的识别算法
 */

import { BaseParser, ParseResult } from './Parser';
import { createLogger, LogCategory } from '../../utils/logger';

const log = createLogger('ContentParser', LogCategory.API_REQUEST);

// ================================================================================
// 类型定义
// ================================================================================

export type ContentType = 
  | 'text'           // 纯文本
  | 'markdown'       // Markdown 内容
  | 'code'           // 代码块
  | 'image'          // 图片URL
  | 'mixed'          // 混合内容 (文本+图片等)
  | 'json'           // JSON 数据
  | 'html'           // HTML 内容
  | 'url';           // URL链接

export interface ContentElement {
  /** 内容类型 */
  type: ContentType;
  
  /** 内容数据 */
  content: string;
  
  /** 内容在原文中的位置 */
  position?: {
    start: number;
    end: number;
  };
  
  /** 额外的元数据 */
  metadata?: {
    language?: string;    // 代码语言
    filename?: string;    // 文件名
    alt?: string;        // 图片alt文本
    title?: string;      // 标题
    [key: string]: any;  // 其他自定义数据
  };
}

export interface ParsedContent {
  /** 原始内容 */
  raw: string;
  
  /** 主要内容类型 */
  primaryType: ContentType;
  
  /** 解析后的内容元素列表 */
  elements: ContentElement[];
  
  /** 是否包含多种类型的内容 */
  isMixed: boolean;
  
  /** 渲染提示 */
  renderHints?: {
    /** 推荐的UI变体 */
    variant?: 'chat' | 'widget' | 'artifact' | 'preview';
    
    /** 是否需要特殊处理 */
    requiresSpecialHandling?: boolean;
    
    /** 预估渲染复杂度 */
    complexity?: 'simple' | 'moderate' | 'complex';
  };
  
  /** 解析统计信息 */
  stats?: {
    totalLength: number;
    elementCount: number;
    typeDistribution: Record<ContentType, number>;
  };
}

// ================================================================================
// 内容识别规则
// ================================================================================

interface ContentPattern {
  type: ContentType;
  regex: RegExp;
  priority: number;
  validator?: (match: RegExpMatchArray, content: string) => boolean;
  metadata?: (match: RegExpMatchArray, content: string) => any;
}

const CONTENT_PATTERNS: ContentPattern[] = [
  // 图片URL - 最高优先级
  {
    type: 'image',
    regex: /https?:\/\/[^\s<>"{}|\\^`[\]]*\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s<>"{}|\\^`[\]]*)?/gi,
    priority: 100,
    metadata: (match) => ({ 
      url: match[0],
      extension: match[1] 
    })
  },
  
  // 代码块 (```language 或 ``` 包围)
  {
    type: 'code',
    regex: /```(\w+)?\n([\s\S]*?)\n```/g,
    priority: 90,
    metadata: (match) => ({
      language: match[1] || 'text',
      code: match[2]
    })
  },
  
  // 内联代码 (`code`)
  {
    type: 'code',
    regex: /`([^`\n]+)`/g,
    priority: 80,
    metadata: (match) => ({
      inline: true,
      code: match[1]
    })
  },
  
  // JSON 数据
  {
    type: 'json',
    regex: /^\s*[\{\[][^\{\[\]\}]*[\}\]]\s*$/g,
    priority: 70,
    validator: (match, content) => {
      try {
        JSON.parse(content.trim());
        return true;
      } catch {
        return false;
      }
    }
  },
  
  // HTML 标签
  {
    type: 'html',
    regex: /<\/?[\w\s="/.':;#-\/\?]+>/gi,
    priority: 60,
    validator: (match, content) => {
      // 至少包含一对HTML标签才认为是HTML内容
      const tagCount = (content.match(/<\/?[\w\s="/.':;#-\/\?]+>/gi) || []).length;
      return tagCount >= 2;
    }
  },
  
  // Markdown 格式
  {
    type: 'markdown',
    regex: /(?:^|\n)(#{1,6}\s|[\*\-]\s|\d+\.\s|>\s|\|.*\||\*\*.*\*\*|__.*__|`.*`)/g,
    priority: 50,
    validator: (match, content) => {
      // 包含多个markdown标记才认为是markdown
      const markdownCount = (content.match(/(?:^|\n)(#{1,6}\s|[\*\-]\s|\d+\.\s|>\s|\|.*\||\*\*.*\*\*|__.*__|`.*`)/g) || []).length;
      return markdownCount >= 2;
    }
  },
  
  // URL链接
  {
    type: 'url',
    regex: /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
    priority: 40,
    metadata: (match) => ({ url: match[0] })
  }
];

// ================================================================================
// ContentParser 实现
// ================================================================================

export class ContentParser extends BaseParser<string, ParsedContent> {
  readonly name = 'content_parser';
  readonly version = '1.0.0';
  
  private patternCache = new Map<string, ContentElement[]>();
  
  canParse(data: string): boolean {
    return typeof data === 'string' && data.length > 0;
  }
  
  parse(content: string): ParsedContent | null {
    if (!content || typeof content !== 'string') {
      return null;
    }
    
    try {
      // 检查缓存
      const cacheKey = this.getCacheKey(content);
      let elements = this.patternCache.get(cacheKey);
      
      if (!elements) {
        elements = this.extractContentElements(content);
        
        // 缓存结果 (限制缓存大小)
        if (this.patternCache.size > 1000) {
          const firstKey = this.patternCache.keys().next().value;
          if (firstKey) {
            this.patternCache.delete(firstKey);
          }
        }
        this.patternCache.set(cacheKey, elements);
      }
      
      // 分析内容类型
      const primaryType = this.determinePrimaryType(elements, content);
      const isMixed = this.isMixedContent(elements);
      
      // 生成渲染提示
      const renderHints = this.generateRenderHints(elements, primaryType, content);
      
      // 统计信息
      const stats = this.generateStats(content, elements);
      
      return {
        raw: content,
        primaryType,
        elements,
        isMixed,
        renderHints,
        stats
      };
      
    } catch (error) {
      log.warn('Parse failed', error);
      // 回退到纯文本
      return {
        raw: content,
        primaryType: 'text',
        elements: [{
          type: 'text',
          content
        }],
        isMixed: false,
        renderHints: {
          variant: 'chat',
          complexity: 'simple'
        },
        stats: {
          totalLength: content.length,
          elementCount: 1,
          typeDistribution: { text: 1 } as any
        }
      };
    }
  }
  
  /**
   * 提取内容元素
   */
  private extractContentElements(content: string): ContentElement[] {
    const elements: ContentElement[] = [];
    const processedRanges: Array<{start: number; end: number}> = [];
    
    // 按优先级排序模式
    const sortedPatterns = [...CONTENT_PATTERNS].sort((a, b) => b.priority - a.priority);
    
    for (const pattern of sortedPatterns) {
      const matches = Array.from(content.matchAll(pattern.regex));
      
      for (const match of matches) {
        if (!match.index) continue;
        
        const start = match.index;
        const end = start + match[0].length;
        
        // 检查是否与已处理的范围重叠
        const isOverlapping = processedRanges.some(range => 
          (start >= range.start && start < range.end) ||
          (end > range.start && end <= range.end) ||
          (start < range.start && end > range.end)
        );
        
        if (isOverlapping) continue;
        
        // 验证匹配
        if (pattern.validator && !pattern.validator(match, content)) {
          continue;
        }
        
        // 提取元数据
        const metadata = pattern.metadata ? pattern.metadata(match, content) : {};
        
        elements.push({
          type: pattern.type,
          content: match[0],
          position: { start, end },
          metadata
        });
        
        processedRanges.push({ start, end });
      }
    }
    
    // 提取剩余的文本内容
    this.extractTextElements(content, processedRanges, elements);
    
    // 按位置排序
    return elements.sort((a, b) => {
      const aPos = a.position?.start || 0;
      const bPos = b.position?.start || 0;
      return aPos - bPos;
    });
  }
  
  /**
   * 提取文本元素
   */
  private extractTextElements(
    content: string, 
    processedRanges: Array<{start: number; end: number}>,
    elements: ContentElement[]
  ): void {
    let lastEnd = 0;
    
    // 按起始位置排序处理过的范围
    const sortedRanges = processedRanges.sort((a, b) => a.start - b.start);
    
    for (const range of sortedRanges) {
      // 添加之前的文本
      if (range.start > lastEnd) {
        const textContent = content.slice(lastEnd, range.start).trim();
        if (textContent) {
          elements.push({
            type: 'text',
            content: textContent,
            position: { start: lastEnd, end: range.start }
          });
        }
      }
      lastEnd = Math.max(lastEnd, range.end);
    }
    
    // 添加最后的文本
    if (lastEnd < content.length) {
      const textContent = content.slice(lastEnd).trim();
      if (textContent) {
        elements.push({
          type: 'text',
          content: textContent,
          position: { start: lastEnd, end: content.length }
        });
      }
    }
  }
  
  /**
   * 确定主要内容类型
   */
  private determinePrimaryType(elements: ContentElement[], content: string): ContentType {
    if (elements.length === 0) return 'text';
    if (elements.length === 1) return elements[0].type;
    
    // 计算各类型的权重
    const typeWeights: Record<ContentType, number> = {
      text: 1,
      markdown: 3,
      code: 4,
      image: 5,
      mixed: 0,
      json: 4,
      html: 4,
      url: 2
    };
    
    const typeScores: Record<string, number> = {};
    
    for (const element of elements) {
      const weight = typeWeights[element.type] || 1;
      const length = element.content.length;
      typeScores[element.type] = (typeScores[element.type] || 0) + weight * length;
    }
    
    // 找到最高分的类型
    const topType = Object.entries(typeScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return topType ? topType[0] as ContentType : 'mixed';
  }
  
  /**
   * 判断是否为混合内容
   */
  private isMixedContent(elements: ContentElement[]): boolean {
    const types = new Set(elements.map(e => e.type));
    return types.size > 1 || (types.size === 1 && !types.has('text'));
  }
  
  /**
   * 生成渲染提示
   */
  private generateRenderHints(
    elements: ContentElement[], 
    primaryType: ContentType, 
    content: string
  ): ParsedContent['renderHints'] {
    const complexity = this.assessComplexity(elements, content);
    
    let variant: 'chat' | 'widget' | 'artifact' | 'preview' = 'chat';
    let requiresSpecialHandling = false;
    
    // 根据内容类型确定变体
    if (primaryType === 'code' || primaryType === 'json') {
      variant = 'artifact';
      requiresSpecialHandling = true;
    } else if (primaryType === 'image') {
      variant = 'preview';
    } else if (elements.length > 3 || complexity === 'complex') {
      variant = 'widget';
    }
    
    return {
      variant,
      requiresSpecialHandling,
      complexity
    };
  }
  
  /**
   * 评估复杂度
   */
  private assessComplexity(elements: ContentElement[], content: string): 'simple' | 'moderate' | 'complex' {
    const elementCount = elements.length;
    const contentLength = content.length;
    const typeCount = new Set(elements.map(e => e.type)).size;
    
    if (elementCount <= 1 && contentLength <= 100) {
      return 'simple';
    }
    
    if (elementCount <= 3 && contentLength <= 500 && typeCount <= 2) {
      return 'moderate';
    }
    
    return 'complex';
  }
  
  /**
   * 生成统计信息
   */
  private generateStats(content: string, elements: ContentElement[]): ParsedContent['stats'] {
    const typeDistribution: Record<string, number> = {};
    
    for (const element of elements) {
      typeDistribution[element.type] = (typeDistribution[element.type] || 0) + 1;
    }
    
    return {
      totalLength: content.length,
      elementCount: elements.length,
      typeDistribution: typeDistribution as Record<ContentType, number>
    };
  }
  
  /**
   * 生成缓存键
   */
  private getCacheKey(content: string): string {
    // 使用内容长度和前后几个字符作为简单的缓存键
    if (content.length <= 50) {
      return content;
    }
    
    return `${content.length}_${content.slice(0, 20)}_${content.slice(-20)}`;
  }
  
  /**
   * 清理缓存
   */
  clearCache(): void {
    this.patternCache.clear();
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.patternCache.size,
      maxSize: 1000
    };
  }
}

// ================================================================================
// 工厂函数和工具
// ================================================================================

/**
 * 创建内容解析器实例
 */
export const createContentParser = (): ContentParser => {
  return new ContentParser();
};

/**
 * 快速解析内容类型
 */
export const parseContentType = (content: string): ContentType => {
  const parser = createContentParser();
  const result = parser.parse(content);
  return result?.primaryType || 'text';
};

/**
 * 检查内容是否包含图片
 */
export const hasImages = (content: string): boolean => {
  const parser = createContentParser();
  const result = parser.parse(content);
  return result?.elements.some(e => e.type === 'image') || false;
};

/**
 * 提取所有图片URL
 */
export const extractImageUrls = (content: string): string[] => {
  const parser = createContentParser();
  const result = parser.parse(content);
  return result?.elements
    .filter(e => e.type === 'image')
    .map(e => e.content) || [];
};