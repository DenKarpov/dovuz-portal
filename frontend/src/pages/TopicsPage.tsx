import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, ChevronRight, Plus, Trash2, Search, Edit2, X, Check, ShieldOff } from 'lucide-react';
import { motion } from 'motion/react';
import { subjectTopicsApi, type SubjectTopicResponse } from '../app/api/subjectTopics';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { adminModeratorsApi } from '../app/api/adminModerators';
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
  const { isAdmin, isModerator, user } = useAuth();

  const [topics, setTopics] = useState<SubjectTopicResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Breadcrumb
  const [subjectName, setSubjectName] = useState('');
  const [directionName, setDirectionName] = useState('');
  const [directionId, setDirectionId] = useState<number | null>(null);

  // CRUD
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Права модератора на текущий предмет
  const [canManage, setCanManage] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const fetchTopics = useCallback(async (p = 0) => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const res = await subjectTopicsApi.getBySubject(Number(subjectId), p, 12);
      setTopics(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
      if (res.data.content.length > 0 && res.data.content[0].subject && !subjectName) {
        setSubjectName(res.data.content[0].subject.name);
      }
    } catch {
      toast.error('Ошибка загрузки тем');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  // Хлебные крошки — getById нет, ищем предмет перебором направлений
  useEffect(() => {
    if (!subjectId) return;
    fetchTopics(0);

    const loadBreadcrumb = async () => {
      try {
        const dirs: DirectionResponse[] = (await directionsApi.getAll()).data;
        for (const dir of dirs) {
          const subsPage = await subjectsApi.getByDirection(dir.id, 0, 200);
          const found = subsPage.data.content.find((s: SubjectResponse) => s.id === Number(subjectId));
          if (found) {
            setSubjectName(found.name);
            setDirectionName(dir.name);
            setDirectionId(dir.id);
            break;
          }
        }
      } catch { /* ignore */ }
    };
    loadBreadcrumb();
  }, [subjectId, fetchTopics]);

  // Проверяем права модератора через существующий эндпоинт /admin/moderators/subject/{id}
  useEffect(() => {
    if (!subjectId) return;

    if (isAdmin) {
      setCanManage(true);
      setAccessChecked(true);
      return;
    }

    if (!isModerator || !user) {
      setCanManage(false);
      setAccessChecked(true);
      return;
    }

    adminModeratorsApi.getMySubjects()
        .then(moderatorSubjects => {
          const hasAccess = moderatorSubjects.some(m => m.subjectId === Number(subjectId));
          setCanManage(hasAccess);
          setAccessChecked(true);
        })
        .catch(() => {
          setCanManage(false);
          setAccessChecked(true);
        });
  }, [subjectId, isAdmin, isModerator, user]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Введите название');
    setCreating(true);
    try {
      await subjectTopicsApi.create(newName.trim(), Number(subjectId));
      toast.success('Тема создана');
      setCreateOpen(false);
      setNewName('');
      fetchTopics(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return toast.error('Введите название');
    setSaving(true);
    try {
      await subjectTopicsApi.update(id, editName.trim());
      toast.success('Тема обновлена');
      setEditId(null);
      fetchTopics(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить тему? Все публикации будут удалены.')) return;
    try {
      await subjectTopicsApi.delete(id);
      toast.success('Тема удалена');
      fetchTopics(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    }
  };

  const filtered = topics.filter(
      t => !search.trim() || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="size-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <Layers className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{subjectName || 'Темы'}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Разделы дисциплины</p>
            </div>
          </div>
          {canManage && (
              <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
              >
                <Plus className="size-4" /> Добавить тему
              </button>
          )}
        </motion.div>

        {/* Breadcrumb */}
        <motion.nav
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
            className="flex items-center gap-2 text-xs text-muted-foreground mb-6 flex-wrap"
        >
          <Link to="/directions" className="hover:text-foreground transition-colors">Материалы</Link>
          <ChevronRight className="size-3.5" />
          {directionId ? (
              <Link to={`/directions/${directionId}/subjects`} className="hover:text-foreground transition-colors">
                {directionName || '...'}
              </Link>
          ) : <span>{directionName || '...'}</span>}
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{subjectName || '...'}</span>
        </motion.nav>

        {/* Баннер: модератор не назначен на этот предмет — показываем только после завершения проверки */}
        {isModerator && !isAdmin && accessChecked && !canManage && (
            <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="flex items-start gap-3 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-6"
            >
              <ShieldOff className="size-4 mt-0.5 shrink-0" />
              <span>Вы не назначены на этот предмет. Создание, редактирование и удаление тем недоступно. Если это ошибка — обратитесь к администратору.</span>
            </motion.div>
        )}

        {/* Search */}
        <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="relative mb-6"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Найти тему..."
              className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </motion.div>

        {/* Skeleton */}
        {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}
            </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
              <Layers className="size-10 mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">
                {topics.length === 0 ? 'Тем пока нет' : `Ничего не найдено по «${search}»`}
              </p>
              {canManage && topics.length === 0 && (
                  <button
                      onClick={() => setCreateOpen(true)}
                      className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90"
                  >
                    Создать первую тему
                  </button>
              )}
            </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t, idx) => {
                const grad = PALETTE[idx % PALETTE.length];
                const isEditing = editId === t.id;
                return (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }} whileHover={{ y: -2 }}
                    >
                      <div className="group relative overflow-hidden rounded-2xl p-5 text-white min-h-[148px] flex flex-col">
                        <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-white/8" />
                        <div className="absolute -bottom-6 -left-3 size-16 rounded-full bg-black/10" />
                        <div className="relative flex flex-col h-full gap-3">
                          <div className="flex items-start justify-between">
                            <Layers className="size-7 text-white/70" />
                            {canManage && !isEditing && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                      onClick={() => { setEditId(t.id); setEditName(t.name); }}
                                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                      title="Редактировать"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </button>
                                  <button
                                      onClick={() => handleDelete(t.id)}
                                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                      title="Удалить"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white/60 text-xs font-medium mb-1">
                              {t.subject?.name ?? ''}
                            </p>
                            {isEditing ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                      autoFocus value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleEdit(t.id);
                                        if (e.key === 'Escape') setEditId(null);
                                      }}
                                      className="flex-1 text-sm font-bold bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:bg-white/30"
                                  />
                                  <button
                                      onClick={() => handleEdit(t.id)} disabled={saving}
                                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-60"
                                  >
                                    <Check className="size-3.5" />
                                  </button>
                                  <button
                                      onClick={() => setEditId(null)}
                                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                            ) : (
                                <Link to={`/topics/${t.id}/publications`} className="block">
                                  <h3 className="text-white text-base font-bold leading-snug group-hover:text-white/90">
                                    {t.name}
                                  </h3>
                                  <p className="text-white/60 text-xs mt-2 group-hover:text-white/80 transition-colors">
                                    Смотреть публикации →
                                  </p>
                                </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                );
              })}
            </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchTopics} />

        {/* Create modal */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая тема">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Название темы *</label>
              <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Например: Интегралы" autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-3">
              <button
                  onClick={handleCreate} disabled={creating}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2.5 bg-muted text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};