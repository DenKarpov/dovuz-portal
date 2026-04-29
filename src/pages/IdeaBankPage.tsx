import React, { useCallback, useEffect, useState } from 'react';
import {
  Lightbulb, Search, Plus, Edit2, Trash2, School, ChevronDown, Loader2,
  MessageSquare, ExternalLink, X,
} from 'lucide-react';
import { ideaBankApi, type IdeaBankEntryResponse } from '../app/api/ideaBank';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { Pagination } from '../app/components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const IdeaBankPage: React.FC = () => {
  const { isModerator } = useAuth();
  const navigate = useNavigate();

  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [ideas, setIdeas] = useState<IdeaBankEntryResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeaBankEntryResponse | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formComments, setFormComments] = useState('');

  useEffect(() => {
    if (!isModerator) { toast.error('Недостаточно прав'); navigate('/'); return; }
    schoolsApi.getAll().then(r => setSchools(r.data)).catch(() => {});
  }, [isModerator]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchIdeas = useCallback(async (p = 0) => {
    if (!selectedSchool) return;
    setLoading(true);
    try {
      const res = await ideaBankApi.getBySchool(selectedSchool, p, 10, debouncedSearch || undefined);
      setIdeas(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch { toast.error('Ошибка загрузки идей'); } finally { setLoading(false); }
  }, [selectedSchool, debouncedSearch]);

  useEffect(() => { fetchIdeas(0); }, [fetchIdeas]);

  const handleAdd = async () => {
    if (!formTitle.trim() || !selectedSchool) return;
    try {
      await ideaBankApi.create({
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        comments: formComments.trim() || undefined,
        school_id: selectedSchool,
      });
      toast.success('Идея добавлена');
      closeModal();
      fetchIdeas(0);
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Ошибка'); }
  };

  const handleUpdate = async () => {
    if (!editingIdea) return;
    try {
      await ideaBankApi.update(editingIdea.id, {
        title: formTitle.trim() || undefined,
        description: formDesc.trim(),
        comments: formComments.trim(),
      });
      toast.success('Идея обновлена');
      closeModal();
      fetchIdeas(page);
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Ошибка'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить идею?')) return;
    try {
      await ideaBankApi.delete(id);
      toast.success('Удалено');
      fetchIdeas(page);
    } catch { toast.error('Ошибка удаления'); }
  };

  const openEdit = (idea: IdeaBankEntryResponse) => {
    setEditingIdea(idea);
    setFormTitle(idea.title);
    setFormDesc(idea.description ?? '');
    setFormComments(idea.comments ?? '');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingIdea(null);
    setFormTitle('');
    setFormDesc('');
    setFormComments('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
          <Lightbulb className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Банк идей</h1>
          <p className="text-sm text-muted-foreground">Архив тем проектов для повторного использования</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="relative">
          <School className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <select
            value={selectedSchool ?? ''}
            onChange={e => setSelectedSchool(e.target.value ? Number(e.target.value) : null)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Выберите школу</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={!selectedSchool}
          />
        </div>
        <div className="flex items-center">
          <button
            onClick={() => { setEditingIdea(null); setFormTitle(''); setFormDesc(''); setFormComments(''); setShowAddModal(true); }}
            disabled={!selectedSchool}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:opacity-90 transition disabled:opacity-40"
          >
            <Plus className="size-4" />
            Добавить идею
          </button>
        </div>
      </div>

      {selectedSchool && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="size-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Банк идей пуст для этой школы</p>
            </div>
          ) : ideas.map(idea => (
            <div key={idea.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
                  {idea.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{idea.description}</p>
                  )}
                  {idea.comments && (
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                      <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{idea.comments}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>Автор: @{idea.created_by_nickname}</span>
                    <span>{new Date(idea.created_at).toLocaleDateString('ru-RU')}</span>
                    {idea.source_project_id && (
                      <button
                        onClick={() => navigate(`/projects/${idea.source_project_id}`)}
                        className="flex items-center gap-0.5 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" /> Проект #{idea.source_project_id}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(idea)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchIdeas} />
          )}
        </div>
      )}

      {/* Add/Edit modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingIdea ? 'Редактировать идею' : 'Новая идея'}
              </h3>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-muted transition">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Название темы *</label>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Описание</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Комментарии / заметки</label>
                <textarea
                  value={formComments}
                  onChange={e => setFormComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Идеи, обсуждения, контекст..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition"
              >
                Отмена
              </button>
              <button
                onClick={editingIdea ? handleUpdate : handleAdd}
                disabled={!formTitle.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 transition disabled:opacity-40"
              >
                {editingIdea ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
