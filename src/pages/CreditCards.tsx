import React, { useState, useEffect } from 'react';
import { Plus, Archive, Edit, Trash2, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCardModal } from '@/components/CreditCardModal';
import { CreditCardGrid } from '@/components/CreditCardGrid';
import { toast } from 'sonner';
import { getLogger } from '@/utils/logger';
import { CreditCardWithBank } from '@/types/creditCard';
import { useCreditCardOperations } from '@/hooks/useCreditCardOperations';

const logger = getLogger('CreditCards');

export default function CreditCards() {
  const { 
    creditCards, 
    isLoading, 
    loadCreditCards, 
    archiveCreditCard 
  } = useCreditCardOperations();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardWithBank | null>(null);

  useEffect(() => {
    loadCreditCards();
  }, [loadCreditCards]);

  const handleAddNew = () => {
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const handleEdit = (card: CreditCardWithBank) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
  };

  const handleArchive = async (cardId: string) => {
    const success = await archiveCreditCard(cardId);
    if (success) {
      logger.info('Card archived successfully', { cardId });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando cartões...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-light text-gray-900 dark:text-white">Cartões de Crédito</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Gerencie seus cartões e acompanhe suas faturas
                </p>
              </div>
            </div>
            <Button 
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Cartão
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Cartões</p>
                  <p className="text-2xl font-light text-gray-900 dark:text-white">{creditCards.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cartões Ativos</p>
                  <p className="text-2xl font-light text-gray-900 dark:text-white">{creditCards.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bancos Diferentes</p>
                  <p className="text-2xl font-light text-gray-900 dark:text-white">
                    {new Set(creditCards.map(card => card.bank?.name)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          {creditCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum cartão cadastrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Comece adicionando seu primeiro cartão de crédito para acompanhar suas faturas e transações.
              </p>
              <Button 
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Cartão
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Seus Cartões ({creditCards.length})
                </h2>
              </div>
              
              <CreditCardGrid
                creditCards={creditCards}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onAddNew={handleAddNew}
              />
            </div>
          )}
        </div>

        <CreditCardModal
           isOpen={isModalOpen}
           onClose={handleModalClose}
           editingCard={editingCard}
           onSuccess={handleModalSuccess}
         />
      </div>
    </div>
  );
}
