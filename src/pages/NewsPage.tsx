import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Plus, Calendar, User } from 'lucide-react';
import { newsPublicationsApi, type PublicationResponse } from '../app/api/newsPublications';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const NewsPage: React.FC = () => {
  const { isModerator } = useAuth();
  const [news, setNews] = useState<PublicationResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchNews = async (p = 0) => {
    setLoading(true);
    try {
      const res = await newsPublicationsApi.getAll(p, 10);
      setNews(res.data.content);
      setTotalPages(res.data.total_pages);
    } catch {
      toast.error('Ошибка загрузки новостей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(page); }, [page]);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Введите заголовок');
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      if (files) {
        Array.from(files).forEach((f) => fd.append('files', f));
      }
      await newsPublicationsApi.create(fd);
      toast.success('Публикация создана');
      setCreateOpen(false);
      setForm({ title: '', description: '' });
      setFiles(null);
      fetchNews(0);
      setPage(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Newspaper className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-gray-900">Новости</h1>
            <p className="text-xs text-gray-400">Последние события университета</p>
          </div>
        </div>
        {isModerator && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="size-4" />
            Создать
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Newspaper className="size-12 mx-auto mb-3 opacity-30" />
          <p>Новостей пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <h3 className="text-gray-900 group-hover:text-indigo-700 transition-colors mb-2">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDate(item.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="size-3.5" />
                  {item.author_nickname}
                </span>
                {item.files?.length > 0 && (
                  <span className="text-indigo-500">{item.files.length} файл(а)</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая новость">
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
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Введите описание"
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
          <div className="flex gap-3 pt-2">
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
