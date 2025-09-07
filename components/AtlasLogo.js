import React from 'react';

export default function AtlasLogo({ size = 32, className = "", style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5"/>
      <path 
        d="M10 10 L10 22 M10 10 L22 10 M10 16 L20 16 M10 22 L22 22" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
