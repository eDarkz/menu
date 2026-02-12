import { useState, useEffect } from 'react';
import { apiService, ApiMenu } from '../services/api';
import { getTodayApiFormat, isoToApiFormat, apiToIsoFormat } from '../utils/dateUtils';

export const useApiMenuData = () => {
  const [menus, setMenus] = useState<ApiMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all menus
  const loadMenus = async () => {
    try {
      setLoading(true);
      setError(null);
      const menusData = await apiService.getAllMenus();
      setMenus(menusData);
      
      // Show info message if using fallback data
      if (menusData.length === 0) {
        setError('No hay menús disponibles en este momento');
      } else if (menusData.length === 1 && menusData[0].id === 'fallback-1') {
        setError('Usando datos de ejemplo - el servidor no está disponible');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión con el servidor';
      setError(errorMessage);
      console.error('Error loading menus:', err);
      
      // Set empty array as fallback
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  // Load menus on component mount
  useEffect(() => {
    loadMenus();
  }, []);

  const getTodayMenu = async (): Promise<ApiMenu | null> => {
    try {
      const today = getTodayApiFormat();
      return await apiService.getMenuByDate(today);
    } catch (err) {
      console.warn('Error getting today menu, returning null:', err);
      return null;
    }
  };

  const getMenuByDate = async (date: string): Promise<ApiMenu | null> => {
    try {
      // Always convert YYYY-MM-DD to DD/M/YYYY format for API
      const apiDate = isoToApiFormat(date);
      return await apiService.getMenuByDate(apiDate);
    } catch (err) {
      console.warn('Error getting menu by date, returning null:', err);
      return null;
    }
  };

  const addOrUpdateMenu = async (menuData: {
    date: string; // YYYY-MM-DD format
    mainDish: string;
    side: string;
    beverage: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert to API format
      const apiDate = isoToApiFormat(menuData.date);
      
      const result = await apiService.createOrUpdateMenu({
        fecha: apiDate,
        menu_ppal: menuData.mainDish,
        acompanamiento: menuData.side,
        bebida: menuData.beverage,
      });

      // Reload menus to get updated data
      await loadMenus();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving menu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addVote = async (menuDate: string, rating: 'like' | 'dislike') => {
    try {
      // Convert YYYY-MM-DD to DD/M/YYYY if needed
      const apiDate = menuDate.includes('-') ? isoToApiFormat(menuDate) : menuDate;
      
      const result = await apiService.submitVote({
        fecha: apiDate,
        like: rating === 'like',
      });

      // Update local state
      setMenus(prev => prev.map(menu => 
        menu.fecha === result.fecha ? result : menu
      ));

      return result;
    } catch (err) {
      console.error('Error submitting vote:', err);
      throw err;
    }
  };

  const submitComment = async (fecha: string, menu_ppal: string, comentario: string) => {
    try {
      // Convert YYYY-MM-DD to DD/M/YYYY if needed
      const apiDate = fecha.includes('-') ? isoToApiFormat(fecha) : fecha;
      
      return await apiService.submitComment({
        fecha: apiDate,
        menu_ppal,
        comentario,
      });
    } catch (err) {
      console.error('Error submitting comment:', err);
      throw err;
    }
  };

  const sendTestNotification = async (fecha: string) => {
    try {
      // Convert YYYY-MM-DD to DD/M/YYYY if needed
      const apiDate = fecha.includes('-') ? isoToApiFormat(fecha) : fecha;
      
      return await apiService.sendTestNotification(apiDate);
    } catch (err) {
      console.error('Error sending test notification:', err);
      throw err;
    }
  };

  const sendYesterdayNotification = async () => {
    try {
      return await apiService.sendYesterdayNotification();
    } catch (err) {
      console.error('Error sending yesterday notification:', err);
      throw err;
    }
  };

  // Convert API menu format to local format for compatibility
  const getMenuStats = () => {
    return menus.map(menu => {
      const totalVotes = menu.megusto + menu.nomegusto;
      return {
        menuId: menu.id,
        date: apiToIsoFormat(menu.fecha), // Convert to YYYY-MM-DD for compatibility
        totalVotes,
        likes: menu.megusto,
        dislikes: menu.nomegusto,
        likePercentage: totalVotes > 0 ? Math.round((menu.megusto / totalVotes) * 100) : 0,
      };
    });
  };

  const getTodayVotes = async () => {
    try {
      const todayMenu = await getTodayMenu();
      if (!todayMenu) return { likes: 0, dislikes: 0, total: 0 };
      
      return {
        likes: todayMenu.megusto,
        dislikes: todayMenu.nomegusto,
        total: todayMenu.megusto + todayMenu.nomegusto,
      };
    } catch (err) {
      console.warn('Error getting today votes, returning zeros:', err);
      return { likes: 0, dislikes: 0, total: 0 };
    }
  };

  return {
    menus,
    loading,
    error,
    loadMenus,
    getTodayMenu,
    getMenuByDate,
    addOrUpdateMenu,
    addVote,
    submitComment,
    sendTestNotification,
    sendYesterdayNotification,
    getMenuStats,
    getTodayVotes,
  };
};