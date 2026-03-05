/**
 * ============================================================================
 * Component Demo - 演示和测试新的通用组件
 * ============================================================================
 * 
 * 这个组件用于验证新的 ContentRenderer 和 StatusRenderer 组件
 * 可以在开发过程中快速测试各种场景和配置
 */

import React, { useState } from 'react';
import { createLogger } from '../../../utils/logger';
import {
  ContentRenderer, 
  StatusRenderer, 
  Button,
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  DangerButton,
  IconButton,
  LinkButton,
  InputGroup,
  TextAreaGroup,
  Modal,
  ConfirmModal,
  ImageModal,
  modal,
  ToastProvider,
  useToast,
  toast,
  Avatar,
  MessageBubble,
  TypingIndicator,
  ChatInput,
  SearchBar,
  StatusBar,
  EmptyState,
  GlassCard,
  GlassButton,
  GlassInput,
  GlassMessageBubble,
  GlassChatInput
} from '../index';

const log = createLogger('ComponentDemo');

// 内部组件，使用Toast
const ComponentDemoContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'content' | 'status' | 'button' | 'input' | 'modal' | 'toast' | 'chat' | 'modern' | 'glass'>('content');
  const [contentType, setContentType] = useState<'markdown' | 'text' | 'image' | 'code'>('markdown');
  const [statusType, setStatusType] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [progress, setProgress] = useState(45);
  const [inputValue, setInputValue] = useState('');
  const [textAreaValue, setTextAreaValue] = useState('');
  
  // Chat states
  const [chatMessage, setChatMessage] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Glass states
  const [glassMessage, setGlassMessage] = useState('');
  const [glassInput, setGlassInput] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Toast hook
  const { addToast } = useToast();

  // 示例内容
  const sampleContents = {
    markdown: `# Hello World

这是一个 **markdown** 示例，包含：

- 列表项 1
- 列表项 2
- [链接示例](https://example.com)

\`\`\`javascript
console.log('Hello, World!');
\`\`\`

> 这是一个引用块

## 表格示例

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |`,

    text: '这是一段普通文本内容，用于测试文本渲染功能。它包含多行内容，可以测试换行和长文本的处理。',

    image: 'https://picsum.photos/400/300',

    code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));`
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">组件演示</h1>
        
        {/* 标签切换 */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setCurrentTab('content')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'content' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            ContentRenderer
          </button>
          <button
            onClick={() => setCurrentTab('status')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'status' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            StatusRenderer
          </button>
          <button
            onClick={() => setCurrentTab('button')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'button' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Button
          </button>
          <button
            onClick={() => setCurrentTab('input')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'input' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            InputGroup
          </button>
          <button
            onClick={() => setCurrentTab('modal')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'modal' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Modal
          </button>
          <button
            onClick={() => setCurrentTab('toast')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'toast' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Toast
          </button>
          <button
            onClick={() => setCurrentTab('chat')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'chat' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Chat UI
          </button>
          <button
            onClick={() => setCurrentTab('modern')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'modern' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Modern 2025
          </button>
          <button
            onClick={() => setCurrentTab('glass')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTab === 'glass' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            🌟 Glassmorphism Pro
          </button>
        </div>

        {/* ContentRenderer 演示 */}
        {currentTab === 'content' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">ContentRenderer 演示</h2>
              
              {/* 控制面板 */}
              <div className="mb-6 flex gap-4">
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded"
                >
                  <option value="markdown">Markdown</option>
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="code">Code</option>
                </select>
              </div>

              {/* 不同变体演示 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chat 变体 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Chat 变体</h3>
                  <div className="bg-gray-700 p-4 rounded">
                    <ContentRenderer
                      content={sampleContents[contentType]}
                      type={contentType}
                      variant="chat"
                      features={{
                        markdown: true,
                        copyButton: true,
                        imagePreview: true,
                        truncate: contentType === 'text' ? 100 : undefined
                      }}
                      onAction={(action, data) => log.debug('Chat action', { action, data })}
                    />
                  </div>
                </div>

                {/* Widget 变体 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Widget 变体</h3>
                  <ContentRenderer
                    content={sampleContents[contentType]}
                    type={contentType}
                    variant="widget"
                    features={{
                      markdown: true,
                      copyButton: true,
                      saveButton: contentType === 'image',
                      imagePreview: true
                    }}
                    onAction={(action, data) => log.debug('Widget action', { action, data })}
                  />
                </div>

                {/* Artifact 变体 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Artifact 变体</h3>
                  <ContentRenderer
                    content={sampleContents[contentType]}
                    type={contentType}
                    variant="artifact"
                    features={{
                      markdown: true,
                      copyButton: true,
                      saveButton: true,
                      expandButton: true,
                      truncate: 200
                    }}
                    onAction={(action, data) => log.debug('Artifact action', { action, data })}
                  />
                </div>

                {/* Inline 变体 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Inline 变体</h3>
                  <div className="bg-gray-700 p-4 rounded">
                    这是一段文本，包含内联内容：
                    <ContentRenderer
                      content={contentType === 'text' ? '内联文本示例' : sampleContents[contentType]}
                      type={contentType}
                      variant="inline"
                      size="sm"
                      features={{
                        markdown: contentType === 'markdown',
                        truncate: 50
                      }}
                    />
                    继续文本。
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* StatusRenderer 演示 */}
        {currentTab === 'status' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">StatusRenderer 演示</h2>
              
              {/* 控制面板 */}
              <div className="mb-6 flex gap-4">
                <select
                  value={statusType}
                  onChange={(e) => setStatusType(e.target.value as any)}
                  className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded"
                >
                  <option value="loading">Loading</option>
                  <option value="processing">Processing</option>
                  <option value="generating">Generating</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white">{progress}%</span>
              </div>

              {/* 不同变体演示 */}
              <div className="space-y-6">
                {/* Inline 变体 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white">Inline 变体</h3>
                  <div className="bg-white/5 border border-white/10 p-4 rounded flex items-center gap-4">
                    <StatusRenderer
                      status={statusType}
                      message={`This is ${statusType} status`}
                      variant="inline"
                      showProgress={true}
                      progress={progress}
                    />
                  </div>
                </div>

                {/* Avatar-side 变体 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white">Avatar-side 变体</h3>
                  <div className="bg-white/5 border border-white/10 p-4 rounded flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      AI
                    </div>
                    <StatusRenderer
                      status={statusType}
                      message={`${statusType.charAt(0).toUpperCase() + statusType.slice(1)}...`}
                      variant="avatar-side"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Widget-header 变体 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white">Widget-header 变体</h3>
                  <div className="bg-white/5 border border-white/10 rounded">
                    <StatusRenderer
                      status={statusType}
                      message={`Widget is ${statusType}`}
                      variant="widget-header"
                      showProgress={true}
                      progress={progress}
                    />
                    <div className="p-4 text-white">
                      Widget content area...
                    </div>
                  </div>
                </div>

                {/* Minimal 变体 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white">Minimal 变体</h3>
                  <div className="bg-white/5 border border-white/10 p-4 rounded">
                    正在处理您的请求 
                    <StatusRenderer
                      status={statusType}
                      variant="minimal"
                      size="xs"
                    />
                    请稍候...
                  </div>
                </div>

                {/* Floating 变体 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white">Floating 变体</h3>
                  <div className="bg-white/5 border border-white/10 p-4 rounded relative h-32">
                    <p className="text-white">这是主要内容区域...</p>
                    <StatusRenderer
                      status={statusType}
                      message="Operation in progress"
                      variant="floating"
                      showProgress={true}
                      progress={progress}
                    />
                  </div>
                </div>

                {/* 不同尺寸对比 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white">尺寸对比</h3>
                  <div className="bg-white/5 border border-white/10 p-4 rounded space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="text-white w-8">XS:</span>
                      <StatusRenderer status={statusType} variant="inline" size="xs" />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white w-8">SM:</span>
                      <StatusRenderer status={statusType} variant="inline" size="sm" />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white w-8">MD:</span>
                      <StatusRenderer status={statusType} variant="inline" size="md" />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white w-8">LG:</span>
                      <StatusRenderer status={statusType} variant="inline" size="lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Button 演示 */}
        {currentTab === 'button' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Button 演示</h2>
              
              {/* 基础按钮变体 */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">按钮变体</h3>
                  <div className="flex flex-wrap gap-4">
                    <PrimaryButton>Primary</PrimaryButton>
                    <SecondaryButton>Secondary</SecondaryButton>
                    <SuccessButton>Success</SuccessButton>
                    <DangerButton>Danger</DangerButton>
                    <Button variant="warning">Warning</Button>
                    <Button variant="ghost">Ghost</Button>
                    <LinkButton>Link</LinkButton>
                  </div>
                </div>

                {/* 按钮尺寸 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">按钮尺寸</h3>
                  <div className="flex items-center gap-4">
                    <PrimaryButton size="xs">Extra Small</PrimaryButton>
                    <PrimaryButton size="sm">Small</PrimaryButton>
                    <PrimaryButton size="md">Medium</PrimaryButton>
                    <PrimaryButton size="lg">Large</PrimaryButton>
                    <PrimaryButton size="xl">Extra Large</PrimaryButton>
                  </div>
                </div>

                {/* 图标按钮 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">图标按钮</h3>
                  <div className="flex flex-wrap gap-4">
                    <PrimaryButton icon={<span>🔍</span>}>搜索</PrimaryButton>
                    <SecondaryButton icon={<span>📝</span>} iconPosition="right">编辑</SecondaryButton>
                    <IconButton icon={<span>❌</span>} size="sm" />
                    <IconButton icon={<span>✅</span>} size="md" />
                    <IconButton icon={<span>🔄</span>} size="lg" />
                  </div>
                </div>

                {/* 按钮状态 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">按钮状态</h3>
                  <div className="flex flex-wrap gap-4">
                    <PrimaryButton>正常状态</PrimaryButton>
                    <PrimaryButton loading loadingText="加载中...">加载状态</PrimaryButton>
                    <PrimaryButton disabled>禁用状态</PrimaryButton>
                    <PrimaryButton state="pressed">按下状态</PrimaryButton>
                  </div>
                </div>

                {/* 特殊样式 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">特殊样式</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <PrimaryButton rounded>圆角按钮</PrimaryButton>
                      <SecondaryButton elevated>提升效果</SecondaryButton>
                    </div>
                    <div>
                      <PrimaryButton fullWidth>全宽按钮</PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* InputGroup 演示 */}
        {currentTab === 'input' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">InputGroup 演示</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 基础输入框 */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">基础输入框</h3>
                  
                  <InputGroup
                    label="用户名"
                    placeholder="请输入用户名"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    helperText="用户名长度应在3-20个字符之间"
                    clearable
                    onClear={() => setInputValue('')}
                  />

                  <InputGroup
                    label="邮箱地址"
                    type="email"
                    placeholder="example@domain.com"
                    leftIcon={<span>📧</span>}
                    variant="filled"
                  />

                  <InputGroup
                    label="密码"
                    type="password"
                    placeholder="请输入密码"
                    showPasswordToggle
                    rightIcon={<span>🔒</span>}
                    variant="outlined"
                  />

                  <InputGroup
                    label="搜索"
                    placeholder="搜索内容..."
                    leftIcon={<span>🔍</span>}
                    variant="underlined"
                    clearable
                  />
                </div>

                {/* 不同状态和尺寸 */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white">状态和尺寸</h3>
                  
                  <InputGroup
                    label="成功状态"
                    placeholder="输入正确"
                    state="success"
                    helperText="验证通过"
                    size="sm"
                  />

                  <InputGroup
                    label="错误状态"
                    placeholder="输入错误"
                    state="error"
                    errorText="该字段为必填项"
                    size="md"
                  />

                  <InputGroup
                    label="警告状态"
                    placeholder="需要注意"
                    state="warning"
                    helperText="建议修改此内容"
                    size="lg"
                  />

                  <InputGroup
                    label="禁用状态"
                    placeholder="无法输入"
                    disabled
                    value="禁用的输入框"
                  />
                </div>

                {/* 文本域 */}
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-lg font-medium text-white">文本域</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TextAreaGroup
                      label="普通文本域"
                      placeholder="请输入多行文本..."
                      value={textAreaValue}
                      onChange={(e) => setTextAreaValue(e.target.value)}
                      helperText="最多输入500个字符"
                      rows={4}
                    />

                    <TextAreaGroup
                      label="自动调整高度"
                      placeholder="文本域会自动调整高度..."
                      autoResize
                      variant="filled"
                      rows={2}
                    />

                    <TextAreaGroup
                      label="圆角文本域"
                      placeholder="圆角样式..."
                      variant="outlined"
                      rounded
                      resize="none"
                      rows={3}
                    />

                    <TextAreaGroup
                      label="下划线样式"
                      placeholder="下划线样式文本域..."
                      variant="underlined"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 演示 */}
        {currentTab === 'modal' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Modal 演示</h2>
              
              <div className="space-y-6">
                {/* 基础弹窗 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">基础弹窗</h3>
                  <div className="flex flex-wrap gap-4">
                    <PrimaryButton onClick={() => setShowModal(true)}>
                      基础弹窗
                    </PrimaryButton>
                    <SecondaryButton onClick={() => setShowConfirmModal(true)}>
                      确认弹窗
                    </SecondaryButton>
                    <SuccessButton onClick={() => setShowImageModal(true)}>
                      图片预览
                    </SuccessButton>
                  </div>
                </div>

                {/* 不同尺寸 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">不同尺寸</h3>
                  <div className="flex flex-wrap gap-4">
                    {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(size => (
                      <Button
                        key={size}
                        variant="secondary"
                        onClick={() => {
                          setShowModal(true);
                        }}
                      >
                        {size.toUpperCase()} 尺寸
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 预设弹窗类型 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">快捷方法</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => addToast(toast.info('这是一个信息提示'))}
                    >
                      信息弹窗
                    </Button>
                    <SuccessButton 
                      onClick={() => addToast(toast.success('操作成功！'))}
                    >
                      成功弹窗
                    </SuccessButton>
                    <Button 
                      variant="warning" 
                      onClick={() => addToast(toast.warning('请注意这个警告'))}
                    >
                      警告弹窗
                    </Button>
                    <DangerButton 
                      onClick={() => addToast(toast.error('发生了错误'))}
                    >
                      错误弹窗
                    </DangerButton>
                  </div>
                </div>
              </div>

              {/* 基础Modal */}
              <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="示例弹窗"
                footer={
                  <div className="flex gap-3 justify-end">
                    <SecondaryButton onClick={() => setShowModal(false)}>
                      取消
                    </SecondaryButton>
                    <PrimaryButton onClick={() => setShowModal(false)}>
                      确认
                    </PrimaryButton>
                  </div>
                }
              >
                <div className="space-y-4">
                  <p className="text-white/90">
                    这是一个基础的Modal弹窗示例。您可以在这里放置任何内容。
                  </p>
                  <InputGroup
                    label="示例输入"
                    placeholder="在弹窗中输入内容..."
                    fullWidth
                  />
                </div>
              </Modal>

              {/* 确认Modal */}
              <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="确认操作"
                content="您确定要执行这个操作吗？此操作不可撤销。"
                onOk={async () => {
                  // 模拟异步操作
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  addToast(toast.success('操作成功完成！'));
                }}
                onCancel={() => {
                  addToast(toast.info('操作已取消'));
                }}
              />

              {/* 图片预览Modal */}
              <ImageModal
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
                src="https://picsum.photos/800/600"
                alt="示例图片"
              />
            </div>
          </div>
        )}

        {/* Toast 演示 */}
        {currentTab === 'toast' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Toast 演示</h2>
              
              <div className="space-y-6">
                {/* 基础通知 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">基础通知</h3>
                  <div className="flex flex-wrap gap-4">
                    <PrimaryButton 
                      onClick={() => addToast(toast.info('这是一个信息通知'))}
                    >
                      信息通知
                    </PrimaryButton>
                    <SuccessButton 
                      onClick={() => addToast(toast.success('操作成功完成！'))}
                    >
                      成功通知
                    </SuccessButton>
                    <Button 
                      variant="warning"
                      onClick={() => addToast(toast.warning('请注意这个警告信息'))}
                    >
                      警告通知
                    </Button>
                    <DangerButton 
                      onClick={() => addToast(toast.error('发生了一个错误'))}
                    >
                      错误通知
                    </DangerButton>
                    <Button 
                      variant="ghost"
                      onClick={() => addToast(toast.loading('正在处理中...'))}
                    >
                      加载通知
                    </Button>
                  </div>
                </div>

                {/* 带标题的通知 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">带标题通知</h3>
                  <div className="flex flex-wrap gap-4">
                    <PrimaryButton 
                      onClick={() => addToast({
                        type: 'success',
                        title: '文件上传成功',
                        message: '您的文件已成功上传到服务器。'
                      })}
                    >
                      带标题
                    </PrimaryButton>
                    <SecondaryButton 
                      onClick={() => addToast({
                        type: 'info',
                        title: '系统更新',
                        message: '新版本已发布，建议您尽快更新。',
                        action: {
                          label: '立即更新',
                          onClick: () => addToast(toast.success('开始更新...'))
                        }
                      })}
                    >
                      带操作按钮
                    </SecondaryButton>
                  </div>
                </div>

                {/* 不同位置 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">不同位置</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map(position => (
                      <Button
                        key={position}
                        variant="secondary"
                        size="sm"
                        onClick={() => addToast({
                          type: 'info',
                          message: `${position} 位置通知`,
                          position
                        })}
                      >
                        {position}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 自定义持续时间 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">自定义持续时间</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => addToast({
                        type: 'info',
                        message: '1秒后消失',
                        duration: 1000
                      })}
                    >
                      1秒
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => addToast({
                        type: 'warning',
                        message: '5秒后消失',
                        duration: 5000
                      })}
                    >
                      5秒
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => addToast({
                        type: 'error',
                        message: '不会自动消失',
                        duration: 0
                      })}
                    >
                      持久显示
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Chat UI 演示 */}
        {currentTab === 'chat' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Chat UI Components</h2>
              
              <div className="space-y-8">
                {/* Avatar 组件 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Avatar 组件</h3>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar variant="user" size="xs" showStatus status="online" />
                      <Avatar variant="user" size="sm" showStatus status="thinking" />
                      <Avatar variant="user" size="md" showStatus status="typing" />
                      <Avatar variant="user" size="lg" showStatus status="offline" />
                      <Avatar variant="user" size="xl" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Avatar variant="assistant" size="md" showStatus status="online" />
                      <Avatar variant="assistant" size="md" showStatus status="thinking" />
                      <Avatar variant="system" size="md" showStatus status="online" />
                    </div>
                  </div>
                </div>

                {/* Message Bubble 组件 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Message Bubble 组件</h3>
                  <div className="bg-gray-700 p-4 rounded-lg space-y-4 max-w-2xl">
                    <MessageBubble
                      content="Hello! How can I help you today?"
                      role="assistant"
                      timestamp={new Date().toISOString()}
                      onCopy={() => addToast(toast.success('Message copied!'))}
                      onLike={() => addToast(toast.success('Message liked!'))}
                    />
                    <MessageBubble
                      content="I need help with React components"
                      role="user"
                      timestamp={new Date(Date.now() - 60000).toISOString()}
                      onCopy={() => addToast(toast.success('Message copied!'))}
                    />
                    <MessageBubble
                      content="I'm thinking about your request..."
                      role="assistant"
                      timestamp={new Date().toISOString()}
                      isStreaming
                      streamingStatus="Analyzing requirements"
                      onCopy={() => addToast(toast.success('Message copied!'))}
                    />
                  </div>
                </div>

                {/* Typing Indicator 组件 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Typing Indicator 组件</h3>
                  <div className="bg-gray-700 p-4 rounded-lg space-y-4 max-w-2xl">
                    <TypingIndicator variant="modern" message="AI is thinking" />
                    <TypingIndicator variant="dots" message="Processing" />
                    <TypingIndicator variant="pulse" message="Generating response" />
                    <TypingIndicator variant="wave" message="Analyzing" />
                  </div>
                </div>

                {/* Chat Input 组件 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Chat Input 组件</h3>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <ChatInput
                      value={chatMessage}
                      onChange={setChatMessage}
                      onSend={(msg) => {
                        addToast(toast.success(`Message sent: ${msg}`));
                        setChatMessage('');
                      }}
                      placeholder="Type your message here..."
                      onAttachFile={() => addToast(toast.info('Attach file clicked'))}
                      onVoiceRecord={() => addToast(toast.info('Voice record clicked'))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modern 2025 演示 */}
        {currentTab === 'modern' && (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Modern UI Components 2025</h2>
              
              <div className="space-y-8">
                {/* Search Bar 组件 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Search Bar 组件</h3>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <SearchBar
                      value={searchValue}
                      onChange={setSearchValue}
                      onSearch={(query) => addToast(toast.info(`Searching for: ${query}`))}
                      placeholder="Search conversations, messages, files..."
                      recentQueries={['React components', 'TypeScript', 'Next.js deployment']}
                      suggestions={['React hooks', 'Component patterns', 'State management']}
                      results={[
                        {
                          id: '1',
                          title: 'React Component Discussion',
                          content: 'We discussed creating reusable components...',
                          type: 'conversation',
                          timestamp: new Date(Date.now() - 86400000).toISOString()
                        },
                        {
                          id: '2',
                          title: 'TypeScript Integration',
                          content: 'How to properly type React components...',
                          type: 'message',
                          timestamp: new Date(Date.now() - 172800000).toISOString()
                        }
                      ]}
                    />
                  </div>
                </div>

                {/* Status Bar 组件 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Status Bar 组件</h3>
                  <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                    <StatusBar
                      connectionStatus="connected"
                      aiStatus="ready"
                      tokenUsage={{ current: 1250, limit: 5000, resetDate: new Date(Date.now() + 86400000).toISOString() }}
                      modelInfo={{ name: 'Claude 3.5 Sonnet', version: '2024-10' }}
                    />
                    <StatusBar
                      connectionStatus="connecting"
                      aiStatus="thinking"
                      tokenUsage={{ current: 4750, limit: 5000 }}
                      modelInfo={{ name: 'GPT-4 Turbo' }}
                    />
                    <StatusBar
                      connectionStatus="error"
                      aiStatus="offline"
                      showTokenUsage={false}
                      showModelInfo={false}
                    />
                  </div>
                </div>

                {/* Empty State 组件 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Empty State 组件</h3>
                  <div className="bg-gray-700 p-4 rounded-lg space-y-6">
                    <div className="h-64">
                      <EmptyState
                        variant="welcome"
                        onSuggestionClick={(suggestion) => 
                          addToast(toast.info(`Selected: ${suggestion}`))
                        }
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-48 bg-gray-600 rounded-lg">
                        <EmptyState
                          variant="no-chats"
                          className="h-full"
                          actions={
                            <Button onClick={() => addToast(toast.info('New chat started'))}>
                              Start New Chat
                            </Button>
                          }
                        />
                      </div>
                      
                      <div className="h-48 bg-gray-600 rounded-lg">
                        <EmptyState
                          variant="no-results"
                          className="h-full"
                          title="No matches found"
                          description="Try different search terms"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-48 bg-gray-600 rounded-lg">
                        <EmptyState
                          variant="error"
                          className="h-full"
                          actions={
                            <Button onClick={() => addToast(toast.success('Refreshed!'))}>
                              Try Again
                            </Button>
                          }
                        />
                      </div>
                      
                      <div className="h-48 bg-gray-600 rounded-lg">
                        <EmptyState
                          variant="offline"
                          className="h-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toggle Typing Demo */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Interactive Demo</h3>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex gap-4 mb-4">
                      <Button 
                        onClick={() => setIsTyping(!isTyping)}
                        variant={isTyping ? "success" : "secondary"}
                      >
                        {isTyping ? 'Stop Typing' : 'Start Typing'}
                      </Button>
                    </div>
                    {isTyping && (
                      <TypingIndicator 
                        variant="modern" 
                        message="AI is generating response"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Glassmorphism Pro 演示 */}
        {currentTab === 'glass' && (
          <div className="space-y-8">
            {/* Glass Background */}
            <div 
              className="rounded-lg p-6 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
              }}
            >
              <h2 className="text-xl font-semibold text-white mb-6 relative z-10">🌟 Glassmorphism Pro Components</h2>
              
              <div className="space-y-8 relative z-10">
                {/* Glass Cards */}
                <div>
                  <h3 className="text-lg font-medium text-white/90 mb-4">Glass Cards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <GlassCard variant="subtle" className="p-4">
                      <h4 className="text-white/90 font-medium mb-2">Subtle</h4>
                      <p className="text-white/70 text-sm">Light glass effect with minimal blur</p>
                    </GlassCard>
                    <GlassCard variant="default" className="p-4">
                      <h4 className="text-white/90 font-medium mb-2">Default</h4>
                      <p className="text-white/70 text-sm">Balanced glass effect for most use cases</p>
                    </GlassCard>
                    <GlassCard variant="elevated" className="p-4">
                      <h4 className="text-white/90 font-medium mb-2">Elevated</h4>
                      <p className="text-white/70 text-sm">Strong glass effect with shadow</p>
                    </GlassCard>
                    <GlassCard variant="intense" className="p-4">
                      <h4 className="text-white/90 font-medium mb-2">Intense</h4>
                      <p className="text-white/70 text-sm">Maximum glass effect with ring</p>
                    </GlassCard>
                  </div>
                </div>

                {/* Glass Buttons */}
                <div>
                  <h3 className="text-lg font-medium text-white/90 mb-4">Glass Buttons</h3>
                  <div className="flex flex-wrap gap-4">
                    <GlassButton variant="primary">Primary</GlassButton>
                    <GlassButton variant="secondary">Secondary</GlassButton>
                    <GlassButton variant="accent">Accent</GlassButton>
                    <GlassButton variant="success">Success</GlassButton>
                    <GlassButton variant="danger">Danger</GlassButton>
                    <GlassButton variant="ghost">Ghost</GlassButton>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-4">
                    <GlassButton variant="primary" size="xs">Extra Small</GlassButton>
                    <GlassButton variant="primary" size="sm">Small</GlassButton>
                    <GlassButton variant="primary" size="md">Medium</GlassButton>
                    <GlassButton variant="primary" size="lg">Large</GlassButton>
                    <GlassButton variant="primary" size="xl">Extra Large</GlassButton>
                  </div>
                </div>

                {/* Glass Inputs */}
                <div>
                  <h3 className="text-lg font-medium text-white/90 mb-4">Glass Inputs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassInput
                      value={glassInput}
                      onChange={setGlassInput}
                      placeholder="Type something..."
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      }
                    />
                    <GlassInput
                      value=""
                      onChange={() => {}}
                      placeholder="Disabled input"
                      disabled
                    />
                    <GlassInput
                      value=""
                      onChange={() => {}}
                      placeholder="Success state"
                      success
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      }
                    />
                    <GlassInput
                      value=""
                      onChange={() => {}}
                      placeholder="Error state"
                      error
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      }
                    />
                  </div>
                </div>

                {/* Glass Message Bubbles */}
                <div>
                  <h3 className="text-lg font-medium text-white/90 mb-4">Glass Message Bubbles</h3>
                  <GlassCard className="p-4 max-w-2xl">
                    <div className="space-y-4">
                      <GlassMessageBubble
                        content="Hey! Check out these amazing glass effects 🌟"
                        role="user"
                        timestamp={new Date().toISOString()}
                        onCopy={() => addToast(toast.success('Message copied!'))}
                        variant="elevated"
                      />
                      <GlassMessageBubble
                        content="Absolutely stunning! The glassmorphism effects are perfect for a modern AI interface. The blur and transparency create such an elegant look."
                        role="assistant"
                        timestamp={new Date(Date.now() - 30000).toISOString()}
                        onCopy={() => addToast(toast.success('Message copied!'))}
                        onLike={() => addToast(toast.success('Message liked!'))}
                        variant="elevated"
                      />
                      <GlassMessageBubble
                        content="I'm generating an even better response with ultra-modern effects..."
                        role="assistant"
                        timestamp={new Date().toISOString()}
                        isStreaming
                        streamingStatus="Applying glassmorphism magic"
                        onCopy={() => addToast(toast.success('Message copied!'))}
                        variant="elevated"
                      />
                    </div>
                  </GlassCard>
                </div>

                {/* Glass Chat Input */}
                <div>
                  <h3 className="text-lg font-medium text-white/90 mb-4">Glass Chat Input</h3>
                  <GlassCard className="p-4">
                    <div className="space-y-4">
                      <GlassChatInput
                        value={glassMessage}
                        onChange={setGlassMessage}
                        onSend={(msg) => {
                          addToast(toast.success(`Glass message sent: ${msg}`));
                          setGlassMessage('');
                        }}
                        placeholder="Experience the future of chat input..."
                        variant="elevated"
                        onAttachFile={() => addToast(toast.info('Glass attach clicked'))}
                        onVoiceRecord={() => addToast(toast.info('Glass voice clicked'))}
                        onMagicAction={() => addToast(toast.info('Glass magic clicked'))}
                      />
                      
                      <GlassChatInput
                        value=""
                        onChange={() => {}}
                        onSend={() => {}}
                        placeholder="Compact variant"
                        variant="compact"
                        showMagicButton={false}
                      />
                    </div>
                  </GlassCard>
                </div>

                {/* Interactive Demo */}
                <div>
                  <h3 className="text-lg font-medium text-white/90 mb-4">Interactive Glass Demo</h3>
                  <GlassCard variant="intense" className="p-6">
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-white/90 mb-4">🚀 Ready to Transform Your App?</h4>
                      <p className="text-white/70 mb-6">Ultra-modern glassmorphism components are ready to elevate your interface</p>
                      <div className="flex flex-wrap justify-center gap-4">
                        <GlassButton 
                          variant="primary" 
                          size="lg"
                          onClick={() => addToast({
                            type: 'success',
                            title: '🌟 Glassmorphism Activated!',
                            message: 'Your app is now ready for the future'
                          })}
                        >
                          🚀 Apply to App
                        </GlassButton>
                        <GlassButton 
                          variant="secondary" 
                          size="lg"
                          onClick={() => addToast(toast.info('More glass effects coming soon!'))}
                        >
                          ✨ Explore More
                        </GlassButton>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>

              {/* Background Glass Orbs */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
                <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-blue-400/15 rounded-full blur-2xl animate-pulse delay-500"></div>
                <div className="absolute bottom-10 right-10 w-28 h-28 bg-pink-400/20 rounded-full blur-lg animate-pulse delay-700"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 外层组件，提供Toast Provider
export const ComponentDemo: React.FC = () => {
  return (
    <ToastProvider>
      <ComponentDemoContent />
    </ToastProvider>
  );
};

export default ComponentDemo;