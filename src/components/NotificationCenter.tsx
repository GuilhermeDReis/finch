import React, { useState, useEffect } from 'react';
import { getLogger } from '@/utils/logger';

const logger = getLogger('notificationCenter');
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
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

interface NotificationCenterProps {
  align?: 'start' | 'center' | 'end';
  maxWidth?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  align = 'end',
  maxWidth = '28rem'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    stats,
    loading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    hasMore,
    loadMore,
  } = useNotifications({
    initialFilters: { limit: 10 },
    enableRealtime: true
  });

  // Auto-cleanup read notifications after 60 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      const readNotifications = notifications.filter(n => n.is_read);
      
      readNotifications.forEach(notification => {
        const readAt = new Date(notification.read_at || notification.created_at);
        const minutesSinceRead = (now.getTime() - readAt.getTime()) / (1000 * 60);
        
        if (minutesSinceRead >= 60) {
          deleteNotification(notification.id);
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [notifications, deleteNotification]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      logger.error('Error marking notification as read', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      logger.error('Error marking all notifications as read', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColorClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50';
      case 'error':
        return 'border-l-red-500 bg-red-50/50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50';
      case 'info':
      default:
        return 'border-l-blue-500 bg-blue-50/50';
    }
  };

  const unreadCount = stats?.unread || 0;

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
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Carregando notificações...
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 text-sm text-center">
                  <div className="text-muted-foreground mb-2">📋</div>
                  <div className="text-muted-foreground">
                    {error.includes('does not exist') ? 'Sistema de notificações sendo configurado...' : error}
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Nenhuma notificação encontrada
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
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
                                onClick={() => deleteNotification(notification.id)}
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
                  
                  {hasMore && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadMore}
                        disabled={loading}
                      >
                        {loading ? 'Carregando...' : 'Carregar mais'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
