import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCardModal } from '@/components/CreditCardModal';
import { CreditCardGrid } from '@/components/CreditCardGrid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCardWithBank, CreditCard } from '@/types/creditCard';

export default function CreditCards() {
  const [creditCards, setCreditCards] = useState<CreditCardWithBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardWithBank | null>(null);
  const { user } = useAuth();

  // Fetch credit cards from database
  const fetchCreditCards = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First, let's test basic connectivity
      console.log('Testing Supabase connectivity...');
      
      // Test if we can connect to supabase at all
      const { data: testData, error: testError } = await supabase
        .from('banks')
        .select('id, name')
        .limit(1);
      
      if (testError) {
        console.error('Basic connectivity test failed:', testError);
        throw new Error(`Conectividade falhou: ${testError.message}`);
      }
      
      
      console.log('Basic connectivity OK, testing credit cards for user:', user.id);
      
      const { data, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          banks (
            id,
            name,
            icon_url
          )
        `)
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Credit cards fetched successfully:', data);
      setCreditCards(data || []);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
      toast.error(`Erro ao carregar cartões de crédito: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCards();
  }, [user]);

  const handleAddNew = () => {
    setEditingCard(null);
    setShowModal(true);
  };

  const handleEdit = (card: CreditCardWithBank) => {
    setEditingCard(card);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCard(null);
  };

  const handleCardSaved = () => {
    fetchCreditCards();
    handleModalClose();
    toast.success(editingCard ? 'Cartão atualizado com sucesso!' : 'Cartão cadastrado com sucesso!');
  };

  const handleArchive = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({ is_archived: true })
        .eq('id', cardId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setCreditCards(prev => prev.filter(card => card.id !== cardId));
      toast.success('Cartão arquivado com sucesso!');
    } catch (error) {
      console.error('Error archiving credit card:', error);
      toast.error('Erro ao arquivar cartão');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cartões de Crédito</h1>
              <p className="text-muted-foreground">
                Gerencie seus cartões de crédito e acompanhe seus gastos
              </p>
            </div>
            <Button onClick={handleAddNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Cartão de Crédito
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando cartões de crédito...</p>
            </div>
          </div>
        ) : (
          // Credit cards grid - Always show with action card
          <CreditCardGrid 
            creditCards={creditCards}
            onEdit={handleEdit}
            onArchive={handleArchive}
            onAddNew={handleAddNew}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CreditCardModal
          creditCard={editingCard}
          onClose={handleModalClose}
          onSave={handleCardSaved}
        />
      )}
    </div>
  );
}
