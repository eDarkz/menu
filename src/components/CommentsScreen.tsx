import React, { useState, useEffect } from 'react';
import { Calendar, MessageCircle, Send, CheckCircle, AlertCircle, Utensils, Coffee } from 'lucide-react';
import { useApiMenuData } from '../hooks/useApiMenuData';
import { formatDateForDisplay } from '../utils/dateUtils';
import { formatMenuText } from '../utils/textUtils';
import { format } from 'date-fns';
import { useMenuSocket } from '../hooks/useSocketConnection';
import { ApiMenu } from '../services/api';

export const CommentsScreen: React.FC = () => {
  const { submitComment, getMenuByDate } = useApiMenuData();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [menu, setMenu] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Socket connection para actualizaciones en tiempo real
  const { isConnected, connectionStatus } = useMenuSocket((updatedMenu: ApiMenu) => {
    // Solo actualizar si es el menú de la fecha seleccionada
    const [year, month, day] = selectedDate.split('-').map(Number);
    const selectedApiDate = `${day}/${month}/${year}`;
    
    if (updatedMenu.fecha === selectedApiDate) {
      console.log('🔄 Menú de comentarios actualizado via socket:', updatedMenu);
      setMenu(updatedMenu);
    }
  });

  // Cargar menú cuando cambia la fecha
  useEffect(() => {
    const loadMenuForDate = async () => {
      setLoadingMenu(true);
      setError(null);
      
      try {
        const menuData = await getMenuByDate(selectedDate);
        
        if (!menuData) {
          setMenu(null);
          setError('No hay menú disponible para esta fecha');
          return;
        }
        
        setMenu(menuData);
      } catch (err) {
        console.warn('Error loading menu:', err);
        setError('Error al cargar el menú');
        setMenu(null);
      } finally {
        setLoadingMenu(false);
      }
    };

    loadMenuForDate();
  }, [selectedDate]);

  const handleSubmitComment = async () => {
    if (!comment.trim() || !menu) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitComment(selectedDate, menu.menu_ppal, comment.trim());
      setSuccess(true);
      setComment('');
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Error al enviar el comentario. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ¡Comentario Enviado!
          </h2>
          
          <p className="text-gray-600 mb-8">
            Tu comentario ha sido enviado exitosamente. El equipo de cocina lo revisará pronto.
          </p>
          
          <button
            onClick={() => setSuccess(false)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Enviar Otro Comentario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl border border-white/30">
          <div className="flex items-center gap-3 text-white">
            <MessageCircle className="w-8 h-8" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Comentarios del Menú</h1>
              <p className="text-sm opacity-90">Comparte tu opinión sobre el menú</p>
            </div>
            
            {/* Indicador de conexión */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              connectionStatus === 'connected' 
                ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
                : 'bg-red-500/20 text-red-100 border border-red-400/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-400 animate-pulse' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-400'
              }`} />
              {connectionStatus === 'connected' ? 'En vivo' : 
               connectionStatus === 'connecting' ? 'Conectando...' : 'Sin conexión'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Selector de Fecha */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Selecciona la fecha del menú
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
          </div>

          {/* Menú del día seleccionado */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Utensils className="w-6 h-6 text-orange-600" />
              Menú del día seleccionado
            </h3>
            
            {loadingMenu ? (
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando menú...</p>
              </div>
            ) : menu ? (
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 font-medium">
                    {formatDateForDisplay(menu.fecha)}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      Plato Principal
                    </h4>
                    <p className="text-gray-700 font-medium">{formatMenuText(menu.menu_ppal)}</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      Acompañamiento
                    </h4>
                    <p className="text-gray-700 font-medium">{formatMenuText(menu.acompanamiento)}</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-blue-500" />
                      Bebida
                    </h4>
                    <p className="text-gray-700 font-medium">{formatMenuText(menu.bebida)}</p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <Utensils className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-600">
                  {error || 'No hay menú disponible para esta fecha'}
                </p>
              </div>
            )}
          </div>

          {/* Área de comentario */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              Tu comentario
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe aquí tu comentario sobre el menú... ¿Qué te pareció el sabor? ¿Alguna sugerencia de mejora?"
              className="w-full h-40 px-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
              maxLength={500}
              disabled={!menu}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">
                Máximo 500 caracteres
              </p>
              <p className="text-sm text-gray-500">
                {comment.length}/500
              </p>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Botón de envío */}
          <button
            onClick={handleSubmitComment}
            disabled={!comment.trim() || !menu || submitting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enviando comentario...
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                Enviar Comentario
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};