import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';

interface CSVRow {
  Data: string;
  Valor: string;
  Identificador: string;
  'DescriÃ§Ã£o': string;
}

interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  originalDescription: string;
  type: 'income' | 'expense';
}

interface CSVUploaderProps {
  onDataParsed: (data: ParsedTransaction[]) => void;
  onError: (error: string) => void;
}

export default function CSVUploader({ onDataParsed, onError }: CSVUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const parseDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const parseAmount = (amountStr: string): number => {
    const cleaned = amountStr.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
  };

  const processCSV = useCallback((file: File) => {
    setIsProcessing(true);
    setStatus('processing');
    setProgress(0);
    setMessage('Processando arquivo...');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      Papa.parse<CSVRow>(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        encoding: 'latin1',
        step: (results, parser) => {
          const progressPercent = Math.min((results.meta.cursor / file.size) * 90, 90);
          setProgress(progressPercent);
        },
        complete: (results) => {
          try {
            const actualHeaders = Object.keys(results.data[0] || {});
            console.log('Cabeçalhos encontrados no CSV:', actualHeaders);
            console.log('Primeiro registro completo:', results.data[0]);
            
            const expectedHeaders = ['Data', 'Valor', 'Identificador', 'DescriÃ§Ã£o'];
            
            const normalizedActualHeaders = actualHeaders.map(h => h.trim());
            console.log('Cabeçalhos normalizados:', normalizedActualHeaders);
            
            const missingHeaders = expectedHeaders.filter(h => !normalizedActualHeaders.includes(h));
            if (missingHeaders.length > 0) {
              console.log('Cabeçalhos ausentes:', missingHeaders);
              throw new Error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`);
            }

            setMessage('Convertendo dados...');
            setProgress(95);

            const transactions: ParsedTransaction[] = results.data
              .filter(row => row.Data && row.Valor && row.Identificador && row['DescriÃ§Ã£o'])
              .map(row => {
                const amount = parseAmount(row.Valor);
                return {
                  id: row.Identificador,
                  date: parseDate(row.Data),
                  amount: Math.abs(amount),
                  description: row['DescriÃ§Ã£o'].trim(),
                  originalDescription: row['DescriÃ§Ã£o'].trim(),
                  type: amount >= 0 ? 'income' : 'expense'
                };
              });

            if (transactions.length === 0) {
              throw new Error('Nenhuma transação válida encontrada no arquivo');
            }

            setProgress(100);
            setStatus('success');
            setMessage(`${transactions.length} transações carregadas com sucesso!`);
            onDataParsed(transactions);

          } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Erro ao processar arquivo');
            onError(error instanceof Error ? error.message : 'Erro desconhecido');
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error) => {
          setStatus('error');
          setMessage(`Erro ao ler arquivo: ${error.message}`);
          onError(error.message);
          setIsProcessing(false);
        }
      });
    };

    reader.onerror = () => {
      setStatus('error');
      setMessage('Erro ao ler o arquivo');
      onError('Erro ao ler o arquivo');
      setIsProcessing(false);
    };

    reader.readAsText(file, 'latin1');
  }, [onDataParsed, onError]);

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
                {status === 'success' ? 'Arquivo processado!' :
                 status === 'error' ? 'Erro no processamento' :
                 isDragActive ? 'Solte o arquivo aqui' :
                 'Arraste um arquivo CSV ou clique para selecionar'}
              </h3>
              
              {status === 'idle' && (
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: .csv (máximo 10MB)<br />
                  Estrutura: Data, Valor, Identificador, Descrição
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