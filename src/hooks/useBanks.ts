import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/utils/logger';

const logger = getLogger('useBanks');

export interface Bank {
  id: string;
  name: string;
  code: string;
  icon_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UseBanksState {
  banks: Bank[];
  isLoading: boolean;
  error: string | null;
}

export interface UseBanksActions {
  loadBanks: () => Promise<void>;
  refreshBanks: () => Promise<void>;
  getBankById: (bankId: string) => Bank | undefined;
  getBankByName: (bankName: string) => Bank | undefined;
}

export function useBanks() {
  const [state, setState] = useState<UseBanksState>({
    banks: [],
    isLoading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const loadBanks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name');

      if (error) throw error;

      setState(prev => ({ 
        ...prev, 
        banks: data || [], 
        isLoading: false 
      }));

      logger.info('Banks loaded successfully', { count: data?.length || 0 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar bancos';
      setError(errorMessage);
      setLoading(false);
      logger.error('Error loading banks', { error: errorMessage });
    }
  }, [setLoading, setError]);

  const refreshBanks = useCallback(async () => {
    await loadBanks();
  }, [loadBanks]);

  const getBankById = useCallback((bankId: string): Bank | undefined => {
    return state.banks.find(bank => bank.id === bankId);
  }, [state.banks]);

  const getBankByName = useCallback((bankName: string): Bank | undefined => {
    return state.banks.find(bank => 
      bank.name.toLowerCase().includes(bankName.toLowerCase())
    );
  }, [state.banks]);

  // Load banks on mount
  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

  return {
    ...state,
    loadBanks,
    refreshBanks,
    getBankById,
    getBankByName,
  };
}