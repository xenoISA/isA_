import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createLogger } from '@/utils/logger';

const log = createLogger('AnalyticsWebhook');

// Supabase 客户端配置  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 使用 service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'dev' }
});

// RudderStack webhook 安全验证
const RUDDERSTACK_WEBHOOK_SECRET = process.env.RUDDERSTACK_WEBHOOK_SECRET;

interface RudderStackEvent {
  type: string;
  event?: string;
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, any>;
  context?: {
    page?: {
      url: string;
      path: string;
      title: string;
      referrer?: string;
    };
    userAgent?: string;
    screen?: {
      width: number;
      height: number;
    };
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    sessionId?: string;
  };
  timestamp?: string;
  originalTimestamp?: string;
}

// 验证 webhook 签名
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  if (!secret) return true; // 如果没有设置密钥，跳过验证（开发环境）
  
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedSignature = `sha256=${hash}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// 验证 UUID 格式并转换
function validateAndConvertUUID(value: string | undefined | null): string | null {
  if (!value) return null;
  
  // UUID 正则表达式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(value)) {
    return value;
  }
  
  // 如果不是有效的 UUID，返回 null
  return null;
}

// 解析用户代理信息
function parseUserAgent(userAgent: string): { browser: string; os: string; device_type: string } {
  // 简单的用户代理解析
  let browser = 'unknown';
  let os = 'unknown';
  let device_type = 'desktop';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('iOS')) os = 'iOS';
  else if (userAgent.includes('Android')) os = 'Android';

  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) device_type = 'mobile';
  else if (/Tablet|iPad/.test(userAgent)) device_type = 'tablet';

  return { browser, os, device_type };
}

// 处理事件数据并存储到相应表
async function processAndStoreEvent(event: RudderStackEvent) {
  const eventType = event.type;
  const eventName = event.event;
  const timestamp = event.timestamp || event.originalTimestamp || new Date().toISOString();
  
  // 解析用户代理
  const userAgentInfo = event.context?.userAgent 
    ? parseUserAgent(event.context.userAgent) 
    : { browser: 'unknown', os: 'unknown', device_type: 'desktop' };

  // 基础事件数据
  const baseEventData = {
    event_name: eventName || eventType,
    event_category: eventType,
    timestamp,
    user_id: validateAndConvertUUID(event.userId),
    anonymous_id: event.anonymousId,
    session_id: event.context?.sessionId,
    properties: event.properties || {},
    page_url: event.context?.page?.url,
    page_path: event.context?.page?.path,
    page_title: event.context?.page?.title,
    referrer: event.context?.page?.referrer,
    user_agent: event.context?.userAgent,
    browser: userAgentInfo.browser,
    os: userAgentInfo.os,
    device_type: userAgentInfo.device_type,
    screen_width: event.context?.screen?.width,
    screen_height: event.context?.screen?.height,
    country: event.context?.location?.country,
    region: event.context?.location?.region,
    city: event.context?.location?.city,
  };

  try {
    // 1. 总是存储到主事件表
    log.debug('Inserting event data:', baseEventData);
    const { error: eventError } = await supabase
      .from('user_events')
      .insert(baseEventData);

    if (eventError) {
      log.error('Error inserting user event:', eventError);
      throw eventError;
    }

    // 2. 根据事件类型存储到专门的表
    switch (eventType) {
      case 'track':
        await handleTrackEvent(event, baseEventData);
        break;
      case 'page':
        await handlePageEvent(event, baseEventData);
        break;
      case 'identify':
        await handleIdentifyEvent(event, baseEventData);
        break;
    }

    // 3. 更新会话信息
    await updateSessionInfo(event, baseEventData);

    return { success: true };
  } catch (error) {
    log.error('Error processing event:', error);
    return { success: false, error };
  }
}

// 处理 track 事件
async function handleTrackEvent(event: RudderStackEvent, baseData: any) {
  const eventName = event.event;
  const properties = event.properties || {};

  // 聊天相关事件
  if (eventName?.startsWith('CHAT_') || eventName?.includes('Chat')) {
    const chatData = {
      user_id: baseData.user_id,
      session_id: baseData.session_id,
      message_type: eventName.includes('SENT') ? 'sent' : 'received',
      message_length: properties.message_length,
      input_method: properties.input_method,
      typing_duration: properties.typing_duration,
      thinking_time: properties.thinking_time,
      revision_count: properties.revision_count,
      intelligent_mode: properties.intelligent_mode,
      widget_type: properties.widget_type,
      widget_id: properties.widget_id,
      timestamp: baseData.timestamp,
    };

    const { error } = await supabase
      .from('chat_interactions')
      .insert(chatData);

    if (error) log.error('Error inserting chat interaction:', error);
  }

  // Widget 相关事件
  if (eventName?.startsWith('WIDGET_') || properties.widget_type) {
    const widgetData = {
      user_id: baseData.user_id,
      session_id: baseData.session_id,
      widget_type: properties.widget_type,
      widget_id: properties.widget_id,
      action: properties.action || eventName?.toLowerCase().split('_')[1],
      interaction_type: properties.interaction_type,
      duration: properties.duration,
      position_x: properties.position?.x,
      position_y: properties.position?.y,
      width: properties.width || properties.size?.width,
      height: properties.height || properties.size?.height,
      source_widget: properties.source_widget,
      target_widget: properties.target_widget,
      properties: properties,
      timestamp: baseData.timestamp,
    };

    const { error } = await supabase
      .from('widget_analytics')
      .insert(widgetData);

    if (error) log.error('Error inserting widget analytics:', error);
  }

  // 性能相关事件
  if (eventName?.includes('RESPONSE_TIME') || eventName?.includes('LOAD_TIME') || properties.duration) {
    const performanceData = {
      user_id: baseData.user_id,
      session_id: baseData.session_id,
      metric_name: eventName || 'unknown_performance_metric',
      duration: properties.duration,
      endpoint: properties.endpoint,
      method: properties.method,
      status_code: properties.status_code,
      browser: baseData.browser,
      device_type: baseData.device_type,
      network_type: properties.network_type,
      perceived_slow: properties.perceived_slow || false,
      abandoned: properties.abandoned || false,
      timestamp: baseData.timestamp,
    };

    const { error } = await supabase
      .from('performance_metrics')
      .insert(performanceData);

    if (error) log.error('Error inserting performance metrics:', error);
  }
}

// 处理页面事件
async function handlePageEvent(event: RudderStackEvent, baseData: any) {
  // 页面访问已经存储在主事件表中
  // 这里可以添加额外的页面分析逻辑
}

// 处理用户识别事件
async function handleIdentifyEvent(event: RudderStackEvent, baseData: any) {
  // 用户识别事件通常用于更新用户属性
  // 在这里可以更新用户档案信息
}

// 更新会话信息
async function updateSessionInfo(event: RudderStackEvent, baseData: any) {
  if (!baseData.session_id) return;

  // 构建会话元数据
  const metadata = {
    browser: baseData.browser,
    os: baseData.os,
    device_type: baseData.device_type,
    last_event_timestamp: baseData.timestamp,
    last_event_type: event.type
  };

  const sessionData = {
    session_id: baseData.session_id,
    user_id: baseData.user_id ? baseData.user_id.toString() : null, // sessions 表中 user_id 是 varchar
    updated_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    metadata: metadata,
  };

  // 使用 upsert 来更新或插入会话信息
  const { error } = await supabase
    .from('sessions')
    .upsert(sessionData, { 
      onConflict: 'session_id',
      ignoreDuplicates: false 
    });

  if (error) {
    log.error('Error upserting session:', error);
  }

  // 更新消息计数（对于 track 事件）
  if (event.type === 'track') {
    // 先获取当前消息计数
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('message_count')
      .eq('session_id', baseData.session_id)
      .single();

    const updateData = { 
      message_count: (currentSession?.message_count || 0) + 1,
      updated_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };
    
    await supabase
      .from('sessions')
      .update(updateData)
      .eq('session_id', baseData.session_id);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 验证 webhook 签名
    const signature = req.headers['x-signature'] as string;
    const body = JSON.stringify(req.body);
    
    if (RUDDERSTACK_WEBHOOK_SECRET && signature) {
      const isValidSignature = verifyWebhookSignature(body, signature, RUDDERSTACK_WEBHOOK_SECRET);
      if (!isValidSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    // 批量处理事件
    const results = await Promise.allSettled(
      events.map((event: RudderStackEvent) => processAndStoreEvent(event))
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;

    // 记录处理结果
    log.info(`Analytics webhook processed: ${successCount} success, ${errorCount} errors`);

    if (errorCount > 0) {
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason);
      
      log.error('Webhook processing errors:', errors);
    }

    return res.status(200).json({
      success: true,
      processed: successCount,
      errors: errorCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error('Webhook handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}