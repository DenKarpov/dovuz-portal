import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Compass, FlaskConical, Palette, Code2, Calculator, Globe, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { toast } from 'sonner';

const DIRECTION_STYLES = [
  { gradient: 'from-violet-600 to-indigo-700', shadow: 'shadow-indigo-200', icon: <Calculator className="size-6 text-white" /> },
  { gradient: 'from-blue-600 to-cyan-700', shadow: 'shadow-cyan-200', icon: <Code2 className="size-6 text-white" /> },
  { gradient: 'from-emerald-600 to-teal-700', shadow: 'shadow-teal-200', icon: <FlaskConical className="size-6 text-white" /> },
  { gradient: 'from-orange-500 to-red-600', shadow: 'shadow-orange-200', icon: <Compass className="size-6 text-white" /> },
  { gradient: 'from-pink-600 to-rose-700', shadow: 'shadow-rose-200', icon: <Palette className="size-6 text-white" /> },
  { gradient: 'from-amber-500 to-yellow-600', shadow: 'shadow-yellow-200', icon: <Globe className="size-6 text-white" /> },
];

export const DirectionsPage: React.FC = () => {
  const [directions, setDirections] = useState<DirectionResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    directionsApi.getAll()
      .then(res => setDirections(res.data))
      .catch(() => toast.error('Ошибка загрузки направлений'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="size-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <BookOpen className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-slate-900 text-2xl font-bold">📚 Учебные материалы</h1>
          <p className="text-slate-400 text-base">Выберите направление для просмотра дисциплин</p>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-sm mb-8 mt-4"
      >
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium text-xs">Направления</span>
      </motion.div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Поиск по направлениям..."
          className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (() => {
        const filtered = directions.filter(d => !searchQuery.trim() || d.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
        return filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="size-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="size-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-base">{directions.length === 0 ? '📭 Направлений пока нет' : '🔍 Ничего не найдено'}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((dir, idx) => {
            const style = DIRECTION_STYLES[idx % DIRECTION_STYLES.length];
            return (
              <motion.div
                key={dir.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
              >
                <Link
                  to={`/directions/${dir.id}/subjects`}
                  className={`group relative overflow-hidden rounded-3xl p-6 text-white block`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />

                  {/* Decorative circles */}
                  <div className="absolute -top-6 -right-6 size-28 rounded-full bg-white/10" />
                  <div className="absolute -bottom-8 -left-4 size-20 rounded-full bg-black/10" />

                  <div className="relative flex flex-col h-full gap-4 min-h-[140px]">
                    <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-sm">
                      {style.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-white/60 text-xs font-medium mb-1">Направление #{dir.id}</p>
                      <h3 className="text-white text-lg font-bold leading-snug">{dir.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/80 text-sm font-medium group-hover:text-white transition-colors">
                      Предметы
                      <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      );
      })()}
    </div>
  );
};
