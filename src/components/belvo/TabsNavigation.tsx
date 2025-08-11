import React from 'react';
import { Link2, CreditCard, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { useBelvoConfig } from '@/contexts/BelvoConfigContext';
import { BelvoEndpoint } from '@/types/belvo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TabItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresLink?: boolean;
}

const tabs: TabItem[] = [
  {
    id: BelvoEndpoint.CREATE_LINK,
    label: 'Criar Link',
    description: 'Conectar com uma instituição financeira',
    icon: Link2,
    requiresLink: false
  },
  {
    id: BelvoEndpoint.GET_ACCOUNTS,
    label: 'Obter Contas',
    description: 'Listar contas do link criado',
    icon: CreditCard,
    requiresLink: true
  },
  {
    id: BelvoEndpoint.GET_TRANSACTIONS,
    label: 'Obter Transações',
    description: 'Buscar transações das contas',
    icon: ArrowRightLeft,
    requiresLink: true
  }
];

export function TabsNavigation() {
  const { activeTab, setActiveTab, currentLinkId } = useBelvoConfig();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const isTabDisabled = (tab: TabItem) => {
    return tab.requiresLink && !currentLinkId;
  };

  const isTabCompleted = (tabId: string) => {
    if (tabId === BelvoEndpoint.CREATE_LINK) {
      return !!currentLinkId;
    }
    return false;
  };

  return (
    <div className="w-full">
      {/* Navegação Principal */}
      <div className="flex flex-col sm:flex-row gap-2 p-1 bg-muted rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = isTabDisabled(tab);
          const isCompleted = isTabCompleted(tab.id);

          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              className={`
                flex-1 justify-start gap-3 h-auto p-4 text-left
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isActive ? 'shadow-sm' : ''}
              `}
              onClick={() => !isDisabled && handleTabClick(tab.id)}
              disabled={isDisabled}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              aria-disabled={isDisabled}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isCompleted && (
                    <CheckCircle className="w-3 h-3 text-green-600 absolute -top-1 -right-1 bg-background rounded-full" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tab.label}</span>
                    {isCompleted && (
                      <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                        Concluído
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {tab.description}
                  </p>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Indicador de Progresso */}
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          {tabs.map((tab, index) => (
            <div key={tab.id} className="flex items-center gap-1">
              <div
                className={`
                  w-2 h-2 rounded-full transition-colors
                  ${isTabCompleted(tab.id) 
                    ? 'bg-green-600' 
                    : activeTab === tab.id 
                      ? 'bg-primary' 
                      : 'bg-muted-foreground/30'
                  }
                `}
              />
              {index < tabs.length - 1 && (
                <div className="w-4 h-px bg-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>
        
        <span className="ml-2">
          {currentLinkId ? (
            <span className="text-green-600">
              Link ativo: {currentLinkId.substring(0, 8)}...
            </span>
          ) : (
            'Nenhum link criado'
          )}
        </span>
      </div>

      {/* Informações Contextuais */}
      {activeTab !== BelvoEndpoint.CREATE_LINK && !currentLinkId && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Atenção:</strong> Você precisa criar um link primeiro antes de acessar contas e transações.
          </p>
        </div>
      )}
    </div>
  );
}