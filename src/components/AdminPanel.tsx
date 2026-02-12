import React, { useState } from 'react';
import { Calendar, Plus, Save, TrendingUp, Filter, Award, TrendingDown, Star, Users, ChefHat, Send, Bell, BarChart3, PieChart, Target, Clock, DollarSign, Utensils, ThumbsUp, ThumbsDown, CheckCircle, AlertCircle, BellRing, Loader2, ArrowLeft, Trophy, Medal, Activity, BarChart, LineChart, Coffee } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApiMenuData } from '../hooks/useApiMenuData';
import { getTodayApiFormat, isoToApiFormat, apiToIsoFormat, formatDateForDisplay } from '../utils/dateUtils';
import { formatMenuText } from '../utils/textUtils';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { AutocompleteInput } from './AutocompleteInput';

export const AdminPanel: React.FC = () => {
  const { 
    menus, 
    addOrUpdateMenu, 
    getMenuStats, 
    getMenuByDate, 
    sendTestNotification, 
    sendYesterdayNotification,
    loading 
  } = useApiMenuData();
  const [activeTab, setActiveTab] = useState<'menu' | 'stats' | 'notifications'>('menu');
  const [dateFilter, setDateFilter] = useState<'current-month' | 'last-month' | 'current-year' | 'last-year' | 'all-time' | 'custom'>('current-month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [menuForm, setMenuForm] = useState({
    mainDish: '',
    side: '',
    beverage: ''
  });
  const [notificationDate, setNotificationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Socket connection
  const { isConnected, connectionStatus } = useSocketConnection();

  // Generar sugerencias de autocompletado basadas en menús existentes
  const getMenuSuggestions = React.useMemo(() => {
    const mainDishes = [...new Set(menus.map(menu => menu.menu_ppal))].sort();
    const sides = [...new Set(menus.map(menu => menu.acompanamiento))].sort();
    const beverages = [...new Set(menus.map(menu => menu.bebida))].sort();
    
    return {
      mainDishes,
      sides,
      beverages
    };
  }, [menus]);

  // Función para filtrar estadísticas por fecha - Memoizada para evitar re-cálculos
  const getFilteredStats = React.useMemo(() => {
    const allStats = getMenuStats();
    const now = new Date();
    
    let startDate: Date;
    let endDate: Date;
    
    switch (dateFilter) {
      case 'current-month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'current-year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'last-year':
        const lastYear = subYears(now, 1);
        startDate = startOfYear(lastYear);
        endDate = endOfYear(lastYear);
        break;
      case 'custom':
        startDate = parseISO(customStartDate);
        endDate = parseISO(customEndDate);
        break;
      default: // all-time
        return allStats;
    }
    
    return allStats.filter(stat => 
      isWithinInterval(parseISO(stat.date), { start: startDate, end: endDate })
    );
  }, [dateFilter, customStartDate, customEndDate, getMenuStats]);

  const stats = getFilteredStats;
  
  // Cargar menú para la fecha seleccionada - Separado en useEffect independiente
  React.useEffect(() => {
    const loadMenuForDate = async () => {
      const existingMenu = await getMenuByDate(selectedDate);
      if (existingMenu) {
        setMenuForm({
          mainDish: existingMenu.menu_ppal,
          side: existingMenu.acompanamiento,
          beverage: existingMenu.bebida
        });
      } else {
        setMenuForm({
          mainDish: '',
          side: '',
          beverage: ''
        });
      }
    };
    
    loadMenuForDate();
  }, [selectedDate]);

  const handleSaveMenu = async () => {
    if (!menuForm.mainDish || !menuForm.side || !menuForm.beverage) {
      alert('Por favor completa todos los campos del menú');
      return;
    }

    try {
      await addOrUpdateMenu({
        date: selectedDate,
        mainDish: menuForm.mainDish,
        side: menuForm.side,
        beverage: menuForm.beverage
      });

      alert('Menú guardado exitosamente');
    } catch (error) {
      alert('Error al guardar el menú');
    }
  };

  const handleSendTestNotification = async () => {
    setNotificationLoading(true);
    setNotificationStatus(null);
    
    try {
      const result = await sendTestNotification(notificationDate);
      setNotificationStatus(`✅ Notificación enviada exitosamente para ${result.fecha}`);
    } catch (error) {
      setNotificationStatus(`❌ Error al enviar notificación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setNotificationLoading(false);
    }
  };


  // Estadísticas avanzadas
  const getAdvancedStats = () => {
    if (stats.length === 0) return null;
    
    const totalVotes = stats.reduce((sum, stat) => sum + stat.totalVotes, 0);
    const totalLikes = stats.reduce((sum, stat) => sum + stat.likes, 0);
    const totalDislikes = stats.reduce((sum, stat) => sum + stat.dislikes, 0);
    const averageLikePercentage = stats.reduce((sum, stat) => sum + stat.likePercentage, 0) / stats.length;
    
    // Menús más populares
    const menuPopularity = stats.map(stat => {
      const menu = menus.find(m => m.id === stat.menuId);
      return {
        ...stat,
        mainDish: menu?.menu_ppal || 'Desconocido'
      };
    }).filter(stat => stat.totalVotes > 0).sort((a, b) => b.likePercentage - a.likePercentage);
    
    // Análisis de platos repetidos
    const filteredMenus = menus.filter(menu => {
      const menuDate = apiToIsoFormat(menu.fecha);
      const menuStat = stats.find(stat => stat.date === menuDate);
      return menuStat !== undefined;
    });
    
    const dishFrequency = filteredMenus.reduce((acc, menu) => {
      acc[menu.menu_ppal] = (acc[menu.menu_ppal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const repeatedDishes = Object.entries(dishFrequency)
      .filter(([_, count]) => count > 1)
      .map(([dish, count]) => {
        const dishStats = stats.filter(stat => {
          const menu = filteredMenus.find(m => m.id === stat.menuId);
          return menu?.menu_ppal === dish;
        });
        
        const avgLikes = dishStats.reduce((sum, stat) => sum + stat.likePercentage, 0) / dishStats.length;
        const totalVotesForDish = dishStats.reduce((sum, stat) => sum + stat.totalVotes, 0);
        
        return {
          dish,
          count,
          averageLikePercentage: Math.round(avgLikes),
          totalVotes: totalVotesForDish
        };
      })
      .filter(dish => dish.totalVotes > 0)
      .sort((a, b) => b.averageLikePercentage - a.averageLikePercentage);
    
    return {
      totalVotes,
      totalLikes,
      totalDislikes,
      averageLikePercentage: Math.round(averageLikePercentage),
      bestMenu: menuPopularity[0],
      worstMenu: menuPopularity[menuPopularity.length - 1],
      repeatedDishes,
      totalMenus: stats.length
    };
  };

  const advancedStats = getAdvancedStats();

  // Estadísticas detalladas de platillos
  const getDishStatistics = () => {
    if (stats.length === 0) return null;
    
    // Filtrar menús según el período seleccionado
    const filteredMenus = menus.filter(menu => {
      const menuDate = apiToIsoFormat(menu.fecha);
      const menuStat = stats.find(stat => stat.date === menuDate);
      return menuStat !== undefined;
    });
    
    // Análisis por plato principal
    const dishAnalysis = filteredMenus.reduce((acc, menu) => {
      const dish = menu.menu_ppal;
      const menuStat = stats.find(stat => stat.date === apiToIsoFormat(menu.fecha));
      
      if (!acc[dish]) {
        acc[dish] = {
          name: dish,
          timesServed: 0,
          totalVotes: 0,
          totalLikes: 0,
          totalDislikes: 0,
          dates: [],
          averageRating: 0,
          bestDate: null,
          worstDate: null,
          consistency: 0
        };
      }
      
      acc[dish].timesServed++;
      acc[dish].totalVotes += menuStat?.totalVotes || 0;
      acc[dish].totalLikes += menuStat?.likes || 0;
      acc[dish].totalDislikes += menuStat?.dislikes || 0;
      acc[dish].dates.push({
        date: menu.fecha,
        rating: menuStat?.likePercentage || 0,
        votes: menuStat?.totalVotes || 0
      });
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calcular métricas adicionales
    Object.values(dishAnalysis).forEach((dish: any) => {
      dish.averageRating = dish.totalVotes > 0 ? Math.round((dish.totalLikes / dish.totalVotes) * 100) : 0;
      
      // Encontrar mejor y peor fecha
      const sortedDates = dish.dates.sort((a: any, b: any) => b.rating - a.rating);
      dish.bestDate = sortedDates[0];
      dish.worstDate = sortedDates[sortedDates.length - 1];
      
      // Calcular consistencia (desviación estándar de ratings)
      const ratings = dish.dates.map((d: any) => d.rating);
      const avgRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
      const variance = ratings.reduce((sum: number, r: number) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;
      dish.consistency = Math.round(100 - Math.sqrt(variance)); // Invertir para que mayor sea mejor
    });
    
    // Análisis por acompañamientos
    const sideAnalysis = filteredMenus.reduce((acc, menu) => {
      const side = menu.acompanamiento;
      if (!acc[side]) {
        acc[side] = { name: side, count: 0, avgRating: 0, totalVotes: 0 };
      }
      acc[side].count++;
      const menuStat = stats.find(stat => stat.date === apiToIsoFormat(menu.fecha));
      acc[side].totalVotes += menuStat?.totalVotes || 0;
      acc[side].avgRating += menuStat?.likePercentage || 0;
      return acc;
    }, {} as Record<string, any>);
    
    Object.values(sideAnalysis).forEach((side: any) => {
      side.avgRating = Math.round(side.avgRating / side.count);
    });
    
    // Análisis por bebidas
    const beverageAnalysis = filteredMenus.reduce((acc, menu) => {
      const beverage = menu.bebida;
      if (!acc[beverage]) {
        acc[beverage] = { name: beverage, count: 0, avgRating: 0, totalVotes: 0 };
      }
      acc[beverage].count++;
      const menuStat = stats.find(stat => stat.date === apiToIsoFormat(menu.fecha));
      acc[beverage].totalVotes += menuStat?.totalVotes || 0;
      acc[beverage].avgRating += menuStat?.likePercentage || 0;
      return acc;
    }, {} as Record<string, any>);
    
    Object.values(beverageAnalysis).forEach((beverage: any) => {
      beverage.avgRating = Math.round(beverage.avgRating / beverage.count);
    });
    
    // Ordenar por diferentes criterios
    const topDishes = Object.values(dishAnalysis).sort((a: any, b: any) => b.averageRating - a.averageRating);
    const mostServedDishes = Object.values(dishAnalysis).sort((a: any, b: any) => b.timesServed - a.timesServed);
    const mostConsistentDishes = Object.values(dishAnalysis).sort((a: any, b: any) => b.consistency - a.consistency);
    const topSides = Object.values(sideAnalysis).sort((a: any, b: any) => b.avgRating - a.avgRating);
    const topBeverages = Object.values(beverageAnalysis).sort((a: any, b: any) => b.avgRating - a.avgRating);
    
    return {
      dishAnalysis: Object.values(dishAnalysis),
      topDishes: topDishes.slice(0, 5),
      mostServedDishes: mostServedDishes.slice(0, 5),
      mostConsistentDishes: mostConsistentDishes.slice(0, 5),
      topSides: topSides.slice(0, 5),
      topBeverages: topBeverages.slice(0, 5),
      totalUniqueDishes: Object.keys(dishAnalysis).length,
      totalUniqueSides: Object.keys(sideAnalysis).length,
      totalUniqueBeverages: Object.keys(beverageAnalysis).length
    };
  };
  
  const dishStats = getDishStatistics();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            
            {/* Indicador de conexión */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500 animate-pulse' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`} />
              {connectionStatus === 'connected' ? 'Tiempo Real Activo' : 
               connectionStatus === 'connecting' ? 'Conectando...' : 'Sin Conexión'}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'menu'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Gestión de Menús
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bell className="w-5 h-5" />
            Notificaciones
          </button>
        </div>

        {/* Menu Management */}
        {activeTab === 'menu' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Plus className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Configurar Menú</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha del Menú
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <AutocompleteInput
                      label="Plato Principal"
                      value={menuForm.mainDish}
                      onChange={(value) => setMenuForm(prev => ({ ...prev, mainDish: value }))}
                      suggestions={getMenuSuggestions.mainDishes}
                      placeholder="Ej: Pollo a la plancha con hierbas"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <AutocompleteInput
                      label="Acompañamiento"
                      value={menuForm.side}
                      onChange={(value) => setMenuForm(prev => ({ ...prev, side: value }))}
                      suggestions={getMenuSuggestions.sides}
                      placeholder="Ej: Arroz pilaf con vegetales"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <AutocompleteInput
                      label="Bebida"
                      value={menuForm.beverage}
                      onChange={(value) => setMenuForm(prev => ({ ...prev, beverage: value }))}
                      suggestions={getMenuSuggestions.beverages}
                      placeholder="Ej: Limonada natural"
                      disabled={loading}
                    />
                  </div>

                  <button
                    onClick={handleSaveMenu}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Guardando...' : 'Guardar Menú'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Enviar Notificaciones</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                {/* Test Notification */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Notificación de Prueba</h3>
                  <p className="text-sm text-gray-600">
                    Envía una notificación para una fecha específica
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha del Menú
                    </label>
                    <input
                      type="date"
                      value={notificationDate}
                      onChange={(e) => setNotificationDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={handleSendTestNotification}
                    disabled={notificationLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                    {notificationLoading ? 'Enviando...' : 'Enviar Notificación'}
                  </button>
                </div>
              </div>

              </div>

              {/* Notification Status */}
              {notificationStatus && (
                <div className={`mt-6 p-4 rounded-lg ${
                  notificationStatus.includes('✅') 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{notificationStatus}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {/* Filtros de fecha */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Filter className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filtros de Fecha</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Período
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="current-month">Mes Actual</option>
                    <option value="last-month">Mes Anterior</option>
                    <option value="current-year">Año Actual</option>
                    <option value="last-year">Año Anterior</option>
                    <option value="all-time">Todo el Tiempo</option>
                    <option value="custom">Rango Personalizado</option>
                  </select>
                </div>
                
                {dateFilter === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Estadísticas principales */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Votos</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {advancedStats?.totalVotes || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Votos Positivos</p>
                    <p className="text-3xl font-bold text-green-600">
                      {advancedStats?.totalLikes || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold">👍</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Votos Negativos</p>
                    <p className="text-3xl font-bold text-red-600">
                      {advancedStats?.totalDislikes || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-bold">👎</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Satisfacción Promedio</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {advancedStats?.averageLikePercentage || 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Estadísticas avanzadas */}
            {advancedStats && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="w-6 h-6 text-yellow-600" />
                    <h3 className="text-xl font-bold text-gray-900">Mejor Menú</h3>
                  </div>
                  {advancedStats.bestMenu && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="font-semibold text-green-800">{formatMenuText(advancedStats.bestMenu.mainDish)}</p>
                      <p className="text-sm text-green-600">
                        {advancedStats.bestMenu.likePercentage}% de satisfacción ({advancedStats.bestMenu.totalVotes} votos)
                      </p>
                      <p className="text-xs text-green-500 mt-1">
                        {format(parseISO(advancedStats.bestMenu.date), "dd 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl font-bold text-gray-900">Menú con Menor Aceptación</h3>
                  </div>
                  {advancedStats.worstMenu && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="font-semibold text-red-800">{formatMenuText(advancedStats.worstMenu.mainDish)}</p>
                      <p className="text-sm text-red-600">
                        {advancedStats.worstMenu.likePercentage}% de satisfacción ({advancedStats.worstMenu.totalVotes} votos)
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        {format(parseISO(advancedStats.worstMenu.date), "dd 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Platos repetidos */}
            {advancedStats && advancedStats.repeatedDishes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <ChefHat className="w-6 h-6 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-900">Platos Repetidos - Análisis de Popularidad</h3>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {advancedStats.repeatedDishes.map((dish, index) => (
                    <div key={dish.dish} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm leading-tight">{formatMenuText(dish.dish)}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-bold text-gray-600">#{index + 1}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Servido:</span> {dish.count} veces
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Satisfacción promedio:</span> 
                          <span className={`ml-1 font-bold ${
                            dish.averageLikePercentage >= 70 ? 'text-green-600' :
                            dish.averageLikePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {dish.averageLikePercentage}%
                          </span>
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Total votos:</span> {dish.totalVotes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen de tendencias */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Resumen de Tendencias</h3>
              </div>
              
              {stats.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {Math.round((stats.reduce((sum, stat) => sum + stat.likes, 0) / stats.reduce((sum, stat) => sum + stat.totalVotes, 0)) * 100) || 0}%
                    </div>
                    <p className="text-sm text-green-700 font-medium">Satisfacción General</p>
                    <p className="text-xs text-green-600 mt-1">
                      {stats.reduce((sum, stat) => sum + stat.likes, 0)} votos positivos
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {Math.round(stats.reduce((sum, stat) => sum + stat.totalVotes, 0) / stats.length) || 0}
                    </div>
                    <p className="text-sm text-blue-700 font-medium">Votos Promedio por Día</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {stats.length} días con menú
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {stats.filter(stat => stat.likePercentage >= 70).length}
                    </div>
                    <p className="text-sm text-purple-700 font-medium">Días Exitosos</p>
                    <p className="text-xs text-purple-600 mt-1">
                      ≥70% de satisfacción
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay datos para el período seleccionado</p>
                </div>
              )}
            </div>

            {/* Estadísticas de Platillos */}
            {dishStats && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-bold text-gray-900">Estadísticas de Platillos</h3>
                  </div>
                  
                  {/* Métricas generales */}
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {dishStats.totalUniqueDishes}
                      </div>
                      <p className="text-sm text-purple-700 font-medium">Platos Únicos</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {dishStats.totalUniqueSides}
                      </div>
                      <p className="text-sm text-green-700 font-medium">Acompañamientos Únicos</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {dishStats.totalUniqueBeverages}
                      </div>
                      <p className="text-sm text-blue-700 font-medium">Bebidas Únicas</p>
                    </div>
                  </div>
                  
                  {/* Top 5 Rankings */}
                  <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Platos más populares */}
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Award className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-bold text-gray-800">Top 5 - Más Populares</h4>
                      </div>
                      <div className="space-y-3">
                        {dishStats.topDishes.map((dish: any, index: number) => (
                          <div key={dish.name} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{formatMenuText(dish.name)}</p>
                                <p className="text-xs text-gray-500">{dish.timesServed} veces servido</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                dish.averageRating >= 70 ? 'text-green-600' : 
                                dish.averageRating >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {dish.averageRating}%
                              </div>
                              <p className="text-xs text-gray-500">{dish.totalVotes} votos</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Platos más servidos */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <ChefHat className="w-5 h-5 text-blue-600" />
                        <h4 className="font-bold text-gray-800">Top 5 - Más Servidos</h4>
                      </div>
                      <div className="space-y-3">
                        {dishStats.mostServedDishes.map((dish: any, index: number) => (
                          <div key={dish.name} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{formatMenuText(dish.name)}</p>
                                <p className="text-xs text-gray-500">{dish.averageRating}% satisfacción</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">
                                {dish.timesServed}
                              </div>
                              <p className="text-xs text-gray-500">veces</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Análisis de consistencia y acompañamientos */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Platos más consistentes */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-green-600" />
                        <h4 className="font-bold text-gray-800">Más Consistentes</h4>
                      </div>
                      <div className="space-y-3">
                        {dishStats.mostConsistentDishes.slice(0, 3).map((dish: any, index: number) => (
                          <div key={dish.name} className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="font-medium text-gray-800 text-sm mb-1">{formatMenuText(dish.name)}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{dish.timesServed} veces</span>
                              <span className="text-sm font-bold text-green-600">{dish.consistency}% consistente</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Top acompañamientos */}
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Utensils className="w-5 h-5 text-orange-600" />
                        <h4 className="font-bold text-gray-800">Mejores Acompañamientos</h4>
                      </div>
                      <div className="space-y-3">
                        {dishStats.topSides.slice(0, 3).map((side: any, index: number) => (
                          <div key={side.name} className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="font-medium text-gray-800 text-sm mb-1">{formatMenuText(side.name)}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{side.count} veces</span>
                              <span className="text-sm font-bold text-orange-600">{side.avgRating}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Top bebidas */}
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-6 border border-cyan-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Coffee className="w-5 h-5 text-cyan-600" />
                        <h4 className="font-bold text-gray-800">Mejores Bebidas</h4>
                      </div>
                      <div className="space-y-3">
                        {dishStats.topBeverages.slice(0, 3).map((beverage: any, index: number) => (
                          <div key={beverage.name} className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="font-medium text-gray-800 text-sm mb-1">{formatMenuText(beverage.name)}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{beverage.count} veces</span>
                              <span className="text-sm font-bold text-cyan-600">{beverage.avgRating}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tabla detallada de todos los platillos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <PieChart className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-xl font-bold text-gray-900">Análisis Detallado por Platillo</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Platillo</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Veces Servido</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Total Votos</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Satisfacción</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Consistencia</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Mejor Fecha</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Peor Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dishStats.dishAnalysis.map((dish: any) => (
                          <tr key={dish.name} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                              {formatMenuText(dish.name)}
                            </td>
                            <td className="py-3 px-4 text-sm text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {dish.timesServed}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 text-center font-bold">
                              {dish.totalVotes}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                dish.averageRating >= 70 
                                  ? 'bg-green-100 text-green-800' 
                                  : dish.averageRating >= 50 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {dish.averageRating}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                dish.consistency >= 80 
                                  ? 'bg-green-100 text-green-800' 
                                  : dish.consistency >= 60 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {dish.consistency}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-600 text-center">
                              {dish.bestDate && (
                                <div>
                                  <div className="font-medium">{formatDateForDisplay(dish.bestDate.date)}</div>
                                  <div className="text-green-600">{dish.bestDate.rating}%</div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-600 text-center">
                              {dish.worstDate && (
                                <div>
                                  <div className="font-medium">{formatDateForDisplay(dish.worstDate.date)}</div>
                                  <div className="text-red-600">{dish.worstDate.rating}%</div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Stats Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Detalles por Menú</h3>
              {stats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Fecha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Plato Principal</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">👍</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">👎</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">% Positivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((stat) => {
                        const menu = menus.find(m => m.id === stat.menuId);
                        return (
                          <tr key={stat.menuId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {format(parseISO(stat.date), "dd 'de' MMMM", { locale: es })}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 font-medium">{formatMenuText(menu?.menu_ppal || '')}</td>
                            <td className="py-3 px-4 text-sm text-green-600 text-center font-bold">
                              {stat.likes}
                            </td>
                            <td className="py-3 px-4 text-sm text-red-600 text-center font-bold">
                              {stat.dislikes}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 text-center font-bold">
                              {stat.totalVotes}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                stat.likePercentage >= 70 
                                  ? 'bg-green-100 text-green-800' 
                                  : stat.likePercentage >= 50 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {stat.likePercentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay menús para el período seleccionado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};