import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, ChevronRight, Plus, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { subjectTopicsApi, type SubjectTopicResponse } from '../app/api/subjectTopics';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

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
  const [searchQuery, setSearchQuery] = useState('');

  const [subjectName, setSubjectName] = useState('');
  const [directionName, setDirectionName] = useState('');
  const [directionId, setDirectionId] = useState<number | null>(null);

  // Обернули fetchTopics в useCallback
  const fetchTopics = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const res = await subjectTopicsApi.getBySubject(Number(subjectId), p, 12);
      setTopics(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);

      // Получаем имя предмета из первого топика, если есть
      if (res.data.content.length > 0 && res.data.content[0].subject) {
        setSubjectName(res.data.content[0].subject.name);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Ошибка загрузки топиков');
    } finally {
      setLoading(false);
    }
  }, [subjectId]); // Добавили зависимость subjectId

  useEffect(() => {
    fetchTopics(0);

    // Загружаем информацию о предмете и направлении для хлебных крошек
    const loadSubjectAndDirection = async () => {
      try {
        // Получаем все направления
        const dirRes = await directionsApi.getAll();
        const dirs: DirectionResponse[] = dirRes.data;

        // Ищем предмет в каждом направлении
        for (const dir of dirs) {
          try {
            const subRes = await subjectsApi.getByDirection(dir.id, 0, 100);
            const found = subRes.data.content.find(
                (s: SubjectResponse) => s.id === Number(subjectId)
            );
            if (found) {
              setSubjectName(found.name);
              setDirectionName(dir.name);
              setDirectionId(dir.id);
              return;
            }
          } catch {
            // Продолжаем поиск
          }
        }
      } catch (error) {
        console.error('Error loading subject info:', error);
      }
    };

    if (subjectId) {
      loadSubjectAndDirection();
    }
  }, [subjectId, fetchTopics]); // Добавили fetchTopics в зависимости

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Введите название');
      return;
    }

    setCreating(true);
    try {
      // Убрали неиспользуемую переменную response
      await subjectTopicsApi.create(form.name.trim(), Number(subjectId));
      toast.success('✅ Топик создан');
      setCreateOpen(false);
      setForm({ name: '' });
      fetchTopics(0);
    } catch (err: any) {
      console.error('Create error:', err);
      const errorMessage = err.response?.data?.message || 'Ошибка при создании топика';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
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
              <Layers className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 text-2xl font-bold">{subjectName || 'Топики'}</h1>
              <p className="text-slate-400 text-base">📂 Разделы дисциплины</p>
            </div>
          </div>
          {isModerator && (
              <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-base font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
              >
                <Plus className="size-5" />
                Добавить топик
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
          <Link to="/directions" className="hover:text-indigo-600 transition-colors">
            📚 Направления
          </Link>
          <ChevronRight className="size-4" />
          {directionId ? (
              <Link to={`/directions/${directionId}/subjects`} className="hover:text-indigo-600 transition-colors">
                {directionName}
              </Link>
          ) : (
              <span>Загрузка...</span>
          )}
          <ChevronRight className="size-4" />
          <span className="text-slate-700 font-medium">{subjectName || '...'}</span>
        </motion.div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
          <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по названию топика..."
              className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
          />
        </div>

        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
        ) : (() => {
          const filtered = topics.filter(t =>
              !searchQuery.trim() ||
              t.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
          );

          return filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-slate-400">
                <Layers className="size-14 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">
                  {topics.length === 0 ? '📭 Топиков пока нет' : '🔍 Ничего не найдено'}
                </p>
                {isModerator && topics.length === 0 && (
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      + Создать первый топик
                    </button>
                )}
              </motion.div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((t, idx) => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.06 }}
                        whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
                    >
                      <Link
                          to={`/topics/${t.id}/publications`}
                          className="group block bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all p-6"
                      >
                        <h3 className="text-slate-900 text-lg font-semibold group-hover:text-indigo-700 transition-colors mb-2">
                          {t.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {t.subject?.name || 'Предмет'}
                        </p>
                      </Link>
                    </motion.div>
                ))}
              </div>
          );
        })()}

        {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchTopics} />
        )}

        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="✨ Новый топик">
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-base text-gray-700 font-medium mb-2">
                Название топика *
              </label>
              <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  placeholder="Например: Введение в программирование"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !creating && form.name.trim()) {
                      handleCreate();
                    }
                  }}
              />
            </div>
            <div className="flex gap-3">
              <button
                  onClick={handleCreate}
                  disabled={creating || !form.name.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white text-base rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? 'Создание...' : '🚀 Создать'}
              </button>
              <button
                  onClick={() => {
                    setCreateOpen(false);
                    setForm({ name: '' });
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 text-base rounded-xl hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};