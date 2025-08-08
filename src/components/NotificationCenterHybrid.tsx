import React, { useState, useMemo, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificationService } from '@/services/notificationService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getLogger } from '@/utils/logger';

// Criar uma instância do logger para este componente
const logger = getLogger('NotificationCenterHybrid');

interface HybridNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'general' | 'background_job' | 'transaction' | 'system';
  is_read: boolean;
  created_at: string;
  read_at?: string;
  data?: any;
}

interface NotificationCenterHybridProps {
  align?: 'start' | 'center' | 'end';
  maxWidth?: string;
}

const NotificationCenterHybrid: React.FC<NotificationCenterHybridProps> = ({
  align = 'end',
  maxWidth = '28rem'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local notifications (fallback data)
  const [localNotifications, setLocalNotifications] = useState<HybridNotification[]>([
    {
      id: '1',
      title: 'Importação Concluída',
      message: 'Suas transações foram importadas com sucesso. 45 transações processadas.',
      type: 'success',
      category: 'background_job',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      data: { jobType: 'transaction_import', recordCount: 45 }
    },
    {
      id: '2',
      title: 'Nova Transação Detectada',
      message: 'Transação de R$ -125,50 em SUPERMERCADO XYZ foi adicionada automaticamente.',
      type: 'info',
      category: 'transaction',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    }
  ]);

  // Online notifications (from Supabase)
  const [onlineNotifications, setOnlineNotifications] = useState<HybridNotification[]>([]);
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);

  // Check authentication status
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const { data: user, error } = await supabase.auth.getUser();
      const isAuthenticated = !error && !!user?.user;
      logger.debug('Verificação de status de autenticação', { isAuthenticated, hasError: !!error });
      return isAuthenticated;
    } catch (error) {
      logger.error('Erro ao verificar status de autenticação', { error });
      return false;
    }
  };

  // Try to connect to Supabase and fetch notifications
  const tryConnectToSupabase = async () => {
    logger.info('Tentando conectar ao Supabase');
    setLoading(true);
    setError(null);
    
    try {
      const isAuthenticated = await checkAuthStatus();
      
      if (!isAuthenticated) {
        logger.warn('Usuário não autenticado, usando modo offline');
        setError('Usuário não autenticado');
        setIsOnlineMode(false);
        return;
      }

      logger.info('Buscando notificações do Supabase');
      const notifications = await notificationService.getNotifications({ limit: 20 });
      
      setOnlineNotifications(notifications as HybridNotification[]);
      setIsOnlineMode(true);
      setError(null);
      
      logger.info('Modo online ativado com sucesso', { notificationCount: notifications.length });
      setupRealtimeSubscription();
    } catch (error: any) {
      logger.error('Falha ao conectar com Supabase', { error });
      setIsOnlineMode(false);
      setError(error.message || 'Erro ao conectar');
    } finally {
      setLoading(false);
    }
  };

  // Setup real-time subscription for notifications
  const setupRealtimeSubscription = async () => {
    try {
      logger.debug('Configurando subscrição em tempo real para notificações');
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        logger.warn('Usuário não autenticado, não é possível configurar subscrição');
        return;
      }

      if (realtimeSubscription) {
        logger.debug('Cancelando subscrição anterior');
        realtimeSubscription.unsubscribe();
      }

      const subscription = supabase
        .channel(`notifications_${user.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.user.id}`
          },
          (payload) => {
            const newNotification = payload.new as HybridNotification;
            logger.info('Nova notificação recebida em tempo real', { 
              notificationId: newNotification.id,
              type: newNotification.type 
            });
            setOnlineNotifications(prev => [newNotification, ...prev]);
          }
        )
        .subscribe();

      setRealtimeSubscription(subscription);
    } catch (error) {
      logger.error('Erro ao configurar real-time subscription', { error });
    }
  };

  // Auto-cleanup read notifications after 60 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      const currentNotifications = isOnlineMode ? onlineNotifications : localNotifications;
      const readNotifications = currentNotifications.filter(n => n.is_read);
      
      readNotifications.forEach(notification => {
        const readAt = new Date(notification.read_at || notification.created_at);
        const minutesSinceRead = (now.getTime() - readAt.getTime()) / (1000 * 60);
        
        if (minutesSinceRead >= 60) {
          if (isOnlineMode) {
            notificationService.deleteNotification(notification.id).catch(error => {
              logger.error('Erro ao deletar notificação durante limpeza automática', { notificationId: notification.id, error });
            });
          } else {
            setLocalNotifications(prev => prev.filter(n => n.id !== notification.id));
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [isOnlineMode, onlineNotifications, localNotifications]);

  // Try to connect on component mount
  useEffect(() => {
    tryConnectToSupabase();
    
    return () => {
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
    };
  }, []);

  // Get current notifications based on mode
  const currentNotifications = isOnlineMode ? onlineNotifications : localNotifications;

  // Calculate stats
  const stats = useMemo(() => {
    const total = currentNotifications.length;
    const unread = currentNotifications.filter(n => !n.is_read).length;
    return { total, unread };
  }, [currentNotifications]);

  // Handle actions - online mode uses Supabase, offline uses local state
  const handleMarkAsRead = async (notificationId: string) => {
    logger.debug('Marcando notificação como lida', { notificationId, isOnlineMode });
    if (isOnlineMode) {
      try {
        await notificationService.markAsRead(notificationId);
        setOnlineNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        logger.info('Notificação marcada como lida com sucesso', { notificationId });
      } catch (error) {
        logger.error('Erro ao marcar notificação como lida', { notificationId, error });
        toast.error('Erro ao marcar como lida');
      }
    } else {
      setLocalNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      logger.info('Notificação local marcada como lida', { notificationId });
    }
  };

  const handleMarkAllAsRead = async () => {
    logger.info('Marcando todas as notificações como lidas', { isOnlineMode });
    if (isOnlineMode) {
      try {
        await notificationService.markAllAsRead();
        setOnlineNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        logger.info('Todas as notificações marcadas como lidas com sucesso');
      } catch (error) {
        logger.error('Erro ao marcar todas as notificações como lidas', { error });
        toast.error('Erro ao marcar todas como lidas');
      }
    } else {
      setLocalNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      logger.info('Todas as notificações locais marcadas como lidas');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    logger.debug('Deletando notificação', { notificationId, isOnlineMode });
    if (isOnlineMode) {
      try {
        await notificationService.deleteNotification(notificationId);
        setOnlineNotifications(prev => prev.filter(n => n.id !== notificationId));
        logger.info('Notificação deletada com sucesso', { notificationId });
      } catch (error) {
        logger.error('Erro ao deletar notificação', { notificationId, error });
        toast.error('Erro ao deletar notificação');
      }
    } else {
      setLocalNotifications(prev => prev.filter(n => n.id !== notificationId));
      logger.info('Notificação local deletada', { notificationId });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info':
      default: return 'ℹ️';
    }
  };

  const getNotificationColorClass = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-green-500 bg-green-50/50';
      case 'error': return 'border-l-red-500 bg-red-50/50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50/50';
      case 'info':
      default: return 'border-l-blue-500 bg-blue-50/50';
    }
  };

  const unreadCount = stats.unread;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-8 px-2"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className={cn("p-0", maxWidth && `w-[${maxWidth}]`)} 
        align={align}
      >
        <div className="flex flex-col h-[32rem]">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Notificações
              </h3>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar todas como lidas
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading && currentNotifications.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Carregando notificações...
                </div>
              ) : currentNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-sm text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-muted-foreground">
                    {isOnlineMode ? '' : 'Nenhuma notificação encontrada'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 rounded-md border-l-4 cursor-pointer transition-colors",
                        getNotificationColorClass(notification.type),
                        !notification.is_read && "bg-opacity-80",
                        notification.is_read && "opacity-75"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "text-sm font-medium",
                              !notification.is_read && "font-semibold"
                            )}>
                              {notification.title}
                            </p>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                locale: ptBR,
                                addSuffix: true
                              })}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  title="Marcar como lida"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteNotification(notification.id)}
                                title="Deletar notificação"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenterHybrid;
