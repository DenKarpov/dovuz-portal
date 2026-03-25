import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { publicationsApi, type PublicationTitleAndId } from '../app/api/publications';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const PublicationsListPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const { user, isModerator } = useAuth();
  const [publications, setPublications] = useState<PublicationTitleAndId[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [creating, setCreating] = useState(false);

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

  useEffect(() => { fetchPublications(0); }, [topicId]);

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileText className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-gray-900">Публикации</h1>
            <p className="text-xs text-gray-400">Материалы раздела</p>
          </div>
        </div>
        {user && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="size-4" />
            Создать
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link to="/directions" className="hover:text-indigo-600 transition-colors">Направления</Link>
        <ChevronRight className="size-3.5" />
        <span>...</span>
        <ChevronRight className="size-3.5" />
        <span className="text-gray-600">Публикации</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : publications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="size-12 mx-auto mb-3 opacity-30" />
          <p>Публикаций пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {publications.map((p) => (
            <div
              key={p.id}
              className="group flex items-center justify-between bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all px-5 py-4"
            >
              <Link
                to={`/publications/${p.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="size-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="size-4 text-indigo-600" />
                </div>
                <span className="text-sm text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
                  {p.title}
                </span>
              </Link>
              {isModerator && (
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchPublications} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая публикация">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Заголовок *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Введите заголовок"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Описание материала"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Файлы</label>
            <input
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.png"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {creating ? 'Создание...' : 'Создать'}
            </button>
            <button
              onClick={() => setCreateOpen(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
