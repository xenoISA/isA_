/**
 * ============================================================================
 * Dropdown - 通用下拉选择器组件
 * ============================================================================
 * 
 * 功能特性：
 * - 美观的glassmorphism设计
 * - 支持自定义选项渲染
 * - 键盘导航支持
 * - 可配置的显示样式
 * - 点击外部关闭
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ================================================================================
// 类型定义
// ================================================================================

export interface DropdownOption {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
  metadata?: any;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: number;
  searchable?: boolean;
  customTrigger?: (selected: DropdownOption | null, isOpen: boolean) => React.ReactNode;
  customOption?: (option: DropdownOption, isSelected: boolean) => React.ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
}

// ================================================================================
// 主组件
// ================================================================================

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  maxHeight = 240,
  searchable = false,
  customTrigger,
  customOption,
  onOpen,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const selectedOption = options.find(option => option.id === value) || null;

  // 过滤选项
  const filteredOptions = searchable && searchTerm
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
    setFocusedIndex(-1);
    onClose?.();
  }, [onClose]);

  const handleSelect = useCallback((optionId: string) => {
    const option = options.find(opt => opt.id === optionId);
    if (option && !option.disabled) {
      onChange(optionId);
      handleClose();
    }
  }, [options, onChange, handleClose]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClose]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].id);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, focusedIndex, filteredOptions, handleClose, handleSelect]);

  // 搜索框聚焦
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (disabled) return;

    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    if (newIsOpen) {
      setFocusedIndex(-1);
      setSearchTerm("");
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  // 默认触发器渲染
  const renderDefaultTrigger = () => (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-4 py-3 bg-white/8 backdrop-blur-xl border border-white/10 rounded-xl text-white transition-all hover:bg-white/12 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {selectedOption ? (
          <>
            {selectedOption.icon && <span className="text-lg">{selectedOption.icon}</span>}
            <div className="text-left min-w-0">
              <div className="font-medium truncate">{selectedOption.label}</div>
              {selectedOption.subtitle && (
                <div className="text-xs text-white/60 truncate">{selectedOption.subtitle}</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-white/60">{placeholder}</div>
        )}
      </div>
      <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
        ▼
      </span>
    </button>
  );

  // 默认选项渲染
  const renderDefaultOption = (option: DropdownOption, isSelected: boolean, isFocused: boolean) => (
    <button
      key={option.id}
      onClick={() => handleSelect(option.id)}
      disabled={option.disabled}
      className={`w-full text-left p-3 transition-all first:rounded-t-xl last:rounded-b-xl disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected
          ? 'bg-blue-500/20 border-l-2 border-blue-500'
          : isFocused
          ? 'bg-white/15'
          : 'hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        {option.icon && <span className="text-lg">{option.icon}</span>}
        <div className="min-w-0 flex-1">
          <div className={`font-medium truncate ${isSelected ? 'text-blue-300' : 'text-white'}`}>
            {option.label}
          </div>
          {option.subtitle && (
            <div className="text-xs text-white/60 truncate">
              {option.subtitle}
            </div>
          )}
        </div>
      </div>
    </button>
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* 触发器 */}
      {customTrigger ? customTrigger(selectedOption, isOpen) : renderDefaultTrigger()}
      
      {/* 下拉面板 */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-black/85 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {/* 搜索框 */}
          {searchable && (
            <div className="p-3 border-b border-white/10">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-400/70"
              />
            </div>
          )}
          
          {/* 选项列表 */}
          <div className="overflow-y-auto" style={{ maxHeight: searchable ? maxHeight - 70 : maxHeight }}>
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-white/60 text-sm">
                {searchTerm ? 'No matching options found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.id === value;
                const isFocused = index === focusedIndex;
                
                return customOption
                  ? customOption(option, isSelected)
                  : renderDefaultOption(option, isSelected, isFocused);
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ================================================================================
// Hook for easier dropdown state management
// ================================================================================

export const useDropdown = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (newValue: string) => {
    setValue(newValue);
  };

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return {
    value,
    setValue,
    isOpen,
    handleChange,
    handleOpen,
    handleClose
  };
};