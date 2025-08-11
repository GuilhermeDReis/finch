import React, { useState } from 'react';
import { Copy, Check, Maximize2, Minimize2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface JsonViewerProps {
  data: any;
  title?: string;
  className?: string;
  maxHeight?: string;
  showMetadata?: boolean;
  metadata?: {
    count?: number;
    next?: string | null;
    previous?: string | null;
    requestId?: string;
  };
}

export function JsonViewer({ 
  data, 
  title = "Resposta da API", 
  className = "",
  maxHeight = "400px",
  showMetadata = false,
  metadata
}: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const jsonString = JSON.stringify(data, null, 2);
  const isLargeData = jsonString.length > 5000;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "JSON copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o JSON",
        variant: "destructive"
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `belvo-response-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download iniciado",
      description: "Arquivo JSON baixado com sucesso",
    });
  };

  const formatJsonWithSyntaxHighlight = (json: string) => {
    return json
      .replace(/(".*?"):/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>:')
      .replace(/: (".*?")/g, ': <span class="text-green-600 dark:text-green-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-purple-600 dark:text-purple-400">$1</span>')
      .replace(/: (null)/g, ': <span class="text-gray-500 dark:text-gray-400">$1</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-orange-600 dark:text-orange-400">$1</span>');
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            {showMetadata && metadata?.count !== undefined && (
              <Badge variant="outline">
                {metadata.count} {metadata.count === 1 ? 'item' : 'itens'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isLargeData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    Recolher
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    Expandir
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Baixar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Metadata */}
        {showMetadata && metadata && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {metadata.requestId && (
              <span>ID: {metadata.requestId}</span>
            )}
            {metadata.next && (
              <span>• Próxima página disponível</span>
            )}
            {metadata.previous && (
              <span>• Página anterior disponível</span>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div 
          className={`
            relative bg-slate-50 dark:bg-slate-900 rounded-lg border overflow-auto
            ${isExpanded ? 'max-h-none' : ''}
          `}
          style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
        >
          <pre className="p-4 text-sm font-mono leading-relaxed">
            <code 
              dangerouslySetInnerHTML={{ 
                __html: formatJsonWithSyntaxHighlight(jsonString) 
              }}
            />
          </pre>
          
          {/* Indicador de conteúdo truncado */}
          {!isExpanded && isLargeData && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent flex items-end justify-center pb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="text-xs"
              >
                Ver mais...
              </Button>
            </div>
          )}
        </div>
        
        {/* Estatísticas do JSON */}
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>
            {jsonString.split('\n').length} linhas • {jsonString.length} caracteres
          </span>
          <span>
            {Array.isArray(data) ? `Array com ${data.length} itens` : typeof data}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}