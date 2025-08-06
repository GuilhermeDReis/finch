
import React from 'react';
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface ImportResult {
  successful: number;
  failed: number;
  skipped: number;
  updated: number;
  total: number;
  errors: string[];
}

interface ImportResultsCardProps {
  result: ImportResult;
  onClose: () => void;
}

export default function ImportResultsCard({ result, onClose }: ImportResultsCardProps) {
  const { successful, failed, skipped, updated, total, errors } = result || {
    successful: 0,
    failed: 0,
    skipped: 0,
    updated: 0,
    total: 0,
    errors: []
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resultado da Importação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <div className="font-bold text-green-700">{successful}</div>
              <div className="text-xs text-green-600">Importadas</div>
            </div>
          </div>
          
          {updated > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-bold text-blue-700">{updated}</div>
                <div className="text-xs text-blue-600">Atualizadas</div>
              </div>
            </div>
          )}
          
          {skipped > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="font-bold text-yellow-700">{skipped}</div>
                <div className="text-xs text-yellow-600">Ignoradas</div>
              </div>
            </div>
          )}
          
          {failed > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="font-bold text-red-700">{failed}</div>
                <div className="text-xs text-red-600">Falharam</div>
              </div>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {successful > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importação concluída com sucesso!</strong> {successful} de {total} transações foram processadas.
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erros encontrados:</strong>
              <ul className="mt-2 list-disc list-inside text-sm">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 5 && (
                  <li>... e mais {errors.length - 5} erros</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Message */}
        <div className="text-center text-sm text-muted-foreground">
          {successful === total ? (
            <span className="text-green-600">Todas as transações foram importadas com sucesso!</span>
          ) : (
            <span>
              {successful} de {total} transações importadas
              {failed > 0 && ` (${failed} falharam)`}
              {skipped > 0 && ` (${skipped} ignoradas)`}
            </span>
          )}
        </div>

        <Button onClick={onClose} className="w-full">
          Fechar
        </Button>
      </CardContent>
    </Card>
  );
}
