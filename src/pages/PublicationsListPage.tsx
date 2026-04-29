import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, ChevronRight, Plus, Trash2, Search, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { publicationsApi, type PublicationTitleAndId } from '../app/api/publications';
import { subjectTopicsApi, type SubjectTopicResponse } from '../app/api/subjectTopics';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const PublicationsListPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const { user, isModerator } = useAuth();
  const [publications, setPublications] = useState<PublicationTitleAndId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [creating, setCreating] = useState(false);

  const [topicName, setTopicName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [directionName, setDirectionName] = useState('');
  const [directionId, setDirectionId] = useState<number | null>(null);

  const filteredPublications = publications.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q);
  });

  const fetchPublications = async (p = 0) => {
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
  };

  useEffect(() => {
    fetchPublications(0);

    // Build breadcrumb: load topic → subject → direction
    subjectTopicsApi.getBySubject(0, 0, 1).catch(() => {}); // not useful, we need by topic
    // Fetch the topic's subject via searching all subjects of all directions
    const buildBreadcrumb = async () => {
      try {
        const dirRes = await directionsApi.getAll();
        const dirs: DirectionResponse[] = dirRes.data;
        for (const dir of dirs) {
          try {
            const subRes = await subjectsApi.getByDirection(dir.id, 0, 100);
            for (const sub of subRes.data.content as SubjectResponse[]) {
              try {
                const topicsRes = await subjectTopicsApi.getBySubject(sub.id, 0, 100);
                const found = topicsRes.data.content.find(
                  (t: SubjectTopicResponse) => t.id === Number(topicId)
                );
                if (found) {
                  setTopicName(found.name);
                  setSubjectName(sub.name);
                  setSubjectId(sub.id);
                  setDirectionName(dir.name);
                  setDirectionId(dir.id);
                  return;
                }
              } catch { /* continue */ }
            }
          } catch { /* continue */ }
        }
      } catch { /* ignore */ }
    };
    buildBreadcrumb();
  }, [topicId]);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Введите заголовок');
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('subjectTopicId', topicId!);
      if (files) Array.from(files).forEach((f) => fd.append('files', f));
      await publicationsApi.create(fd);
      toast.success('✅ Публикация создана');
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
      toast.success('🗑️ Публикация удалена');
      fetchPublications(page);
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
          <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <FileText className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 text-2xl font-bold">{topicName || 'Публикации'}</h1>
            <p className="text-slate-400 text-base">📄 Материалы раздела</p>
          </div>
        </div>
        {user && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
          >
            <Plus className="size-5" />
            Создать
          </motion.button>
        )}
      </motion.div>

      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-base text-slate-400 mb-8 flex-wrap"
      >
        <Link to="/directions" className="hover:text-blue-600 transition-colors">📚 Направления</Link>
        <ChevronRight className="size-4" />
        {directionId ? (
          <Link to={`/directions/${directionId}/subjects`} className="hover:text-blue-600 transition-colors">{directionName}</Link>
        ) : <span>...</span>}
        <ChevronRight className="size-4" />
        {subjectId ? (
          <Link to={`/subjects/${subjectId}/topics`} className="hover:text-blue-600 transition-colors">{subjectName}</Link>
        ) : <span>...</span>}
        <ChevronRight className="size-4" />
        <span className="text-slate-700 font-medium">{topicName || '...'}</span>
      </motion.div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Поиск по названию публикации..."
          className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredPublications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <FileText className="size-14 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 text-lg">{publications.length === 0 ? '📭 Публикаций пока нет' : '🔍 Ничего не найдено'}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredPublications.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              whileHover={{ x: 3 }}
              className="group"
            >
              <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all px-6 py-5">
                <Link
                  to={`/publications/${p.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div className="size-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="size-5 text-blue-600" />
                  </div>
                  <span className="text-base text-slate-800 group-hover:text-blue-700 transition-colors truncate font-medium">
                    {p.title}
                  </span>
                  <ArrowRight className="size-4 text-slate-300 group-hover:text-blue-400 shrink-0 ml-auto transition-colors" />
                </Link>
                {isModerator && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-3"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchPublications} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="📝 Новая публикация">
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-base text-slate-700 font-medium mb-2">Заголовок *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              placeholder="Введите заголовок"
            />
          </div>
          <div>
            <label className="block text-base text-slate-700 font-medium mb-2">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              placeholder="Описание материала"
            />
          </div>
          <div>
            <label className="block text-base text-slate-700 font-medium mb-2">📎 Файлы</label>
            <input
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.png"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-base text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-base file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={creating} className="flex-1 py-3 bg-blue-600 text-white text-base rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60">
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
