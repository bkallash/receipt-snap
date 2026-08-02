import React from 'react';

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'dark' | 'light';
}

export function LogoIcon({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M6 24C6 12.9543 14.9543 4 26 4H30V16C30 27.0457 21.0457 36 10 36H6V24Z"
                fill="#10B981"
            />
            <path
                d="M12 13H22"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <path
                d="M10 19H20"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <path
                d="M8 25H16"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function Logo({
    className = '',
    iconOnly = false,
    size = 'md',
    variant = 'dark',
}: LogoProps) {
    const sizeClasses = {
        sm: { icon: 'h-6 w-6', text: 'text-base' },
        md: { icon: 'h-8 w-8', text: 'text-xl' },
        lg: { icon: 'h-10 w-10', text: 'text-2xl' },
    };

    const textColors = {
        dark: { primary: 'text-white', accent: 'text-emerald-500' },
        light: { primary: 'text-zinc-900', accent: 'text-emerald-600' },
    };

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <LogoIcon className={sizeClasses[size].icon} />
            {!iconOnly && (
                <span
                    className={`font-bold tracking-tight ${sizeClasses[size].text}`}
                >
                    <span className={textColors[variant].primary}>Receipt</span>
                    <span className={textColors[variant].accent}>Snap</span>
                </span>
            )}
        </div>
    );
}
