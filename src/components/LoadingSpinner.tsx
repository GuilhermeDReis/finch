import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Carregando...', 
  className = '' 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-muted-foreground`} />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
};

export const FullPageLoader = ({ text = 'Carregando...' }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" text={text} />
  </div>
);
