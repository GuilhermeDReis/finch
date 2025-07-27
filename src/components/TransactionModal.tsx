import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransactionForm } from '@/components/TransactionForm';
import { Transaction, TransactionFormData, TransactionType } from '@/types/transaction';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => void;
  editTransaction?: Transaction | null;
  defaultType?: TransactionType;
}

export function TransactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editTransaction, 
  defaultType = 'expense' 
}: TransactionModalProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>(
    editTransaction?.type || defaultType
  );

  const handleSubmit = (data: TransactionFormData) => {
    onSubmit(data);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const modalTitle = editTransaction 
    ? `Editar ${editTransaction.type === 'income' ? 'Receita' : 'Despesa'}`
    : 'Cadastrar Nova Transação';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {modalTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {!editTransaction && (
            <div className="mb-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Tipo de Transação:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionType('income')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      transactionType === 'income'
                        ? 'bg-success text-white'
                        : 'bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType('expense')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      transactionType === 'expense'
                        ? 'bg-destructive text-white'
                        : 'bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Despesa
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <TransactionForm
            type={transactionType}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
