import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, ChevronRight, Plus, Search, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { subjectTopicsApi, type SubjectTopicResponse } from '../app/api/subjectTopics';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const PALETTE = [
  'from-blue-500 to-blue-700', 'from-indigo-500 to-indigo-700',
  'from-emerald-500 to-teal-700', 'from-orange-500 to-red-600',
  'from-pink-500 to-rose-700', 'from-amber-500 to-yellow-600',
  'from-purple-500 to-violet-700', 'from-cyan-500 to-sky-700',
];

export const TopicsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { isModerator } = useAuth();
  const [topics, setTopics] = useState<SubjectTopicResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [directionName, setDirectionName] = useState('');
  const [directionId, setDirectionId] = useState<number | null>(null);

  const fetchTopics = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const res = await subjectTopicsApi.getBySubject(Number(subjectId), p, 12);
      setTopics(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
      if (res.data.content.length > 0 && res.data.content[0].subject)
        setSubjectName(res.data.content[0].subject.name);
    } catch { toast.error('Ошибка загрузки тем'); }
    finally { setLoading(false); }
  }, [subjectId]);

  useEffect(() => {
    fetchTopics(0);
    const load = async () => {
      try {
        const dirs: DirectionResponse[] = (await directionsApi.getAll()).data;
        for (const dir of dirs) {
          try {
            const subs = (await subjectsApi.getByDirection(dir.id, 0, 100)).data.content;
            const found = subs.find((s: SubjectResponse) => s.id === Number(subjectId));
            if (found) { setSubjectName(found.name); setDirectionName(dir.name); setDirectionId(dir.id); return; }
          } catch { /* continue */ }
        }
      } catch { /* ignore */ }
    };
    if (subjectId) load();
  }, [subjectId, fetchTopics]);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Введите название');
    setCreating(true);
    try {
      await subjectTopicsApi.create(form.name.trim(), Number(subjectId));
      toast.success('Тема создана');
      setCreateOpen(false); setForm({ name: '' }); fetchTopics(0);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setCreating(false); }
  };

  const filtered = topics.filter(t => !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <Layers className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{subjectName || 'Темы'}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Разделы дисциплины</p>
            </div>
          </div>
          {isModerator && (
              <button onClick={() => setCreateOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0">
                <Plus className="size-4" /> Добавить тему
              </button>
          )}
        </motion.div>

        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground mb-6 flex-wrap">
          <Link to="/directions" className="hover:text-foreground transition-colors">Материалы</Link>
          <ChevronRight className="size-3.5" />
          {directionId ? (
              <Link to={`/directions/${directionId}/subjects`} className="hover:text-foreground transition-colors">{directionName}</Link>
          ) : <span>Загрузка...</span>}
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{subjectName || '...'}</span>
        </motion.nav>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                    className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти тему..."
                 className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </motion.div>

        {/* Skeleton */}
        {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}
            </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center border border-dashed border-border rounded-2xl">
              <FileText className="size-10 mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">{topics.length === 0 ? 'Тем пока нет' : `Ничего не найдено по «${search}»`}</p>
              {isModerator && topics.length === 0 && (
                  <button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">
                    Создать первую тему
                  </button>
              )}
            </div>
        )}

        {/* Grid - same card style as SubjectsPage & DirectionsPage */}
        {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t, idx) => {
                const grad = PALETTE[idx % PALETTE.length];
                return (
                    <motion.div key={t.id}
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.04 }} whileHover={{ y: -2 }}>
                      <Link to={`/topics/${t.id}/publications`}
                            className="group block relative overflow-hidden rounded-2xl p-5 text-white min-h-[148px] flex flex-col">
                        <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-white/8" />
                        <div className="absolute -bottom-6 -left-3 size-16 rounded-full bg-black/10" />
                        <div className="relative flex flex-col h-full gap-3">
                          <Layers className="size-7 text-white/70" />
                          <div className="flex-1">
                            <p className="text-white/60 text-xs font-medium mb-1">{t.subject?.name ?? 'Тема'}</p>
                            <h3 className="text-white text-base font-bold leading-snug">{t.name}</h3>
                          </div>
                          <p className="text-white/70 text-xs font-medium group-hover:text-white/90 transition-colors">Открыть публикации →</p>
                        </div>
                      </Link>
                    </motion.div>
                );
              })}
            </div>
        )}

        {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchTopics} />}

        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая тема">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Название темы *</label>
              <input type="text" value={form.name} onChange={e => setForm({ name: e.target.value })}
                     placeholder="Например: Введение в программирование" autoFocus
                     onKeyDown={e => { if (e.key === 'Enter' && !creating && form.name.trim()) handleCreate(); }}
                     className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button onClick={() => { setCreateOpen(false); setForm({ name: '' }); }}
                      className="flex-1 py-2.5 bg-muted text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};