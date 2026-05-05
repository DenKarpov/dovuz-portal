import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Plus, Trash2, Search, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const PALETTE = [
  'from-blue-500 to-blue-700',
  'from-indigo-500 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-700',
  'from-amber-500 to-yellow-600',
  'from-purple-500 to-violet-700',
  'from-cyan-500 to-sky-700',
];
const EMOJIS = ['📐', '📊', '🔬', '💻', '🎨', '🌍', '📝', '🧮', '⚡', '🔧', '📕', '🎯'];

export const SubjectsPage: React.FC = () => {
  const { dirId } = useParams<{ dirId: string }>();
  const { isAdmin } = useAuth();
  const [direction, setDirection] = useState<DirectionResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = subjects.filter(s => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()));

  const fetchSubjects = async (p = 0) => {
    setLoading(true);
    try {
      const res = await subjectsApi.getByDirection(Number(dirId), p, 12);
      setSubjects(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch { toast.error('Ошибка загрузки предметов'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    directionsApi.getAll().then(res => {
      setDirection(res.data.find((d: DirectionResponse) => d.id === Number(dirId)) ?? null);
    });
    fetchSubjects(0);
  }, [dirId]);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Введите название');
    setCreating(true);
    try {
      await subjectsApi.create(newName.trim(), Number(dirId));
      toast.success('Предмет создан');
      setCreateOpen(false); setNewName(''); fetchSubjects(0);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить предмет?')) return;
    try { await subjectsApi.delete(id); toast.success('Предмет удалён'); fetchSubjects(page); }
    catch { toast.error('Ошибка удаления'); }
  };

  return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <BookOpen className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{direction?.name ?? 'Предметы'}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Выберите предмет для изучения</p>
            </div>
          </div>
          {isAdmin && (
              <button onClick={() => setCreateOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0">
                <Plus className="size-4" /> Добавить предмет
              </button>
          )}
        </motion.div>

        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link to="/directions" className="hover:text-foreground transition-colors">Материалы</Link>
          <ChevronRight className="size-3.5" />
          <Link to="/directions" className="hover:text-foreground transition-colors">Направления</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{direction?.name ?? '...'}</span>
        </motion.nav>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                    className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти предмет..."
                 className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </motion.div>

        {/* Skeleton */}
        {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)}
            </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
              <Layers className="size-10 mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">{subjects.length === 0 ? 'Предметов пока нет' : `Ничего не найдено по «${search}»`}</p>
              {isAdmin && subjects.length === 0 && (
                  <button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">
                    Добавить первый предмет
                  </button>
              )}
            </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s, idx) => {
                const grad = PALETTE[idx % PALETTE.length];
                const emoji = EMOJIS[idx % EMOJIS.length];
                return (
                    <motion.div key={s.id} className="relative group"
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.04 }} whileHover={{ y: -2 }}>
                      <Link to={`/subjects/${s.id}/topics`}
                            className="block relative overflow-hidden rounded-2xl p-5 text-white min-h-[148px] flex flex-col">
                        <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-white/8" />
                        <div className="absolute -bottom-6 -left-3 size-16 rounded-full bg-black/10" />
                        <div className="relative flex flex-col h-full gap-3">
                          <span className="text-2xl">{emoji}</span>
                          <div className="flex-1">
                            <p className="text-white/60 text-xs font-medium mb-1">Предмет</p>
                            <h3 className="text-white text-base font-bold leading-snug">{s.name}</h3>
                          </div>
                          <p className="text-white/70 text-xs font-medium group-hover:text-white/90 transition-colors">Открыть темы →</p>
                        </div>
                      </Link>
                      {isAdmin && (
                          <button onClick={() => handleDelete(s.id)}
                                  className="absolute top-3 right-3 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="size-3.5" />
                          </button>
                      )}
                    </motion.div>
                );
              })}
            </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchSubjects} />

        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый предмет">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Название предмета *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                     placeholder="Например: Математика" autoFocus
                     className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={creating}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button onClick={() => setCreateOpen(false)}
                      className="flex-1 py-2.5 bg-muted text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};