import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, User, ChevronLeft, ChevronRight, BookOpen, Users,
  Trophy, ArrowRight, GraduationCap, Layers, Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { newsPublicationsApi, type PublicationResponse } from '../app/api/newsPublications';
import { useAuth } from '../context/AuthContext';

const NoisePattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [page, setPage] = useState(0);
  const [news, setNews] = useState<PublicationResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    setNewsLoading(true);
    newsPublicationsApi.getAll(page, 5)
      .then(res => {
        setNews(res.data.content);
        setTotalPages(res.data.total_pages);
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false));
  }, [page]);

  const features = [
    { icon: BookOpen, color: '#2563eb', bg: '#dbeafe', title: 'Богатая библиотека', desc: 'Методические материалы, лекции и практические задания по всем направлениям подготовки' },
    { icon: Users, color: '#1d4ed8', bg: '#dbeafe', title: 'Живое сообщество', desc: 'Общайтесь с преподавателями и единомышленниками, задавайте вопросы и делитесь опытом' },
    { icon: Trophy, color: '#2563eb', bg: '#dbeafe', title: 'Результат', desc: 'Отслеживайте прогресс, проходите контрольные слушания и развивайте навыки системно' },
  ];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-white -mt-16">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-[#0A0A14] min-h-[92vh] flex items-center">
        <NoisePattern />

        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.4) 0%, transparent 70%)' }}
        />

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${[6, 10, 4, 8, 5, 12][i]}px`,
              height: `${[6, 10, 4, 8, 5, 12][i]}px`,
              background: i % 2 === 0 ? '#3b82f6' : '#2563eb',
              left: `${[15, 75, 35, 85, 55, 20][i]}%`,
              top: `${[25, 15, 65, 45, 80, 55][i]}%`,
              opacity: 0.6,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, i % 2 === 0 ? 10 : -10, 0],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          />
        ))}

        <div className="container mx-auto px-6 relative z-10 py-24">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 text-base px-5 py-2.5 rounded-full backdrop-blur-sm">
                <span className="w-2.5 h-2.5 bg-blue-50 rounded-full animate-pulse" />
                Московский Политехнический Университет
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-white mb-8"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}
            >
              Довузовская{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #3b82f6 0%, #93c5fd 50%, #3b82f6 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmerHero 3s linear infinite',
                }}
              >
                подготовка
              </span>
              <br />в Московском Политехе
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-gray-400 mb-12 max-w-2xl"
              style={{ fontSize: 'clamp(1.05rem, 2vw, 1.35rem)', lineHeight: 1.7 }}
            >
              Образовательная платформа для школьников, которые хотят поступить в один из
              ведущих технических университетов страны.
            </motion.p>

            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(59,130,246,0.5)' }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-9 py-4.5 rounded-xl text-base font-semibold transition-colors shadow-lg shadow-blue-500/25"
                  >
                    Начать обучение
                    <ArrowRight className="size-5" />
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />

        <style>{`
          @keyframes shimmerHero {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-28 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-gray-900 mb-5" style={{ fontSize: 'clamp(1.85rem, 4vw, 2.85rem)', fontWeight: 800, lineHeight: 1.2 }}>
              Всё для успешной подготовки
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Современные инструменты обучения, созданные специально для школьников
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,0,0,0.10)' }}
                className="bg-white border border-gray-100 rounded-2xl p-9 cursor-default transition-shadow"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                  style={{ background: f.bg }}
                >
                  <f.icon className="size-8" style={{ color: f.color }} />
                </motion.div>
                <h3 className="text-gray-900 mb-3" style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 }}>
                  {f.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DIVIDER ─── */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600" />

      {/* ─── NEWS ─── */}
      <section className="py-28 bg-[#F5F6F8]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-12 gap-4"
            >
              <div>
                <span className="text-blue-600 text-sm font-semibold tracking-widest uppercase mb-2 block">
                  Новости
                </span>
                <h2 className="text-gray-900" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.35rem)', fontWeight: 800, lineHeight: 1.2 }}>
                  Последние события
                </h2>
              </div>
              <Link
                to="/news"
                className="hidden md:flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-base shrink-0 group"
              >
                Все новости
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {newsLoading ? (
              <div className="flex items-center justify-center py-24">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 className="size-8 text-blue-600" />
                </motion.div>
              </div>
            ) : news.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-16 text-center border border-gray-100">
                <BookOpen className="size-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-400 text-lg">Новостей пока нет</p>
              </motion.div>
            ) : (
              <>
                <div className="space-y-4">
                  {news.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.08 }}
                      whileHover={{ x: 4 }}
                    >
                      <Link
                        to={`/news/${item.id}`}
                        className="group block bg-white rounded-2xl p-7 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-start gap-5">
                          <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 shrink-0">
                            <GraduationCap className="size-7 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-gray-900 mb-2 group-hover:text-blue-600 transition-colors" style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3 }}>
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-gray-500 leading-relaxed mb-4 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-5">
                              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                <User className="size-4" />
                                <span>{item.nickname}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                <Calendar className="size-4" />
                                <span>{formatDate(item.created_at)}</span>
                              </div>
                              <span className="ml-auto flex items-center gap-1.5 text-blue-600 text-sm font-semibold group-hover:translate-x-0.5 transition-transform">
                                Читать <ArrowRight className="size-4" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 mt-10">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-base font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="size-4" /> Назад
                    </button>
                    <div className="px-6 py-3 bg-white rounded-xl border border-gray-200 text-base">
                      <span className="font-bold text-gray-900">{page + 1}</span>
                      <span className="text-gray-400"> / {totalPages}</span>
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-base font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Вперёд <ChevronRight className="size-4" />
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      {!isAuthenticated && (
        <section className="relative py-28 bg-[#0A0A14] overflow-hidden">
          <NoisePattern />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }}
          />

          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="text-white mb-6" style={{ fontSize: 'clamp(2.1rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1 }}>
                Готовы начать{' '}
                <span className="text-blue-400">обучение?</span>
              </h2>
              <p className="text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed text-lg">
                Присоединяйтесь к тысячам школьников, которые уже развивают свои навыки вместе с Московским Политехом
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(59,130,246,0.5)' }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-11 py-4.5 rounded-xl text-base font-semibold transition-colors shadow-lg shadow-blue-500/25"
                  >
                    Зарегистрироваться <ArrowRight className="size-5" />
                  </motion.button>
                </Link>
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 border border-white/15 text-white hover:bg-white/5 px-11 py-4.5 rounded-xl text-base font-semibold transition-colors"
                  >
                    Уже есть аккаунт
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};
