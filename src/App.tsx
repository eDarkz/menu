import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { VotingScreen } from './components/VotingScreen';
import { AdminPanel } from './components/AdminPanel';
import { CommentsScreen } from './components/CommentsScreen';
import { StatsScreen } from './components/StatsScreen';
import { Settings, MessageCircle, List, ArrowLeft, Lock, X, LineChart  } from 'lucide-react';

// Inicializar conexión socket al cargar la app
import { socketService } from './services/socketService';

// Conectar socket cuando se carga la aplicación
socketService.connect();

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-8">
      {/* Header con botón de regreso */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Votación
        </Link>
      </div>
      
      <div className="flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Listado de Pantallas
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Selecciona la pantalla que necesitas
        </p>
        
        <div className="space-y-6">
          <Link
            to="/comentarios"
            className="block bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <MessageCircle className="w-6 h-6 inline mr-3" />
            Pantalla de Comentarios
          </Link>
          
          <Link
            to="/admin"
            className="block bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <Settings className="w-6 h-6 inline mr-3" />
            Panel de Administración
          </Link>
        

          <Link
            to="/estadisticas"
           className="
                      block
                      bg-gradient-to-r
                      from-orange-400 to-orange-600
                      hover:from-orange-500 hover:to-orange-700
                      text-white
                      px-8 py-4
                      rounded-xl
                      text-xl
                      font-bold
                      shadow-lg
                      transform transition-all duration-200
                      hover:scale-105
                    "
          >
            <LineChart className="w-6 h-6 inline mr-3" />
            Panel de estadisticas publica
          </Link>
        </div>

        
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            <strong>Comentarios:</strong> Interfaz móvil para comentarios detallados<br/>
            <strong>Panel de Admin:</strong> Para gestionar menús y ver estadísticas<br/>
            <strong>Panel de estadisticas publicas:</strong> Para que la operacion acceda a estadisticas utiles
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

function PasswordModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ing') {
      onSuccess();
      setPassword('');
      setError('');
    } else {
      setError('Contraseña incorrecta');
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Acceso Restringido</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Ingresa la contraseña para acceder al listado de pantallas
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm mt-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                </span>
                {error}
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    window.location.href = '/listado';
  };

  return (
    <Router>
      {/* Botón flotante para acceder al listado desde la pantalla principal */}
      <Routes>
        <Route path="/" element={
          <div className="relative">
            <VotingScreen />
            <button
              onClick={() => setShowPasswordModal(true)}
              className="fixed top-6 right-6 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-xl font-medium shadow-lg transition-all duration-200 hover:scale-105 border border-white/30 flex items-center justify-center z-50"
            >
              <List className="w-5 h-5" />
            </button>
            
            <PasswordModal
              isOpen={showPasswordModal}
              onClose={() => setShowPasswordModal(false)}
              onSuccess={handlePasswordSuccess}
            />
          </div>
        } />
        <Route path="/listado" element={<HomePage />} />
        <Route path="/comentarios" element={<CommentsScreen />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/estadisticas" element={<StatsScreen />} />
      </Routes>
    </Router>
  );
}

export default App;