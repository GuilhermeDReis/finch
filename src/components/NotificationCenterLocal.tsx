import React, { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LocalNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'general' | 'background_job' | 'transaction' | 'system';
  is_read: boolean;
  created_at: string;
  data?: any;
}

interface NotificationCenterLocalProps {
  align?: 'start' | 'center' | 'end';
  maxWidth?: string;
}

const NotificationCenterLocal: React.FC<NotificationCenterLocalProps> = ({
  align = 'end',
  maxWidth = '28rem'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  // Local notifications data
  const [notifications, setNotifications] = useState<LocalNotification[]>([
    {
      id: '1',
      title: 'Importação Concluída',
      message: 'Suas transações foram importadas com sucesso. 45 transações processadas.',
      type: 'success',
      category: 'background_job',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
      data: { jobType: 'transaction_import', recordCount: 45 }
    },
    {
      id: '2',
      title: 'Nova Transação Detectada',
      message: 'Transação de R$ -125,50 em SUPERMERCADO XYZ foi adicionada automaticamente.',
      type: 'info',
      category: 'transaction',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    },
    {
      id: '3',
      title: 'Categorização Automática',
      message: '12 transações foram categorizadas automaticamente baseadas em padrões anteriores.',
      type: 'success',
      category: 'background_job',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: '4',
      title: 'Atenção: Limite do Cartão',
      message: 'Você atingiu 85% do limite do seu cartão Nubank. Considere fazer um pagamento.',
      type: 'warning',
      category: 'system',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    },
    {
      id: '5',
      title: 'Erro na Importação',
      message: 'Não foi possível processar o arquivo CSV. Verifique o formato e tente novamente.',
      type: 'error',
      category: 'background_job',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    }
  ]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const byCategory = notifications.reduce((acc, n) => {
      acc[n.category] = (acc[n.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, unread, byCategory, byType };
  }, [notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (selectedCategory !== 'all' && notification.category !== selectedCategory) {
        return false;
      }
      if (selectedType !== 'all' && notification.type !== selectedType) {
        return false;
      }
      if (showOnlyUnread && notification.is_read) {
        return false;
      }
      return true;
    });
  }, [notifications, selectedCategory, selectedType, showOnlyUnread]);

  const handleMarkAsRead = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
  };

  const handleDeleteNotification = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleDeleteAllRead = () => {
    setNotifications(prev => prev.filter(n => !n.is_read));
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

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'background_job':
        return 'Processamento';
      case 'transaction':
        return 'Transação';
      case 'system':
        return 'Sistema';
      case 'general':
      default:
        return 'Geral';
    }
  };

  const unreadCount = stats.unread;
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-8 px-2"
          aria-label={`Notificações${hasUnread ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
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
                <span className="ml-2 text-xs text-muted-foreground">
                  ({stats.unread} de {stats.total})
                </span>
              </h3>
              
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleMarkAllAsRead}>
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Marcar todas como lidas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteAllRead}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar lidas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  <SelectItem value="background_job">Processamento</SelectItem>
                  <SelectItem value="transaction">Transação</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos tipos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showOnlyUnread ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                className="h-8 text-xs"
              >
                Não lidas
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                        'border-l-4',
                        getNotificationColorClass(notification.type),
                        !notification.is_read && 'bg-muted/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-lg leading-none">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                                {getCategoryDisplayName(notification.category)}
                              </span>
                              <span>
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  locale: ptBR,
                                  addSuffix: true
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              title="Marcar como lida"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            title="Deletar notificação"
                          >
                            <X className="h-3 w-3" />
                          </Button>
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

export default NotificationCenterLocal;
