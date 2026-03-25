import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { projectsApi, type ProjectResponse } from '../app/api/projects';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Ожидает проверки', color: 'text-yellow-600 bg-yellow-50', icon: <Clock className="size-3.5" /> },
  ACCEPTED: { label: 'Принято', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="size-3.5" /> },
  REJECTED: { label: 'Отклонено', color: 'text-red-600 bg-red-50', icon: <XCircle className="size-3.5" /> },
  REVISION: { label: 'На доработку', color: 'text-orange-600 bg-orange-50', icon: <AlertCircle className="size-3.5" /> },
};

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', teammateIds: '' });
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchProjects = async (p = 0) => {
    setLoading(true);
    try {
      const res = await projectsApi.getMyProjects(p, 10);
      setProjects(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch {
      toast.error('Ошибка загрузки проектов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(0); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Введите название проекта');
    if (!file) return toast.error('Прикрепите файл презентации');
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('file', file);
      if (form.teammateIds.trim()) {
        form.teammateIds.split(',').map((id) => id.trim()).filter(Boolean).forEach((id) => {
          fd.append('teammateIds', id);
        });
      }
      await projectsApi.create(fd);
      toast.success('Проект создан!');
      setCreateOpen(false);
      setForm({ title: '', description: '', teammateIds: '' });
      setFile(null);
      fetchProjects(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const getLastStageStatus = (p: ProjectResponse) => {
    if (!p.stages || p.stages.length === 0) return null;
    const last = p.stages[p.stages.length - 1];
    return statusConfig[last.status] ?? null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FolderOpen className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-gray-900">Мои проекты</h1>
            <p className="text-xs text-gray-400">Проектные работы в рамках довузовской подготовки</p>
          </div>
        </div>
        {user && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="size-4" />
            Новый проект
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="size-12 mx-auto mb-3 opacity-30" />
          <p>У вас пока нет проектов</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Создать первый проект
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const statusInfo = getLastStageStatus(p);
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="block bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 mb-1">{p.title}</h3>
                    {p.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{p.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
                      <span>Автор: {p.owner?.nickname}</span>
                      {p.teammates?.length > 0 && (
                        <span>Команда: {p.teammates.map((t) => t.nickname).join(', ')}</span>
                      )}
                      {p.school && <span>Школа: {p.school.name}</span>}
                      <span>Этапов: {p.stages?.length ?? 0}</span>
                    </div>
                  </div>
                  {statusInfo && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs shrink-0 ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchProjects} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый проект">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Название проекта *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Название вашего проекта"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Краткое описание проекта"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              ID сокомандников{' '}
              <span className="text-gray-400 text-xs">(через запятую)</span>
            </label>
            <input
              type="text"
              value={form.teammateIds}
              onChange={(e) => setForm({ ...form, teammateIds: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Например: 2, 5, 8"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Файл презентации *</label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {creating ? 'Создание...' : 'Создать проект'}
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
