import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ThumbsUp, ThumbsDown, Utensils, GlassWater, Clock, Heart, Sparkles, Soup, Salad, MessageCircle } from 'lucide-react';
import { useApiMenuData } from '../hooks/useApiMenuData';
import { getTodayApiFormat } from '../utils/dateUtils';
import { formatMenuText, formatDateToUpperCase } from '../utils/textUtils';
import { useMenuSocket } from '../hooks/useSocketConnection';
import { ApiMenu } from '../services/api';
import  ChristmasSnow  from '../components/Navidad';
export const VotingScreen: React.FC = () => {
  const { getTodayMenu, addVote, getTodayVotes } = useApiMenuData();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [voteAnimation, setVoteAnimation] = useState<'like' | 'dislike' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSadness, setShowSadness] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [todayMenu, setTodayMenu] = useState<any>(null);
  const [todayVotes, setTodayVotes] = useState({ likes: 0, dislikes: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // ===== Indicador de día (se actualiza a las 00:00) =====
  const dayToken = format(currentTime, 'yyyy-MM-dd');

  // ===== Socket: actualizaciones en tiempo real (solo si corresponden al día de hoy) =====
  const { isConnected, connectionStatus } = useMenuSocket((updatedMenu: ApiMenu) => {
    const isToday = updatedMenu?.fecha === getTodayApiFormat();
    if (!isToday) return;
    setTodayMenu(updatedMenu);
    setTodayVotes({
      likes: updatedMenu.megusto,
      dislikes: updatedMenu.nomegusto,
      total: updatedMenu.megusto + updatedMenu.nomegusto,
    });
  });

  // ===== Horario de votación: 11:00 AM – 11:59 PM =====
  const isVotingTime = (time: Date): boolean => {
    const hour = time.getHours();
    return hour >= 11 && hour < 24;
  };

  // ===== Cuenta hacia las 11:00 (HH:MM:SS). Si ya pasaron, cuenta hacia mañana 11:00) =====
  const getTimeRemainingTo11 = (now: Date): string => {
    const target = new Date(now);
    target.setHours(11, 0, 0, 0);
    if (now.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    const ms = Math.max(0, target.getTime() - now.getTime());
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // ===== Reloj =====
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ===== Cargar menú y votos (primera carga) =====
  useEffect(() => {
    const loadTodayData = async () => {
      try {
        setLoading(true);
        const menu = await getTodayMenu();
        const votes = await getTodayVotes();
        setTodayMenu(menu || null);
        setTodayVotes(votes || { likes: 0, dislikes: 0, total: 0 });
      } catch (error) {
        console.error('Error loading today data:', error);
        setTodayMenu(null);
        setTodayVotes({ likes: 0, dislikes: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    };
    loadTodayData();
  }, []);

  // ===== Kiosko: permitir varios votos; reseteo local =====
  useEffect(() => {
    setHasVotedToday(false);
  }, []);

  // ===== Re-cargar/limpiar al cambiar de día (evita conservar el menú de ayer a las 00:00) =====
  useEffect(() => {
    let cancelled = false;
    const reloadForNewDay = async () => {
      setLoading(true);
      setTodayMenu(null);
      setTodayVotes({ likes: 0, dislikes: 0, total: 0 });
      setHasVotedToday(false);
      try {
        const menu = await getTodayMenu();
        const votes = await getTodayVotes();
        if (!cancelled) {
          setTodayMenu(menu || null);
          setTodayVotes(votes || { likes: 0, dislikes: 0, total: 0 });
        }
      } catch {
        if (!cancelled) {
          setTodayMenu(null);
          setTodayVotes({ likes: 0, dislikes: 0, total: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    reloadForNewDay();
    return () => { cancelled = true; };
  }, [dayToken]);

  // ===== Cuenta regresiva post-voto para liberar pantalla =====
  useEffect(() => {
    if (!hasVotedToday) return;
    let timer: NodeJS.Timeout | null = null;
    setCountdown(5);
    timer = setInterval(() => {
      setCountdown(prev => {
        if (prev && prev > 1) return prev - 1;
        if (timer) clearInterval(timer);
        setHasVotedToday(false);
        setCountdown(null);
        setVoteAnimation(null);
        setShowCelebration(false);
        setShowSadness(false);
        return null;
      });
    }, 1000);
    return () => { if (timer) clearInterval(timer); };
  }, [hasVotedToday]);

  const handleVote = async (rating: 'like' | 'dislike') => {
    if (!todayMenu || hasVotedToday) return;

    // Animación inmediata
    setVoteAnimation(rating);
    setHasVotedToday(true);

    if (rating === 'like') {
      setShowCelebration(true);
    } else {
      setShowSadness(true);
    }

    // Enviar voto al servidor sin bloquear UI
    try {
      const result = await addVote(getTodayApiFormat(), rating);
      setTodayVotes({
        likes: result.megusto,
        dislikes: result.nomegusto,
        total: result.megusto + result.nomegusto,
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      // Se sincronizará por socket o próxima carga
    }
  };

  // ===== Pantalla fuera de horario =====
  if (!isVotingTime(currentTime)) {
    const timeRemaining = getTimeRemainingTo11(currentTime);

    return (

      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-8">
              <ChristmasSnow 
                particleCount={400} 
                windSpeed={2} 
                windDirection="right" 
            />
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-16 text-center max-w-6xl w-full border border-white/30">
          {/* Header con hora actual */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-6 text-gray-800 mb-6">
              <Clock className="w-16 h-16 animate-pulse drop-shadow-lg text-blue-600" />
              <div className="text-6xl font-bold tracking-wider text-gray-900">
               {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })} {format(currentTime, 'HH:mm')} 
              </div>
            </div>
   
          </div>

          {/* Mensaje de horario */}
          <div className="mb-16">
            <h2 className="text-5xl font-bold text-orange-600 mb-4">
              🕐  ENCUESTA CERRADA ESPERA LA<br/> APERTURA DEL COMEDOR <span className=" text-orange-700">({timeRemaining})</span>
            </h2>


            <p className="text-3xl text-gray-700 mb-6">
              La encuesta está disponible en el horario del comedor de colegas
            </p>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 inline-block border-2 border-blue-300 shadow-xl">
              <p className="text-4xl font-bold text-white">
                11:00 AM   -   12:00 PM
              </p>
            </div>
          </div>

          {/* Menú del día - Solo plato principal */}
          {loading ? (
            <div className="animate-pulse">
              <Utensils className="w-24 h-24 text-blue-600 mx-auto mb-6" />
              <p className="text-2xl text-gray-700">Cargando menú del día...</p>
            </div>
          ) : todayMenu ? (
            <div className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 rounded-3xl p-12 border-2 border-orange-300 shadow-xl">
              <h3 className="text-3xl font-bold text-white mb-8 flex items-center justify-center gap-4">
                <Utensils className="w-10 h-10 text-white" />
                Menú Principal del Día
                {isConnected && (
                  <div
                    className="w-3 h-3 bg-green-300 rounded-full animate-pulse"
                    title="Actualizaciones en tiempo real activas"
                  />
                )}
              </h3>

              {/* Solo el plato principal - Diseño horizontal */}
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-12 shadow-lg border-2 border-white/30">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                    <span className="text-orange-600 text-3xl font-bold">🍽️</span>
                  </div>
                  <p className="text-7xl font-bold text-white leading-tight drop-shadow-md">
                    {formatMenuText(todayMenu.menu_ppal)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 border-2 border-red-300">
              <Utensils className="w-24 h-24 text-red-500 mx-auto mb-6" />
              <p className="text-3xl text-red-600">
               Espera a que compartamos el menu para el dia de hoy
              </p>
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-12 text-gray-600">
            <p className="text-xl font-medium">
              Vuelve durante el horario de votación para calificar el menú
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== Pantalla dentro de horario =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center p-8">
                     <ChristmasSnow 
                particleCount={400} 
                windSpeed={2} 
                windDirection="right" 
            />
        <div className="bg-white rounded-3xl shadow-2xl p-16 text-center max-w-4xl transform scale-110">
          <div className="animate-spin">
            <Utensils className="w-32 h-32 text-gray-400 mx-auto mb-8" />
          </div>
          <h2 className="text-6xl font-bold text-gray-800 mb-6">
            Cargando menú...
          </h2>
        </div>
      </div>
    );
  }

  if (!todayMenu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-16 text-center max-w-4xl transform scale-110">
          <div className="animate-pulse">
            <Utensils className="w-32 h-32 text-gray-400 mx-auto mb-8" />
          </div>
          <h2 className="text-6xl font-bold text-gray-800 mb-6">
            😴 No hay menú disponible
          </h2>
          <p className="text-2xl text-gray-600">
            El menú del día aún no ha sido configurado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 relative overflow-hidden">
      {/* Efectos de celebración */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce drop-shadow-2xl will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.8 + Math.random() * 0.4}s`,
              }}
            >
              <Sparkles className="w-8 h-8 text-yellow-400 drop-shadow-2xl animate-spin will-change-transform" />
            </div>
          ))}
          {[...Array(30)].map((_, i) => (
            <div
              key={`heart-${i}`}
              className="absolute animate-pulse drop-shadow-2xl will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.8}s`,
                animationDuration: `${0.6 + Math.random() * 0.4}s`,
              }}
            >
              <Heart className="w-7 h-7 text-red-500 fill-current drop-shadow-2xl will-change-transform" />
            </div>
          ))}
          {[...Array(30)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute animate-ping will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.6}s`,
                animationDuration: `${0.5 + Math.random() * 0.3}s`,
              }}
            >
              <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-2xl animate-spin will-change-transform" />
            </div>
          ))}
          {[...Array(15)].map((_, i) => (
            <div
              key={`firework-${i}`}
              className="absolute animate-bounce will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${1 + Math.random() * 0.5}s`,
              }}
            >
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-2xl animate-pulse will-change-transform" />
            </div>
          ))}
          {[...Array(20)].map((_, i) => (
            <div
              key={`flash-${i}`}
              className="absolute animate-ping will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1.2}s`,
                animationDuration: `${0.4 + Math.random() * 0.3}s`,
              }}
            >
              <div className="w-2 h-8 bg-gradient-to-t from-yellow-400 to-orange-400 rounded-full shadow-2xl animate-spin will-change-transform" />
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-gradient-to-r from-green-400 to-green-600 text-white px-12 py-6 rounded-full text-4xl font-bold animate-bounce shadow-2xl border-4 border-white drop-shadow-2xl will-change-transform scale-125">
              🎉 ¡INCREÍBLE!, ¡MUCHAS GRACIAS! 🎉
            </div>
          </div>
        </div>
      )}

      {/* Efectos de tristeza */}
      {showSadness && (
        <div className="fixed inset-0 pointer-events-none z-50">
                       <ChristmasSnow 
                particleCount={400} 
                windSpeed={2} 
                windDirection="right" 
            />
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 80}%`,
                animationDelay: `${Math.random() * 0.8}s`,
                animationDuration: `${0.5 + Math.random() * 0.4}s`,
              }}
            >
              <div className="w-4 h-8 bg-blue-500 rounded-full shadow-2xl animate-bounce will-change-transform" />
            </div>
          ))}
          {[...Array(15)].map((_, i) => (
            <div
              key={`cloud-${i}`}
              className="absolute animate-bounce will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40}%`,
                animationDelay: `${Math.random() * 0.6}s`,
                animationDuration: `${0.8 + Math.random() * 0.4}s`,
              }}
            >
              <div className="w-12 h-6 bg-gray-500 rounded-full opacity-80 shadow-2xl will-change-transform" />
            </div>
          ))}
          {[...Array(6)].map((_, i) => (
            <div
              key={`lightning-${i}`}
              className="absolute animate-ping will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${0.3 + Math.random() * 0.2}s`,
              }}
            >
              <div className="w-1 h-16 bg-gradient-to-b from-yellow-300 to-blue-400 shadow-2xl animate-pulse will-change-transform" />
            </div>
          ))}
          {[...Array(20)].map((_, i) => (
            <div
              key={`tear-${i}`}
              className="absolute animate-bounce will-change-transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${0.6 + Math.random() * 0.4}s`,
              }}
            >
              <div className="w-3 h-5 bg-blue-400 rounded-full shadow-2xl animate-pulse will-change-transform" />
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-12 py-6 rounded-full text-4xl font-bold animate-bounce shadow-2xl border-4 border-white drop-shadow-2xl will-change-transform scale-125">
              😢 ¡GRACIAS POR TU HONESTIDAD! 😢
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-8 py-12 relative z-10">
        {/* Header con fecha y hora */}
        <header className="text-center mb-6">
                       <ChristmasSnow 
                particleCount={400} 
                windSpeed={2} 
                windDirection="right" 
            />
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-2xl max-w-6xl w-full mx-auto border border-white/30 drop-shadow-xl">
            <div className="flex items-center justify-between text-white">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500/20 text-green-100 border border-green-400/30'
                    : connectionStatus === 'connecting'
                    ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
                    : 'bg-red-500/20 text-red-100 border border-red-400/30'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-green-400 animate-pulse'
                      : connectionStatus === 'connecting'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
                {connectionStatus === 'connected'
                  ? 'Conectado'
                  : connectionStatus === 'connecting'
                  ? 'Conectando...'
                  : 'Desconectado'}
              </div>

              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 animate-pulse drop-shadow-lg" />
                <div className="text-2xl font-bold tracking-wider">
                  {format(currentTime, 'HH:mm:ss')}
                </div>
              </div>

              <div className="text-2xl font-medium">
                {formatDateToUpperCase(
                  format(currentTime, "EEEE, d 'de' MMMM", { locale: es })
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-6xl w-full transform hover:scale-102 transition-all duration-500 border border-gray-200/50 drop-shadow-2xl">
            <div
              className={`transition-all duration-700 ${
                showSadness
                  ? 'grayscale blur-sm'
                  : showCelebration
                  ? 'brightness-110 saturate-150'
                  : ''
              }`}
            >
              <div className="text-center mb-3">
                <h2
                  className={`text-3xl font-bold mb-4 transition-all duration-500 drop-shadow-md ${
                    voteAnimation === 'like'
                      ? 'text-green-600 animate-pulse scale-110'
                      : voteAnimation === 'dislike'
                      ? 'text-red-600 animate-pulse scale-110'
                      : 'text-gray-800'
                  }`}
                >
                  {showSadness
                    ? '😔 Menú del Día 😔'
                    : voteAnimation === 'like'
                    ? '😊 ¡Menú Delicioso! 😊'
                    : voteAnimation === 'dislike'
                    ? '😞 Menú del Día 😞'
                    : 'Menú del Día '}
                </h2>
                <div
                  className={`h-1 w-32 bg-gradient-to-r from-orange-400 to-pink-400 mx-auto rounded-full shadow-lg transition-all duration-500 ${
                    voteAnimation === 'like'
                      ? 'animate-pulse bg-gradient-to-r from-green-400 to-green-600'
                      : voteAnimation === 'dislike'
                      ? 'animate-pulse bg-gradient-to-r from-red-400 to-red-600'
                      : ''
                  }`}
                />
              </div>

              {/* Plato Principal */}
              <div className="mb-6">
                <div className="text-center">
                  <div
                    className={`bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-6 mb-4 transform transition-all duration-700 shadow-xl border border-orange-200/50 ${
                      showSadness
                        ? 'grayscale bg-gradient-to-br from-gray-100 to-gray-200 shadow-gray-400/50'
                        : showCelebration
                        ? 'animate-pulse bg-gradient-to-br from-green-100 to-green-200 shadow-green-400/50 scale-105'
                        : voteAnimation === 'like'
                        ? 'animate-bounce bg-gradient-to-br from-green-100 to-green-200 shadow-green-400/50 scale-110'
                        : voteAnimation === 'dislike'
                        ? 'animate-bounce bg-gradient-to-br from-red-100 to-red-200 shadow-red-400/50 scale-110'
                        : 'hover:scale-105 hover:shadow-2xl transition-all duration-200'
                    }`}
                  >
                    <h3 className="text-xl font-extrabold text-gray-900 mb-1">
                      Plato Principal
                    </h3>
                    <p className="text-6xl text-gray-600 font-extrabold drop-shadow-md leading-tight">
                      {formatMenuText(todayMenu.menu_ppal)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acompañamiento / Bebida / QR */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div
                    className={`bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-4 transform transition-all duration-700 shadow-lg border border-green-200/50 ${
                      voteAnimation === 'like'
                        ? 'animate-bounce bg-gradient-to-br from-green-200 to-green-300 shadow-green-400/50 scale-110'
                        : showSadness
                        ? 'grayscale bg-gradient-to-br from-gray-100 to-gray-200 shadow-gray-400/50'
                        : showCelebration
                        ? 'animate-pulse bg-gradient-to-br from-green-200 to-green-300 shadow-green-400/50'
                        : 'hover:scale-105 hover:shadow-xl transition-all duration-200'
                    }`}
                  >
                    <div className="grid grid-cols-2">
                      <div className="flex justify-end">
                        <Soup
                          className={`w-10 h-10 mb-2 transition-all duration-500 drop-shadow-lg ${
                            voteAnimation === 'like'
                              ? 'text-blue-600 animate-bounce'
                              : showSadness
                              ? 'text-gray-500'
                              : 'text-blue-600'
                          }`}
                        />
                      </div>
                      <div className="flex justify-start">
                        <Salad
                          className={`w-10 h-10 mb-2 transition-all duration-500 drop-shadow-lg ${
                            voteAnimation === 'like'
                              ? 'text-blue-600 animate-bounce'
                              : showSadness
                              ? 'text-gray-500'
                              : 'text-blue-600'
                          }`}
                        />
                      </div>
                    </div>
                    <h3 className="text-base font-medium text-gray-600 mb-2 drop-shadow-sm">
                      Acompañamiento
                    </h3>
                    <p className="text-2xl text-gray-900 font-bold drop-shadow-sm leading-tight">
                      {formatMenuText(todayMenu.acompanamiento)}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div
                    className={`bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 transform transition-all duration-700 shadow-lg border border-blue-200/50 ${
                      voteAnimation === 'like'
                        ? 'animate-bounce bg-gradient-to-br from-blue-200 to-blue-300 shadow-blue-400/50 scale-110'
                        : showSadness
                        ? 'grayscale bg-gradient-to-br from-gray-100 to-gray-200 shadow-gray-400/50'
                        : showCelebration
                        ? 'animate-pulse bg-gradient-to-br from-blue-200 to-blue-300 shadow-blue-400/50'
                        : 'hover:scale-105 hover:shadow-xl transition-all duration-200'
                    }`}
                  >
                    <GlassWater
                      className={`w-10 h-10 mx-auto mb-2 transition-all duration-500 drop-shadow-lg ${
                        voteAnimation === 'like'
                          ? 'text-blue-600 animate-bounce'
                          : showSadness
                          ? 'text-gray-500'
                          : 'text-blue-600'
                      }`}
                    />
                    <h3 className="text-base font-medium text-gray-600 mb-2 drop-shadow-sm">
                      Bebida
                    </h3>
                    <p className="text-2xl text-gray-900 font-bold drop-shadow-sm leading-tight">
                      {formatMenuText(todayMenu.bebida)}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div
                    className={`bg-gradient-to-br from-blue-100 to-purple-200 rounded-xl p-4 transform transition-all duration-700 shadow-lg border border-purple-200/50 ${
                      voteAnimation === 'like'
                        ? 'animate-bounce bg-gradient-to-br from-blue-200 to-purple-300 shadow-purple-400/50 scale-110'
                        : showSadness
                        ? 'grayscale bg-gradient-to-br from-gray-100 to-gray-200 shadow-gray-400/50'
                        : showCelebration
                        ? 'animate-pulse bg-gradient-to-br from-blue-200 to-purple-300 shadow-purple-400/50'
                        : 'hover:scale-105 hover:shadow-xl transition-all duration-200'
                    }`}
                  >
                    <MessageCircle
                      className={`w-10 h-10 mx-auto mb-2 transition-all duration-500 drop-shadow-lg ${
                        voteAnimation === 'like'
                          ? 'text-purple-600 animate-bounce'
                          : showSadness
                          ? 'text-gray-500'
                          : 'text-purple-600'
                      }`}
                    />
                    <h3 className="text-xl font-medium text-gray-600 mb-2 drop-shadow-sm">
                      ¿Algo te gustó o no te gustó? <br /> Déjanos tu comentario
                    </h3>
                    <div>
                      <img
                        src="https://i.imgur.com/bAUFa5G.jpg"
                        alt="Código QR para comentarios detallados"
                        className="w-32 h-32 mx-auto object-contain"
                      />
                    </div>
                    <p className="text-xl text-gray-600 leading-tight">
                      <strong className="text-purple-600">Escanea</strong> con tu celular
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de votación */}
              {!hasVotedToday ? (
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 animate-pulse drop-shadow-md">
                    ¿Te gustó la comida de hoy?
                  </h3>
                  <div className="flex justify-center gap-8">
                    {/* BOTÓN LIKE */}
                    <button
                      onClick={() => handleVote('like')}
                      className={`group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                      text-white px-16 py-4 min-w-[220px] rounded-xl text-lg font-bold shadow-2xl transform transition-all duration-300 
                      hover:scale-110 active:scale-95 border-2 border-green-400/50 
                      ${voteAnimation === 'like' 
                        ? 'scale-110 shadow-green-500/70 brightness-110 animate-bounce' 
                        : 'hover:shadow-green-500/50 hover:shadow-2xl'}`}
                    >
                      <ThumbsUp className="w-10 h-10 mx-auto mb-2 drop-shadow-lg" />
                      <div className="text-lg drop-shadow-md">¡ME GUSTÓ!</div>

                      {voteAnimation === 'like' && (
                        <div className="absolute inset-0 rounded-xl bg-green-400 opacity-40 animate-ping shadow-2xl" />
                      )}
                    </button>

                    {/* BOTÓN DISLIKE */}
                    <button
                      onClick={() => handleVote('dislike')}
                      className={`group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                      text-white px-16 py-4 min-w-[220px] rounded-xl text-lg font-bold shadow-2xl transform transition-all duration-300 
                      hover:scale-110 active:scale-95 border-2 border-red-400/50 
                      ${voteAnimation === 'dislike' 
                        ? 'scale-110 shadow-red-500/70 brightness-110 animate-pulse' 
                        : 'hover:shadow-red-500/50 hover:shadow-2xl'}`}
                    >
                      <ThumbsDown className="w-10 h-10 mx-auto mb-2 drop-shadow-lg" />
                      <div className="text-lg drop-shadow-md">NO ME GUSTÓ</div>

                      {voteAnimation === 'dislike' && (
                        <div className="absolute inset-0 rounded-xl bg-red-400 opacity-40 animate-ping shadow-2xl" />
                      )}
                    </button>
                  </div>

                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 transform hover:scale-105 transition-all duration-300 shadow-xl border border-purple-200/50">
                    {countdown !== null ? (
                      <>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3 drop-shadow-md">
                          🙏 ¡Gracias por votar! 🙏
                        </h3>
                        <p className="text-lg text-gray-600 mb-3 drop-shadow-sm">
                          Preparando para el siguiente comensal...
                        </p>
                        <div className="mb-3">
                          <div className="text-4xl font-bold text-blue-600 animate-pulse drop-shadow-lg">
                            {countdown}
                          </div>
                          <p className="text-base text-gray-500 mt-1 drop-shadow-sm">segundos</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3 drop-shadow-md">
                          🙏 ¡Gracias por votar! 🙏
                        </h3>
                        <p className="text-lg text-gray-600 mb-3 drop-shadow-sm">
                          Tu opinión es muy importante para nosotros
                        </p>
                      </>
                    )}
                    <div className="flex justify-center gap-6 text-lg">
                      <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg shadow-lg border border-green-200/50">
                        <ThumbsUp className="w-6 h-6 text-green-600 drop-shadow-sm" />
                        <span className="font-bold text-green-600 text-2xl drop-shadow-sm">
                          {todayVotes.likes}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-lg shadow-lg border border-red-200/50">
                        <ThumbsDown className="w-6 h-6 text-red-600 drop-shadow-sm" />
                        <span className="font-bold text-red-600 text-2xl drop-shadow-sm">
                          {todayVotes.dislikes}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
