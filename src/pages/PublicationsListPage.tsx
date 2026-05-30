import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, ChevronRight, Plus, Trash2, Search, Layers, ShieldOff, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { publicationsApi, type PublicationTitleAndId } from '../app/api/publications';
import { subjectTopicsApi, type SubjectTopicResponse } from '../app/api/subjectTopics';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { adminModeratorsApi } from '../app/api/adminModerators';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const PublicationsListPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const { user, isAdmin, isModerator } = useAuth();

  const [publications, setPublications] = useState<PublicationTitleAndId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [creating, setCreating] = useState(false);

  // Breadcrumb
  const [topicName, setTopicName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [directionName, setDirectionName] = useState('');
  const [directionId, setDirectionId] = useState<number | null>(null);

  // Права на управление — аналогично TopicsPage
  const [canManage, setCanManage] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const filteredPublications = publications.filter(p => {
    const q = searchQuery.trim().toLowerCase();
    return !q || p.title.toLowerCase().includes(q);
  });

  const fetchPublications = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const res = await publicationsApi.getByTopic(Number(topicId), p, 15);
      setPublications(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch {
      toast.error('Ошибка загрузки публикаций');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  // Хлебные крошки — перебираем направления → предметы → темы
  useEffect(() => {
    if (!topicId) return;
    fetchPublications(0);

    const buildBreadcrumb = async () => {
      try {
        const dirs: DirectionResponse[] = (await directionsApi.getAll()).data;
        for (const dir of dirs) {
          const subs = (await subjectsApi.getByDirection(dir.id, 0, 100)).data.content;
          for (const sub of subs as SubjectResponse[]) {
            const topics = (await subjectTopicsApi.getBySubject(sub.id, 0, 100)).data.content;
            const found = topics.find((t: SubjectTopicResponse) => t.id === Number(topicId));
            if (found) {
              setTopicName(found.name);
              setSubjectName(sub.name);
              setSubjectId(sub.id);
              setDirectionName(dir.name);
              setDirectionId(dir.id);
              return;
            }
          }
        }
      } catch { /* ignore */ }
    };
    buildBreadcrumb();
  }, [topicId, fetchPublications]);

  // Проверяем права на управление публикациями — через назначение на предмет
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
    adminModeratorsApi.listBySubject(subjectId)
        .then(res => setCanManage(res.data.some(m => m.nickname === user.nickname)))
        .catch(() => setCanManage(false))
        .finally(() => setAccessChecked(true));
  }, [subjectId, isAdmin, isModerator, user]);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Введите заголовок');
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('subjectTopicId', topicId!);
      if (files) Array.from(files).forEach(f => fd.append('files', f));
      await publicationsApi.create(fd);
      toast.success('Публикация создана');
      setCreateOpen(false);
      setForm({ title: '', description: '' });
      setFiles(null);
      fetchPublications(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить публикацию?')) return;
    try {
      await publicationsApi.delete(id);
      toast.success('Публикация удалена');
      fetchPublications(page);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const PALETTE = [
    'from-blue-500 to-blue-700', 'from-indigo-500 to-indigo-700',
    'from-emerald-500 to-teal-700', 'from-orange-500 to-red-600',
    'from-pink-500 to-rose-700', 'from-amber-500 to-yellow-600',
    'from-purple-500 to-violet-700', 'from-cyan-500 to-sky-700',
  ];

  return (
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header — идентичен DirectionsPage / SubjectsPage / TopicsPage */}
        <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <FileText className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{topicName || 'Публикации'}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Материалы раздела</p>
            </div>
          </div>
          {canManage && (
              <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
              >
                <Plus className="size-4" /> Добавить публикацию
              </button>
          )}
        </motion.div>

        {/* Breadcrumb — идентичен TopicsPage */}
        <motion.nav
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
            className="flex items-center gap-2 text-xs text-muted-foreground mb-6 flex-wrap"
        >
          <Link to="/directions" className="hover:text-foreground transition-colors">Материалы</Link>
          <ChevronRight className="size-3.5" />
          {directionId
              ? <Link to={`/directions/${directionId}/subjects`} className="hover:text-foreground transition-colors">{directionName || '...'}</Link>
              : <span>{directionName || '...'}</span>}
          <ChevronRight className="size-3.5" />
          {subjectId
              ? <Link to={`/subjects/${subjectId}/topics`} className="hover:text-foreground transition-colors">{subjectName || '...'}</Link>
              : <span>{subjectName || '...'}</span>}
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{topicName || '...'}</span>
        </motion.nav>

        {/* Баннер: модератор не назначен на предмет */}
        {isModerator && !isAdmin && accessChecked && !canManage && (
            <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="flex items-start gap-3 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-6"
            >
              <ShieldOff className="size-4 mt-0.5 shrink-0" />
              <span>Вы не назначены на этот предмет. Создание и удаление публикаций недоступно.</span>
            </motion.div>
        )}

        {/* Search — идентичен остальным страницам */}
        <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="relative mb-6"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Найти публикацию..."
              className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </motion.div>

        {/* Skeleton */}
        {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
        )}

        {/* Empty */}
        {!loading && filteredPublications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
              <FileText className="size-10 mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">
                {publications.length === 0 ? 'Публикаций пока нет' : `Ничего не найдено по «${searchQuery}»`}
              </p>
              {canManage && publications.length === 0 && (
                  <button
                      onClick={() => setCreateOpen(true)}
                      className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Добавить первую публикацию
                  </button>
              )}
            </div>
        )}

        {/* Grid — те же карточки с градиентом как в SubjectsPage и TopicsPage */}
        {!loading && filteredPublications.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPublications.map((p, idx) => {
                const grad = PALETTE[idx % PALETTE.length];
                return (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }} whileHover={{ y: -2 }}
                    >
                      <div className="group relative overflow-hidden rounded-2xl p-5 text-white min-h-[148px] flex flex-col">
                        <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-white/8" />
                        <div className="absolute -bottom-6 -left-3 size-16 rounded-full bg-black/10" />
                        <div className="relative flex flex-col h-full gap-3">
                          <div className="flex items-start justify-between">
                            <FileText className="size-7 text-white/70" />
                            {canManage && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                      onClick={() => handleDelete(p.id)}
                                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                      title="Удалить"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white/60 text-xs font-medium mb-1">{topicName || 'Публикация'}</p>
                            <Link to={`/publications/${p.id}`} className="block">
                              <h3 className="text-white text-base font-bold leading-snug group-hover:text-white/90 line-clamp-2">
                                {p.title}
                              </h3>
                              <p className="text-white/60 text-xs mt-2 group-hover:text-white/80 transition-colors">
                                Открыть →
                              </p>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                );
              })}
            </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchPublications} />

        {/* Create modal — стиль как в TopicsPage / SubjectsPage */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая публикация">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Заголовок *</label>
              <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Введите заголовок"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Описание</label>
              <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Описание материала"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Файлы</label>
              <input
                  type="file"
                  multiple
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.png"
                  onChange={e => setFiles(e.target.files)}
                  className="w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80"
              />
            </div>
            <div className="flex gap-3">
              <button
                  onClick={handleCreate}
                  disabled={creating || !form.title.trim()}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button
                  onClick={() => { setCreateOpen(false); setForm({ title: '', description: '' }); setFiles(null); }}
                  className="flex-1 py-2.5 bg-muted text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};