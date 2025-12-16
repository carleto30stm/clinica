import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { TrackingCat } from '@/components/cat/CatTracking';
import { useAuthStore } from '../../store/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-sm">
        {/* Cat Container */}
        <div className="relative z-0">
          <TrackingCat isPasswordFocused={isPasswordFocused} />
        </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white tracking-wide">Bienvenido</h1>
          <p className="text-blue-100 text-sm mt-1">Ingresa a tu cuenta</p>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Field */}
            <div className="space-y-1 group">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-blue-600"
              >
                Email o Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-gray-900"
                  placeholder="usuario o ejemplo@correo.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1 group">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-blue-600"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-gray-900"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" 
                />
                <span className="text-gray-600 group-hover:text-gray-800">Recordarme</span>
              </label>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md transform transition-all active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>

            {/* Social Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O continuar con</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                className="flex items-center justify-center py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Google
              </button>
              <button 
                type="button"
                className="flex items-center justify-center py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200"
              >
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </button>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                Al continuar, aceptas nuestros <a href="#" className="underline hover:text-gray-700">Términos de Servicio</a> y <a href="#" className="underline hover:text-gray-700">Política de Privacidad</a>.
              </p>
            </div>

          </form>
        </div>
      </div>
      </div>
    </div>
  );
};