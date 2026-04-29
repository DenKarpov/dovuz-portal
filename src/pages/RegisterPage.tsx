import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, UserPlus, ArrowRight, BookOpen, Users, Trophy, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '../app/api/auth';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const features = [
  { icon: BookOpen, title: 'Методические материалы', desc: 'Полная библиотека учебных ресурсов по всем направлениям подготовки' },
  { icon: Users, title: 'Экспертные преподаватели', desc: 'Обратная связь от специалистов Московского Политехнического Университета' },
  { icon: Trophy, title: 'Проектные работы', desc: 'Система оценки проектов и отслеживания прогресса по этапам' },
];

const NoisePattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise-reg">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise-reg)" />
  </svg>
);

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nickname || !password) return toast.error('Заполните все поля');
    if (password.length < 8) return toast.error('Пароль должен содержать не менее 8 символов');
    setLoading(true);
    try {
      const res = await authApi.register(email.trim(), nickname.trim(), password.trim());
      login({ nickname: res.data.nickname, role: res.data.role });
      toast.success('🎉 Аккаунт успешно создан!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT: Dark panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0A0A14]">
        <NoisePattern />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.5) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)' }}
        />
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 via-blue-600/50 to-transparent" />

        <div className="relative z-10 flex flex-col justify-center p-16 max-w-xl">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            <div className="mb-12">
              <div className="text-white mb-5" style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, lineHeight: 1.15 }}>
                🎓 Начните свой путь
                <br />
                <span className="text-blue-400">в Московском Политехе</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-lg">
                Присоединяйтесь к сообществу будущих инженеров и учёных
              </p>
            </div>

            <div className="space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-5 p-5 rounded-2xl bg-white/5 border border-white/8 cursor-default"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 shrink-0">
                    <f.icon className="size-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-base mb-1">{f.title}</div>
                    <div className="text-slate-500 text-sm leading-relaxed">{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-12 grid grid-cols-3 gap-4"
            >
              {[['500+', '📖 Материалов'], ['12', '🎯 Направлений'], ['1200+', '👩‍🎓 Учеников']].map(([n, l]) => (
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-white text-2xl font-bold">{n}</p>
                  <p className="text-slate-500 text-xs mt-1">{l}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* RIGHT: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 bg-white">
        <div className="w-full max-w-[420px]">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Link to="/" className="inline-flex items-center gap-2.5 mb-10 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                <GraduationCap className="size-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base leading-none group-hover:text-blue-700 transition-colors">МосПолитех</p>
                <p className="text-slate-400 text-xs leading-none mt-0.5">Довузовская подготовка</p>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="mb-8">
            <h1 className="text-slate-900 mb-2" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 800, lineHeight: 1.2 }}>
              Создайте аккаунт ✨
            </h1>
            <p className="text-slate-500">Регистрация занимает пару минут</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Никнейм</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="username"
                  required
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  required
                  minLength={8}
                  className="w-full h-12 pl-11 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPwd ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? 'none' : '0 8px 25px rgba(79,70,229,0.35)' }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <>🚀 Зарегистрироваться</>
              )}
            </motion.button>

            <p className="text-center text-slate-500 pt-2">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">Войти</Link>
            </p>
          </motion.form>
        </div>
      </div>
    </div>
  );
};
