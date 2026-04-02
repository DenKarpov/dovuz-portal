import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Plus, Trash2, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const SUBJECT_EMOJIS = ['📐', '📊', '🔬', '💻', '🎨', '🌍', '📝', '🧮', '⚡', '🔧', '📕', '🎯'];
const CARD_STYLES = [
  { gradient: 'from-violet-600 to-indigo-700' },
  { gradient: 'from-blue-600 to-cyan-700' },
  { gradient: 'from-emerald-600 to-teal-700' },
  { gradient: 'from-orange-500 to-red-600' },
  { gradient: 'from-pink-600 to-rose-700' },
  { gradient: 'from-amber-500 to-yellow-600' },
];

export const SubjectsPage: React.FC = () => {
  const { dirId } = useParams<{ dirId: string }>();
  const { isAdmin } = useAuth();
  const [direction, setDirection] = useState<DirectionResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredSubjects = subjects.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q);
  });

  const fetchSubjects = async (p = 0) => {
    setLoading(true);
    try {
      const res = await subjectsApi.getByDirection(Number(dirId), p, 12);
      setSubjects(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch {
      toast.error('Ошибка загрузки предметов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    directionsApi.getAll().then((res) => {
      const dir = res.data.find((d) => d.id === Number(dirId));
      setDirection(dir ?? null);
    });
    fetchSubjects(0);
  }, [dirId]);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Введите название предмета');
    setCreating(true);
    try {
      await subjectsApi.create(newName.trim(), Number(dirId));
      toast.success('✅ Предмет создан');
      setCreateOpen(false);
      setNewName('');
      fetchSubjects(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить предмет?')) return;
    try {
      await subjectsApi.delete(id);
      toast.success('🗑️ Предмет удалён');
      fetchSubjects(page);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="size-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <BookOpen className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 text-2xl font-bold">{direction?.name ?? 'Предметы'}</h1>
            <p className="text-slate-400 text-base">📖 Выберите предмет для изучения</p>
          </div>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-base font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <Plus className="size-5" />
            Добавить предмет
          </motion.button>
        )}
      </motion.div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-base text-slate-400 mb-8">
        <Link to="/directions" className="hover:text-indigo-600 transition-colors">📚 Направления</Link>
        <ChevronRight className="size-4" />
        <span className="text-slate-700 font-medium">{direction?.name ?? '...'}</span>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Поиск по названию предмета..."
          className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <BookOpen className="size-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 text-lg">{subjects.length === 0 ? '📭 Предметов пока нет' : '🔍 Ничего не найдено'}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((s, idx) => (
            (() => {
              const style = CARD_STYLES[idx % CARD_STYLES.length];
              const emoji = SUBJECT_EMOJIS[idx % SUBJECT_EMOJIS.length];
              return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
              className="group relative"
            >
              <Link
                to={`/subjects/${s.id}/topics`}
                className="group relative overflow-hidden rounded-3xl p-6 text-white block"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
                <div className="absolute -top-6 -right-6 size-28 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 -left-4 size-20 rounded-full bg-black/10" />

                <div className="relative flex flex-col h-full gap-4 min-h-[140px]">
                  <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-sm text-2xl">
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-white/60 text-xs font-medium mb-1">Предмет</p>
                    <h3 className="text-white text-lg font-bold leading-snug">{s.name}</h3>
                    <p className="text-white/70 text-sm mt-1.5">{s.directionName}</p>
                  </div>
                  <div className="text-white/85 text-sm font-medium group-hover:text-white transition-colors">
                    Открыть → 
                  </div>
                </div>
              </Link>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(s.id)}
                  className="absolute top-4 right-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 backdrop-blur"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </motion.div>
              );
            })()
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchSubjects} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="✨ Новый предмет">
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-base text-slate-700 font-medium mb-2">Название предмета *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
              placeholder="Например: Математика"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={creating} className="flex-1 py-3 bg-indigo-600 text-white text-base rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60">
              {creating ? 'Создание...' : '🚀 Создать'}
            </button>
            <button onClick={() => setCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 text-base rounded-xl hover:bg-slate-200 transition-colors">
              Отмена
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
