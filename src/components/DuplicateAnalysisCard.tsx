
import React from 'react';
import { AlertTriangle, CheckCircle, FileText, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import type { TransactionRow } from '@/types/transaction';

export type ImportMode = 'new-only' | 'update-existing' | 'import-all';

interface DuplicateAnalysisCardProps {
  duplicates: Array<{
    existing: any;
    new: TransactionRow;
    similarity: number;
    reasons: string[];
  }>;
  newTransactions: TransactionRow[];
  selectedMode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  onComplete: (selectedTransactions: TransactionRow[], action: 'import' | 'skip' | 'overwrite') => void;
  isLoading?: boolean;
}

export default function DuplicateAnalysisCard({
  duplicates,
  newTransactions,
  selectedMode,
  onModeChange,
  onComplete,
  isLoading = false
}: DuplicateAnalysisCardProps) {
  const totalNew = newTransactions.length;
  const totalDuplicates = duplicates.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Análise de Duplicatas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-700">{totalNew}</div>
              <div className="text-sm text-green-600">Novas transações</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-yellow-700">{totalDuplicates}</div>
              <div className="text-sm text-yellow-600">Duplicatas encontradas</div>
            </div>
          </div>
        </div>

        {/* Duplicate Warning */}
        {totalDuplicates > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Duplicatas detectadas:</strong> {totalDuplicates} transações já existem no sistema.
              Escolha como proceder abaixo.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Import Options */}
        <div className="space-y-4">
          <h3 className="font-semibold">Opções de Importação</h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => onModeChange('new-only')}>
              <input
                type="radio"
                name="import-mode"
                value="new-only"
                checked={selectedMode === 'new-only'}
                onChange={() => onModeChange('new-only')}
                className="text-primary"
              />
              <div className="flex-1">
                <div className="font-medium">Importar apenas novas transações</div>
                <div className="text-sm text-muted-foreground">
                  Ignorar duplicatas e importar {totalNew} transações novas
                </div>
              </div>
              <Badge variant="secondary">{totalNew} transações</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => onModeChange('update-existing')}>
              <input
                type="radio"
                name="import-mode"
                value="update-existing"
                checked={selectedMode === 'update-existing'}
                onChange={() => onModeChange('update-existing')}
                className="text-primary"
              />
              <div className="flex-1">
                <div className="font-medium">Atualizar transações existentes</div>
                <div className="text-sm text-muted-foreground">
                  Importar novas e atualizar as {totalDuplicates} transações duplicadas
                </div>
              </div>
              <Badge variant="secondary">{totalNew + totalDuplicates} transações</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => onModeChange('import-all')}>
              <input
                type="radio"
                name="import-mode"
                value="import-all"
                checked={selectedMode === 'import-all'}
                onChange={() => onModeChange('import-all')}
                className="text-primary"
              />
              <div className="flex-1">
                <div className="font-medium">Tentar importar tudo</div>
                <div className="text-sm text-muted-foreground">
                  Tentar importar todas as transações (duplicatas podem falhar)
                </div>
              </div>
              <Badge variant="outline">Comportamento atual</Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => {
              // Determine which transactions to send based on selected mode
              const transactionsToSend = selectedMode === 'new-only' 
                ? newTransactions 
                : [...newTransactions, ...duplicates.map(d => d.new)];
              
              onComplete(transactionsToSend, 'import');
            }}
            disabled={isLoading}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isLoading ? 'Processando...' : 'Prosseguir com Importação'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onComplete([], 'skip')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
