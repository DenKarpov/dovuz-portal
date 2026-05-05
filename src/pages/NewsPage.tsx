import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Plus, Calendar, User, Download, ArrowRight, Search, Filter, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { newsPublicationsApi, type PublicationResponse } from '../app/api/newsPublications';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { filesApi } from '../app/api/files';
import type { FileInfo } from '../app/api/newsPublications';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const NewsPage: React.FC = () => {
  const { isModerator } = useAuth();
  const [news, setNews] = useState<PublicationResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [onlyWithFiles, setOnlyWithFiles] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      if (files) Array.from(files).forEach((f) => fd.append('files', f));
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

  const getExtension = (name: string) => name.split('.').pop()?.toUpperCase() ?? '';
  const isImageFile = (file: FileInfo) => ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(getExtension(file.initial_file_name));

  const handleDownload = async (file: FileInfo) => {
    try {
      await filesApi.downloadFile(file.file_name_in_directory, file.initial_file_name);
    } catch {
      toast.error('Ошибка при загрузке файла');
    }
  };

  const displayed = news
      .filter((n) => {
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const inTitle = (n.title ?? '').toLowerCase().includes(q);
          const inDesc = (n.description ?? '').toLowerCase().includes(q);
          if (!inTitle && !inDesc) return false;
        }
        if (authorFilter.trim() && !(n.nickname ?? '').toLowerCase().includes(authorFilter.trim().toLowerCase())) return false;
        if (onlyWithFiles && (!n.files || n.files.length === 0)) return false;
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortBy === 'newest' ? db - da : da - db;
      });

  return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-3">
            <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Newspaper className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">📰 Новости</h1>
              <p className="text-sm text-muted-foreground">Последние события университета</p>
            </div>
          </div>
          {isModerator && (
              <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-colors shadow-md shadow-blue-200"
              >
                <Plus className="size-5" />
                Создать
              </motion.button>
          )}
        </motion.div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по заголовку или описанию..."
                className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="size-4" />
                </button>
            )}
          </div>
        </div>

        {/* Collapsible filters */}
        <div className="mb-8">
          <button
              type="button"
              onClick={() => setFiltersOpen(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            <Filter className="size-4" />
            Фильтры
            <ChevronDown className={`size-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            {(authorFilter || onlyWithFiles || sortBy !== 'newest') && (
                <span className="size-2 bg-blue-500 rounded-full" />
            )}
          </button>
          <AnimatePresence>
            {filtersOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                          value={authorFilter}
                          onChange={(e) => setAuthorFilter(e.target.value)}
                          placeholder="Фильтр по автору..."
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      />
                    </div>
                    <button
                        type="button"
                        onClick={() => setOnlyWithFiles(v => !v)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                            onlyWithFiles ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <Filter className="size-4" />
                      {onlyWithFiles ? 'С файлами' : 'Все'}
                    </button>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                    >
                      <option value="newest">Сначала новые</option>
                      <option value="oldest">Сначала старые</option>
                    </select>
                    {(authorFilter || onlyWithFiles || sortBy !== 'newest') && (
                        <button
                            type="button"
                            onClick={() => { setAuthorFilter(''); setOnlyWithFiles(false); setSortBy('newest'); }}
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Сбросить
                        </button>
                    )}
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* List */}
        {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-7 animate-pulse">
                    <div className="h-6 bg-slate-100 rounded w-2/3 mb-4" />
                    <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </div>
              ))}
            </div>
        ) : displayed.length === 0 ? (
            <AnimatePresence>
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200"
              >
                <Newspaper className="size-14 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-400 text-lg">{news.length === 0 ? 'Новостей пока нет' : '🔍 Ничего не найдено по фильтрам'}</p>
              </motion.div>
            </AnimatePresence>
        ) : (
            <div className="space-y-5">
              {displayed.map((item, index) => (
                  <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.06 }}
                      whileHover={{ x: 4 }}
                  >
                    <Link
                        to={`/news/${item.id}`}
                        className="group block bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Images row at top */}
                      {item.files && item.files.length > 0 && (() => {
                        const imageFiles = item.files.filter(isImageFile);
                        return imageFiles.length > 0 ? (
                            <div className="overflow-hidden rounded-t-2xl">
                              {imageFiles.length === 1 ? (
                                  <img
                                      src={filesApi.getPhotoUrl(imageFiles[0].file_name_in_directory)}
                                      alt={imageFiles[0].initial_file_name}
                                      className="w-full h-52 object-cover"
                                      loading="lazy"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                  />
                              ) : (
                                  <div className="grid grid-cols-3 gap-px bg-slate-100">
                                    {imageFiles.slice(0, 3).map((f) => (
                                        <img
                                            key={f.id}
                                            src={filesApi.getPhotoUrl(f.file_name_in_directory)}
                                            alt={f.initial_file_name}
                                            className="w-full h-40 object-cover"
                                            loading="lazy"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ))}
                                  </div>
                              )}
                            </div>
                        ) : null;
                      })()}

                      <div className="p-7">
                        <h3 className="text-slate-900 text-lg font-bold group-hover:text-blue-700 transition-colors mb-2.5 leading-snug">
                          {item.title}
                        </h3>

                        {item.description && (
                            <p className="text-slate-500 leading-relaxed mb-4 line-clamp-2">{item.description}</p>
                        )}

                        {/* Non-image attachments */}
                        {item.files && item.files.length > 0 && (() => {
                          const attachedFiles = item.files.filter((f) => !isImageFile(f));
                          return attachedFiles.length > 0 ? (
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                {attachedFiles.slice(0, 3).map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(f); }}
                                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                    >
                                      <Download className="size-4 text-slate-400" />
                                      <span className="text-sm text-slate-700 truncate max-w-[10rem]">{f.initial_file_name}</span>
                                    </button>
                                ))}
                                {attachedFiles.length > 3 && (
                                    <span className="text-sm text-slate-400">+{attachedFiles.length - 3} файл(ов)</span>
                                )}
                              </div>
                          ) : null;
                        })()}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-4" />
                        {formatDate(item.created_at)}
                      </span>
                            <span className="flex items-center gap-1.5">
                        <User className="size-4" />
                        <span className="text-slate-700 font-medium">{item.nickname}</span>
                      </span>
                          </div>
                          <span className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Читать <ArrowRight className="size-4" />
                    </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
              ))}
            </div>
        )}

        {/* Note: pagination still uses backend paging; filters are client-side for the loaded page */}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Create Modal */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая новость">
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
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50 focus:bg-white transition-all"
                  placeholder="Введите описание"
              />
            </div>
            <div>
              <label className="block text-base text-slate-700 font-medium mb-2">Файлы</label>
              <input
                  type="file"
                  multiple
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.png"
                  onChange={(e) => setFiles(e.target.files)}
                  className="w-full text-base text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-base file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-colors disabled:opacity-60"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 text-base rounded-xl hover:bg-slate-200 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};