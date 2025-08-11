import React, { useState } from 'react';
import { Link2, Copy, Check, AlertTriangle, Info } from 'lucide-react';
import { useBelvoConfig } from '@/contexts/BelvoConfigContext';
import { useBelvoApi, useBelvoValidation } from '@/hooks/useBelvoApi';
import { LinkCreationParams, BelvoInstitution, AccessMode } from '@/types/belvo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from './JsonViewer';
import { useToast } from '@/hooks/use-toast';

const institutionOptions = [
  { value: BelvoInstitution.BANORTE, label: 'Banorte' },
  { value: BelvoInstitution.BBVA, label: 'BBVA México' },
  { value: BelvoInstitution.SANTANDER, label: 'Santander México' },
  { value: BelvoInstitution.BANAMEX, label: 'Banamex' },
  { value: BelvoInstitution.HSBC, label: 'HSBC México' }
];

const accessModeOptions = [
  { 
    value: AccessMode.SINGLE, 
    label: 'Single', 
    description: 'Acesso único - dados coletados uma vez' 
  },
  { 
    value: AccessMode.RECURRENT, 
    label: 'Recurrent', 
    description: 'Acesso recorrente - dados atualizados automaticamente' 
  }
];

export function CreateLinkTab() {
  const { setCurrentLinkId } = useBelvoConfig();
  const { createLinkDirect, isLoading, error, clearError } = useBelvoApi();
  const { validateLinkParams } = useBelvoValidation();
  const { toast } = useToast();

  const [params, setParams] = useState<LinkCreationParams>({
    institution: '',
    username: '',
    password: '',
    access_mode: AccessMode.SINGLE,
    username_type: '',
    certificate: '',
    private_key: ''
  });

  const [apiResponse, setApiResponse] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [linkIdCopied, setLinkIdCopied] = useState(false);

  const handleInputChange = (field: keyof LinkCreationParams, value: string) => {
    setParams(prev => ({ ...prev, [field]: value }));
    
    // Limpar erros quando o usuário começar a digitar
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar parâmetros
    const errors = validateLinkParams(params);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Limpar estados anteriores
    setValidationErrors([]);
    setApiResponse(null);
    clearError();

    try {
      // Usar a nova API direta
      const result = await createLinkDirect(
        params.institution,
        params.username,
        params.password,
        params.access_mode
      );
      
      // Definir resposta da API
      setApiResponse(result);
      
      // Se bem-sucedido, atualizar currentLinkId no estado global
      if (result && result.id) {
        setCurrentLinkId(result.id);
        
        toast({
          title: "Link criado com sucesso!",
          description: `Link ID: ${result.id}`,
        });
      }
    } catch (err) {
      console.error('Erro ao criar link:', err);
      // O erro já foi definido pelo hook useBelvoApi
    }
  };

  const handleCopyLinkId = async () => {
    if (apiResponse?.id) {
      try {
        await navigator.clipboard.writeText(apiResponse.id);
        setLinkIdCopied(true);
        toast({
          title: "Link ID copiado!",
          description: "ID copiado para a área de transferência",
        });
        setTimeout(() => setLinkIdCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o Link ID",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setParams({
      institution: '',
      username: '',
      password: '',
      access_mode: AccessMode.SINGLE,
      username_type: '',
      certificate: '',
      private_key: ''
    });
    setApiResponse(null);
    setValidationErrors([]);
    clearError();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Criar Link com Instituição
          </CardTitle>
          <CardDescription>
            Conecte-se com uma instituição financeira para acessar contas e transações.
            O link criado será usado nos próximos endpoints.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parâmetros de Conexão</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Instituição */}
            <div className="space-y-2">
              <Label htmlFor="institution">Instituição *</Label>
              <Select
                value={params.institution}
                onValueChange={(value) => handleInputChange('institution', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instituição" />
                </SelectTrigger>
                <SelectContent>
                  {institutionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usuário */}
            <div className="space-y-2">
              <Label htmlFor="username">Usuário *</Label>
              <Input
                id="username"
                type="text"
                value={params.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Seu usuário da instituição"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={params.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Sua senha da instituição"
              />
            </div>

            {/* Modo de Acesso */}
            <div className="space-y-2">
              <Label htmlFor="access_mode">Modo de Acesso *</Label>
              <Select
                value={params.access_mode}
                onValueChange={(value) => handleInputChange('access_mode', value as AccessMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accessModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos Opcionais */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground">
                Campos Opcionais
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username_type">Tipo de Usuário</Label>
                  <Input
                    id="username_type"
                    type="text"
                    value={params.username_type}
                    onChange={(e) => handleInputChange('username_type', e.target.value)}
                    placeholder="Ex: document, email"
                  />
                </div>
              </div>
            </div>

            {/* Erros de Validação */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Erro da API */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                {isLoading ? 'Criando Link...' : 'Criar Link'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isLoading}
              >
                Limpar Formulário
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resultado */}
      {apiResponse && (
        <div className="space-y-4">
          {/* Link ID em destaque */}
          {apiResponse.id && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-green-900 dark:text-green-100">
                      Link criado com sucesso!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Use este ID nos próximos endpoints:
                    </p>
                    <code className="inline-block mt-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200 font-mono text-sm">
                      {apiResponse.id}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLinkId}
                    className="flex items-center gap-2"
                  >
                    {linkIdCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar ID
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* JSON Completo */}
          <JsonViewer
            data={apiResponse}
            title="Resposta Completa da API"
            showMetadata={false}
          />
        </div>
      )}

      {/* Informações Adicionais */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Dica:</strong> Após criar o link com sucesso, você poderá usar o ID gerado 
          para acessar as abas "Obter Contas" e "Obter Transações". O ID será automaticamente 
          preenchido nos próximos formulários.
        </AlertDescription>
      </Alert>
    </div>
  );
}