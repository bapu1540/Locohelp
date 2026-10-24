import React from 'react';

interface LocoHelpLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function LocoHelpLogo({ 
  size = 44, 
  className = '',
  showText = false,
  textSize = 'md'
}: LocoHelpLogoProps) {
  return (
    <div className={`flex items-center justify-center gap-1 md:gap-2 flex-shrink-0 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        className="drop-shadow-md flex-shrink-0 overflow-visible h-7 w-7 md:h-9 md:w-9"
      >
        {/* 1. Supporting Bottom Arc / Curve (Aakar - Loco Orange #FF8800) */}
        {/* Smooth, symmetrical smile cradle centered around the pin tip */}
        <path 
          d="M 16 60 C 26 84, 42 93, 50 93 C 58 93, 74 84, 84 60 C 87 53, 77 49, 73 55 C 65 67, 57 76, 50 76 C 43 76, 35 67, 27 55 C 23 49, 13 53, 16 60 Z" 
          fill="#FF8800" 
          stroke="#FF8800" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* 2. Primary Location Pin (Loco Blue #0066FF) */}
        {/* Perfectly centered at X=50, tip pointing right into the center of the arc */}
        <path 
          d="M 50 6 C 36 6 25 17 25 31 C 25 46 50 66 50 66 C 50 66 75 46 75 31 C 75 17 64 6 50 6 Z M 50 42 C 43.9 42 39 37.1 39 31 C 39 24.9 43.9 20 50 20 C 56.1 20 61 24.9 61 31 C 61 37.1 56.1 42 50 42 Z" 
          fill="#0066FF" 
        />
      </svg>

      {showText && (
        <div className={`font-black tracking-tight flex-shrink-0 flex items-center justify-center gap-0.5 text-center leading-none ${
          textSize === 'sm' ? 'text-base md:text-2xl' :
          textSize === 'lg' ? 'text-4xl sm:text-6xl' :
          textSize === 'xl' ? 'text-5xl sm:text-7xl' :
          'text-2xl sm:text-3xl md:text-4xl'
        }`}>
          <span className="text-[#0066FF] dark:text-[#3388FF] drop-shadow-xs">Loco</span>
          <span className="text-[#FF8800] dark:text-orange-400 drop-shadow-xs">Help</span>
        </div>
      )}
    </div>
  );
}
