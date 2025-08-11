import React from 'react';
import { BelvoConfigProvider } from '@/contexts/BelvoConfigContext';
import { GlobalConfig } from '@/components/belvo/GlobalConfig';
import { TabsNavigation } from '@/components/belvo/TabsNavigation';
import { CreateLinkTab } from '@/components/belvo/CreateLinkTab';
import { GetAccountsTab } from '@/components/belvo/GetAccountsTab';
import { GetTransactionsTab } from '@/components/belvo/GetTransactionsTab';
import { useBelvoConfig } from '@/contexts/BelvoConfigContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

// Componente interno que usa o contexto
function BelvoTestPageContent() {
  const { activeTab } = useBelvoConfig();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'config':
        return <GlobalConfig />;
      case 'create-link':
        return <CreateLinkTab />;
      case 'get-accounts':
        return <GetAccountsTab />;
      case 'get-transactions':
        return <GetTransactionsTab />;
      default:
        return <GlobalConfig />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Belvo API - Tela de Teste
              </CardTitle>
              <CardDescription className="text-lg">
                Interface para testar endpoints da API Belvo em ambiente sandbox.
                Configure sua chave API e teste a criação de links, obtenção de contas e transações.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Aviso de Segurança */}
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Aviso de Segurança:</strong> Esta é uma tela de teste para ambiente sandbox. 
            Em produção, as credenciais da API devem ser mantidas seguras no backend e nunca 
            expostas no código do frontend. Use apenas credenciais de teste/sandbox aqui.
          </AlertDescription>
        </Alert>

        {/* Navegação por Abas */}
        <div className="mb-6">
          <TabsNavigation />
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="space-y-6">
          {renderActiveTab()}
        </div>

        {/* Footer com Informações */}
        <div className="mt-12 pt-8 border-t">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Sobre esta Interface</h3>
                  <p className="text-sm text-muted-foreground">
                    Esta interface permite testar os principais endpoints da API Belvo 
                    em ambiente sandbox. Siga o fluxo: Configure → Criar Link → 
                    Obter Contas → Obter Transações.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Documentação</h3>
                  <p className="text-sm text-muted-foreground">
                    Para mais informações sobre a API Belvo, consulte a{' '}
                    <a 
                      href="https://developers.belvo.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      documentação oficial
                    </a>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Componente principal que fornece o contexto
export function BelvoTestPage() {
  return (
    <BelvoConfigProvider>
      <BelvoTestPageContent />
    </BelvoConfigProvider>
  );
}