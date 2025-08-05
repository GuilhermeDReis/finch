import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCardWithBank } from '@/types/creditCard';

interface CreditCardSelectorProps {
  selectedCreditCardId: string;
  onSelect: (id: string) => void;
}

export function CreditCardSelector({ selectedCreditCardId, onSelect }: CreditCardSelectorProps) {
  const [creditCards, setCreditCards] = useState<CreditCardWithBank[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCreditCards = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({
          title: "Erro",
          description: "Falha ao obter usuário autenticado.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (error) {
        toast({
          title: "Erro ao carregar cartões",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setCreditCards(data || []);
    };

    fetchCreditCards();
  }, []);

  return (
    <div className="mb-4">
      <Select value={selectedCreditCardId} onValueChange={onSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione o cartão de crédito" />
        </SelectTrigger>
        <SelectContent>
          {creditCards.map((card) => (
            <SelectItem key={card.id} value={card.id}>
              <div className="flex items-center">
                <span className="mr-2">💳</span>
                <span>{card.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
