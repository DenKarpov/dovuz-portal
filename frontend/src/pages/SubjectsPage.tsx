import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Plus, Trash2, Search, Layers,
  Edit2, X, Check, UserPlus, UserMinus, ShieldCheck, ShieldOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { adminModeratorsApi, type SubjectModeratorResponse } from '../app/api/adminModerators';
import { accountsApi, type GetAllUserResponse } from '../app/api/accounts';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const PALETTE = [
  'from-blue-500 to-blue-700', 'from-indigo-500 to-indigo-700',
  'from-emerald-500 to-teal-700', 'from-orange-500 to-red-600',
  'from-pink-500 to-rose-700', 'from-amber-500 to-yellow-600',
  'from-purple-500 to-violet-700', 'from-cyan-500 to-sky-700',
];
const EMOJIS = ['📐', '📊', '🔬', '💻', '🎨', '🌍', '📝', '🧮', '⚡', '🔧', '📕', '🎯'];

export const SubjectsPage: React.FC = () => {
  const { dirId } = useParams<{ dirId: string }>();
  const { isAdmin, isModerator, user } = useAuth();

  const [direction, setDirection] = useState<DirectionResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Создание
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Инлайн-редактирование (только для admins)
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Назначение модераторов (только для admins)
  const [modModalSubject, setModModalSubject] = useState<SubjectResponse | null>(null);
  const [subjectMods, setSubjectMods] = useState<SubjectModeratorResponse[]>([]);
  const [allModerators, setAllModerators] = useState<GetAllUserResponse[]>([]);
  const [modSearch, setModSearch] = useState('');
  const [assigningMod, setAssigningMod] = useState(false);

  // Предметы, на которые назначен текущий модератор (только для isModerator && !isAdmin)
  const [mySubjectIds, setMySubjectIds] = useState<Set<number>>(new Set());
  const [mySubjectsLoaded, setMySubjectsLoaded] = useState(false);

  const filtered = subjects.filter(
      s => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())
  );

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

  // Загружаем направление и предметы при монтировании
  useEffect(() => {
    // Нет getById — ищем нужное направление из списка всех
    directionsApi.getAll()
        .then(r => setDirection(r.data.find((d: DirectionResponse) => d.id === Number(dirId)) ?? null))
        .catch(() => {});
    fetchSubjects(0);
  }, [dirId]);

  // Для модератора (не админа) — запрашиваем список модераторов каждого предмета
  // и ищем себя по nickname. Используем существующий GET /admin/moderators/subject/{id}.
  // ВАЖНО: не выставляем mySubjectsLoaded=true пока subjects ещё загружается (length === 0),
  // иначе баннер покажет «не назначены» до того как придут данные.
  useEffect(() => {
    if (!isModerator || isAdmin) {
      setMySubjectsLoaded(true);
      return;
    }
    if (!user) {
      setMySubjectsLoaded(true);
      return;
    }

    if (subjects.length === 0) return;

    adminModeratorsApi.getMySubjects()
        .then(moderatorSubjects => {
          const ids = new Set(moderatorSubjects.map(m => m.subjectId));
          setMySubjectIds(ids);
          setMySubjectsLoaded(true);
        })
        .catch(() => {
          setMySubjectIds(new Set());
          setMySubjectsLoaded(true);
        });
  }, [subjects, isModerator, isAdmin, user]);

  // Может ли текущий пользователь управлять конкретным предметом
  const canManage = (subjectId: number) => isAdmin || mySubjectIds.has(subjectId);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Введите название');
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

  // Редактирование имени: PUT /subjects/{id} — нужно добавить в subjectsApi.
  // Если эндпоинт ещё не готов — кнопка будет видна только admins, но покажет toast.
  const handleEdit = async (id: number) => {
    if (!editName.trim()) return toast.error('Введите название');
    setSaving(true);
    try {
      await subjectsApi.update(id, editName.trim());
      toast.success('Предмет обновлён');
      setEditId(null);
      fetchSubjects(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить предмет? Все темы и публикации будут удалены.')) return;
    try {
      await subjectsApi.delete(id);
      toast.success('Предмет удалён');
      fetchSubjects(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка удаления');
    }
  };

  // ── Модераторы ────────────────────────────────────────────────────────────

  const openModModal = async (subject: SubjectResponse) => {
    setModModalSubject(subject);
    setModSearch('');
    try {
      const [modsRes, usersRes] = await Promise.all([
        adminModeratorsApi.listBySubject(subject.id),
        accountsApi.getAllUsers(0, 500),
      ]);
      setSubjectMods(modsRes.data);
      setAllModerators(usersRes.data.content.filter((u: GetAllUserResponse) => u.role === 'Модератор'));
    } catch {
      toast.error('Ошибка загрузки модераторов');
    }
  };

  const handleAssignMod = async (accountId: number, subjectId: number) => {
    setAssigningMod(true);
    try {
      await adminModeratorsApi.assign(accountId, subjectId);
      toast.success('Модератор назначен');
      setSubjectMods((await adminModeratorsApi.listBySubject(subjectId)).data);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setAssigningMod(false);
    }
  };

  const handleRemoveMod = async (accountId: number, subjectId: number) => {
    try {
      await adminModeratorsApi.remove(accountId, subjectId);
      toast.success('Модератор снят');
      setSubjectMods((await adminModeratorsApi.listBySubject(subjectId)).data);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    }
  };

  const filteredMods = allModerators.filter(m =>
      !modSearch.trim() ||
      m.nickname.toLowerCase().includes(modSearch.toLowerCase()) ||
      `${m.last_name ?? ''} ${m.first_name ?? ''}`.toLowerCase().includes(modSearch.toLowerCase())
  );
  const unassignedMods = filteredMods.filter(
      m => !subjectMods.some(sm => sm.accountId === m.id)
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <BookOpen className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{direction?.name ?? 'Предметы'}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isModerator && !isAdmin
                    ? 'Предметы со щитом — ваши для модерирования'
                    : 'Выберите предмет для изучения'}
              </p>
            </div>
          </div>
          {isAdmin && (
              <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
              >
                <Plus className="size-4" /> Добавить предмет
              </button>
          )}
        </motion.div>

        {/* Breadcrumb */}
        <motion.nav
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
            className="flex items-center gap-2 text-xs text-muted-foreground mb-6"
        >
          <Link to="/directions" className="hover:text-foreground transition-colors">Материалы</Link>
          <ChevronRight className="size-3.5" />
          <Link to="/directions" className="hover:text-foreground transition-colors">Направления</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{direction?.name ?? '...'}</span>
        </motion.nav>

        {/* Search */}
        <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="relative mb-5"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Найти предмет..."
              className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </motion.div>

        {/* Moderator info banner — показываем только после полной загрузки */}
        {isModerator && !isAdmin && mySubjectsLoaded && !loading && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className={`flex items-center gap-2 text-xs rounded-xl px-4 py-2.5 mb-5 border ${
                    mySubjectIds.size > 0
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                }`}
            >
              {mySubjectIds.size > 0
                  ? <ShieldCheck className="size-4 shrink-0" />
                  : <ShieldOff className="size-4 shrink-0" />
              }
              <span>
            {mySubjectIds.size > 0
                ? <>Вы назначены на <strong>{mySubjectIds.size}</strong> {mySubjectIds.size === 1 ? 'предмет' : mySubjectIds.size < 5 ? 'предмета' : 'предметов'} — только на них доступно создание и удаление тем.</>
                : 'Вы не назначены ни на один предмет в этом направлении. Обратитесь к администратору.'
            }
          </span>
            </motion.div>
        )}

        {/* Skeleton */}
        {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
              <Layers className="size-10 mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">
                {subjects.length === 0 ? 'Предметов пока нет' : `Ничего не найдено по «${search}»`}
              </p>
              {isAdmin && subjects.length === 0 && (
                  <button
                      onClick={() => setCreateOpen(true)}
                      className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90"
                  >
                    Добавить первый предмет
                  </button>
              )}
            </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s, idx) => {
                const grad = PALETTE[idx % PALETTE.length];
                const emoji = EMOJIS[idx % EMOJIS.length];
                const isEditing = editId === s.id;
                const isMine = isModerator && !isAdmin && mySubjectIds.has(s.id);
                return (
                    <motion.div
                        key={s.id} className="relative group"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }} whileHover={{ y: -2 }}
                    >
                      <div className={`relative overflow-hidden rounded-2xl p-5 text-white min-h-[148px] flex flex-col bg-gradient-to-br ${grad} ${isMine ? 'ring-2 ring-white/40' : ''}`}>
                        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-white/8" />
                        <div className="absolute -bottom-6 -left-3 size-16 rounded-full bg-black/10" />
                        <div className="relative flex flex-col h-full gap-3">
                          {/* Top row: emoji + badge + action buttons */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{emoji}</span>
                              {/* Бейдж «Мой предмет» — виден только назначенному модератору */}
                              {isMine && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 text-white rounded-lg px-2 py-0.5 backdrop-blur-sm">
                            <ShieldCheck className="size-3" /> Мой предмет
                          </span>
                              )}
                            </div>
                            {canManage(s.id) && !isEditing && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isAdmin && (
                                      <button
                                          onClick={() => openModModal(s)}
                                          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                          title="Назначить модераторов"
                                      >
                                        <UserPlus className="size-3.5" />
                                      </button>
                                  )}
                                  {/* Редактирование имени — только admin */}
                                  {isAdmin && (
                                      <button
                                          onClick={() => { setEditId(s.id); setEditName(s.name); }}
                                          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                          title="Редактировать"
                                      >
                                        <Edit2 className="size-3.5" />
                                      </button>
                                  )}
                                  {isAdmin && (
                                      <button
                                          onClick={() => handleDelete(s.id)}
                                          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                          title="Удалить"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                  )}
                                </div>
                            )}
                          </div>

                          {/* Name / edit form */}
                          <div className="flex-1">
                            <p className="text-white/60 text-xs font-medium mb-1">Предмет</p>
                            {isEditing ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                      autoFocus value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleEdit(s.id);
                                        if (e.key === 'Escape') setEditId(null);
                                      }}
                                      className="flex-1 text-sm font-bold bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/30"
                                  />
                                  <button
                                      onClick={() => handleEdit(s.id)} disabled={saving}
                                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-60"
                                  >
                                    <Check className="size-3.5" />
                                  </button>
                                  <button
                                      onClick={() => setEditId(null)}
                                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                            ) : (
                                <Link to={`/subjects/${s.id}/topics`} className="block">
                                  <h3 className="text-white text-base font-bold leading-snug">{s.name}</h3>
                                  <p className="text-white/70 text-xs font-medium mt-2 group-hover:text-white/90 transition-colors">
                                    Открыть темы →
                                  </p>
                                </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                );
              })}
            </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchSubjects} />

        {/* Create modal */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый предмет">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Название предмета *</label>
              <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Например: Математика" autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-3">
              <button
                  onClick={handleCreate} disabled={creating}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2.5 bg-muted text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>

        {/* Moderator assignment modal */}
        <Modal
            open={!!modModalSubject}
            onClose={() => setModModalSubject(null)}
            title={`Модераторы предмета «${modModalSubject?.name ?? ''}»`}
        >
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Назначенные */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Назначены
              </p>
              {subjectMods.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Модераторов нет</p>
              ) : (
                  <div className="space-y-1.5">
                    {subjectMods.map(m => (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-xl">
                          <span className="text-sm font-medium text-foreground">{m.nickname}</span>
                          <button
                              onClick={() => modModalSubject && handleRemoveMod(m.accountId, modModalSubject.id)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Снять модератора"
                          >
                            <UserMinus className="size-3.5" />
                          </button>
                        </div>
                    ))}
                  </div>
              )}
            </div>

            {/* Добавить */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Добавить модератора
              </p>
              <input
                  value={modSearch} onChange={e => setModSearch(e.target.value)}
                  placeholder="Поиск по нику или имени..."
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {unassignedMods.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {allModerators.length === 0
                        ? 'Нет пользователей с ролью «Модератор»'
                        : 'Все модераторы уже назначены'}
                  </p>
              ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {unassignedMods.map(m => (
                        <div
                            key={m.id}
                            className="flex items-center justify-between px-3 py-2.5 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.nickname}</p>
                            {(m.last_name || m.first_name) && (
                                <p className="text-xs text-muted-foreground">
                                  {[m.last_name, m.first_name].filter(Boolean).join(' ')}
                                </p>
                            )}
                          </div>
                          <button
                              onClick={() => modModalSubject && handleAssignMod(m.id, modModalSubject.id)}
                              disabled={assigningMod}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/15 transition-colors disabled:opacity-60"
                          >
                            <UserPlus className="size-3" /> Назначить
                          </button>
                        </div>
                    ))}
                  </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
  );
};