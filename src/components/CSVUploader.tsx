import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { FileLayoutService } from '@/services/fileLayoutService';

interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  originalDescription: string;
  type: 'income' | 'expense';
}

interface CSVUploaderProps {
  onDataParsed: (data: ParsedTransaction[], layoutType?: 'bank' | 'credit_card') => void;
  onError: (error: string) => void;
  selectedBankId?: string;
}

// Enhanced transaction type detection with Brazilian context
// Now prioritizing amount-based detection over pattern matching
const detectTransactionType = (description: string, amount: number): 'income' | 'expense' => {
  const desc = description.toLowerCase();
  
  console.log(`🔍 [TYPE_DETECTION] Analyzing: "${description}" (amount: ${amount})`);
  
  // Priority 1: Amount-based detection (highest priority)
  if (amount === 0) {
    console.log(`⚠️ [TYPE_DETECTION] Zero amount, defaulting to expense`);
    return 'expense';
  }
  
  const amountBasedType = amount > 0 ? 'income' : 'expense';
  console.log(`🔢 [TYPE_DETECTION] Amount-based detection: ${amountBasedType} (${amount})`);
  
  // If amount clearly indicates expense (negative), return immediately
  if (amount < 0) {
    return 'expense';
  }
  
  // Priority 2: Known Brazilian companies/services (always expense when "enviada")
  const knownExpenseCompanies = [
    'uber', '99', 'taxi', 'ifood', 'rappi', 'delivery', 'd market', 'd.market',
    'emporio km', 'casa da sopa', 'navenda', 'americanas', 'magazine luiza',
    'mercado livre', 'shopee', 'amazon', 'netshoes', 'centauro', 'ponto frio',
    'casas bahia', 'extra', 'carrefour', 'pao de acucar', 'big', 'bompreco',
    'posto', 'shell', 'petrobras', 'ipiranga', 'ale', 'texaco',
    'farmacia', 'drogaria', 'drogasil', 'droga raia', 'pacheco',
    'academia', 'smartfit', 'bioritmo', 'bodytech',
    'netflix', 'spotify', 'amazon prime', 'disney+', 'globoplay',
    'stone', 'pagseguro', 'mercado pago', 'paypal', 'picpay',
    'nubank', 'inter', 'neon', 'c6 bank', 'original'
  ];

  // Priority 3: Transaction context patterns
  const contextPatterns = {
    income: [
      'recebido', 'recebimento', 'entrada', 'credito em conta', 'crédito em conta',
      'deposito', 'depósito', 'transferencia recebida', 'transferência recebida',
      'estorno', 'devolução', 'reembolso', 'restituição', 'pix recebido',
      'salario', 'salário', 'rendimento', 'dividendos', 'juros recebidos',
      'freelance', 'comissão', 'venda', 'bonificação', '13º salário'
    ],
    expense: [
      'enviada', 'enviado', 'pagamento', 'compra', 'debito', 'débito',
      'saque', 'pix enviado', 'transferencia enviada', 'transferência enviada',
      'cartao', 'cartão', 'boleto', 'financiamento', 'prestação',
      'mensalidade', 'anuidade', 'taxa', 'tarifa', 'multa', 'cobrança',
      'desconto em folha', 'fatura'
    ]
  };

  // Check for known expense companies
  for (const company of knownExpenseCompanies) {
    if (desc.includes(company)) {
      console.log(`🏢 [TYPE_DETECTION] Known expense company "${company}" found → expense`);
      return 'expense';
    }
  }

  // Check context patterns
  for (const pattern of contextPatterns.expense) {
    if (desc.includes(pattern)) {
      console.log(`💸 [TYPE_DETECTION] Expense context pattern "${pattern}" found → expense`);
      return 'expense';
    }
  }

  for (const pattern of contextPatterns.income) {
    if (desc.includes(pattern)) {
      console.log(`💰 [TYPE_DETECTION] Income context pattern "${pattern}" found → income`);
      return 'income';
    }
  }

  // Fallback to amount-based detection
  console.log(`🔢 [TYPE_DETECTION] Final fallback to amount-based detection: ${amountBasedType}`);
  return amountBasedType;
};

export default function CSVUploader({ onDataParsed, onError, selectedBankId }: CSVUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const parseDate = (dateStr: string): string => {
    // Handle different date formats
    if (dateStr.includes('/')) {
      // Brazilian format: DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      // Credit card format: YYYY-MM-DD (already in ISO format)
      return dateStr;
    }
  };

  const parseAmount = (amountStr: string): number => {
    console.log('💰 [PARSE_AMOUNT] Parsing:', amountStr);
    
    // Remove espaços e normalize
    let cleanAmount = amountStr.trim();
    
    // Remove prefixo de moeda (R$, $, etc.)
    cleanAmount = cleanAmount.replace(/^[R$€£¥]+\s?/i, '');
    
    // Handle negative values (check for minus sign)
    const isNegative = cleanAmount.includes('-');
    cleanAmount = cleanAmount.replace('-', '');
    
    // Brazilian number format: use comma as decimal separator
    if (cleanAmount.includes(',')) {
      // Remove dots (thousands separator) and replace comma with dot
      cleanAmount = cleanAmount.replace(/\./g, '');
      cleanAmount = cleanAmount.replace(',', '.');
    } else if (cleanAmount.includes('.')) {
      // Check if it's a decimal or thousands separator
      const parts = cleanAmount.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        // É decimal (ex: 946.20)
        // Não faz nada, já está correto
      } else {
        // It's thousands separator (e.g., 1.234.567)
        cleanAmount = cleanAmount.replace(/\./g, '');
      }
    }
    
    const result = parseFloat(cleanAmount);
    const finalResult = isNegative ? -result : result;
    
    console.log('💰 [PARSE_AMOUNT] Result:', amountStr, '->', finalResult);
    return finalResult;
  };

  const processCSV = useCallback(async (file: File) => {
    setIsProcessing(true);
    setStatus('processing');
    setProgress(0);
    setMessage('Processando arquivo...');

    try {
      // Check if bank is selected
      if (!selectedBankId) {
        throw new Error('Por favor, selecione um banco antes de importar o arquivo.');
      }

      // Parse CSV to get headers first
      const parseResult = await new Promise<any>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          preview: 1, // Just get headers and first row to check structure
          complete: (results) => {
            resolve(results);
          },
          error: (error: any) => {
            reject(error);
          }
        });
      });

      const headers = parseResult.meta.fields;
      if (!headers || headers.length === 0) {
        throw new Error('Não foi possível ler os cabeçalhos do arquivo.');
      }

      console.log('📋 [CSV] Headers found:', headers);

      // Find matching layout for the selected bank
      setMessage('Verificando layout do arquivo...');
      setProgress(25);

      const layoutMatchResult = await FileLayoutService.findMatchingLayout(selectedBankId, headers);
      
      if (!layoutMatchResult) {
        throw new Error(`O arquivo não corresponde ao padrão esperado para o banco selecionado. Cabeçalhos encontrados: ${headers.join(', ')}`);
      }

      const { layout: matchingLayout, layoutType } = layoutMatchResult;
      console.log('✅ [CSV] Matching layout found:', matchingLayout.name, 'Type:', layoutType);

      // Map headers to layout columns
      const headerMapping = FileLayoutService.mapHeadersToLayout(headers, matchingLayout);
      console.log('🔍 [CSV] Header mapping:', headerMapping);

      // Validate that all required columns are mapped
      if (!headerMapping.dateColumn || !headerMapping.amountColumn || 
          !headerMapping.identifierColumn || !headerMapping.descriptionColumn) {
        throw new Error('Não foi possível mapear todas as colunas necessárias do arquivo.');
      }

      // Parse the full CSV file with the validated layout
      setMessage('Processando transações...');
      setProgress(50);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (!results.data || results.data.length === 0) {
              throw new Error('Nenhum dado encontrado no arquivo.');
            }

            console.log('📋 [CSV] Full data parsed, rows:', results.data.length);

            setMessage('Analisando e categorizando transações...');
            setProgress(75);

            const transactions: ParsedTransaction[] = results.data
              .map((row: any) => {
                const rowValor = row[headerMapping.amountColumn];
                const amount = parseAmount(rowValor);
                const description = String(row[headerMapping.descriptionColumn]).trim();

                if (!row[headerMapping.dateColumn] || !rowValor || !row[headerMapping.identifierColumn] || !description || isNaN(amount)) {
                  return null;
                }

                // Enhanced type detection with Brazilian context
                const type = detectTransactionType(description, amount);

                return {
                  id: String(row[headerMapping.identifierColumn]).trim(),
                  date: parseDate(String(row[headerMapping.dateColumn]).trim()),
                  amount: Math.abs(amount), // Always store positive amount
                  description: description,
                  originalDescription: description,
                  type: type
                };
              })
              .filter((transaction): transaction is ParsedTransaction => transaction !== null);

            if (transactions.length === 0) {
              throw new Error('Nenhum transação válida foi encontrada no arquivo.');
            }

            // Log statistics
            const incomeCount = transactions.filter(t => t.type === 'income').length;
            const expenseCount = transactions.filter(t => t.type === 'expense').length;
            
            console.log('📊 [CSV] Processing complete:', {
              total: transactions.length,
              income: incomeCount,
              expense: expenseCount
            });

            setProgress(100);
            setStatus('success');
            setMessage(`${transactions.length} transações processadas! (${incomeCount} receitas, ${expenseCount} gastos)`);
            
            // Pass the layout type information to the parent component
            onDataParsed(transactions, layoutType);

          } catch (error) {
            console.error('❌ [CSV] Processing error:', error);
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Erro ao processar arquivo');
            onError(error instanceof Error ? error.message : 'Erro desconhecido');
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error: any) => {
          console.error('❌ [CSV] Parse error:', error);
          setStatus('error');
          setMessage(`Erro no parser CSV: ${error.message}`);
          onError(error.message);
          setIsProcessing(false);
        }
      });

    } catch (error) {
      console.error('❌ [CSV] Processing error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erro ao processar arquivo');
      onError(error instanceof Error ? error.message : 'Erro desconhecido');
      setIsProcessing(false);
    }
  }, [onDataParsed, onError, selectedBankId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setStatus('error');
      setMessage('Apenas arquivos CSV são aceitos');
      onError('Apenas arquivos CSV são aceitos');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus('error');
      setMessage('Arquivo muito grande. Limite máximo: 10MB');
      onError('Arquivo muito grande. Limite máximo: 10MB');
      return;
    }

    processCSV(file);
  }, [processCSV, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv']
    },
    multiple: false,
    disabled: isProcessing
  });

  const reset = () => {
    setStatus('idle');
    setProgress(0);
    setMessage('');
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
            ${isProcessing ? 'cursor-not-allowed opacity-50' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-4">
            {status === 'success' ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : status === 'error' ? (
              <AlertCircle className="h-12 w-12 text-red-500" />
            ) : (
              <Upload className="h-12 w-12 text-muted-foreground" />
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {status === 'success' ? 'Arquivo processado com sucesso!' :
                 status === 'error' ? 'Erro no processamento' :
                 isDragActive ? 'Solte o arquivo aqui' :
                 'Arraste um arquivo CSV ou clique para selecionar'}
              </h3>

              {status === 'idle' && (
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: .csv (máximo 10MB)<br />
                  Estrutura: Data, Valor, Identificador, Descrição<br />
                  <span className="text-xs text-primary">
                    ✨ Detecção inteligente de receitas e gastos
                  </span>
                </p>
              )}
            </div>

            {isProcessing && (
              <div className="w-full max-w-md space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Button onClick={reset} variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Carregar outro arquivo
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Button onClick={reset} variant="outline" size="sm">
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
