import React from 'react';

// Simple Nubank icon component using SVG
export const NubankIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <rect width="24" height="24" rx="4" fill="#8A05BE" />
    <path 
      d="M12 6L6 12L12 18L18 12L12 6Z" 
      fill="white" 
    />
  </svg>
);

// Bank data structure
export interface Bank {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Available banks (currently only Nubank)
export const BANKS: Bank[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    icon: NubankIcon
  }
];
