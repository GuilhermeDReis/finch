import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';

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
    if (typeof amountStr !== 'string') return NaN;
    const cleaned = amountStr.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
  };

  const processCSV = useCallback((file: File) => {
    setIsProcessing(true);
    setStatus('processing');
    setProgress(0);
    setMessage('Processando arquivo...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error('Nenhum dado encontrado no arquivo.');
          }

          const headers = results.meta.fields;
          if (!headers || headers.length === 0) {
            throw new Error('Não foi possível ler os cabeçalhos do arquivo.');
          }

          console.log('Cabeçalhos encontrados:', headers);

          const dataKey = headers.find(h => h.trim().toLowerCase() === 'data');
          const valorKey = headers.find(h => h.trim().toLowerCase() === 'valor');
          const idKey = headers.find(h => {
            const normalized = h.trim().toLowerCase();
            return normalized === 'identificador' || normalized === 'id_transacao';
          });
          const descKey = headers.find(h => {
            const normalized = h.trim().toLowerCase();
            return normalized === 'descricao' || normalized.includes('descri') || normalized.includes('descriÃ§Ã£o');
          });

          console.log('Chaves encontradas:', { dataKey, valorKey, idKey, descKey });

          if (!dataKey || !valorKey || !idKey || !descKey) {
            throw new Error(`Cabeçalhos ausentes. Encontrados: ${headers.join(', ')}. Necessário: Data, Valor, ID_Transacao ou Identificador, Descricao.`);
          }

          setMessage('Convertendo dados...');
          setProgress(50);

          const transactions: ParsedTransaction[] = results.data
            .map((row: any) => {
              const rowValor = row[valorKey];
              const amount = parseAmount(rowValor);

              if (!row[dataKey] || !rowValor || !row[idKey] || !row[descKey] || isNaN(amount)) {
                return null;
              }

              return {
                id: String(row[idKey]).trim(),
                date: parseDate(String(row[dataKey]).trim()),
                amount: Math.abs(amount),
                description: String(row[descKey]).trim(),
                originalDescription: String(row[descKey]).trim(),
                type: amount >= 0 ? 'income' : 'expense'
              };
            })
            .filter((transaction): transaction is ParsedTransaction => transaction !== null);

          if (transactions.length === 0) {
            throw new Error('Nenhuma transação válida foi encontrada no arquivo.');
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
      error: (error: any) => {
        setStatus('error');
        setMessage(`Erro no parser CSV: ${error.message}`);
        onError(error.message);
        setIsProcessing(false);
      }
    });
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