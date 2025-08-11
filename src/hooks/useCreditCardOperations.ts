import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCardService } from '@/services/creditCardService';
import { CreditCardFormData, CreditCardWithBank } from '@/types/creditCard';
import { toast } from 'sonner';

export interface CreditCardOperationsState {
  creditCards: CreditCardWithBank[];
  isLoading: boolean;
  error: string | null;
}

export interface CreditCardOperationsActions {
  loadCreditCards: () => Promise<void>;
  createCreditCard: (formData: CreditCardFormData) => Promise<boolean>;
  updateCreditCard: (cardId: string, formData: Partial<CreditCardFormData>) => Promise<boolean>;
  archiveCreditCard: (cardId: string) => Promise<boolean>;
  refreshCreditCards: () => Promise<void>;
}

export function useCreditCardOperations() {
  const { user } = useAuth();
  const [state, setState] = useState<CreditCardOperationsState>({
    creditCards: [],
    isLoading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const loadCreditCards = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const cards = await CreditCardService.fetchUserCreditCards(user.id);
      setState(prev => ({ ...prev, creditCards: cards, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar cartões';
      setError(errorMessage);
      setLoading(false);
      toast.error('Erro ao carregar cartões de crédito');
    }
  }, [user?.id, setLoading, setError]);

  const createCreditCard = useCallback(async (formData: CreditCardFormData): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await CreditCardService.createCreditCard(formData, user.id);
      toast.success('Cartão de crédito criado com sucesso!');
      await loadCreditCards(); // Refresh the list
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar cartão';
      setError(errorMessage);
      toast.error('Erro ao criar cartão de crédito');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadCreditCards, setLoading, setError]);

  const updateCreditCard = useCallback(async (
    cardId: string, 
    formData: Partial<CreditCardFormData>
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await CreditCardService.updateCreditCard(cardId, formData, user.id);
      toast.success('Cartão de crédito atualizado com sucesso!');
      await loadCreditCards(); // Refresh the list
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar cartão';
      setError(errorMessage);
      toast.error('Erro ao atualizar cartão de crédito');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadCreditCards, setLoading, setError]);

  const archiveCreditCard = useCallback(async (cardId: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await CreditCardService.archiveCreditCard(cardId, user.id);
      toast.success('Cartão arquivado com sucesso!');
      await loadCreditCards(); // Refresh the list
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao arquivar cartão';
      setError(errorMessage);
      toast.error('Erro ao arquivar cartão de crédito');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadCreditCards, setLoading, setError]);

  const refreshCreditCards = useCallback(async () => {
    await loadCreditCards();
  }, [loadCreditCards]);

  return {
    ...state,
    loadCreditCards,
    createCreditCard,
    updateCreditCard,
    archiveCreditCard,
    refreshCreditCards,
  };
}