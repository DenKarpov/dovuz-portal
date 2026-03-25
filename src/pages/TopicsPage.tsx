import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, ChevronRight, Plus, Tag } from 'lucide-react';
import { subjectTopicsApi, type SubjectTopicResponse } from '../app/api/subjectTopics';
import { topicsApi, type TopicTypeResponse } from '../app/api/topics';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const TopicsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { isModerator } = useAuth();
  const [topics, setTopics] = useState<SubjectTopicResponse[]>([]);
  const [topicTypes, setTopicTypes] = useState<TopicTypeResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', topicTypeId: '' });
  const [creating, setCreating] = useState(false);
  const [subjectName, setSubjectName] = useState('');

  const fetchTopics = async (p = 0) => {
    setLoading(true);
    try {
      const res = await subjectTopicsApi.getBySubject(Number(subjectId), p, 12);
      setTopics(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
      if (res.data.content.length > 0) {
        setSubjectName(res.data.content[0].subjectName);
      }
    } catch {
      toast.error('Ошибка загрузки топиков');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics(0);
    topicsApi.getAll().then((res) => setTopicTypes(res.data)).catch(() => {});
  }, [subjectId]);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Введите название');
    if (!form.topicTypeId) return toast.error('Выберите тип топика');
    setCreating(true);
    try {
      await subjectTopicsApi.create(form.name.trim(), Number(subjectId), Number(form.topicTypeId));
      toast.success('Топик создан');
      setCreateOpen(false);
      setForm({ name: '', topicTypeId: '' });
      fetchTopics(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const typeColors: Record<string, string> = {
    default: 'bg-indigo-50 text-indigo-700',
    Лекция: 'bg-blue-50 text-blue-700',
    Практика: 'bg-green-50 text-green-700',
    Семинар: 'bg-purple-50 text-purple-700',
    Лабораторная: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Layers className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-gray-900">{subjectName || 'Топики'}</h1>
            <p className="text-xs text-gray-400">Разделы дисциплины</p>
          </div>
        </div>
        {isModerator && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="size-4" />
            Добавить топик
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
        <Link to="/directions" className="hover:text-indigo-600 transition-colors">Направления</Link>
        <ChevronRight className="size-3.5" />
        <span>Предмет</span>
        <ChevronRight className="size-3.5" />
        <span className="text-gray-600">{subjectName || 'Топики'}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="size-12 mx-auto mb-3 opacity-30" />
          <p>Топиков пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => {
            const colorClass = typeColors[t.topicTypeName] ?? typeColors.default;
            return (
              <Link
                key={t.id}
                to={`/topics/${t.id}/publications`}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${colorClass}`}>
                    <Tag className="size-3" />
                    {t.topicTypeName}
                  </div>
                </div>
                <h3 className="text-gray-900 group-hover:text-indigo-700 transition-colors">{t.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{t.subjectName}</p>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchTopics} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый топик">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Название топика"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Тип топика *</label>
            <select
              value={form.topicTypeId}
              onChange={(e) => setForm({ ...form, topicTypeId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Выберите тип</option>
              {topicTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>{tt.name}</option>
              ))}
            </select>
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
