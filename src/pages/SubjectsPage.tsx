import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const SubjectsPage: React.FC = () => {
  const { dirId } = useParams<{ dirId: string }>();
  const { isAdmin } = useAuth();
  const [direction, setDirection] = useState<DirectionResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchSubjects = async (p = 0) => {
    setLoading(true);
    try {
      const res = await subjectsApi.getByDirection(Number(dirId), p, 12);
      setSubjects(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch {
      toast.error('Ошибка загрузки предметов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    directionsApi.getAll().then((res) => {
      const dir = res.data.find((d) => d.id === Number(dirId));
      setDirection(dir ?? null);
    });
    fetchSubjects(0);
  }, [dirId]);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Введите название предмета');
    setCreating(true);
    try {
      await subjectsApi.create(newName.trim(), Number(dirId));
      toast.success('Предмет создан');
      setCreateOpen(false);
      setNewName('');
      fetchSubjects(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить предмет?')) return;
    try {
      await subjectsApi.delete(id);
      toast.success('Предмет удалён');
      fetchSubjects(page);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <BookOpen className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-gray-900">{direction?.name ?? 'Предметы'}</h1>
            <p className="text-xs text-gray-400">Выберите предмет</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="size-4" />
            Добавить предмет
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link to="/directions" className="hover:text-indigo-600 transition-colors">Направления</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-gray-600">{direction?.name ?? '...'}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="size-12 mx-auto mb-3 opacity-30" />
          <p>Предметов пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <div key={s.id} className="group relative bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all">
              <Link
                to={`/subjects/${s.id}/topics`}
                className="block p-5"
              >
                <h3 className="text-gray-900 group-hover:text-indigo-700 transition-colors">{s.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{s.directionName}</p>
              </Link>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(s.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchSubjects} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый предмет">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Название предмета *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Например: Математика"
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
