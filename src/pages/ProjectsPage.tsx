import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectsApi, type ProjectResponse } from '../app/api/projects';
import { accountsApi, type GetAllUserResponse } from '../app/api/accounts';
import { schoolsApi } from '../app/api/schools';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ON_REVIEW: { label: '⏳ На проверке', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: <Clock className="size-4" /> },
  ACCEPTED: { label: '✅ Принято', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle className="size-4" /> },
  REJECTED: { label: '❌ Отклонено', color: 'text-red-700 bg-red-50 border-red-200', icon: <XCircle className="size-4" /> },
  NEEDS_REVISION: { label: '🔄 На доработку', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: <AlertCircle className="size-4" /> },
};

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({ title: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Teammate search
  const [teammateSearch, setTeammateSearch] = useState('');
  const [teammateResults, setTeammateResults] = useState<GetAllUserResponse[]>([]);
  const [selectedTeammates, setSelectedTeammates] = useState<{ id: number; nickname: string }[]>([]);
  const [searchingTeammates, setSearchingTeammates] = useState(false);
  const [mySchoolId, setMySchoolId] = useState<number | null>(null);

  const fetchProjects = async (pageNumber = 0) => {
    setLoading(true);
    try {
      const res = await projectsApi.getMyProjects(pageNumber, 10);
      setProjects(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(pageNumber);
    } catch {
      toast.error('Ошибка загрузки проектов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(0); }, []);

  useEffect(() => {
    // Determine user's schoolId (AccountResponse is flattened, so map by schoolName)
    const initSchool = async () => {
      if (!user) return;
      try {
        const acc = await accountsApi.getAccount(user.nickname);
        const schoolName = acc.data.schoolName;
        if (!schoolName) return;
        const sch = await schoolsApi.getAll();
        const found = sch.data.find(s => s.name === schoolName);
        if (found) setMySchoolId(found.id);
      } catch { /* ignore */ }
    };
    initSchool();
  }, [user]);

  const searchTeammates = async (query: string) => {
    setTeammateSearch(query);
    if (query.trim().length < 2) { setTeammateResults([]); return; }
    setSearchingTeammates(true);
    try {
      if (!mySchoolId) {
        setTeammateResults([]);
        return;
      }
      const res = await accountsApi.getBySchool(mySchoolId, 0, 50);
      const filtered = res.data.content.filter(
        u => u.nickname.toLowerCase().includes(query.trim().toLowerCase()) &&
             u.nickname !== user?.nickname &&
             !selectedTeammates.some(t => t.id === u.id)
      );
      setTeammateResults(filtered.slice(0, 5));
    } catch { setTeammateResults([]); }
    finally { setSearchingTeammates(false); }
  };

  const addTeammate = (u: GetAllUserResponse) => {
    setSelectedTeammates(prev => [...prev, { id: u.id, nickname: u.nickname }]);
    setTeammateSearch('');
    setTeammateResults([]);
  };

  const removeTeammate = (id: number) => {
    setSelectedTeammates(prev => prev.filter(t => t.id !== id));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Введите название проекта');
    if (!file) return toast.error('Прикрепите файл презентации');

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('stage_number', '1');  // ← stage_number
      formData.append('file', file);

      // teammate_ids (с нижним подчёркиванием, как ожидает CreateProjectRequestDto)
      selectedTeammates.forEach(t => {
        formData.append('teammate_ids', String(t.id));
      });

      await projectsApi.create(formData);
      toast.success('🎉 Проект успешно создан');
      setCreateOpen(false);
      setForm({ title: '', description: '' });
      setFile(null);
      setSelectedTeammates([]);
      fetchProjects(0);
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Ошибка при создании проекта';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const getLastSubmissionStatus = (project: ProjectResponse) => {
    if (!project.submissions || project.submissions.length === 0) return null;
    const last = project.submissions[project.submissions.length - 1];
    return statusConfig[last.status] ?? null;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-center justify-between mb-10"
      >
        <div className="flex items-center gap-3">
          <div className="size-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <FolderOpen className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 text-2xl font-bold">📁 Мои проекты</h1>
            <p className="text-slate-400 text-base">Управление проектными работами</p>
          </div>
        </div>
        {user && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-base font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <Plus className="size-5" />
            Создать проект
          </motion.button>
        )}
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200"
        >
          <div className="text-5xl mb-4">📂</div>
          <p className="text-slate-500 text-lg mb-4">У вас пока нет проектов</p>
          {user && (
            <button
              onClick={() => setCreateOpen(true)}
              className="text-base text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              ✨ Создать первый проект →
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          {projects.map((p, idx) => {
            const statusInfo = getLastSubmissionStatus(p);
            const owner = p.members?.find(m => m.isOwner);

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.07 }}
                whileHover={{ x: 3 }}
              >
                <Link
                  to={`/projects/${p.id}`}
                  className="group flex items-center gap-5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all p-6"
                >
                  <div className={`shrink-0 size-12 rounded-xl flex items-center justify-center border ${
                    statusInfo ? statusInfo.color : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    {statusInfo?.icon ?? <FolderOpen className="size-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 text-lg group-hover:text-indigo-700 truncate transition-colors">
                        {p.title}
                      </h3>
                      {statusInfo && (
                        <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-slate-400 line-clamp-1 mb-2">{p.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span>👤 {owner?.nickname ?? 'Не указан'}</span>
                      {p.schoolName && <span>🏫 {p.schoolName}</span>}
                      <span>📊 Этапов: {p.submissions?.length ?? 0}</span>
                    </div>
                  </div>

                  <ArrowRight className="size-5 text-slate-300 group-hover:text-indigo-400 shrink-0 transition-colors" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchProjects} />
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="🚀 Новый проект">
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-base font-medium text-slate-700 mb-2">Название проекта *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition-all"
              placeholder="Введите название"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-2">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base resize-none focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white transition-all"
              placeholder="О чём этот проект?"
            />
          </div>

          {/* Teammate search */}
          <div>
            <label className="block text-base font-medium text-slate-700 mb-2">👥 Участники команды</label>
            {selectedTeammates.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTeammates.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    {t.nickname}
                    <button onClick={() => removeTeammate(t.id)} className="text-indigo-400 hover:text-red-500 transition-colors ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={teammateSearch}
                onChange={(e) => searchTeammates(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white transition-all"
                placeholder="Поиск по никнейму..."
              />
            </div>
            {!mySchoolId && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Чтобы выбрать участников, сначала укажите школу в профиле.
              </p>
            )}
            {teammateResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-lg">
                {teammateResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => addTeammate(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-b-0"
                  >
                    <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                      {u.nickname[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{u.nickname}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                    <span className="ml-auto text-xs text-indigo-500 font-medium">+ Добавить</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">💡 Участники должны быть из вашей школы</p>
          </div>

          <div>
            <label className="block text-base font-medium text-slate-700 mb-2">📎 Презентация (PDF, PPTX) *</label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-base text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-base file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className="flex-1 py-3 bg-slate-50 text-slate-700 text-base font-medium rounded-xl hover:bg-slate-100 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-3 bg-indigo-600 text-white text-base font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {creating ? 'Создание...' : '🚀 Создать проект'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
