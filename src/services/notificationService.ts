import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Notification = Tables<'notifications'>;
export type NotificationInsert = TablesInsert<'notifications'>;

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
  /**
   * Fetch notifications for the current user
   */
  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    try {
      // Check if user is authenticated first
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.user) {
        console.warn('User not authenticated for notifications:', userError);
        throw new Error('User not authenticated');
      }

      console.log('🔍 NotificationService: Fetching for user:', user.user.id);

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data, error } = await query;

      console.log('📊 NotificationService query result:', { data, error, userId: user.user.id });

      if (error) {
        console.error('Error fetching notifications:', error);
        // Handle specific RLS errors
        if (error.code === '42501') {
          throw new Error('Access denied - notifications table not configured properly');
        }
        throw error;
      }

      console.log(`✅ NotificationService: Found ${data?.length || 0} notifications`);
      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      // Check if user is authenticated first
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.user) {
        console.warn('User not authenticated for stats:', userError);
        throw new Error('User not authenticated');
      }

      console.log('📈 NotificationService: Getting stats for user:', user.user.id);

      const { data, error } = await supabase
        .from('notifications')
        .select('is_read, category, type')
        .eq('user_id', user.user.id);

      if (error) {
        console.error('Error fetching notification stats:', error);
        throw error;
      }

      const stats: NotificationStats = {
        total: data?.length || 0,
        unread: data?.filter(n => !n.is_read).length || 0,
        byCategory: {},
        byType: {}
      };

      // Group by category and type
      data?.forEach(notification => {
        // Count by category
        if (notification.category) {
          stats.byCategory[notification.category] = (stats.byCategory[notification.category] || 0) + 1;
        }
        
        // Count by type
        if (notification.type) {
          stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error in getNotificationStats:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.user.id)
        .eq('is_read', false)
        .select('id');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: NotificationInsert): Promise<Notification> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: user.user.id
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist, fail silently but log for debugging
        if (error.code === '42P01') {
          console.warn('Notifications table not found - notification system not yet configured');
          throw new Error('Notifications table not configured');
        }
        console.error('Error creating notification:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createNotification:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      throw error;
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteNotifications(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);

      if (error) {
        console.error('Error deleting notifications:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteNotifications:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications
   */
  async deleteReadNotifications(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true)
        .select('id');

      if (error) {
        console.error('Error deleting read notifications:', error);
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in deleteReadNotifications:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notification changes
   */
  subscribeToNotifications(
    callback: (notification: Notification) => void,
    onError?: (error: any) => void
  ) {
    return supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        payload => {
          const notification = payload.new as Notification;
          callback(notification);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        payload => {
          const notification = payload.new as Notification;
          callback(notification);
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to notifications');
        } else if (error && onError) {
          onError(error);
        }
      });
  }

  /**
   * Utility method to get notification type icon
   */
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

  /**
   * Utility method to get notification type color
   */
  getNotificationColor(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
      default:
        return 'text-blue-600';
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
    additionalData?: any
  ): Promise<Notification | null> {
    try {
      return await this.createNotification({
        title,
        message,
        type,
        category: 'background_job',
        data: {
          jobId,
          ...additionalData
        },
        related_entity_type: 'background_job',
        related_entity_id: jobId
      } as any);
    } catch (error) {
      // If notifications table doesn't exist, return null instead of throwing
      if (error instanceof Error && error.message.includes('not configured')) {
        console.warn('Background job notification skipped - notifications table not configured');
        return null;
      }
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
