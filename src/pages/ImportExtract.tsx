import React, { useState } from 'react';
import { Upload, FileText, Save, X, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import CSVUploader from '@/components/CSVUploader';
import TransactionImportTable from '@/components/TransactionImportTable';
import { supabase } from '@/integrations/supabase/client';

interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  originalDescription: string;
  type: 'income' | 'expense';
}

interface TransactionRow extends ParsedTransaction {
  categoryId?: string;
  subcategoryId?: string;
  editedDescription?: string;
  isEditing?: boolean;
  selected?: boolean;
}

export default function ImportExtract() {
  const [importedData, setImportedData] = useState<ParsedTransaction[]>([]);
  const [processedData, setProcessedData] = useState<TransactionRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [filename, setFilename] = useState('');
  const { toast } = useToast();

  const handleDataParsed = (data: ParsedTransaction[]) => {
    setImportedData(data);
    setProcessedData(data.map(t => ({ ...t, selected: false })));
    toast({
      title: "Arquivo processado",
      description: `${data.length} transações carregadas com sucesso`,
    });
  };

  const handleError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Erro no processamento",
      description: error,
    });
  };

  const handleTransactionsUpdate = (transactions: TransactionRow[]) => {
    setProcessedData(transactions);
  };

  const clearData = () => {
    setImportedData([]);
    setProcessedData([]);
    setFilename('');
  };

  const validateTransactions = () => {
    const errors: string[] = [];
    let validCount = 0;
    
    processedData.forEach((transaction, index) => {
      if (!transaction.categoryId) {
        errors.push(`Linha ${index + 1}: Categoria não selecionada`);
      } else {
        validCount++;
      }
    });

    return { errors, validCount };
  };

  const importTransactions = async () => {
    if (processedData.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhuma transação para importar",
      });
      return;
    }

    const { errors, validCount } = validateTransactions();
    
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validação falhada",
        description: `${errors.length} transações com problemas. Categorize todas as transações antes de importar.`,
      });
      return;
    }

    setIsImporting(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Create import session
      const { data: session, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          user_id: user.id,
          filename: filename || 'extrato_bancario.csv',
          total_records: processedData.length,
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Prepare transactions for insert
      const transactionsToInsert = processedData.map(transaction => ({
        user_id: user.id,
        external_id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.editedDescription || transaction.description,
        original_description: transaction.originalDescription,
        category_id: transaction.categoryId,
        subcategory_id: transaction.subcategoryId,
        type: transaction.type,
        import_session_id: session.id,
        payment_method: transaction.type === 'income' ? 'Transferência' : 'Cartão de Débito'
      }));

      // Insert transactions in batches
      const batchSize = 100;
      let processedCount = 0;

      for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
        const batch = transactionsToInsert.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(batch);

        if (insertError) {
          // Handle duplicate external_id error
          if (insertError.code === '23505') {
            toast({
              variant: "destructive",
              title: "Transações duplicadas",
              description: "Algumas transações já foram importadas anteriormente",
            });
          } else {
            throw insertError;
          }
        }

        processedCount += batch.length;

        // Update session progress
        await supabase
          .from('import_sessions')
          .update({ processed_records: processedCount })
          .eq('id', session.id);
      }

      // Mark session as completed
      await supabase
        .from('import_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_records: processedCount
        })
        .eq('id', session.id);

      toast({
        title: "Importação concluída",
        description: `${processedCount} transações importadas com sucesso`,
      });

      clearData();

    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getStats = () => {
    const categorized = processedData.filter(t => t.categoryId).length;
    const uncategorized = processedData.length - categorized;
    const totalValue = processedData.reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);

    return { categorized, uncategorized, totalValue };
  };

  const stats = getStats();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Importar Extrato Bancário</h1>
            <p className="text-muted-foreground">
              Importe transações de arquivos CSV do seu banco
            </p>
          </div>
          
          {importedData.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearData}
                disabled={isImporting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados
              </Button>
              <Button
                onClick={importTransactions}
                disabled={isImporting || stats.uncategorized > 0}
                className="min-w-[140px]"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Importar ({stats.categorized})
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Status badges */}
        {importedData.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">
              {importedData.length} transações carregadas
            </Badge>
            <Badge variant={stats.uncategorized === 0 ? "default" : "destructive"}>
              {stats.categorized} categorizadas
            </Badge>
            {stats.uncategorized > 0 && (
              <Badge variant="destructive">
                {stats.uncategorized} sem categoria
              </Badge>
            )}
            <Badge variant="outline" className="text-purple-600">
              {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(stats.totalValue)} total
            </Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* File upload section */}
      {importedData.length === 0 && (
        <div className="space-y-6">
          <CSVUploader 
            onDataParsed={handleDataParsed}
            onError={handleError}
          />
          
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Formato do Arquivo CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Estrutura obrigatória:</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-sm mt-2">
                  Data,Valor,ID_Transacao,Descricao
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Especificações:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Data: DD/MM/AAAA</li>
                    <li>Valor: Formato brasileiro (1.234,56)</li>
                    <li>Codificação: latin-1 (Windows-1252)</li>
                    <li>Tamanho máximo: 10MB</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold">Exemplo:</h4>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs">
                    15/01/2024,-150,50,Supermercado XYZ<br />
                    16/01/2024,2.500,00,Salário Janeiro<br />
                    17/01/2024,-45,30,Combustível
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import table */}
      {importedData.length > 0 && (
        <div className="space-y-4">
          {stats.uncategorized > 0 && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> {stats.uncategorized} transações ainda precisam de categoria. 
                Categorize todas as transações antes de importar.
              </AlertDescription>
            </Alert>
          )}
          
          <TransactionImportTable
            transactions={importedData}
            onTransactionsUpdate={handleTransactionsUpdate}
          />
        </div>
      )}
    </div>
  );
}