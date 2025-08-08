import { useState, useEffect, useCallback } from 'react';
import { getLogger } from '@/utils/logger';

const logger = getLogger('useNotifications');
import { notificationService, type Notification, type NotificationFilters, type NotificationStats } from '@/services/notificationService';

interface UseNotificationsOptions {
  initialFilters?: NotificationFilters;
  enableRealtime?: boolean;
  autoRefreshInterval?: number; // in milliseconds
}

interface UseNotificationsReturn {
  notifications: Notification[];
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteMultiple: (notificationIds: string[]) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  
  // Filtering
  applyFilters: (filters: NotificationFilters) => void;
  clearFilters: () => void;
  currentFilters: NotificationFilters;
  
  // Pagination
  hasMore: boolean;
  currentPage: number;
  totalLoaded: number;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    initialFilters = { limit: 20 },
    enableRealtime = true,
    autoRefreshInterval
  } = options;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<NotificationFilters>(initialFilters);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async (
    filters: NotificationFilters,
    append: boolean = false
  ) => {
    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      const actualFilters = {
        ...filters,
        offset: append ? totalLoaded : 0
      };

      const data = await notificationService.getNotifications(actualFilters);
      
      if (append) {
        setNotifications(prev => [...prev, ...data]);
        setTotalLoaded(prev => prev + data.length);
      } else {
        setNotifications(data);
        setTotalLoaded(data.length);
        setCurrentPage(0);
      }

      // Check if there are more items to load
      const hasMoreItems = data.length === (filters.limit || 20);
      setHasMore(hasMoreItems);

    } catch (err) {
      logger.error('Error fetching notifications', { error: err instanceof Error ? err.message : 'Unknown error' });
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, [totalLoaded]);

  // Fetch notification stats
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await notificationService.getNotificationStats();
      setStats(statsData);
    } catch (err) {
      logger.error('Error fetching notification stats', { error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, []);

  // Refresh data
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchNotifications(currentFilters, false),
      fetchStats()
    ]);
  }, [fetchNotifications, fetchStats, currentFilters]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchNotifications(currentFilters, true);
  }, [hasMore, loading, currentPage, fetchNotifications, currentFilters]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
      
      // Update stats
      await fetchStats();
    } catch (err) {
      logger.error('Error marking notification as read', { notificationId, error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    }
  }, [fetchStats]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );
      
      // Update stats
      await fetchStats();
    } catch (err) {
      logger.error('Error marking all notifications as read', { error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    }
  }, [fetchStats]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotalLoaded(prev => prev - 1);
      
      // Update stats
      await fetchStats();
    } catch (err) {
      logger.error('Error deleting notification', { notificationId, error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    }
  }, [fetchStats]);

  // Delete multiple notifications
  const deleteMultiple = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.deleteNotifications(notificationIds);
      
      // Update local state
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setTotalLoaded(prev => prev - notificationIds.length);
      
      // Update stats
      await fetchStats();
    } catch (err) {
      logger.error('Error deleting multiple notifications', { count: notificationIds.length, error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    }
  }, [fetchStats]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      await notificationService.deleteReadNotifications();
      
      // Update local state
      setNotifications(prev => prev.filter(n => !n.is_read));
      
      // Update stats and total loaded count
      await fetchStats();
      setTotalLoaded(prev => notifications.filter(n => !n.is_read).length);
    } catch (err) {
      logger.error('Error deleting read notifications', { error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    }
  }, [fetchStats, notifications]);

  // Apply filters
  const applyFilters = useCallback((filters: NotificationFilters) => {
    setCurrentFilters(filters);
    setCurrentPage(0);
    setTotalLoaded(0);
    fetchNotifications(filters, false);
  }, [fetchNotifications]);

  // Clear filters
  const clearFilters = useCallback(() => {
    const defaultFilters = { limit: 20 };
    setCurrentFilters(defaultFilters);
    setCurrentPage(0);
    setTotalLoaded(0);
    fetchNotifications(defaultFilters, false);
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const subscription = notificationService.subscribeToNotifications(
      (notification) => {
        // Add new notification to the beginning of the list
        setNotifications(prev => [notification, ...prev]);
        setTotalLoaded(prev => prev + 1);
        
        // Update stats
        fetchStats();
      },
      (error) => {
        logger.error('Realtime notification error', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [enableRealtime, fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshInterval) return;

    const interval = setInterval(refetch, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, refetch]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchNotifications(initialFilters, false),
        fetchStats()
      ]);
    };
    
    loadInitialData();
  }, []); // Empty dependency array - only run once

  return {
    notifications,
    stats,
    loading,
    error,
    
    // Actions
    refetch,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultiple,
    deleteAllRead,
    
    // Filtering
    applyFilters,
    clearFilters,
    currentFilters,
    
    // Pagination
    hasMore,
    currentPage,
    totalLoaded
  };
}
