import React, { useEffect, useState } from 'react';
import {
  Users, School, BookOpen, Shield, Clock, Plus, Trash2, Ban,
  CheckCircle, Edit2, ChevronDown, Search, UserCheck
} from 'lucide-react';
import { accountsApi, type GetAllUserResponse } from '../app/api/accounts';
import { rolesApi, type RoleResponse } from '../app/api/roles';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { adminModeratorsApi, type SubjectModeratorResponse } from '../app/api/adminModerators';
import { adminSchoolModeratorsApi, type SchoolModeratorResponse } from '../app/api/adminSchoolModerators';
import { schedulerApi } from '../app/api/scheduler';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type Tab = 'users' | 'schools' | 'classes' | 'subjects' | 'moderators' | 'school-moderators' | 'scheduler';

export const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Недостаточно прав');
      navigate('/');
    }
  }, [isAdmin]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'users', label: 'Пользователи', icon: <Users className="size-4" /> },
    { key: 'schools', label: 'Школы', icon: <School className="size-4" /> },
    { key: 'classes', label: 'Классы', icon: <BookOpen className="size-4" /> },
    { key: 'subjects', label: 'Предметы', icon: <BookOpen className="size-4" /> },
    { key: 'moderators', label: 'Мод. предметов', icon: <Shield className="size-4" /> },
    { key: 'school-moderators', label: 'Мод. школ', icon: <Shield className="size-4" /> },
    { key: 'scheduler', label: 'Планировщик', icon: <Clock className="size-4" /> },
  ];

  return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-11 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 text-2xl font-bold">Панель администратора</h1>
            <p className="text-slate-400 text-sm">Управление системой и пользователями</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 bg-slate-100 p-1.5 rounded-2xl mb-6 custom-scrollbar">
          {tabs.map((t) => (
              <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === t.key
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {t.icon}
                {t.label}
              </button>
          ))}
        </div>

        <div className="animate-fade-up">
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'schools' && <SchoolsTab />}
          {activeTab === 'classes' && <ClassesTab />}
          {activeTab === 'subjects' && <SubjectsTab />}
          {activeTab === 'moderators' && <ModeratorsTab />}
          {activeTab === 'school-moderators' && <SchoolModeratorsTab />}
          {activeTab === 'scheduler' && <SchedulerTab />}
        </div>
      </div>
  );
};

// ─── Users Tab ───────────────────────────────────────────────────────────────
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<GetAllUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [banFilter, setBanFilter] = useState<'all' | 'banned' | 'active'>('all');
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GetAllUserResponse | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const fetchUsers = async (p = 0) => {
    setLoading(true);
    try {
      const res = await accountsApi.getAllUsers(p, 15);
      setUsers(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch { toast.error('Ошибка загрузки'); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers(0);
    rolesApi.getAll().then(r => setRoles(r.data)).catch(() => {});
  }, []);

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (q) {
      const ok = u.nickname.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      if (!ok) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (banFilter === 'banned' && !u.isBanned) return false;
    if (banFilter === 'active' && u.isBanned) return false;
    return true;
  });

  const handleBan = async (id: number, isBanned: boolean) => {
    try {
      if (!isBanned) await accountsApi.banUser(id);
      else await accountsApi.unbanUser(id);
      toast.success(!isBanned ? 'Пользователь заблокирован' : 'Разблокирован');
      fetchUsers(page);
    } catch { toast.error('Ошибка'); }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRoleId) return;
    try {
      await accountsApi.updateRole(selectedUser.id, Number(selectedRoleId));
      toast.success('Роль обновлена');
      setEditRoleOpen(false);
      fetchUsers(page);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
  };

  const roleStyles: Record<string, string> = {
    Администратор: 'text-red-600 bg-red-50 border-red-100',
    Модератор: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    Пользователь: 'text-slate-500 bg-slate-50 border-slate-100',
  };

  return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по нику или email..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>
          <div className="relative">
            <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">Все роли</option>
              <option value="Пользователь">Пользователь</option>
              <option value="Модератор">Модератор</option>
              <option value="Администратор">Администратор</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
                value={banFilter}
                onChange={(e) => setBanFilter(e.target.value as any)}
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="banned">Заблокированные</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-slate-800 font-semibold">Все пользователи</h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">{filtered.length} чел.</span>
          </div>
          {loading ? (
              <div className="p-8 text-center text-slate-400">Загрузка...</div>
          ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                          {u.nickname[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{u.nickname}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${roleStyles[u.role] ?? 'text-slate-500 bg-slate-50'}`}>
                    {u.role}
                  </span>
                        {u.isBanned && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 font-medium">Заблокирован</span>
                        )}
                        <button
                            onClick={() => { setSelectedUser(u); setSelectedRoleId(''); setEditRoleOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Изменить роль"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                            onClick={() => handleBan(u.id, u.isBanned)}
                            className={`p-1.5 rounded-lg transition-colors ${
                                !u.isBanned
                                    ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={!u.isBanned ? 'Заблокировать' : 'Разблокировать'}
                        >
                          {!u.isBanned ? <Ban className="size-3.5" /> : <CheckCircle className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchUsers} />

        <Modal open={editRoleOpen} onClose={() => setEditRoleOpen(false)} title={`Роль: ${selectedUser?.nickname}`}>
          <div className="p-6 space-y-4">
            <div className="relative">
              <select
                  value={selectedRoleId}
                  onChange={e => setSelectedRoleId(e.target.value)}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              >
                <option value="">Выберите роль</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.description ?? r.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpdateRole} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-indigo-100">
                Сохранить
              </button>
              <button onClick={() => setEditRoleOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};

// ─── Schools Tab ──────────────────────────────────────────────────────────────
const SchoolsTab: React.FC = () => {
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try { const r = await schoolsApi.getAll(); setSchools(r.data); }
    catch { toast.error('Ошибка'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Введите название');
    setCreating(true);
    try {
      await schoolsApi.create(newName.trim());
      toast.success('Школа создана');
      setNewName('');
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить школу?')) return;
    try { await schoolsApi.delete(id); toast.success('Школа удалена'); fetch(); }
    catch { toast.error('Ошибка'); }
  };

  return (
      <div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 shadow-sm">
          <h3 className="text-slate-800 font-semibold mb-4">Добавить школу</h3>
          <div className="flex gap-3">
            <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Название учебного заведения"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 shadow-md shadow-indigo-100"
            >
              <Plus className="size-4" />
              Добавить
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {loading ? (
              <div className="p-8 text-center text-slate-400">Загрузка...</div>
          ) : schools.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Школ пока нет</div>
          ) : (
              <div className="divide-y divide-slate-50">
                {schools.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-9 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                          <School className="size-4 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">{s.name}</span>
                      </div>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>
      </div>
  );
};

// ─── Classes Tab ──────────────────────────────────────────────────────────────
const ClassesTab: React.FC = () => {
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { schoolsApi.getAll().then(r => setSchools(r.data)).catch(() => {}); }, []);

  const loadClasses = async (schoolId: string) => {
    setSelectedSchool(schoolId);
    if (!schoolId) { setClasses([]); return; }
    setLoading(true);
    try { const r = await schoolClassesApi.getBySchool(Number(schoolId)); setClasses(r.data); }
    catch { toast.error('Ошибка'); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !selectedSchool) return toast.error('Заполните все поля');
    setCreating(true);
    try {
      await schoolClassesApi.create(newName.trim(), Number(selectedSchool));
      toast.success('Класс создан');
      setNewName('');
      loadClasses(selectedSchool);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить класс?')) return;
    try { await schoolClassesApi.delete(id); toast.success('Класс удалён'); loadClasses(selectedSchool); }
    catch { toast.error('Ошибка'); }
  };

  return (
      <div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <select
                  value={selectedSchool}
                  onChange={e => loadClasses(e.target.value)}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              >
                <option value="">Выберите школу</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
            <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Название класса (10А)"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
            />
            <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 shadow-md shadow-indigo-100"
            >
              <Plus className="size-4" />
              Добавить
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {loading ? (
              <div className="p-8 text-center text-slate-400">Загрузка...</div>
          ) : classes.length === 0 ? (
              <div className="p-8 text-center text-slate-400">{selectedSchool ? 'Классов нет' : 'Выберите школу'}</div>
          ) : (
              <div className="divide-y divide-slate-50">
                {classes.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium text-slate-800">{c.name}</span>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>
      </div>
  );
};

// ─── Subjects Tab ─────────────────────────────────────────────────────────────
const SubjectsTab: React.FC = () => {
  const [directions, setDirections] = useState<DirectionResponse[]>([]);
  const [selectedDir, setSelectedDir] = useState('');
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => { directionsApi.getAll().then(r => setDirections(r.data)).catch(() => {}); }, []);

  const loadSubjects = async (dirId: string, p = 0) => {
    setSelectedDir(dirId);
    if (!dirId) { setSubjects([]); return; }
    setLoading(true);
    try {
      const r = await subjectsApi.getByDirection(Number(dirId), p, 20);
      setSubjects(r.data.content);
      setTotalPages(r.data.total_pages);
      setPage(p);
    } catch { toast.error('Ошибка'); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !selectedDir) return toast.error('Заполните все поля');
    setCreating(true);
    try {
      await subjectsApi.create(newName.trim(), Number(selectedDir));
      toast.success('Предмет создан');
      setNewName('');
      loadSubjects(selectedDir, 0);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить предмет?')) return;
    try { await subjectsApi.delete(id); toast.success('Предмет удалён'); loadSubjects(selectedDir, 0); }
    catch { toast.error('Ошибка'); }
  };

  return (
      <div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <select
                  value={selectedDir}
                  onChange={e => loadSubjects(e.target.value)}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              >
                <option value="">Выберите направление</option>
                {directions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
            <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Название предмета"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
            />
            <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 shadow-md shadow-indigo-100"
            >
              <Plus className="size-4" />
              Добавить
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {loading ? (
              <div className="p-8 text-center text-slate-400">Загрузка...</div>
          ) : subjects.length === 0 ? (
              <div className="p-8 text-center text-slate-400">{selectedDir ? 'Предметов нет' : 'Выберите направление'}</div>
          ) : (
              <div className="divide-y divide-slate-50">
                {subjects.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium text-slate-800">{s.name}</span>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={p => loadSubjects(selectedDir, p)} />
      </div>
  );
};

// ─── Moderators Tab ───────────────────────────────────────────────────────────
const ModeratorsTab: React.FC = () => {
  const [subjectsAll, setSubjectsAll] = useState<SubjectResponse[]>([]);
  // Only users with the Moderator role
  const [moderatorsOnly, setModeratorsOnly] = useState<GetAllUserResponse[]>([]);

  const [subjectName, setSubjectName] = useState('');
  const [moderatorNickname, setModeratorNickname] = useState('');

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [moderatorId, setModeratorId] = useState<number | null>(null);

  const [allAssignments, setAllAssignments] = useState<SubjectModeratorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Load subjects
      try {
        const dirRes = await directionsApi.getAll();
        const allSubs: SubjectResponse[] = [];
        for (const d of dirRes.data) {
          const subRes = await subjectsApi.getByDirection(d.id, 0, 200);
          allSubs.push(...subRes.data.content);
        }
        setSubjectsAll(allSubs);
      } catch { /* ignore */ }

      // Load ONLY moderators
      try {
        const uRes = await accountsApi.getAllUsers(0, 500);
        const mods = uRes.data.content.filter(u => u.role === 'Модератор');
        setModeratorsOnly(mods);
      } catch { /* ignore */ }
    };
    init();
  }, []);

  useEffect(() => {
    if (subjectsAll.length > 0) loadAllAssignments();
  }, [subjectsAll.length]);

  useEffect(() => {
    const s = subjectsAll.find(x => x.name.toLowerCase() === subjectName.trim().toLowerCase());
    setSubjectId(s ? s.id : null);
  }, [subjectName, subjectsAll]);

  useEffect(() => {
    const u = moderatorsOnly.find(x => x.nickname.toLowerCase() === moderatorNickname.trim().toLowerCase());
    setModeratorId(u ? u.id : null);
  }, [moderatorNickname, moderatorsOnly]);

  const loadAllAssignments = async () => {
    setLoadingAll(true);
    try {
      const results: SubjectModeratorResponse[] = [];
      for (const s of subjectsAll) {
        try {
          const r = await adminModeratorsApi.listBySubject(s.id);
          results.push(...r.data);
        } catch { /* skip */ }
      }
      setAllAssignments(results);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleAssign = async () => {
    if (!moderatorId || !subjectId) return toast.error('Выберите модератора и предмет');
    setAssigning(true);
    try {
      await adminModeratorsApi.assign(moderatorId, subjectId);
      toast.success('Модератор назначен');
      setModeratorNickname('');
      loadAllAssignments();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (accId: number, subId: number) => {
    if (!window.confirm('Снять модератора?')) return;
    try {
      await adminModeratorsApi.remove(accId, subId);
      toast.success('Модератор снят');
      loadAllAssignments();
    } catch { toast.error('Ошибка'); }
  };

  return (
      <div>
        {/* Assign form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
              <UserCheck className="size-4 text-indigo-600" />
            </div>
            <h3 className="text-slate-800 font-semibold">Назначить модератора на предмет</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Предмет</label>
              <input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Начните вводить название..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                  list="subjects-list"
              />
              <datalist id="subjects-list">
                {subjectsAll.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
              {subjectId && (
                  <p className="text-[11px] text-indigo-500 mt-1">✓ ID: {subjectId}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Модератор
                <span className="ml-1.5 text-indigo-400 font-normal">({moderatorsOnly.length} доступно)</span>
              </label>
              <input
                  value={moderatorNickname}
                  onChange={(e) => setModeratorNickname(e.target.value)}
                  placeholder="Ник модератора..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                  list="mods-list"
              />
              <datalist id="mods-list">
                {moderatorsOnly.map(u => <option key={u.id} value={u.nickname} />)}
              </datalist>
              {moderatorId && (
                  <p className="text-[11px] text-indigo-500 mt-1">✓ ID: {moderatorId}</p>
              )}
              {moderatorNickname && !moderatorId && (
                  <p className="text-[11px] text-amber-500 mt-1">Пользователь не найден среди модераторов</p>
              )}
            </div>
            <div className="flex items-end">
              <button onClick={handleAssign} disabled={assigning || !moderatorId || !subjectId}
                      className="w-full px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100 transition-all">
                {assigning ? 'Назначение...' : 'Назначить'}
              </button>
            </div>
          </div>
        </div>

        {/* All assignments list */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-800 font-semibold">
            Все назначения
            {allAssignments.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">({allAssignments.length})</span>
            )}
          </h3>
          <button
              onClick={loadAllAssignments}
              disabled={loadingAll}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {loadingAll ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {loadingAll ? (
              <div className="p-8 text-center text-slate-400">Загрузка назначений...</div>
          ) : allAssignments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Назначений пока нет</div>
          ) : (
              <div className="divide-y divide-slate-50">
                {allAssignments.map(m => (
                    <div key={`${m.accountId}-${m.subjectId}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold border border-indigo-100">
                          {m.nickname?.[0]?.toUpperCase() ?? 'M'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{m.nickname}</p>
                          <p className="text-xs text-slate-400">Предмет: <span className="text-slate-600">{m.subjectName}</span></p>
                        </div>
                      </div>
                      <button onClick={() => handleRemove(m.accountId, m.subjectId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Снять">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>
      </div>
  );
};

// ─── School Moderators Tab ────────────────────────────────────────────────────
const SchoolModeratorsTab: React.FC = () => {
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [moderatorNickname, setModeratorNickname] = useState('');
  const [moderatorId, setModeratorId] = useState<number | null>(null);
  const [allAssignments, setAllAssignments] = useState<SchoolModeratorResponse[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  // Only users with role Модератор
  const [moderatorsOnly, setModeratorsOnly] = useState<GetAllUserResponse[]>([]);

  useEffect(() => {
    schoolsApi.getAll().then(r => setSchools(r.data)).catch(() => {});
    // Load only moderators
    accountsApi.getAllUsers(0, 500)
        .then(r => setModeratorsOnly(r.data.content.filter(u => u.role === 'Модератор')))
        .catch(() => {});
  }, []);

  useEffect(() => {
    const u = moderatorsOnly.find(x => x.nickname.toLowerCase() === moderatorNickname.trim().toLowerCase());
    setModeratorId(u ? u.id : null);
  }, [moderatorNickname, moderatorsOnly]);

  useEffect(() => {
    if (schools.length > 0) loadAllAssignments();
  }, [schools.length]);

  const loadAllAssignments = async () => {
    setLoadingAll(true);
    try {
      const results: SchoolModeratorResponse[] = [];
      for (const s of schools) {
        try {
          const r = await adminSchoolModeratorsApi.listBySchool(s.id);
          results.push(...r.data);
        } catch { /* skip */ }
      }
      setAllAssignments(results);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleAssign = async () => {
    if (!moderatorId || !selectedSchool) return toast.error('Заполните все поля');
    setAssigning(true);
    try {
      await adminSchoolModeratorsApi.assign(moderatorId, Number(selectedSchool));
      toast.success('Модератор назначен на школу');
      setModeratorNickname('');
      loadAllAssignments();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (accId: number, schoolId: number) => {
    if (!window.confirm('Снять модератора?')) return;
    try {
      await adminSchoolModeratorsApi.remove(accId, schoolId);
      toast.success('Снято');
      loadAllAssignments();
    } catch { toast.error('Ошибка'); }
  };

  return (
      <div>
        {/* Assign form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <UserCheck className="size-4 text-blue-600" />
            </div>
            <h3 className="text-slate-800 font-semibold">Назначить модератора на школу</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Школа</label>
              <div className="relative">
                <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}
                        className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50">
                  <option value="">Выберите школу</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Модератор
                <span className="ml-1.5 text-indigo-400 font-normal">({moderatorsOnly.length} доступно)</span>
              </label>
              <input
                  value={moderatorNickname}
                  onChange={(e) => setModeratorNickname(e.target.value)}
                  placeholder="Ник модератора..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                  list="mods-schools-list"
              />
              <datalist id="mods-schools-list">
                {moderatorsOnly.map(u => <option key={u.id} value={u.nickname} />)}
              </datalist>
              {moderatorId && (
                  <p className="text-[11px] text-indigo-500 mt-1">✓ ID: {moderatorId}</p>
              )}
              {moderatorNickname && !moderatorId && (
                  <p className="text-[11px] text-amber-500 mt-1">Пользователь не найден среди модераторов</p>
              )}
            </div>
            <div className="flex items-end">
              <button onClick={handleAssign} disabled={assigning || !moderatorId || !selectedSchool}
                      className="w-full px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100 transition-all">
                {assigning ? 'Назначение...' : 'Назначить'}
              </button>
            </div>
          </div>
        </div>

        {/* All assignments list */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-800 font-semibold">
            Все назначения
            {allAssignments.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">({allAssignments.length})</span>
            )}
          </h3>
          <button
              onClick={loadAllAssignments}
              disabled={loadingAll}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {loadingAll ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {loadingAll ? (
              <div className="p-8 text-center text-slate-400">Загрузка назначений...</div>
          ) : allAssignments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Назначений пока нет</div>
          ) : (
              <div className="divide-y divide-slate-50">
                {allAssignments.map(m => (
                    <div key={`${m.accountId}-${m.schoolId}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold border border-blue-100">
                          {m.nickname?.[0]?.toUpperCase() ?? 'M'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{m.nickname}</p>
                          <p className="text-xs text-slate-400">Школа: <span className="text-slate-600">{m.schoolName}</span></p>
                        </div>
                      </div>
                      <button onClick={() => handleRemove(m.accountId, m.schoolId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Снять">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>
      </div>
  );
};

// ─── Scheduler Tab ────────────────────────────────────────────────────────────
// Full width — no max-w-lg constraint, matches the panel width
const SchedulerTab: React.FC = () => {
  const [cron, setCron] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastCron, setLastCron] = useState('');

  const PRESETS = [
    { label: 'Ежедневно в 08:00', value: '0 0 8 * * ?' },
    { label: 'Каждую неделю (Пн 09:00)', value: '0 0 9 ? * MON' },
    { label: 'Каждый час', value: '0 0 * * * ?' },
    { label: 'Каждые 30 минут', value: '0 0/30 * * * ?' },
    { label: 'Каждые 15 минут', value: '0 0/15 * * * ?' },
    { label: 'Ежедневно в полночь', value: '0 0 0 * * ?' },
  ];

  const handleSave = async () => {
    if (!cron.trim()) return toast.error('Введите cron-выражение');
    setSaving(true);
    try {
      const res = await schedulerApi.setVerificationTime(cron.trim());
      setLastCron(res.data.cron);
      toast.success('Расписание обновлено!');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Main settings card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-slate-800 font-semibold">Планировщик проверки</h3>
              <p className="text-slate-400 text-xs">Автоматическое удаление устаревших комментариев</p>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cron-выражение</label>
            <input
                type="text"
                value={cron}
                onChange={e => setCron(e.target.value)}
                placeholder="0 0 8 * * ?"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
            />
            <p className="text-xs text-slate-400 mt-1.5">Формат: секунды минуты часы день месяц день_недели</p>
          </div>

          {lastCron && (
              <div className="mb-5 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-700">
                  Активное расписание: <code className="font-mono font-semibold">{lastCron}</code>
                </p>
              </div>
          )}

          <button
              onClick={handleSave}
              disabled={saving || !cron.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-60 shadow-md shadow-indigo-100"
          >
            {saving ? 'Сохранение...' : 'Установить расписание'}
          </button>
        </div>

        {/* Presets card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-slate-800 font-semibold mb-1">Готовые пресеты</h3>
          <p className="text-slate-400 text-xs mb-4">Нажмите, чтобы подставить значение</p>
          <div className="grid grid-cols-1 gap-2">
            {PRESETS.map(p => (
                <button
                    key={p.value}
                    onClick={() => setCron(p.value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm border transition-all text-left ${
                        cron === p.value
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                >
                  <span className="font-medium">{p.label}</span>
                  <code className="text-xs font-mono opacity-60">{p.value}</code>
                </button>
            ))}
          </div>
        </div>
      </div>
  );
};