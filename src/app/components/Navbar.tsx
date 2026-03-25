import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Newspaper,
  FolderOpen,
  User,
  Shield,
  LogOut,
  LogIn,
  Menu,
  X,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/news', label: 'Новости', icon: <Newspaper className="size-4" /> },
    { to: '/directions', label: 'Материалы', icon: <BookOpen className="size-4" /> },
    ...(user ? [
      { to: '/projects', label: 'Мои проекты', icon: <FolderOpen className="size-4" /> },
    ] : []),
    ...(isModerator ? [
      { to: '/moderator', label: 'Модератор', icon: <Layers className="size-4" /> },
    ] : []),
    ...(isAdmin ? [
      { to: '/admin', label: 'Админ', icon: <Shield className="size-4" /> },
    ] : []),
  ];

  const isActive = (to: string) => location.pathname.startsWith(to);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="size-7 text-indigo-600" />
            <span className="hidden sm:block text-indigo-700" style={{ fontWeight: 700 }}>
              МосПолитех
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(l.to)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {l.icon}
                {l.label}
              </Link>
            ))}
          </div>

          {/* User section */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to={`/profile/${user.nickname}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <User className="size-4" />
                  <span>{user.nickname}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="size-4" />
                  Выйти
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <LogIn className="size-4" />
                Войти
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                isActive(l.to) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {l.icon}
              {l.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 pt-2 mt-2">
            {user ? (
              <>
                <Link
                  to={`/profile/${user.nickname}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileOpen(false)}
                >
                  <User className="size-4" />
                  {user.nickname}
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-4" />
                  Выйти
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-600"
                onClick={() => setMobileOpen(false)}
              >
                <LogIn className="size-4" />
                Войти
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
