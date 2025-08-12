import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { Json } from '@/integrations/supabase/types';
import { getLogger } from '@/utils/logger';

const logger = getLogger('notificationService');

export type Notification = Tables<'notifications'>;
export type NotificationInsert = TablesInsert<'notifications'>;

type NewNotificationInput = Omit<NotificationInsert, 'user_id'> & Partial<Pick<NotificationInsert, 'user_id'>>;

export interface NotificationFilters {
  isRead?: boolean;
  category?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
}

class NotificationService {
  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    try {
      let query = supabase.from('notifications').select('*');

      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 10) - 1);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching notifications', { error });
        return [];
      }

      return data as Notification[];
    } catch (error) {
      logger.error('Exception fetching notifications', { error });
      return [];
    }
  }

  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, category, is_read');

      if (error) {
        logger.error('Error fetching notification stats', { error });
        return { total: 0, unread: 0, byCategory: {}, byType: {} };
      }

      const stats: NotificationStats = {
        total: data?.length || 0,
        unread: data?.filter(n => !n.is_read).length || 0,
        byCategory: {},
        byType: {}
      };

      (data || []).forEach(n => {
        stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
        stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Exception computing notification stats', { error });
      return { total: 0, unread: 0, byCategory: {}, byType: {} };
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      logger.error('Error marking notification as read', { error, notificationId });
      throw error;
    }
  }

  async markAllAsRead(): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false)
      .select('id');

    if (error) {
      logger.error('Error marking all notifications as read', { error });
      throw error;
    }

    return data?.length || 0;
  }

  async createNotification(notification: NewNotificationInput): Promise<Notification> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.error('User not authenticated when creating notification');
      throw new Error('User not authenticated');
    }

    const payload: NotificationInsert = {
      ...notification,
      user_id: notification.user_id ?? user.id,
    } as NotificationInsert;

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error('Error creating notification', { error, notification: payload });
      throw error;
    }

    return data as Notification;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      logger.error('Error deleting notification', { error, notificationId });
      throw error;
    }
  }

  async deleteNotifications(notificationIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds);

    if (error) {
      logger.error('Error deleting notifications', { error, notificationIds });
      throw error;
    }
  }

  async deleteReadNotifications(): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .select('id');

    if (error) {
      logger.error('Error deleting read notifications', { error });
      throw error;
    }

    return data?.length || 0;
  }

  subscribeToNotifications(
    callback: (notification: Notification) => void,
    onError?: (error: any) => void
  ) {
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to notifications');
        }
      });

    return channel;
  }

  getNotificationIcon(type: string): string {
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
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'warning':
        return 'yellow';
      case 'info':
      default:
        return 'blue';
    }
  }

  /**
   * Utility method to format notification category
   */
  getCategoryDisplayName(category: string): string {
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
  }

  /**
   * Helper method to create background job notifications
   */
  async createBackgroundJobNotification(
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' | 'warning',
    jobId: string,
    additionalData?: { [key: string]: Json }
  ): Promise<Notification | null> {
    try {
      return await this.createNotification({
        title,
        message,
        type,
        category: 'background_job',
        data: {
          jobId,
          ...(additionalData || {})
        } as unknown as Json,
        related_entity_type: 'background_job',
        related_entity_id: jobId
      });
    } catch (error) {
      // If notifications table doesn't exist, return null instead of throwing
      if (error instanceof Error && error.message.includes('not configured')) {
        logger.warn('Background job notification skipped - notifications table not configured', { jobId });
        return null;
      }
      logger.error('Error creating background job notification', { error, jobId, title });
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
