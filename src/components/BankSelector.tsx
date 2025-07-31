import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

// Simple default bank icon component using SVG
const DefaultBankIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <rect width="24" height="24" rx="4" fill="#6b7280" />
    <path 
      d="M12 6L6 12L12 18L18 12L12 6Z" 
      fill="white" 
    />
  </svg>
);

interface Bank {
  id: string;
  name: string;
  icon_url: string;
}

interface BankSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export const BankSelector = ({ 
  value, 
  onValueChange,
  disabled = false
}: BankSelectorProps) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data, error } = await supabase
          .from('banks')
          .select('id, name, icon_url')
          .order('name');

        if (error) {
          console.error('Error fetching banks:', error);
          // Fallback to default bank if fetch fails
          setBanks([{
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Nubank',
            icon_url: ''
          }]);
        } else {
          setBanks(data || []);
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
        // Fallback to default bank if fetch fails
        setBanks([{
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Nubank',
          icon_url: ''
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, []);

  // Set default value to first bank if no value is provided
  const selectedValue = value || (banks.length > 0 ? banks[0].id : '');

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Banco de origem
        </label>
        <div className="w-full max-w-md h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Carregando bancos...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Banco de origem
      </label>
      <Select value={selectedValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Selecione o Banco de origem">
            {selectedValue && (() => {
              const selectedBank = banks.find(bank => bank.id === selectedValue);
              return selectedBank && (
                <div className="flex items-center gap-2">
                  {selectedBank.icon_url ? (
                    <img src={selectedBank.icon_url} alt={selectedBank.name} className="h-4 w-4 object-contain" />
                  ) : (
                    <DefaultBankIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm">{selectedBank.name}</span>
                </div>
              );
            })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {banks.map((bank) => (
            <SelectItem key={bank.id} value={bank.id}>
              <div className="flex items-center gap-2">
                {bank.icon_url ? (
                  <img src={bank.icon_url} alt={bank.name} className="h-4 w-4 object-contain" />
                ) : (
                  <DefaultBankIcon className="h-4 w-4" />
                )}
                <span>{bank.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Selecione o banco de onde vem o extrato
      </p>
    </div>
  );
};
