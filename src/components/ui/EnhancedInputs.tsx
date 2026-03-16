// src/components/ui/EnhancedInputs.tsx
// Enhanced Input Components for Vartica App

import React, { useState, useRef, useEffect } from 'react';

// ============================================
// Floating Label Input
// ============================================

interface FloatingLabelInputProps {
    label: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    error?: string;
    className?: string;
    disabled?: boolean;
    floating?: boolean;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
    label,
    placeholder,
    value,
    onChange,
    type = 'text',
    error,
    className = '',
    disabled = false,
    floating = true
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.length > 0;

    return (
        <div className={`relative ${className}`}>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={floating ? '' : placeholder}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`
                    w-full px-4 py-4 bg-slate-800 border rounded-lg 
                    focus:ring-2 focus:ring-green-500 focus:border-transparent 
                    transition-all text-slate-100 placeholder-slate-500
                    pt-6 pb-2
                    ${error ? 'border-red-500' : 'border-slate-700'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            />
            <label
                className={`
                    absolute left-4 transition-all duration-200 pointer-events-none
                    ${isFocused || hasValue
                        ? 'top-2 text-xs text-green-500'
                        : 'top-4 text-slate-400'
                    }
                `}
            >
                {label}
            </label>
            {error && (
                <p className="text-sm text-red-400 mt-1">{error}</p>
            )}
        </div>
    );
};

// ============================================
// Input with Icon
// ============================================

interface InputWithIconProps {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    error?: string;
    icon: React.ReactNode;
    iconPosition?: 'left' | 'right';
    className?: string;
    disabled?: boolean;
}

export const InputWithIcon: React.FC<InputWithIconProps> = ({
    label,
    placeholder,
    value,
    onChange,
    type = 'text',
    error,
    icon,
    iconPosition = 'left',
    className = '',
    disabled = false
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-200">
                    {label}
                </label>
            )}
            <div className="relative">
                {iconPosition === 'left' && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`
                        w-full px-4 py-3 bg-slate-800 border rounded-lg 
                        focus:ring-2 focus:ring-green-500 focus:border-transparent 
                        transition-all text-slate-100 placeholder-slate-500 
                        ${iconPosition === 'left' ? 'pl-10' : 'pr-10'}
                        ${error ? 'border-red-500' : 'border-slate-700'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                />
                {iconPosition === 'right' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {icon}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}
        </div>
    );
};

// ============================================
// Search Input with Filters
// ============================================

interface SearchInputProps {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    filters?: { label: string; value: string }[];
    selectedFilter?: string;
    onFilterChange?: (value: string) => void;
    className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    placeholder = 'Search...',
    value,
    onChange,
    onSearch,
    filters,
    selectedFilter,
    onFilterChange,
    className = ''
}) => {
    const [showFilters, setShowFilters] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(value || '');
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-slate-100 placeholder-slate-500"
                    />
                </div>
                {filters && filters.length > 0 && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-3 rounded-lg border transition-colors ${selectedFilter ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </button>
                        {showFilters && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
                                {filters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => {
                                            onFilterChange?.(filter.value);
                                            setShowFilters(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 ${selectedFilter === filter.value ? 'text-green-500' : 'text-slate-200'
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// OTP Input
// ============================================

interface OTPInputProps {
    length?: number;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
    className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
    length = 6,
    value = '',
    onChange,
    error,
    className = ''
}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, digit: string) => {
        if (!/^\d*$/.test(digit)) return;

        const newValue = value.padEnd(length, ' ').split('');
        newValue[index] = digit;
        const finalValue = newValue.join('').trim();
        onChange?.(finalValue);

        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        onChange?.(pasteData);
    };

    return (
        <div className={className}>
            <div className="flex gap-2 justify-center">
                {Array.from({ length }).map((_, index) => (
                    <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value[index] || ''}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`
                            w-12 h-14 text-center text-xl font-bold bg-slate-800 border rounded-lg
                            focus:ring-2 focus:ring-green-500 focus:border-transparent
                            text-slate-100 transition-all
                            ${error ? 'border-red-500' : 'border-slate-700'}
                        `}
                    />
                ))}
            </div>
            {error && (
                <p className="text-sm text-red-400 mt-2 text-center">{error}</p>
            )}
        </div>
    );
};

// ============================================
// File Upload Dropzone
// ============================================

interface FileUploadProps {
    accept?: string;
    maxSize?: number;
    onChange?: (files: File[]) => void;
    multiple?: boolean;
    className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    accept = 'image/*',
    maxSize = 5,
    onChange,
    multiple = false,
    className = ''
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFiles = (fileList: File[]): File[] => {
        const validFiles: File[] = [];
        setError('');

        for (const file of fileList) {
            if (file.size > maxSize * 1024 * 1024) {
                setError(`File too large. Max size is ${maxSize}MB`);
                continue;
            }
            validFiles.push(file);
        }

        return validFiles;
    };

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        const validated = validateFiles(Array.from(fileList));
        setFiles(validated);
        onChange?.(validated);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onChange?.(newFiles);
    };

    return (
        <div className={className}>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragging
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                />
                <div className="text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-medium">Drag & drop files here</p>
                    <p className="text-sm mt-1">or click to browse</p>
                    <p className="text-xs mt-2">Max size: {maxSize}MB</p>
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-400 mt-2">{error}</p>
            )}

            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-slate-200 truncate max-w-[200px]">{file.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-slate-400 hover:text-red-400"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================
// Toggle Switch
// ============================================

interface ToggleSwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    checked = false,
    onChange,
    label,
    disabled = false,
    className = ''
}) => {
    return (
        <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange?.(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                />
                <div
                    className={`
                        w-12 h-6 rounded-full transition-colors duration-200
                        ${checked ? 'bg-green-500' : 'bg-slate-600'}
                    `}
                >
                    <div
                        className={`
                            absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                            ${checked ? 'translate-x-7' : 'translate-x-1'}
                        `}
                    />
                </div>
            </div>
            {label && <span className="text-sm text-slate-200">{label}</span>}
        </label>
    );
};

// ============================================
// Textarea
// ============================================

interface TextareaProps {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
    error?: string;
    className?: string;
    disabled?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
    label,
    placeholder,
    value,
    onChange,
    rows = 4,
    error,
    className = '',
    disabled = false
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-200">
                    {label}
                </label>
            )}
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                className={`
                    w-full px-4 py-3 bg-slate-800 border rounded-lg 
                    focus:ring-2 focus:ring-green-500 focus:border-transparent 
                    transition-all text-slate-100 placeholder-slate-500 resize-none
                    ${error ? 'border-red-500' : 'border-slate-700'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            />
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}
        </div>
    );
};

export default {
    FloatingLabelInput,
    InputWithIcon,
    SearchInput,
    OTPInput,
    FileUpload,
    ToggleSwitch,
    Textarea,
};
