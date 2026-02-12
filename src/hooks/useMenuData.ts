import { useState, useEffect } from 'react';
import { MenuItem, Vote, MenuStats } from '../types';
import { format, isToday, parseISO } from 'date-fns';

export const useMenuData = () => {
  const [menus, setMenus] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('hotel-menus');
    return saved ? JSON.parse(saved) : [];
  });

  const [votes, setVotes] = useState<Vote[]>(() => {
    const saved = localStorage.getItem('hotel-votes');
    return saved ? JSON.parse(saved) : [];
  });

  // Guardar en localStorage cuando cambian los datos
  useEffect(() => {
    localStorage.setItem('hotel-menus', JSON.stringify(menus));
  }, [menus]);

  useEffect(() => {
    localStorage.setItem('hotel-votes', JSON.stringify(votes));
  }, [votes]);

  const getTodayMenu = (): MenuItem | null => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return menus.find(menu => menu.date === today) || null;
  };

  const getMenuByDate = (date: string): MenuItem | null => {
    return menus.find(menu => menu.date === date) || null;
  };

  const addOrUpdateMenu = (menuData: Omit<MenuItem, 'id'>) => {
    const existingMenu = menus.find(menu => menu.date === menuData.date);
    
    if (existingMenu) {
      setMenus(prev => prev.map(menu => 
        menu.date === menuData.date 
          ? { ...existingMenu, ...menuData }
          : menu
      ));
    } else {
      const newMenu: MenuItem = {
        id: Date.now().toString(),
        ...menuData
      };
      setMenus(prev => [...prev, newMenu]);
    }
  };

  const addVote = (menuId: string, rating: 'like' | 'dislike') => {
    const newVote: Vote = {
      id: Date.now().toString(),
      menuId,
      rating,
      timestamp: new Date().toISOString()
    };
    setVotes(prev => [...prev, newVote]);
  };

  const getMenuStats = (): MenuStats[] => {
    return menus.map(menu => {
      const menuVotes = votes.filter(vote => vote.menuId === menu.id);
      const likes = menuVotes.filter(vote => vote.rating === 'like').length;
      const dislikes = menuVotes.filter(vote => vote.rating === 'dislike').length;
      const totalVotes = likes + dislikes;
      
      return {
        menuId: menu.id,
        date: menu.date,
        totalVotes,
        likes,
        dislikes,
        likePercentage: totalVotes > 0 ? Math.round((likes / totalVotes) * 100) : 0
      };
    });
  };

  const getTodayVotes = () => {
    const todayMenu = getTodayMenu();
    if (!todayMenu) return { likes: 0, dislikes: 0, total: 0 };
    
    const todayVotes = votes.filter(vote => vote.menuId === todayMenu.id);
    const likes = todayVotes.filter(vote => vote.rating === 'like').length;
    const dislikes = todayVotes.filter(vote => vote.rating === 'dislike').length;
    
    return { likes, dislikes, total: likes + dislikes };
  };

  return {
    menus,
    votes,
    getTodayMenu,
    getMenuByDate,
    addOrUpdateMenu,
    addVote,
    getMenuStats,
    getTodayVotes
  };
};