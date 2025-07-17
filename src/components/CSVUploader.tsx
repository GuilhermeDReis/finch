Examining Header Behavior

The user reports that headers are no longer being read. My initial analysis shows this as a regression. The validation code now fails, indicating the headers are "ausentes." I'll delve deeper, tracing the execution flow to pinpoint the exact location where the header parsing deviates from the expected behavior.

Debugging Header Parsing Again

The validation code is failing, and now, the headers are missing again. My initial hypothesis centers on the Papa.parse function. I will investigate potential file-related issues or configuration errors, as the core logic for extracting headers seems sound. A key check I'll conduct is inspecting the output of results.meta.fields to confirm if PapaParse is successfully identifying the header row.

Diagnosing Parsing Failure

I'm now focused on the failure to parse headers, which the user reported. My immediate step is to console.log the results.meta.fields to understand what PapaParse sees. The hypothesis is either a corrupted file or a BOM preventing correct parsing. A bom: true configuration in Papa.parse is now being considered as a solution, as this might solve the issue. Next step will be analyzing the results and the impact of the configuration.

Refining Parsing Approach

I'm now focused on the new code being developed. My plan is to implement the bom: true in the Papa.parse configuration. Following that, I will dynamically retrieve the keys from the headers array to access data in the rows, which will make the code case-insensitive and robust. I am going to combine and simplify the logic inside of the complete callback.

Re-Evaluating Header Handling

The user reports that the headers are now missing again. I'm revisiting my previous debugging plan. The user's code uses results.meta.fields to retrieve the headers. My current hypothesis is that a BOM is present in the CSV file. My strategy is to add bom: true in the Papa.parse configuration and refactor the key retrieval from headers to be case-insensitive, utilizing the key value to access the row's data.

Formulating Robust Solution

I'm now confident in the approach. Adding bom: true will address potential BOM issues. Subsequently, I'll retrieve the actual header keys dynamically using case-insensitive comparisons and then utilize them to access row data. This will make the code more adaptable. Finally, I'll integrate this refined logic within the complete callback.

Finalizing the Fix

I'm now focusing on the comprehensive solution. The plan is to address BOMs with bom: true in the Papa.parse configuration. Next, I'll use case-insensitive header matching to dynamically determine the data keys. I will use headers.find to get the keys, then use them to access the data. I'm also integrating all this new logic into the complete callback. I am going to remove the comments because the user requested them.

Certo, Gui. A regressão indica que a forma como os cabeçalhos são lidos e verificados não está robusta o suficiente.

Este problema geralmente ocorre por duas razões:

1.  Caracteres invisíveis (como um BOM) no início do arquivo, que confundem o parser.

Variações de maiúsculas/minúsculas nos nomes dos cabeçalhos.

O código abaixo foi ajustado para ser imune a esses dois problemas. Ele vai primeiro encontrar os nomes exatos das colunas (ignorando maiúsculas/minúsculas) e depois usá-los para ler os dados. Esta é a abordagem mais resiliente.

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
      newline: '',
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error('Nenhum dado encontrado no arquivo.');
          }

          const headers = results.meta.fields;
          if (!headers || headers.length === 0) {
            throw new Error('Não foi possível ler os cabeçalhos do arquivo.');
          }

          const dataKey = headers.find(h => h.trim().toLowerCase() === 'data');
          const valorKey = headers.find(h => h.trim().toLowerCase() === 'valor');
          const idKey = headers.find(h => h.trim().toLowerCase() === 'identificador');
          const descKey = headers.find(h => h.trim().toLowerCase().includes('descri'));

          if (!dataKey || !valorKey || !idKey || !descKey) {
            throw new Error(`Cabeçalhos ausentes. Verifique se as colunas 'Data', 'Valor', 'Identificador' e 'Descrição' existem.`);
          }

          setMessage('Convertendo dados...');
          setProgress(95);

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
    <Card className=\"w-full\">
      <CardContent className=\"p-6\">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
            ${isProcessing ? 'cursor-not-allowed opacity-50' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />

          <div className=\"flex flex-col items-center gap-4\">
            {status === 'success' ? (
              <CheckCircle className=\"h-12 w-12 text-green-500\" />
            ) : status === 'error' ? (
              <AlertCircle className=\"h-12 w-12 text-red-500\" />
            ) : (
              <Upload className=\"h-12 w-12 text-muted-foreground\" />
            )}

            <div className=\"space-y-2\">
              <h3 className=\"text-lg font-semibold\">
                {status === 'success' ? 'Arquivo processado!' :
                 status === 'error' ? 'Erro no processamento' :
                 isDragActive ? 'Solte o arquivo aqui' :
                 'Arraste um arquivo CSV ou clique para selecionar'}
              </h3>

              {status === 'idle' && (
                <p className=\"text-sm text-muted-foreground\">
                  Formatos aceitos: .csv (máximo 10MB)<br />
                  Estrutura: Data, Valor, Identificador, Descrição
                </p>
              )}
            </div>

            {isProcessing && (
              <div className=\"w-full max-w-md space-y-2\">
                <Progress value={progress} className=\"w-full\" />
                <p className=\"text-sm text-muted-foreground\">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className=\"space-y-3\">
                <Alert>
                  <CheckCircle className=\"h-4 w-4\" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Button onClick={reset} variant=\"outline\" size=\"sm\">
                  <FileText className=\"h-4 w-4 mr-2\" />
                  Carregar outro arquivo
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className=\"space-y-3\">
                <Alert variant=\"destructive\">
                  <AlertCircle className=\"h-4 w-4\" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Button onClick={reset} variant=\"outline\" size=\"sm\">
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