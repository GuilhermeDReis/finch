import { Settings, Palette, Monitor } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemeDisplayName = () => {
    if (!mounted) return 'Carregando...';
    switch (theme) {
      case 'dark':
        return 'Modo Escuro';
      case 'light':
        return 'Modo Claro';
      case 'system':
        return 'Sistema';
      default:
        return 'Modo Claro';
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-gray-900 dark:text-white">Configurações</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Personalize a aparência e comportamento do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Configurações de Aparência */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Aparência</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure o tema e a aparência da interface
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tema */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Monitor className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Tema</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Atual: {getThemeDisplayName()}
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            {/* Descrição do tema */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {mounted && theme === 'dark' 
                  ? 'O modo escuro reduz o cansaço visual em ambientes com pouca luz e pode ajudar a economizar bateria em dispositivos com telas OLED.'
                  : 'O modo claro oferece melhor legibilidade em ambientes bem iluminados e é ideal para uso durante o dia.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Seção de Configurações Futuras */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Configurações Adicionais
            </h3>
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Mais opções de configuração serão adicionadas em breve
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}