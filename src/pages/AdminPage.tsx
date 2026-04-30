import React, { useEffect, useState } from 'react';
import {
  Users, School, BookOpen, Shield, Clock, Plus, Trash2, Ban,
  CheckCircle, Edit2, ChevronDown, Search, UserCheck, FileSpreadsheet,
  GraduationCap, Layers, ChevronRight, FileText, Send, Award, X, Filter,
} from 'lucide-react';
import { accountsApi, type GetAllUserResponse } from '../app/api/accounts';
import { rolesApi, roleDisplayLabel, type RoleResponse } from '../app/api/roles';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { adminModeratorsApi, type SubjectModeratorResponse } from '../app/api/adminModerators';
import { adminSchoolModeratorsApi, type SchoolModeratorResponse } from '../app/api/adminSchoolModerators';
import { schedulerApi } from '../app/api/scheduler';
import {
  coursesApi,
  type CourseShortResponse,
  type CourseSchoolRef,
  type CourseLessonResponse,
  type LessonSubmissionResponse,
  type GradingCriterionResponse,
  type CriterionScoreInput,
  type CreateLessonRequest,
  apiDeadlineToDatetimeLocal,
  datetimeLocalToApiDeadline,
} from '../app/api/courses';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ImportExportPanel } from './ImportExportPanel'; // новый компонент
import { filesApi } from '../app/api/files';

/** ФИО в админке; если нет в справочнике — ник из API */
function formatAdminFio(u: GetAllUserResponse | undefined, fallbackNick: string) {
  if (!u) return fallbackNick;
  const parts = [u.last_name, u.first_name, u.middle_name].filter(Boolean);
  return parts.length ? parts.join(' ') : u.nickname;
}

type Tab = 'users' | 'schools' | 'classes' | 'subjects' | 'moderators' | 'school-moderators' | 'scheduler' | 'import-export';

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
    { key: 'import-export', label: 'Импорт/Экспорт', icon: <FileSpreadsheet className="size-4" /> },
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
          {activeTab === 'import-export' && <ImportExportPanel />}
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState({ email: '', nickname: '', password: '', roleId: '' });
  const [registerSaving, setRegisterSaving] = useState(false);

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
    rolesApi
      .getAll()
      .then(r => setRoles(Array.isArray(r.data) ? r.data : []))
      .catch(() => {
        toast.error('Не удалось загрузить список ролей');
      });
  }, []);

  const userFullName = (u: GetAllUserResponse) => {
    const parts = [u.last_name, u.first_name, u.middle_name].filter(Boolean);
    return parts.length ? parts.join(' ') : u.nickname;
  };

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = [
        u.nickname,
        u.email,
        userFullName(u),
        u.school_name,
        u.class_name,
      ].filter(Boolean).join(' ').toLowerCase();
      const ok = hay.includes(q);
      if (!ok) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (banFilter === 'banned' && !u.is_banned) return false;
    if (banFilter === 'active' && u.is_banned) return false;
    return true;
  });

  const handleBan = async (id: number, isBanned: boolean) => {
    try {
      if (!isBanned) await accountsApi.banUser(id);
      else await accountsApi.unbanUser(id);
      toast.success(!isBanned ? 'Пользователь заблокирован' : 'Разблокирован');
      fetchUsers(page);
    } catch { toast.error('Ошибка блокировки'); }
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

  const handleRegisterUser = async () => {
    if (!regForm.email.trim() || !regForm.nickname.trim() || !regForm.password) {
      toast.error('Укажите email, никнейм и пароль');
      return;
    }
    if (regForm.password.length < 8) {
      toast.error('Пароль не короче 8 символов');
      return;
    }
    setRegisterSaving(true);
    try {
      await accountsApi.adminRegisterUser({
        email: regForm.email.trim(),
        nickname: regForm.nickname.trim(),
        password: regForm.password,
        ...(regForm.roleId && { role_id: Number(regForm.roleId) }),
      });
      toast.success('Пользователь добавлен');
      setRegisterOpen(false);
      setRegForm({ email: '', nickname: '', password: '', roleId: '' });
      fetchUsers(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Не удалось создать пользователя');
    } finally {
      setRegisterSaving(false);
    }
  };

  const roleStyles: Record<string, string> = {
    Администратор: 'text-red-600 bg-red-50 border-red-100',
    Модератор: 'text-blue-600 bg-blue-50 border-blue-100',
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
                placeholder="Поиск по ФИО, нику, школе, классу или email..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>
          <div className="relative">
            <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
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
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRegisterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="size-4" /> Добавить
              </button>
              <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">{filtered.length} чел.</span>
            </div>
          </div>
          {loading ? (
              <div className="p-8 text-center text-slate-400">Загрузка...</div>
          ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 w-12" aria-hidden />
                      <th className="px-3 py-3">ФИО</th>
                      <th className="px-3 py-3">Ник</th>
                      <th className="px-3 py-3">Почта</th>
                      <th className="px-3 py-3">Школа</th>
                      <th className="px-3 py-3">Класс</th>
                      <th className="px-3 py-3">Роль</th>
                      <th className="px-4 py-3 text-right w-28">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5 align-middle">
                          {u.photo_name_in_directory ? (
                            <img
                              src={filesApi.getPhotoUrl(u.photo_name_in_directory)}
                              alt=""
                              className="size-9 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="size-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                              {u.nickname?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{userFullName(u)}</td>
                        <td className="px-3 py-2.5 text-slate-600">@{u.nickname}</td>
                        <td className="px-3 py-2.5 text-slate-600 break-all max-w-[200px]">{u.email}</td>
                        <td className="px-3 py-2.5 text-slate-600">{u.school_name ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600">{u.class_name ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${roleStyles[u.role] ?? 'text-slate-500 bg-slate-50'}`}>
                            {u.role}
                          </span>
                          {u.is_banned && (
                            <span className="ml-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-lg border border-red-100 font-medium">бан</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => { setSelectedUser(u); setSelectedRoleId(''); setEditRoleOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-flex"
                            title="Изменить роль"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBan(u.id, u.is_banned)}
                            className={`p-1.5 rounded-lg transition-colors inline-flex ${
                              !u.is_banned
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={!u.is_banned ? 'Заблокировать' : 'Разблокировать'}
                          >
                            {!u.is_banned ? <Ban className="size-3.5" /> : <CheckCircle className="size-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
              >
                <option value="">Выберите роль</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{roleDisplayLabel(r)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpdateRole} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-100">
                Сохранить
              </button>
              <button onClick={() => setEditRoleOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
                Отмена
              </button>
            </div>
          </div>
        </Modal>

        <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Новый пользователь">
          <div className="p-6 space-y-3 max-w-md">
            <input
              type="email"
              placeholder="Email"
              value={regForm.email}
              onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
            <input
              placeholder="Никнейм"
              value={regForm.nickname}
              onChange={e => setRegForm(f => ({ ...f, nickname: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
            <input
              type="password"
              placeholder="Пароль (мин. 8 символов)"
              value={regForm.password}
              onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
            <div className="relative">
              <select
                value={regForm.roleId}
                onChange={e => setRegForm(f => ({ ...f, roleId: e.target.value }))}
                className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50"
              >
                <option value="">Роль по умолчанию (ученик)</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{roleDisplayLabel(r)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={registerSaving}
                onClick={handleRegisterUser}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {registerSaving ? 'Создание…' : 'Создать'}
              </button>
              <button type="button" onClick={() => setRegisterOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl">
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
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-60 shadow-md shadow-blue-100"
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
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
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
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
            />
            <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-60 shadow-md shadow-blue-100"
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
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
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
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
            />
            <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-60 shadow-md shadow-blue-100"
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
    const extractNickname = (v: string) => {
      const m = v.match(/@([^\s)]+)/);
      return (m?.[1] ?? v).trim();
    };
    const nick = extractNickname(moderatorNickname).toLowerCase();
    const u = moderatorsOnly.find(x => x.nickname.toLowerCase() === nick);
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
            <div className="size-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <UserCheck className="size-4 text-blue-600" />
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                  list="subjects-list"
              />
              <datalist id="subjects-list">
                {subjectsAll.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
              {subjectId && (
                  <p className="text-[11px] text-blue-500 mt-1">✓ ID: {subjectId}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Модератор
                <span className="ml-1.5 text-blue-400 font-normal">({moderatorsOnly.length} доступно)</span>
              </label>
              <input
                  value={moderatorNickname}
                  onChange={(e) => setModeratorNickname(e.target.value)}
                  placeholder="ФИО или ник модератора..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                  list="mods-list"
              />
              <datalist id="mods-list">
                {moderatorsOnly.map(u => {
                  const fio = [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ');
                  const label = fio ? `${fio} (@${u.nickname})` : u.nickname;
                  return <option key={u.id} value={label} />;
                })}
              </datalist>
              {moderatorId && (
                  <p className="text-[11px] text-blue-500 mt-1">✓ ID: {moderatorId}</p>
              )}
              {moderatorNickname && !moderatorId && (
                  <p className="text-[11px] text-amber-500 mt-1">Пользователь не найден среди модераторов</p>
              )}
            </div>
            <div className="flex items-end">
              <button onClick={handleAssign} disabled={assigning || !moderatorId || !subjectId}
                      className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 shadow-md shadow-blue-100 transition-all">
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
                {allAssignments.map(m => {
                  const aid = m.accountId ?? (m as { account_id?: number }).account_id ?? -1;
                  const mod = moderatorsOnly.find(x => x.id === aid);
                  const title = formatAdminFio(mod, m.nickname);
                  return (
                    <div key={`${aid}-${m.subjectId}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold border border-blue-100 shrink-0">
                          {title[0]?.toUpperCase() ?? 'M'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
                          <p className="text-xs text-slate-500">
                            @{mod?.nickname ?? m.nickname}
                            {mod?.email ? ` · ${mod.email}` : ''}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">Предмет: <span className="text-slate-600">{m.subjectName}</span></p>
                        </div>
                      </div>
                      <button onClick={() => handleRemove(aid, m.subjectId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                              title="Снять">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
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
    const extractNickname = (v: string) => {
      const m = v.match(/@([^\s)]+)/);
      return (m?.[1] ?? v).trim();
    };
    const nick = extractNickname(moderatorNickname).toLowerCase();
    const u = moderatorsOnly.find(x => x.nickname.toLowerCase() === nick);
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
                        className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50">
                  <option value="">Выберите школу</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Модератор
                <span className="ml-1.5 text-blue-400 font-normal">({moderatorsOnly.length} доступно)</span>
              </label>
              <input
                  value={moderatorNickname}
                  onChange={(e) => setModeratorNickname(e.target.value)}
                  placeholder="ФИО или ник модератора..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                  list="mods-schools-list"
              />
              <datalist id="mods-schools-list">
                {moderatorsOnly.map(u => {
                  const fio = [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ');
                  const label = fio ? `${fio} (@${u.nickname})` : u.nickname;
                  return <option key={u.id} value={label} />;
                })}
              </datalist>
              {moderatorId && (
                  <p className="text-[11px] text-blue-500 mt-1">✓ ID: {moderatorId}</p>
              )}
              {moderatorNickname && !moderatorId && (
                  <p className="text-[11px] text-amber-500 mt-1">Пользователь не найден среди модераторов</p>
              )}
            </div>
            <div className="flex items-end">
              <button onClick={handleAssign} disabled={assigning || !moderatorId || !selectedSchool}
                      className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 shadow-md shadow-blue-100 transition-all">
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
                {allAssignments.map(m => {
                  const aid = m.accountId ?? (m as { account_id?: number }).account_id ?? -1;
                  const mod = moderatorsOnly.find(x => x.id === aid);
                  const title = formatAdminFio(mod, m.nickname);
                  return (
                    <div key={`${aid}-${m.schoolId}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold border border-blue-100 shrink-0">
                          {title[0]?.toUpperCase() ?? 'M'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
                          <p className="text-xs text-slate-500">
                            @{mod?.nickname ?? m.nickname}
                            {mod?.email ? ` · ${mod.email}` : ''}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">Школа: <span className="text-slate-600">{m.schoolName}</span></p>
                        </div>
                      </div>
                      <button onClick={() => handleRemove(aid, m.schoolId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                              title="Снять">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
          )}
        </div>
      </div>
  );
};

// ─── Courses Tab ─────────────────────────────────────────────────────────────
export const CoursesTab: React.FC = () => {
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [courses, setCourses] = useState<CourseShortResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [activeCourse, setActiveCourse] = useState<CourseShortResponse | null>(null);
  const [activeCourseSchools, setActiveCourseSchools] = useState<CourseSchoolRef[]>([]);
  const [addSchoolId, setAddSchoolId] = useState('');
  const [lessons, setLessons] = useState<CourseLessonResponse[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLessonResponse | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '', lecture_content: '', practice_description: '',
    submission_type: 'TEXT' as 'TEXT' | 'FILE' | 'TEXT_AND_FILE', order_number: 1,
    video_url: '', max_score: 100,
    deadline_local: '',
  });
  const [lessonCriteriaFormInline, setLessonCriteriaFormInline] = useState<Array<{ name: string; description: string; max_points: number }>>([]);
  const [savingLesson, setSavingLesson] = useState(false);

  // Per-lesson submissions review panel
  const [reviewLesson, setReviewLesson] = useState<CourseLessonResponse | null>(null);
  const [submissions, setSubmissions] = useState<LessonSubmissionResponse[]>([]);
  const [subPage, setSubPage] = useState(0);
  const [subTotalPages, setSubTotalPages] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState<LessonSubmissionResponse | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'ACCEPTED' | 'NEEDS_REVISION'>('ACCEPTED');
  const [reviewScore, setReviewScore] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Course-wide submissions panel
  const [showCourseSubmissions, setShowCourseSubmissions] = useState(false);
  const [courseSubStatusFilter, setCourseSubStatusFilter] = useState('');
  const [courseSubmissions, setCourseSubmissions] = useState<LessonSubmissionResponse[]>([]);
  const [courseSubPage, setCourseSubPage] = useState(0);
  const [courseSubTotalPages, setCourseSubTotalPages] = useState(0);
  const [courseSubLoading, setCourseSubLoading] = useState(false);

  // Moderator assignment
  const [modModalOpen, setModModalOpen] = useState(false);
  const [moderatorsOnly, setModeratorsOnly] = useState<GetAllUserResponse[]>([]);
  const [modNickname, setModNickname] = useState('');
  const [modId, setModId] = useState<number | null>(null);
  const [courseMods, setCourseMods] = useState<{ id: number; account_id: number; nickname: string; course_id: number; course_name: string }[]>([]);
  const [modAssigning, setModAssigning] = useState(false);

  // Lecture file upload
  const [lectureFile, setLectureFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Grading criteria (per lesson)
  const [lessonCriteriaMap, setLessonCriteriaMap] = useState<Map<number, GradingCriterionResponse[]>>(new Map());
  const [criteriaLessonId, setCriteriaLessonId] = useState<number | null>(null);
  const [criteriaForm, setCriteriaForm] = useState<Array<{ name: string; description: string; max_points: number }>>([]);
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [reviewCriteriaScores, setReviewCriteriaScores] = useState<Record<number, number>>({});

  useEffect(() => {
    schoolsApi.getAll().then(r => setSchools(r.data)).catch(() => {});
    accountsApi.getAllUsers(0, 500)
      .then(r => setModeratorsOnly(r.data.content.filter((u: GetAllUserResponse) => u.role === 'Модератор')))
      .catch(() => {});
    loadAllCourses();
  }, []);

  useEffect(() => {
    const extractNickname = (v: string) => {
      const m = v.match(/@([^\s)]+)/);
      return (m?.[1] ?? v).trim();
    };
    const nick = extractNickname(modNickname).toLowerCase();
    const u = moderatorsOnly.find(x => x.nickname.toLowerCase() === nick);
    setModId(u ? u.id : null);
  }, [modNickname, moderatorsOnly]);

  const loadAllCourses = async () => {
    setLoading(true);
    try {
      const r = await coursesApi.adminGetAllCourses(0, 200);
      setCourses(r.data.content);
    } catch { toast.error('Ошибка загрузки курсов'); } finally { setLoading(false); }
  };

  const filteredCourses = courses.filter(c => {
    if (schoolFilter && !c.schools?.some(s => s.id === Number(schoolFilter))) return false;
    if (courseSearch && !c.name.toLowerCase().includes(courseSearch.toLowerCase())) return false;
    return true;
  });

  const handleCreateCourse = async () => {
    if (!newCourseName.trim()) return toast.error('Введите название курса');
    setCreating(true);
    try {
      await coursesApi.adminCreateCourse({
        name: newCourseName.trim(),
        description: newCourseDesc.trim(),
      });
      toast.success('Курс создан');
      setNewCourseName(''); setNewCourseDesc(''); setCreateOpen(false);
      loadAllCourses();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setCreating(false); }
  };

  const handleToggle = async (courseId: number) => {
    try {
      await coursesApi.adminToggleActive(courseId);
      toast.success('Статус обновлён');
      loadAllCourses();
    } catch { toast.error('Ошибка'); }
  };

  const handleDeleteCourse = async (courseId: number, name: string) => {
    if (!window.confirm(`Удалить курс «${name}»? Все уроки, работы, группы и данные курса будут удалены безвозвратно.`)) return;
    try {
      await coursesApi.adminDeleteCourse(courseId);
      toast.success('Курс удалён');
      if (activeCourse?.id === courseId) { setActiveCourse(null); setLessons([]); }
      loadAllCourses();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка удаления'); }
  };

  const openCourse = async (course: CourseShortResponse) => {
    setActiveCourse(course);
    setReviewLesson(null);
    setShowCourseSubmissions(false);
    setActiveCourseSchools(course.schools ?? []);
    setLessonsLoading(true);
    try {
      const lessonsRes = await coursesApi.getLessons(course.id);
      setLessons(lessonsRes.data);

      const criteriaMap = new Map<number, GradingCriterionResponse[]>();
      await Promise.all(
        lessonsRes.data.map(async (l: CourseLessonResponse) => {
          try {
            const res = await coursesApi.getLessonCriteria(l.id);
            if (res.data?.length) criteriaMap.set(l.id, res.data);
          } catch { /* no criteria */ }
        }),
      );
      setLessonCriteriaMap(criteriaMap);
      loadMods(course.id);
    } catch { toast.error('Ошибка загрузки уроков'); } finally { setLessonsLoading(false); }
  };

  const handleAddSchool = async () => {
    if (!addSchoolId || !activeCourse) return;
    try {
      const r = await coursesApi.addSchoolToCourse(activeCourse.id, Number(addSchoolId));
      setActiveCourseSchools(r.data.schools);
      setAddSchoolId('');
      toast.success('Школа привязана');
      loadAllCourses();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
  };

  const handleRemoveSchool = async (schoolId: number) => {
    if (!activeCourse) return;
    try {
      const r = await coursesApi.removeSchoolFromCourse(activeCourse.id, schoolId);
      setActiveCourseSchools(r.data.schools);
      toast.success('Школа откреплена');
      loadAllCourses();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
  };

  const loadMods = async (courseId: number) => {
    try {
      const r = await coursesApi.listModeratorsByCourse(courseId);
      setCourseMods(r.data);
    } catch { /* ignore */ }
  };

  const handleAssignMod = async () => {
    if (!modId || !activeCourse) return toast.error('Выберите модератора');
    setModAssigning(true);
    try {
      await coursesApi.assignModerator(modId, activeCourse.id);
      toast.success('Модератор назначен на курс');
      setModNickname('');
      loadMods(activeCourse.id);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setModAssigning(false); }
  };

  const handleRemoveMod = async (accountId: number, courseId: number) => {
    try {
      await coursesApi.removeCourseModerator(accountId, courseId);
      toast.success('Модератор снят');
      loadMods(courseId);
    } catch { toast.error('Ошибка'); }
  };

  const handleUploadLectureFile = async () => {
    if (!lectureFile || !activeCourse || !editingLesson) return;
    setUploadingFile(true);
    try {
      await coursesApi.adminUploadLectureFile(activeCourse.id, editingLesson.id, lectureFile);
      toast.success('Файл лекции загружен');
      setLectureFile(null);
      const r = await coursesApi.getLessons(activeCourse.id);
      setLessons(r.data);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setUploadingFile(false); }
  };

  const openCriteriaModal = (lessonId: number) => {
    const existing = lessonCriteriaMap.get(lessonId) ?? [];
    setCriteriaLessonId(lessonId);
    setCriteriaForm(
      existing.length > 0
        ? existing.map(c => ({ name: c.name, description: c.description ?? '', max_points: c.max_points }))
        : [{ name: '', description: '', max_points: 5 }]
    );
    setCriteriaModalOpen(true);
  };

  const handleSaveCriteria = async () => {
    if (!criteriaLessonId) return;
    const valid = criteriaForm.filter(c => c.name.trim());
    if (valid.length === 0) return toast.error('Добавьте хотя бы один критерий');
    setSavingCriteria(true);
    try {
      const res = await coursesApi.setLessonCriteria(criteriaLessonId, valid);
      setLessonCriteriaMap(prev => {
        const next = new Map(prev);
        next.set(criteriaLessonId, res.data);
        return next;
      });
      setCriteriaModalOpen(false);
      toast.success('Критерии сохранены');
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setSavingCriteria(false); }
  };

  const getReviewCriteria = (): GradingCriterionResponse[] => {
    if (reviewLesson) return lessonCriteriaMap.get(reviewLesson.id) ?? [];
    if (reviewModal) {
      const lesson = lessons.find(l => l.id === reviewModal.lesson_id);
      if (lesson) return lessonCriteriaMap.get(lesson.id) ?? [];
    }
    return [];
  };

  const handleGradeWithCriteria = async () => {
    if (!reviewModal || !activeCourse) return;
    setSubmitting(true);
    try {
      const activeCriteria = getReviewCriteria();
      const grades: CriterionScoreInput[] = activeCriteria.map(c => ({
        criterion_id: c.id,
        points: reviewCriteriaScores[c.id] ?? 0,
      }));
      await coursesApi.gradeSubmission(reviewModal.id, grades, reviewComment || undefined);
      toast.success('Оценка по критериям сохранена');
      setReviewModal(null); setReviewComment(''); setReviewCriteriaScores({});
      if (reviewLesson) openReview(reviewLesson, subPage);
      else if (showCourseSubmissions && activeCourse) loadCourseSubmissions(courseSubPage);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setSubmitting(false); }
  };

  const openLessonModal = (lesson?: CourseLessonResponse) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        lecture_content: lesson.lecture_content ?? '',
        practice_description: lesson.practice_description ?? '',
        submission_type: lesson.submission_type,
        order_number: lesson.order_number,
        video_url: lesson.video_url ?? '',
        max_score: lesson.max_score ?? 100,
        deadline_local: apiDeadlineToDatetimeLocal(lesson.submission_deadline),
      });
      const existing = lessonCriteriaMap.get(lesson.id) ?? [];
      setLessonCriteriaFormInline(
        existing.length > 0
          ? existing.map(c => ({ name: c.name, description: c.description ?? '', max_points: c.max_points }))
          : []
      );
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: '', lecture_content: '', practice_description: '',
        submission_type: 'TEXT', order_number: lessons.length + 1,
        video_url: '', max_score: 100,
        deadline_local: '',
      });
      setLessonCriteriaFormInline([]);
    }
    setLessonModalOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!activeCourse || !lessonForm.title.trim()) return toast.error('Введите название урока');
    setSavingLesson(true);
    try {
      const validCriteriaForScore = lessonCriteriaFormInline.filter(c => c.name.trim());
      const { deadline_local, ...lessonRest } = lessonForm;
      const formToSend: CreateLessonRequest = {
        ...lessonRest,
        submission_deadline: datetimeLocalToApiDeadline(deadline_local),
        category: editingLesson?.category ?? 'LESSON',
        hearing_stage: editingLesson?.hearing_stage ?? undefined,
      };
      if (validCriteriaForScore.length > 0) {
        formToSend.max_score = validCriteriaForScore.reduce((s, c) => s + (c.max_points || 0), 0);
      }

      let savedLessonId: number;
      if (editingLesson) {
        await coursesApi.adminUpdateLesson(activeCourse.id, editingLesson.id, formToSend);
        savedLessonId = editingLesson.id;
        toast.success('Урок обновлён');
      } else {
        const res = await coursesApi.adminAddLesson(activeCourse.id, formToSend);
        savedLessonId = res.data.id;
        toast.success('Урок добавлен');
      }

      const validCriteria = lessonCriteriaFormInline.filter(c => c.name.trim());
      if (validCriteria.length > 0) {
        const criteriaRes = await coursesApi.setLessonCriteria(savedLessonId, validCriteria);
        setLessonCriteriaMap(prev => {
          const next = new Map(prev);
          next.set(savedLessonId, criteriaRes.data);
          return next;
        });
      }

      setLessonModalOpen(false);
      const r = await coursesApi.getLessons(activeCourse.id);
      setLessons(r.data);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setSavingLesson(false); }
  };

  const handleDeleteLesson = async (l: CourseLessonResponse) => {
    if (!activeCourse) return;
    if (!window.confirm(`Удалить урок «${l.title}»? Все сданные работы по нему будут удалены.`)) return;
    try {
      await coursesApi.deleteLesson(activeCourse.id, l.id);
      toast.success('Урок удалён');
      if (reviewLesson?.id === l.id) {
        setReviewLesson(null);
        setSubmissions([]);
      }
      const r = await coursesApi.getLessons(activeCourse.id);
      setLessons(r.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка удаления урока');
    }
  };

  const openReview = async (lesson: CourseLessonResponse, p = 0) => {
    setReviewLesson(lesson);
    setShowCourseSubmissions(false);
    setSubLoading(true);
    try {
      const r = await coursesApi.getSubmissionsByLesson(lesson.id, p, 10);
      setSubmissions(r.data.content);
      setSubTotalPages(r.data.total_pages);
      setSubPage(p);
    } catch { toast.error('Ошибка'); } finally { setSubLoading(false); }
  };

  const loadCourseSubmissions = async (p = 0) => {
    if (!activeCourse) return;
    setCourseSubLoading(true);
    try {
      const r = await coursesApi.getSubmissionsByCourse(activeCourse.id, courseSubStatusFilter || undefined, p, 10);
      setCourseSubmissions(r.data.content);
      setCourseSubTotalPages(r.data.total_pages);
      setCourseSubPage(p);
    } catch { toast.error('Ошибка загрузки работ'); } finally { setCourseSubLoading(false); }
  };

  const openCourseSubmissions = () => {
    setShowCourseSubmissions(true);
    setReviewLesson(null);
    setCourseSubStatusFilter('');
    loadCourseSubmissions(0);
  };

  useEffect(() => {
    if (showCourseSubmissions && activeCourse) loadCourseSubmissions(0);
  }, [courseSubStatusFilter]);

  const handleReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      await coursesApi.reviewSubmission(reviewModal.id, reviewStatus, reviewComment, reviewScore === '' ? undefined : reviewScore);
      toast.success('Оценка сохранена');
      setReviewModal(null); setReviewComment(''); setReviewScore('');
      if (reviewLesson) openReview(reviewLesson, subPage);
      else if (showCourseSubmissions && activeCourse) loadCourseSubmissions(courseSubPage);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setSubmitting(false); }
  };

  const statusLabel = (s: string) => {
    if (s === 'ACCEPTED') return { text: 'Принята', cls: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    if (s === 'NEEDS_REVISION') return { text: 'На доработку', cls: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { text: 'Сдана', cls: 'text-blue-600 bg-blue-50 border-blue-100' };
  };

  const availableSchoolsToAdd = schools.filter(s => {
    if (activeCourseSchools.some(cs => cs.id === s.id)) return false;
    if (schoolSearchTerm && !s.name.toLowerCase().includes(schoolSearchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header + create */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <GraduationCap className="size-4 text-blue-600" />
          </div>
          <h3 className="text-slate-800 font-semibold">Управление курсами проектной деятельности</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              placeholder="Поиск курсов..."
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
            />
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
            >
              <option value="">Все школы</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-100 transition-all"
          >
            <Plus className="size-4" /> Новый курс
          </button>
        </div>
      </div>

      {/* Course list + details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: course list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Все курсы</span>
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{filteredCourses.length}</span>
            </div>
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Загрузка...</div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Курсов пока нет</div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                {filteredCourses.map(c => (
                  <div
                    key={c.id}
                    onClick={() => openCourse(c)}
                    className={`px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${activeCourse?.id === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c.lesson_count} уроков
                          {c.schools?.length > 0 && <> · {c.schools.map(s => s.name).join(', ')}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={c.is_active}
                          onClick={e => { e.stopPropagation(); handleToggle(c.id); }}
                          title={c.is_active ? 'Курс активен — нажмите, чтобы отключить' : 'Курс неактивен — нажмите, чтобы включить'}
                          className={`relative inline-flex h-9 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            c.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-7 rounded-full bg-white shadow-md ring-0 transition-transform ${
                              c.is_active ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <button type="button" onClick={e => { e.stopPropagation(); handleDeleteCourse(c.id, c.name); }} className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Удалить курс">
                          <Trash2 className="size-3.5" />
                        </button>
                        <ChevronRight className="size-4 text-slate-300" />
                      </div>
                    </div>
                    {!c.is_active && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded border border-red-100">неактивен</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2 space-y-4">
          {activeCourse ? (
            <>
              {/* Schools management */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{activeCourse.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Привязанные школы</p>
                  </div>
                </div>
                <div className="px-5 py-3">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {activeCourseSchools.length === 0 && (
                      <span className="text-xs text-slate-400">Школы не привязаны</span>
                    )}
                    {activeCourseSchools.map(s => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-xl border border-blue-100">
                        <School className="size-3" />
                        {s.name}
                        <button onClick={() => handleRemoveSchool(s.id)} className="ml-0.5 p-0.5 rounded-full hover:bg-blue-200 transition-colors">
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                      <input
                        value={schoolSearchTerm}
                        onChange={e => setSchoolSearchTerm(e.target.value)}
                        placeholder="Найти школу..."
                        className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                      />
                    </div>
                    {availableSchoolsToAdd.length > 0 && (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select
                            value={addSchoolId}
                            onChange={e => setAddSchoolId(e.target.value)}
                            className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                          >
                            <option value="">Добавить школу...</option>
                            {availableSchoolsToAdd.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        </div>
                        <button
                          onClick={handleAddSchool}
                          disabled={!addSchoolId}
                          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lessons (regular) */}
              {(() => {
                const regularLessons = lessons.filter(l => l.category !== 'HEARING');
                const hearingLessons = lessons.filter(l => l.category === 'HEARING');
                const renderLessonRow = (l: CourseLessonResponse) => {
                  const lc = lessonCriteriaMap.get(l.id) ?? [];
                  const isHearing = l.category === 'HEARING';
                  return (
                    <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${isHearing ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {l.order_number}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{l.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100">
                              {l.submission_type === 'TEXT' ? 'Текст' : l.submission_type === 'FILE' ? 'Файл' : 'Текст + Файл'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isHearing ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                              {lc.length > 0 ? lc.reduce((s, c) => s + c.max_points, 0) : l.max_score} б.
                            </span>
                            {lc.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100">
                                {lc.length} крит.
                              </span>
                            )}
                            {isHearing && l.hearing_stage && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded border border-violet-100">
                                {l.hearing_stage === 'TOPIC_APPROVAL' ? 'Выбор темы' : l.hearing_stage === 'INTERMEDIATE' ? 'Промежуточный' : 'Финальный'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openCriteriaModal(l.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Критерии оценивания"><Award className="size-3.5" /></button>
                        <button onClick={() => openReview(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Работы учеников"><FileText className="size-3.5" /></button>
                        <button onClick={() => openLessonModal(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Редактировать"><Edit2 className="size-3.5" /></button>
                        <button onClick={() => handleDeleteLesson(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Удалить" type="button"><Trash2 className="size-3.5" /></button>
                      </div>
                    </div>
                  );
                };
                return (
                  <>
                    {/* Regular lessons */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400 mt-0.5">Уроки курса</p>
                          {regularLessons.length > 0 && (
                            <p className="text-[11px] text-blue-500 font-medium mt-0.5">
                              Макс. баллов: {regularLessons.reduce((sum, l) => {
                                const lc = lessonCriteriaMap.get(l.id) ?? [];
                                return sum + (lc.length > 0 ? lc.reduce((s, c) => s + c.max_points, 0) : l.max_score);
                              }, 0)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={openCourseSubmissions} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"><FileText className="size-3.5" /> Все работы</button>
                          <button onClick={() => openLessonModal()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"><Plus className="size-3.5" /> Урок</button>
                        </div>
                      </div>
                      {lessonsLoading ? (
                        <div className="p-6 text-center text-slate-400 text-sm">Загрузка уроков...</div>
                      ) : regularLessons.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">Уроков пока нет. Добавьте первый.</div>
                      ) : (
                        <div className="divide-y divide-slate-50">{regularLessons.map(l => renderLessonRow(l))}</div>
                      )}
                    </div>

                    {/* Hearing lessons */}
                    <div className="bg-white rounded-2xl border border-violet-100 shadow-sm">
                      <div className="px-5 py-4 border-b border-violet-50 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-violet-500 mt-0.5">Слушания (проект)</p>
                          {hearingLessons.length > 0 && (
                            <p className="text-[11px] text-violet-500 font-medium mt-0.5">
                              Макс. баллов: {hearingLessons.reduce((sum, l) => {
                                const lc = lessonCriteriaMap.get(l.id) ?? [];
                                return sum + (lc.length > 0 ? lc.reduce((s, c) => s + c.max_points, 0) : l.max_score);
                              }, 0)}
                            </p>
                          )}
                        </div>
                      </div>
                      {hearingLessons.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">Этапы слушаний создаются автоматически при создании курса.</div>
                      ) : (
                        <div className="divide-y divide-violet-50">{hearingLessons.map(l => renderLessonRow(l))}</div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Course-wide submissions view */}
              {showCourseSubmissions && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Все работы по курсу</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Сводка по всем урокам</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={courseSubStatusFilter}
                          onChange={e => setCourseSubStatusFilter(e.target.value)}
                          className="appearance-none border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                        >
                          <option value="">Все статусы</option>
                          <option value="SUBMITTED">Сдана</option>
                          <option value="ACCEPTED">Принята</option>
                          <option value="NEEDS_REVISION">На доработку</option>
                        </select>
                        <Filter className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none" />
                      </div>
                      <button onClick={() => setShowCourseSubmissions(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                  </div>
                  {courseSubLoading ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Загрузка...</div>
                  ) : courseSubmissions.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Работ пока нет</div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-500 bg-slate-50">
                              <th className="px-4 py-2 text-left font-semibold">Ученик</th>
                              <th className="px-4 py-2 text-left font-semibold">Урок</th>
                              <th className="px-4 py-2 text-left font-semibold">Статус</th>
                              <th className="px-4 py-2 text-left font-semibold">Дата</th>
                              <th className="px-4 py-2 text-center font-semibold">Балл</th>
                              <th className="px-4 py-2 text-center font-semibold"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {courseSubmissions.map(sub => {
                              const s = statusLabel(sub.status);
                              return (
                                <tr key={sub.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="size-7 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                        {sub.account_nickname?.[0]?.toUpperCase() ?? '?'}
                                      </div>
                                      <span className="font-medium text-slate-800">{sub.account_nickname}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600">{sub.lesson_title}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium ${s.cls}`}>{s.text}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(sub.submitted_at).toLocaleDateString('ru')}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    {sub.score != null ? (
                                      <span className="text-sm font-semibold text-slate-700">{sub.score}/{sub.max_score ?? '?'}</span>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {sub.status !== 'ACCEPTED' && (
                                      <button
                                        onClick={() => {
                                          setReviewModal(sub);
                                          setReviewComment(sub.reviewer_comment ?? '');
                                          setReviewStatus('ACCEPTED');
                                          setReviewScore('');
                                          const scores: Record<number, number> = {};
                                          if (sub.criterion_grades?.length) {
                                            sub.criterion_grades.forEach(g => { scores[g.criterion_id] = g.points; });
                                          }
                                          setReviewCriteriaScores(scores);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                                      >
                                        <Send className="size-3" /> Проверить
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <Pagination currentPage={courseSubPage} totalPages={courseSubTotalPages} onPageChange={p => loadCourseSubmissions(p)} />
                    </>
                  )}
                </div>
              )}

              {/* Per-lesson submissions review */}
              {reviewLesson && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Работы: {reviewLesson.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Сданные практические задания</p>
                    </div>
                    <button onClick={() => setReviewLesson(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                  {subLoading ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Загрузка...</div>
                  ) : submissions.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Работ пока нет</div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-50">
                        {submissions.map(sub => {
                          const s = statusLabel(sub.status);
                          return (
                            <div key={sub.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {sub.account_nickname?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{sub.account_nickname}</p>
                                  <p className="text-xs text-slate-400">{new Date(sub.submitted_at).toLocaleDateString('ru')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium ${s.cls}`}>{s.text}</span>
                                {sub.status !== 'ACCEPTED' && (
                                  <button
                                    onClick={() => {
                                      setReviewModal(sub);
                                      setReviewComment(sub.reviewer_comment ?? '');
                                      setReviewStatus('ACCEPTED');
                                      setReviewScore('');
                                      const scores: Record<number, number> = {};
                                      if (sub.criterion_grades?.length) {
                                        sub.criterion_grades.forEach(g => { scores[g.criterion_id] = g.points; });
                                      }
                                      setReviewCriteriaScores(scores);
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                                  >
                                    <Send className="size-3" /> Проверить
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Pagination currentPage={subPage} totalPages={subTotalPages} onPageChange={p => openReview(reviewLesson, p)} />
                    </>
                  )}
                </div>
              )}

              {/* Moderators panel */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Модераторы курса</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Назначенные для проверки заданий</p>
                  </div>
                  <button
                    onClick={() => setModModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    <Plus className="size-3.5" /> Назначить
                  </button>
                </div>
                {courseMods.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">Модераторов нет</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {courseMods.map(m => (
                      <div key={m.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold border border-blue-100">
                            {m.nickname?.[0]?.toUpperCase() ?? 'M'}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{m.nickname}</span>
                        </div>
                        <button onClick={() => handleRemoveMod(m.account_id, m.course_id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 shadow-sm">
              <Layers className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Выберите курс слева для управления</p>
            </div>
          )}
        </div>
      </div>

      {/* Create course modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Создать новый курс">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Название курса</label>
            <input
              value={newCourseName}
              onChange={e => setNewCourseName(e.target.value)}
              placeholder="Введение в проектную деятельность"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Описание</label>
            <textarea
              value={newCourseDesc}
              onChange={e => setNewCourseDesc(e.target.value)}
              placeholder="Краткое описание курса..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateCourse}
              disabled={creating}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-100 disabled:opacity-60"
            >
              {creating ? 'Создание...' : 'Создать курс'}
            </button>
            <button onClick={() => setCreateOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Lesson create/edit modal */}
      <Modal
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title={editingLesson ? `Редактировать: ${editingLesson.title}` : 'Создание нового урока'}
      >
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Basic info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="size-5 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-xs font-bold">1</span>
              Основная информация
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Название урока <span className="text-red-400">*</span></label>
                <input
                  value={lessonForm.title}
                  onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Например: Введение в проектную деятельность"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">№ п/п</label>
                <input
                  type="number"
                  min={1}
                  value={lessonForm.order_number}
                  onChange={e => setLessonForm(f => ({ ...f, order_number: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 text-center"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['TEXT', 'FILE', 'TEXT_AND_FILE'] as const).map(t => {
                const labels: Record<string, string> = { TEXT: 'Текстовый ответ', FILE: 'Загрузка файла', TEXT_AND_FILE: 'Текст + файл' };
                const active = lessonForm.submission_type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLessonForm(f => ({ ...f, submission_type: t }))}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      active
                        ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="size-5 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-xs font-bold">2</span>
              Материалы урока
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Теоретический материал (лекция)</label>
              <textarea
                value={lessonForm.lecture_content}
                onChange={e => setLessonForm(f => ({ ...f, lecture_content: e.target.value }))}
                placeholder="Введите содержание лекции..."
                rows={4}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Описание практического задания <span className="text-red-400">*</span></label>
              <textarea
                value={lessonForm.practice_description}
                onChange={e => setLessonForm(f => ({ ...f, practice_description: e.target.value }))}
                placeholder="Опишите, что ученик должен сделать..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ссылка на видео (необязательно)</label>
              <input
                value={lessonForm.video_url}
                onChange={e => setLessonForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Срок сдачи работы</label>
              <input
                type="datetime-local"
                value={lessonForm.deadline_local}
                onChange={e => setLessonForm(f => ({ ...f, deadline_local: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
              />
              <p className="text-[11px] text-slate-400 mt-1">Пусто — без ограничения по времени</p>
            </div>
            {editingLesson && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Файл лекции (PDF, презентация)</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    onChange={e => setLectureFile(e.target.files?.[0] ?? null)}
                    className="flex-1 text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {lectureFile && (
                    <button
                      onClick={handleUploadLectureFile}
                      disabled={uploadingFile}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {uploadingFile ? '...' : 'Загрузить'}
                    </button>
                  )}
                </div>
                {editingLesson.lecture_file_name && (
                  <p className="text-xs text-blue-500 mt-1">Текущий файл: {editingLesson.lecture_file_name}</p>
                )}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Grading criteria */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="size-5 bg-amber-100 text-amber-600 rounded-md flex items-center justify-center text-xs font-bold">3</span>
                Критерии оценивания
              </div>
              <button
                type="button"
                onClick={() => setLessonCriteriaFormInline(prev => [...prev, { name: '', description: '', max_points: 10 }])}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-100 transition-colors"
              >
                <Plus className="size-3" /> Добавить критерий
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Критерии определяют, по каким пунктам оценивается работа ученика. Макс. балл за урок = сумма баллов по всем критериям.
            </p>
            {lessonCriteriaFormInline.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                Критерии не добавлены. Оценка будет выставляться вручную.
              </div>
            ) : (
              <div className="space-y-2">
                {lessonCriteriaFormInline.map((c, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="size-6 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-[10px] font-bold border border-amber-100 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        value={c.name}
                        onChange={e => {
                          const next = [...lessonCriteriaFormInline];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setLessonCriteriaFormInline(next);
                        }}
                        placeholder="Название критерия"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      />
                      <input
                        value={c.description}
                        onChange={e => {
                          const next = [...lessonCriteriaFormInline];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setLessonCriteriaFormInline(next);
                        }}
                        placeholder="Описание (необязательно)"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-500"
                      />
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <div className="text-center">
                        <label className="block text-[9px] text-slate-400 mb-0.5">Макс.</label>
                        <input
                          type="number"
                          min={1}
                          value={c.max_points}
                          onChange={e => {
                            const next = [...lessonCriteriaFormInline];
                            next[idx] = { ...next[idx], max_points: Number(e.target.value) };
                            setLessonCriteriaFormInline(next);
                          }}
                          className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setLessonCriteriaFormInline(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors mt-3.5"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-xs font-semibold text-blue-700">Макс. балл за урок (сумма критериев)</span>
                  <span className="text-sm font-bold text-blue-800">
                    {lessonCriteriaFormInline.reduce((s, c) => s + (c.max_points || 0), 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSaveLesson}
              disabled={savingLesson}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-100 disabled:opacity-60"
            >
              {savingLesson ? 'Сохранение...' : editingLesson ? 'Сохранить изменения' : 'Создать урок'}
            </button>
            <button onClick={() => setLessonModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Review submission modal */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title={`Проверить работу: ${reviewModal?.account_nickname}`}>
        <div className="p-6 space-y-4">
          {reviewModal?.text_content && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Текст ответа</p>
              <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700 border border-slate-100 max-h-40 overflow-y-auto whitespace-pre-wrap">{reviewModal.text_content}</div>
            </div>
          )}
          {reviewModal?.file_name && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <FileText className="size-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">{reviewModal.file_name}</span>
            </div>
          )}

          {(() => { const rc = getReviewCriteria(); return rc.length > 0 ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Оценка по критериям</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {rc.map(c => {
                    const pts = reviewCriteriaScores[c.id] ?? 0;
                    return (
                      <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">{c.order_number}. {c.name}</p>
                          {c.description && <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="range"
                            min={0}
                            max={c.max_points}
                            value={pts}
                            onChange={e => setReviewCriteriaScores(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                            className="w-20 accent-blue-600"
                          />
                          <span className={`text-sm font-bold w-12 text-center rounded-lg py-0.5 ${
                            pts === c.max_points ? 'text-emerald-700 bg-emerald-50' :
                            pts === 0 ? 'text-red-600 bg-red-50' :
                            'text-blue-700 bg-blue-50'
                          }`}>
                            {pts}/{c.max_points}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-sm font-semibold text-blue-700">Итого</span>
                  <span className="text-sm font-bold text-blue-800">
                    {Object.values(reviewCriteriaScores).reduce((s, v) => s + v, 0)}/{rc.reduce((s, c) => s + c.max_points, 0)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Оценка</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewStatus('ACCEPTED')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${reviewStatus === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >Принять</button>
                  <button
                    onClick={() => setReviewStatus('NEEDS_REVISION')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${reviewStatus === 'NEEDS_REVISION' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >На доработку</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Балл (0–{reviewModal?.max_score ?? 100})</label>
                <input
                  type="number"
                  min={0}
                  max={reviewModal?.max_score ?? 100}
                  value={reviewScore}
                  onChange={e => setReviewScore(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Введите баллы"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                />
              </div>
            </>
          ); })()}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Комментарий (необязательно)</label>
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Замечания, рекомендации..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={getReviewCriteria().length > 0 ? handleGradeWithCriteria : handleReview}
              disabled={submitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-100 disabled:opacity-60"
            >
              {submitting ? 'Сохранение...' : 'Сохранить оценку'}
            </button>
            <button onClick={() => setReviewModal(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign moderator modal */}
      <Modal open={modModalOpen} onClose={() => setModModalOpen(false)} title="Назначить модератора на курс">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Модератор <span className="text-blue-400 font-normal">({moderatorsOnly.length} доступно)</span>
            </label>
            <input
              value={modNickname}
              onChange={e => setModNickname(e.target.value)}
              placeholder="ФИО или ник модератора..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
              list="course-mods-list"
            />
            <datalist id="course-mods-list">
              {moderatorsOnly.map(u => {
                const fio = [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ');
                const label = fio ? `${fio} (@${u.nickname})` : u.nickname;
                return <option key={u.id} value={label} />;
              })}
            </datalist>
            {modId && <p className="text-[11px] text-blue-500 mt-1">✓ Найден: ID {modId}</p>}
            {modNickname && !modId && <p className="text-[11px] text-amber-500 mt-1">Не найден среди модераторов</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAssignMod}
              disabled={modAssigning || !modId}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-100 disabled:opacity-60"
            >
              {modAssigning ? 'Назначение...' : 'Назначить'}
            </button>
            <button onClick={() => setModModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Criteria management modal */}
      <Modal open={criteriaModalOpen} onClose={() => setCriteriaModalOpen(false)} title={`Критерии оценивания: ${lessons.find(l => l.id === criteriaLessonId)?.title ?? 'Урок'}`}>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-400">Задайте критерии оценивания для этого урока. Каждый критерий имеет максимальный балл.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {criteriaForm.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-400 mt-2.5">{i + 1}.</span>
                <div className="flex-1 space-y-1.5">
                  <input
                    value={c.name}
                    onChange={e => setCriteriaForm(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    placeholder="Название критерия"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <input
                    value={c.description}
                    onChange={e => setCriteriaForm(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    placeholder="Описание (необязательно)"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[10px] text-slate-400">Макс.</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={c.max_points}
                    onChange={e => setCriteriaForm(prev => prev.map((x, j) => j === i ? { ...x, max_points: Number(e.target.value) } : x))}
                    className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <button
                  onClick={() => setCriteriaForm(prev => prev.filter((_, j) => j !== i))}
                  className="mt-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCriteriaForm(prev => [...prev, { name: '', description: '', max_points: 5 }])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-100"
            >
              <Plus className="size-3.5" /> Добавить критерий
            </button>
            <span className="text-xs text-slate-400">
              Всего: {criteriaForm.reduce((s, c) => s + (c.max_points || 0), 0)} баллов
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveCriteria}
              disabled={savingCriteria}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-100 disabled:opacity-60"
            >
              {savingCriteria ? 'Сохранение...' : 'Сохранить критерии'}
            </button>
            <button onClick={() => setCriteriaModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
              Отмена
            </button>
          </div>
        </div>
      </Modal>
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
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
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-60 shadow-md shadow-blue-100"
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
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
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
