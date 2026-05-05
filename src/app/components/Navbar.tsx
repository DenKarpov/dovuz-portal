import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen, Newspaper, Shield, LogOut, LogIn, Menu, X, GraduationCap, Home, BookOpenCheck,
  Lightbulb, Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { filesApi } from '../api/files';
import { accountsApi } from '../api/accounts';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (user) {
      accountsApi.getAccount(user.nickname)
        .then(res => {
          if (res.data.photoNameInDirectory) {
            setUserPhoto(filesApi.getPhotoUrl(res.data.photoNameInDirectory));
          }
        })
        .catch(() => {});
    } else {
      setUserPhoto(null);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/directions', label: '📚 Материалы', icon: <BookOpen className="size-4.5" /> },
    ...(!isModerator && user ? [
      { to: '/courses', label: '📖 Курсы', icon: <BookOpenCheck className="size-4.5" /> },
    ] : []),
    ...(isModerator && !isAdmin ? [
      { to: '/courses', label: '📖 Курсы', icon: <BookOpenCheck className="size-4.5" /> },
      { to: '/moderator/idea-bank', label: '💡 Банк идей', icon: <Lightbulb className="size-4.5" /> },
      { to: '/moderator/students', label: '📊 Рейтинг', icon: <Award className="size-4.5" /> },
    ] : []),
    ...(isAdmin ? [
      { to: '/courses', label: '📖 Курсы', icon: <BookOpenCheck className="size-4.5" /> },
      { to: '/moderator/idea-bank', label: '💡 Банк идей', icon: <Lightbulb className="size-4.5" /> },
      { to: '/moderator/students', label: '📊 Рейтинг', icon: <Award className="size-4.5" /> },
    ] : []),
    ...(isAdmin ? [
      { to: '/admin', label: '⚙️ Управление', icon: <Shield className="size-4.5" /> },
    ] : []),
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 dark:bg-card/95 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.08)] dark:shadow-black/40 border-b border-slate-100 dark:border-border'
            : 'bg-white dark:bg-background border-b border-slate-100 dark:border-border'
        }`}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-red-500 to-blue-600" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[64px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative size-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md shadow-blue-200 group-hover:shadow-blue-300 transition-shadow">
                <GraduationCap className="size-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-base font-bold text-slate-800 dark:text-foreground leading-none">Инженерная школа</p>
                <p className="text-xs text-slate-400 dark:text-muted-foreground leading-none mt-0.5">Московский Политех</p>
              </div>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(l.to)
                      ? 'text-blue-700 dark:text-primary bg-blue-50 dark:bg-primary/15'
                      : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 dark:hover:bg-muted/50'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* User section */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to={`/profile/${user.nickname}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 dark:hover:bg-muted/50 transition-all"
                  >
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt={user.nickname}
                        className="size-8 rounded-lg object-cover border border-slate-200"
                        onError={() => setUserPhoto(null)}
                      />
                    ) : (
                      <div className="size-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                        {user.nickname[0].toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{user.nickname}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <LogOut className="size-4" />
                    Выйти
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md shadow-blue-200 hover:shadow-blue-300 transition-all"
                >
                  <LogIn className="size-4" />
                  Войти
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="size-6" />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="size-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-card border-t border-border px-4 py-3 space-y-1 shadow-lg"
            >
              {links.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={l.to}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-base font-medium ${
                      isActive(l.to) ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2 dark:border-border">
                {user ? (
                  <>
                    <Link
                      to={`/profile/${user.nickname}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => setMobileOpen(false)}
                    >
                      {userPhoto ? (
                        <img src={userPhoto} alt={user.nickname} className="size-7 rounded-lg object-cover border border-slate-200" onError={() => setUserPhoto(null)} />
                      ) : (
                        <div className="size-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                          {user.nickname[0].toUpperCase()}
                        </div>
                      )}
                      {user.nickname}
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setMobileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-base font-medium text-red-500 hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      Выйти
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-blue-600"
                    onClick={() => setMobileOpen(false)}
                  >
                    <LogIn className="size-4" />
                    Войти
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};
