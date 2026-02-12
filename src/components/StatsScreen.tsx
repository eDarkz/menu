import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, TrendingUp, Users, Calendar, ThumbsUp, ThumbsDown, ArrowLeft, Filter, Award, Target, Clock, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApiMenuData } from '../hooks/useApiMenuData';
import { formatDateForDisplay, apiFormatToDate } from '../utils/dateUtils';
import { formatMenuText } from '../utils/textUtils';

type TimePeriod = 'all' | 'last30' | 'last90' | 'last180' | 'last365' | `year-${number}`;

export const StatsScreen: React.FC = () => {
  const { menus, loading, error } = useApiMenuData();
  const [stats, setStats] = useState<any[]>([]);
  const [filteredStats, setFilteredStats] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('last365');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (menus.length > 0) {
      // Convertir menús API a formato de estadísticas
      const menuStats = menus.map(menu => {
        const totalVotes = menu.megusto + menu.nomegusto;
        const date = apiFormatToDate(menu.fecha);
        
        return {
          menuId: menu.id,
          date: menu.fecha, // Mantener formato DD/M/YYYY para display
          dateObj: date, // Para ordenamiento y filtrado
          totalVotes,
          likes: menu.megusto,
          dislikes: menu.nomegusto,
          likePercentage: totalVotes > 0 ? Math.round((menu.megusto / totalVotes) * 100) : 0,
          menu: menu // Incluir datos completos del menú
        };
      });
      
      // Ordenar por fecha más reciente primero
      const sortedStats = menuStats.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      setStats(sortedStats);
      
      // Obtener años disponibles
      const years = [...new Set(menuStats.map(stat => stat.dateObj.getFullYear()))].sort((a, b) => b - a);
      setAvailableYears(years);
    }
  }, [menus]);

  useEffect(() => {
    // Filtrar estadísticas según el periodo seleccionado
    const now = new Date();
    let filtered: any[] = [];

    if (selectedPeriod === 'all') {
      filtered = stats;
    } else if (selectedPeriod === 'last30') {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      filtered = stats.filter(stat => stat.dateObj >= cutoffDate);
    } else if (selectedPeriod === 'last90') {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      filtered = stats.filter(stat => stat.dateObj >= cutoffDate);
    } else if (selectedPeriod === 'last180') {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 180);
      filtered = stats.filter(stat => stat.dateObj >= cutoffDate);
    } else if (selectedPeriod === 'last365') {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 365);
      filtered = stats.filter(stat => stat.dateObj >= cutoffDate);
    } else if (selectedPeriod.startsWith('year-')) {
      const year = parseInt(selectedPeriod.split('-')[1]);
      filtered = stats.filter(stat => stat.dateObj.getFullYear() === year);
    }

    setFilteredStats(filtered);
  }, [stats, selectedPeriod]);

  // Calcular totales basados en datos filtrados
  const totalVotes = filteredStats.reduce((sum, stat) => sum + stat.totalVotes, 0);
  const totalLikes = filteredStats.reduce((sum, stat) => sum + stat.likes, 0);
  const totalDislikes = filteredStats.reduce((sum, stat) => sum + stat.dislikes, 0);
  const overallSatisfaction = totalVotes > 0 ? Math.round((totalLikes / totalVotes) * 100) : 0;

  // Análisis adicionales
  const averageVotesPerDay = filteredStats.length > 0 ? Math.round(totalVotes / filteredStats.length) : 0;
  const bestRatedMenu = filteredStats.reduce((best, current) => 
    current.likePercentage > best.likePercentage ? current : best, 
    { likePercentage: 0, menu: null }
  );
  const worstRatedMenu = filteredStats.reduce((worst, current) => 
    current.totalVotes > 0 && current.likePercentage < worst.likePercentage ? current : worst, 
    { likePercentage: 100, menu: null }
  );

  // Análisis por días de la semana
  const weekdayStats = filteredStats.reduce((acc, stat) => {
    const weekday = stat.dateObj.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    if (!acc[weekday]) {
      acc[weekday] = { likes: 0, dislikes: 0, total: 0, count: 0, dates: [] };
    }
    acc[weekday].likes += stat.likes;
    acc[weekday].dislikes += stat.dislikes;
    acc[weekday].total += stat.totalVotes;
    acc[weekday].count += 1;
    acc[weekday].dates.push(stat.date);
    return acc;
  }, {} as Record<number, any>);

  // Calcular promedios y encontrar mejor/peor día
  const weekdayAnalysis = Object.entries(weekdayStats).map(([dayIndex, data]) => {
    const satisfaction = data.total > 0 ? Math.round((data.likes / data.total) * 100) : 0;
    const avgVotesPerDay = data.count > 0 ? Math.round(data.total / data.count) : 0;
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    return {
      dayIndex: parseInt(dayIndex),
      dayName: dayNames[parseInt(dayIndex)],
      satisfaction,
      avgVotesPerDay,
      totalVotes: data.total,
      totalDays: data.count,
      likes: data.likes,
      dislikes: data.dislikes
    };
  }).sort((a, b) => a.dayIndex - b.dayIndex);

  const bestWeekday = weekdayAnalysis.reduce((best, current) => 
    current.totalVotes > 0 && current.satisfaction > best.satisfaction ? current : best, 
    { satisfaction: 0, dayName: 'N/A' }
  );

  const worstWeekday = weekdayAnalysis.reduce((worst, current) => 
    current.totalVotes > 0 && current.satisfaction < worst.satisfaction ? current : worst, 
    { satisfaction: 100, dayName: 'N/A' }
  );

  // Análisis consolidado de platillos a través del tiempo
  const dishAnalysis = filteredStats.reduce((acc, stat) => {
    const dishName = stat.menu.menu_ppal.toLowerCase().trim();
    if (!acc[dishName]) {
      acc[dishName] = {
        name: stat.menu.menu_ppal,
        totalVotes: 0,
        totalLikes: 0,
        totalDislikes: 0,
        appearances: 0,
        dates: []
      };
    }
    acc[dishName].totalVotes += stat.totalVotes;
    acc[dishName].totalLikes += stat.likes;
    acc[dishName].totalDislikes += stat.dislikes;
    acc[dishName].appearances += 1;
    acc[dishName].dates.push(stat.date);
    return acc;
  }, {} as Record<string, any>);

  // Convertir a array y calcular satisfacción consolidada
  const dishStats = Object.values(dishAnalysis)
    .map((dish: any) => ({
      ...dish,
      satisfaction: dish.totalVotes > 0 ? Math.round((dish.totalLikes / dish.totalVotes) * 100) : 0,
      avgVotesPerAppearance: dish.appearances > 0 ? Math.round(dish.totalVotes / dish.appearances) : 0
    }))
    .filter((dish: any) => dish.totalVotes >= 5) // Solo platillos con al menos 5 votos
    .sort((a: any, b: any) => b.satisfaction - a.satisfaction);

  const bestDishOverall = dishStats.length > 0 ? dishStats[0] : null;
  const worstDishOverall = dishStats.length > 0 ? dishStats[dishStats.length - 1] : null;

  // Tendencias mensuales
  const monthlyStats = filteredStats.reduce((acc, stat) => {
    const month = stat.dateObj.getMonth();
    if (!acc[month]) {
      acc[month] = { likes: 0, dislikes: 0, total: 0, count: 0 };
    }
    acc[month].likes += stat.likes;
    acc[month].dislikes += stat.dislikes;
    acc[month].total += stat.totalVotes;
    acc[month].count += 1;
    return acc;
  }, {} as Record<number, any>);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  // Función para obtener el texto descriptivo del periodo seleccionado
  const getPeriodLabel = (period: TimePeriod): string => {
    if (period === 'all') return 'Todo el tiempo';
    if (period === 'last30') return 'Último mes';
    if (period === 'last90') return 'Últimos 3 meses';
    if (period === 'last180') return 'Últimos 6 meses';
    if (period === 'last365') return 'Último año';
    if (period.startsWith('year-')) {
      return period.split('-')[1];
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-8 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-16 text-center max-w-md">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800">Cargando estadísticas...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/30">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <Link
                to="/listado"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver
              </Link>
              <div className="w-px h-8 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8" />
                <div>
                  <h1 className="text-3xl font-bold">Estadísticas del Menú</h1>
                  <p className="text-sm opacity-90">Análisis completo de satisfacción de comensales</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Actualizado</p>
              <p className="font-medium">{format(new Date(), "d 'de' MMMM, HH:mm", { locale: es })}</p>
            </div>
          </div>
        </div>

        {/* Filtro de Periodo de Tiempo */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filtrar por Periodo</h3>
          </div>

          {/* Filtros rápidos */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 font-medium">Periodos Rápidos</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePeriodChange('last30')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedPeriod === 'last30'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Último mes
              </button>
              <button
                onClick={() => handlePeriodChange('last90')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedPeriod === 'last90'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos 3 meses
              </button>
              <button
                onClick={() => handlePeriodChange('last180')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedPeriod === 'last180'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos 6 meses
              </button>
              <button
                onClick={() => handlePeriodChange('last365')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedPeriod === 'last365'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Último año
              </button>
              <button
                onClick={() => handlePeriodChange('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedPeriod === 'all'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todo el tiempo
              </button>
            </div>
          </div>

          {/* Filtros por año específico */}
          {availableYears.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2 font-medium">Por Año Específico</p>
              <div className="flex flex-wrap gap-2">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => handlePeriodChange(`year-${year}` as TimePeriod)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selectedPeriod === `year-${year}`
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredStats.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Periodo seleccionado:</strong> {getPeriodLabel(selectedPeriod)}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Mostrando {filteredStats.length} registro{filteredStats.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-4 mb-8 flex items-center gap-3">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">!</span>
            </div>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Votos</p>
                <p className="text-2xl font-bold text-gray-800">{totalVotes.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ThumbsUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Me Gustó</p>
                <p className="text-2xl font-bold text-green-600">{totalLikes.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <ThumbsDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">No Me Gustó</p>
                <p className="text-2xl font-bold text-red-600">{totalDislikes.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Satisfacción</p>
                <p className="text-2xl font-bold text-purple-600">{overallSatisfaction}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Análisis Adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Promedio de votos por día */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Promedio Diario</h3>
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-2">{averageVotesPerDay}</p>
            <p className="text-sm text-gray-600">votos por día</p>
          </div>

          {/* Mejor menú */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Mejor Calificado</h3>
            </div>
            {bestRatedMenu.menu ? (
              <>
                <p className="text-sm font-medium text-gray-800 mb-1">
                  {formatMenuText(bestRatedMenu.menu.menu_ppal)}
                </p>
                <p className="text-2xl font-bold text-green-600">{bestRatedMenu.likePercentage}%</p>
                <p className="text-xs text-gray-500">{formatDateForDisplay(bestRatedMenu.date)}</p>
              </>
            ) : (
              <p className="text-gray-500">Sin datos</p>
            )}
          </div>

          {/* Peor menú */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Necesita Mejora</h3>
            </div>
            {worstRatedMenu.menu && worstRatedMenu.likePercentage < 100 ? (
              <>
                <p className="text-sm font-medium text-gray-800 mb-1">
                  {formatMenuText(worstRatedMenu.menu.menu_ppal)}
                </p>
                <p className="text-2xl font-bold text-red-600">{worstRatedMenu.likePercentage}%</p>
                <p className="text-xs text-gray-500">{formatDateForDisplay(worstRatedMenu.date)}</p>
              </>
            ) : (
              <p className="text-gray-500">Todos los menús bien calificados</p>
            )}
          </div>
        </div>

        {/* Análisis por Días de la Semana */}
        {weekdayAnalysis.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-600" />
              Análisis por Días de la Semana ({getPeriodLabel(selectedPeriod)})
            </h3>
            
            {/* Resumen de mejor y peor día */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-green-800">Mejor Día de la Semana</h4>
                </div>
                <p className="text-2xl font-bold text-green-700 mb-1">{bestWeekday.dayName}</p>
                <p className="text-lg text-green-600">{bestWeekday.satisfaction}% de satisfacción</p>
                <p className="text-sm text-green-600 mt-2">
                  Promedio: {Math.round(bestWeekday.totalVotes / Math.max(bestWeekday.totalDays, 1))} votos por día
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-red-800">Día que Necesita Mejora</h4>
                </div>
                <p className="text-2xl font-bold text-red-700 mb-1">{worstWeekday.dayName}</p>
                <p className="text-lg text-red-600">{worstWeekday.satisfaction}% de satisfacción</p>
                <p className="text-sm text-red-600 mt-2">
                  Promedio: {Math.round(worstWeekday.totalVotes / Math.max(worstWeekday.totalDays, 1))} votos por día
                </p>
              </div>
            </div>
            
            {/* Tarjeta de Comportamiento Semanal */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 mb-8 border-2 border-blue-200">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-blue-800">Comportamiento Semanal de Satisfacción</h4>
                </div>
                <p className="text-blue-700 text-lg">
                  Promedio de satisfacción por cada día de la semana en {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
                <p className="text-blue-600 text-sm mt-2">
                  Ideal para identificar patrones y planificar menús según el día
                </p>
              </div>
              
              {/* Gráfico de barras horizontal para días de la semana */}
              <div className="space-y-4">
                {weekdayAnalysis.map((day, index) => {
                  const isWeekend = day.dayIndex === 0 || day.dayIndex === 6; // Domingo o Sábado
                  const performanceLevel = 
                    day.satisfaction >= 80 ? 'excelente' :
                    day.satisfaction >= 70 ? 'bueno' :
                    day.satisfaction >= 60 ? 'regular' :
                    day.satisfaction >= 50 ? 'bajo' : 'crítico';
                  
                  const performanceColor = 
                    day.satisfaction >= 80 ? 'from-emerald-400 to-emerald-600' :
                    day.satisfaction >= 70 ? 'from-green-400 to-green-600' :
                    day.satisfaction >= 60 ? 'from-yellow-400 to-yellow-600' :
                    day.satisfaction >= 50 ? 'from-orange-400 to-orange-600' : 'from-red-400 to-red-600';
                  
                  const performanceTextColor = 
                    day.satisfaction >= 80 ? 'text-emerald-700' :
                    day.satisfaction >= 70 ? 'text-green-700' :
                    day.satisfaction >= 60 ? 'text-yellow-700' :
                    day.satisfaction >= 50 ? 'text-orange-700' : 'text-red-700';
                  
                  const performanceBgColor = 
                    day.satisfaction >= 80 ? 'bg-emerald-50 border-emerald-200' :
                    day.satisfaction >= 70 ? 'bg-green-50 border-green-200' :
                    day.satisfaction >= 60 ? 'bg-yellow-50 border-yellow-200' :
                    day.satisfaction >= 50 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200';
                  
                  return (
                    <div key={day.dayIndex} className={`${performanceBgColor} rounded-xl p-6 border-2 transition-all duration-300 hover:shadow-lg`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[100px]">
                            <h5 className="text-lg font-bold text-gray-800 mb-1">
                              {day.dayName}
                              {isWeekend && <span className="text-xs text-purple-600 ml-1">🏖️</span>}
                            </h5>
                            <p className="text-xs text-gray-600">
                              {day.totalDays} día{day.totalDays !== 1 ? 's' : ''} evaluado{day.totalDays !== 1 ? 's' : ''}
                            </p>
                          </div>
                          
                          <div className="flex-1 max-w-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Satisfacción</span>
                              <span className={`text-lg font-bold ${performanceTextColor}`}>
                                {day.satisfaction}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                              <div
                                className={`h-4 rounded-full bg-gradient-to-r ${performanceColor} transition-all duration-500 shadow-sm`}
                                style={{ width: `${day.satisfaction}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${performanceTextColor} ${performanceBgColor.replace('bg-', 'bg-').replace('-50', '-100')}`}>
                            {performanceLevel.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Métricas detalladas */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-800">{day.totalVotes}</div>
                          <div className="text-gray-600">Total Votos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{day.likes}</div>
                          <div className="text-gray-600">Me Gustó</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">{day.dislikes}</div>
                          <div className="text-gray-600">No Me Gustó</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{day.avgVotesPerDay}</div>
                          <div className="text-gray-600">Promedio/Día</div>
                        </div>
                      </div>
                      
                      {/* Insights específicos */}
                      {day.satisfaction < 50 && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                          <p className="text-red-800 text-sm font-medium">
                            ⚠️ Atención: Los {day.dayName.toLowerCase()}s necesitan mejora urgente en la calidad del menú
                          </p>
                        </div>
                      )}
                      {day.satisfaction >= 80 && (
                        <div className="mt-4 p-3 bg-emerald-100 border border-emerald-200 rounded-lg">
                          <p className="text-emerald-800 text-sm font-medium">
                            ✨ Excelente: Los {day.dayName.toLowerCase()}s mantienen alta satisfacción consistente
                          </p>
                        </div>
                      )}
                      {isWeekend && day.satisfaction < 60 && (
                        <div className="mt-4 p-3 bg-purple-100 border border-purple-200 rounded-lg">
                          <p className="text-purple-800 text-sm font-medium">
                            🏖️ Fin de semana: Considerar menús especiales para mejorar la experiencia
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Resumen de insights */}
              <div className="mt-8 p-6 bg-white rounded-xl border border-blue-200 shadow-sm">
                <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Insights del Comportamiento Semanal
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-700 mb-2">
                      <strong>Día más exitoso:</strong> {bestWeekday.dayName} ({bestWeekday.satisfaction}%)
                    </p>
                    <p className="text-gray-700 mb-2">
                      <strong>Día que necesita atención:</strong> {worstWeekday.dayName} ({worstWeekday.satisfaction}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700 mb-2">
                      <strong>Promedio general:</strong> {Math.round(weekdayAnalysis.reduce((sum, day) => sum + day.satisfaction, 0) / weekdayAnalysis.length)}%
                    </p>
                    <p className="text-gray-700">
                      <strong>Días evaluados:</strong> {weekdayAnalysis.reduce((sum, day) => sum + day.totalDays, 0)} en total
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabla detallada por día */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 mb-6">
              {weekdayAnalysis.map((day) => (
                <div key={day.dayIndex} className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-gray-800 text-center mb-3 text-sm">{day.dayName}</h4>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className={`text-2xl font-bold mb-1 ${
                        day.satisfaction >= 70 ? 'text-green-600' :
                        day.satisfaction >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {day.satisfaction}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            day.satisfaction >= 70 ? 'bg-green-500' :
                            day.satisfaction >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${day.satisfaction}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Días:</span>
                        <span className="font-medium">{day.totalDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Votos:</span>
                        <span className="font-medium">{day.totalVotes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Promedio:</span>
                        <span className="font-medium">{day.avgVotesPerDay}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>👍:</span>
                        <span className="font-medium">{day.likes}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>👎:</span>
                        <span className="font-medium">{day.dislikes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Análisis:</strong> Los datos muestran el rendimiento promedio de cada día de la semana. 
                Esto puede ayudar a identificar patrones en la satisfacción de los comensales según el día.
              </p>
            </div>
          </div>
        )}

        {/* Análisis Consolidado de Platillos */}
        {dishStats.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Utensils className="w-6 h-6 text-orange-600" />
              Análisis Consolidado de Platillos ({getPeriodLabel(selectedPeriod)})
            </h3>
            
            {/* Resumen de mejor y peor platillo consolidado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {bestDishOverall && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-green-800">Platillo Más Exitoso</h4>
                  </div>
                  <p className="text-xl font-bold text-green-700 mb-2">{formatMenuText(bestDishOverall.name)}</p>
                  <div className="space-y-1 text-sm text-green-600">
                    <p><strong>{bestDishOverall.satisfaction}%</strong> de satisfacción promedio</p>
                    <p><strong>{bestDishOverall.totalVotes}</strong> votos en <strong>{bestDishOverall.appearances}</strong> apariciones</p>
                    <p><strong>{bestDishOverall.avgVotesPerAppearance}</strong> votos promedio por vez</p>
                  </div>
                </div>
              )}
              
              {worstDishOverall && worstDishOverall.satisfaction < bestDishOverall?.satisfaction && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-red-800">Platillo que Necesita Mejora</h4>
                  </div>
                  <p className="text-xl font-bold text-red-700 mb-2">{formatMenuText(worstDishOverall.name)}</p>
                  <div className="space-y-1 text-sm text-red-600">
                    <p><strong>{worstDishOverall.satisfaction}%</strong> de satisfacción promedio</p>
                    <p><strong>{worstDishOverall.totalVotes}</strong> votos en <strong>{worstDishOverall.appearances}</strong> apariciones</p>
                    <p><strong>{worstDishOverall.avgVotesPerAppearance}</strong> votos promedio por vez</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Ranking completo de platillos */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-100 rounded-2xl p-6 border-2 border-orange-200">
              <h4 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Ranking de Platillos por Satisfacción Consolidada
              </h4>
              <p className="text-orange-700 text-sm mb-6">
                Análisis basado en el rendimiento promedio de cada platillo a través de todas sus apariciones
              </p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {dishStats.map((dish: any, index: number) => {
                  const rankColor = 
                    index === 0 ? 'from-yellow-400 to-yellow-600 text-yellow-800' :
                    index === 1 ? 'from-gray-300 to-gray-500 text-gray-800' :
                    index === 2 ? 'from-orange-400 to-orange-600 text-orange-800' :
                    'from-blue-100 to-blue-200 text-blue-800';
                  
                  const performanceColor = 
                    dish.satisfaction >= 80 ? 'text-emerald-600' :
                    dish.satisfaction >= 70 ? 'text-green-600' :
                    dish.satisfaction >= 60 ? 'text-yellow-600' :
                    dish.satisfaction >= 50 ? 'text-orange-600' : 'text-red-600';
                  
                  const performanceBg = 
                    dish.satisfaction >= 80 ? 'bg-emerald-500' :
                    dish.satisfaction >= 70 ? 'bg-green-500' :
                    dish.satisfaction >= 60 ? 'bg-yellow-500' :
                    dish.satisfaction >= 50 ? 'bg-orange-500' : 'bg-red-500';
                  
                  return (
                    <div key={dish.name} className="bg-white rounded-xl p-4 shadow-sm border border-orange-200/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Posición en ranking */}
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${rankColor} flex items-center justify-center font-bold text-sm shadow-sm`}>
                            {index + 1}
                          </div>
                          
                          {/* Información del platillo */}
                          <div className="flex-1">
                            <h5 className="font-bold text-gray-800 text-sm mb-1">
                              {formatMenuText(dish.name)}
                            </h5>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span><strong>{dish.appearances}</strong> veces servido</span>
                              <span><strong>{dish.totalVotes}</strong> votos totales</span>
                              <span><strong>{dish.avgVotesPerAppearance}</strong> promedio/vez</span>
                            </div>
                          </div>
                          
                          {/* Barra de satisfacción */}
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[60px]">
                              <div
                                className={`h-3 rounded-full ${performanceBg} transition-all duration-300`}
                                style={{ width: `${dish.satisfaction}%` }}
                              ></div>
                            </div>
                            <span className={`font-bold text-sm min-w-[3rem] text-right ${performanceColor}`}>
                              {dish.satisfaction}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Detalles de votos */}
                      <div className="mt-3 flex justify-between items-center text-xs">
                        <div className="flex gap-4">
                          <span className="text-green-600 flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {dish.totalLikes}
                          </span>
                          <span className="text-red-600 flex items-center gap-1">
                            <ThumbsDown className="w-3 h-3" />
                            {dish.totalDislikes}
                          </span>
                        </div>
                        <span className="text-gray-500">
                          Últimas fechas: {dish.dates.slice(-2).join(', ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-white rounded-xl border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>Metodología:</strong> Este ranking consolida el rendimiento de cada platillo a través del tiempo, 
                  considerando todas sus apariciones. Solo se incluyen platillos con al menos 5 votos para mayor precisión estadística.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Análisis Mensual */}
        {Object.keys(monthlyStats).length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Tendencias Mensuales ({getPeriodLabel(selectedPeriod)})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(monthlyStats).map(([monthIndex, data]) => {
                const monthName = format(new Date(2024, parseInt(monthIndex), 1), 'MMMM', { locale: es });
                const satisfaction = data.total > 0 ? Math.round((data.likes / data.total) * 100) : 0;
                
                return (
                  <div key={monthIndex} className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-800 capitalize mb-2">{monthName}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Votos:</span>
                        <span className="font-medium">{data.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Días:</span>
                        <span className="font-medium">{data.count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Satisfacción:</span>
                        <span className={`font-bold ${satisfaction >= 70 ? 'text-green-600' : satisfaction >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {satisfaction}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            satisfaction >= 70 ? 'bg-green-500' : satisfaction >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${satisfaction}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabla de Estadísticas Detalladas */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <Utensils className="w-6 h-6 text-blue-600" />
              Estadísticas Detalladas por Fecha
            </h3>
          </div>
          
          {filteredStats.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
              <p className="text-gray-500">
                {availableYears.length === 0 
                  ? 'No se encontraron estadísticas en el sistema'
                  : `No se encontraron estadísticas para ${getPeriodLabel(selectedPeriod).toLowerCase()}`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fecha</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Menú</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total Votos</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Me Gustó</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">No Me Gustó</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Satisfacción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStats.map((stat, index) => (
                    <tr key={stat.menuId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDateForDisplay(stat.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {formatMenuText(stat.menu.menu_ppal)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatMenuText(stat.menu.acompanamiento)} • {formatMenuText(stat.menu.bebida)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {stat.totalVotes}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                          <ThumbsUp className="w-4 h-4" />
                          {stat.likes}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                          <ThumbsDown className="w-4 h-4" />
                          {stat.dislikes}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                stat.likePercentage >= 70 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                stat.likePercentage >= 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                'bg-gradient-to-r from-red-400 to-red-600'
                              }`}
                              style={{ width: `${stat.likePercentage}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium min-w-[3rem] ${
                            stat.likePercentage >= 70 ? 'text-green-600' :
                            stat.likePercentage >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {stat.likePercentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
          <div className="text-center text-white">
            <p className="text-sm opacity-90 mb-2">
              Las estadísticas se actualizan en tiempo real conforme los comensales votan.
            </p>
            <p className="text-xs opacity-75">
              Comparte esta URL para acceso directo: {window.location.origin}/estadisticas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};