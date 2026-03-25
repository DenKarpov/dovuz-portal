import React, { useEffect, useState } from 'react';
import {
  Users, School, BookOpen, Shield, Clock, Plus, Trash2, Ban, CheckCircle, ChevronDown, Edit2
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
    { key: 'moderators', label: 'Модераторы', icon: <Shield className="size-4" /> },
    { key: 'school-moderators', label: 'Мод. школ', icon: <Shield className="size-4" /> },
    { key: 'scheduler', label: 'Планировщик', icon: <Clock className="size-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 bg-red-100 rounded-xl flex items-center justify-center">
          <Shield className="size-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-gray-900">Панель администратора</h1>
          <p className="text-xs text-gray-400">Управление системой</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'schools' && <SchoolsTab />}
      {activeTab === 'classes' && <ClassesTab />}
      {activeTab === 'subjects' && <SubjectsTab />}
      {activeTab === 'moderators' && <ModeratorsTab />}
      {activeTab === 'school-moderators' && <SchoolModeratorsTab />}
      {activeTab === 'scheduler' && <SchedulerTab />}
    </div>
  );
};

// ─── Users Tab ───────────────────────────────────────────────────────────────
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<GetAllUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
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
    rolesApi.getAll().then((r) => setRoles(r.data)).catch(() => {});
  }, []);

  const handleBan = async (id: number, active: boolean) => {
    try {
      if (active) await accountsApi.banUser(id);
      else await accountsApi.unbanUser(id);
      toast.success(active ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
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

  const roleColors: Record<string, string> = {
    Администратор: 'text-red-600',
    Модератор: 'text-indigo-600',
    Пользователь: 'text-gray-500',
  };

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-gray-900">Все пользователи</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 text-sm">
                    {u.nickname[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{u.nickname}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${roleColors[u.role] ?? 'text-gray-500'}`}>{u.role}</span>
                  {!u.active && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-lg">Заблокирован</span>
                  )}
                  <button
                    onClick={() => { setSelectedUser(u); setSelectedRoleId(''); setEditRoleOpen(true); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Изменить роль"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleBan(u.id, u.active)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      u.active
                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                    title={u.active ? 'Заблокировать' : 'Разблокировать'}
                  >
                    {u.active ? <Ban className="size-3.5" /> : <CheckCircle className="size-3.5" />}
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
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Выберите роль</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.description ?? r.name}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={handleUpdateRole} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700">Сохранить</button>
            <button onClick={() => setEditRoleOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200">Отмена</button>
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h3 className="text-gray-900 mb-4">Добавить школу</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название школы"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus className="size-4" />
            Добавить
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : schools.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Школ пока нет</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {schools.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <School className="size-5 text-indigo-400" />
                  <span className="text-sm text-gray-900">{s.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
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

  useEffect(() => { schoolsApi.getAll().then((r) => setSchools(r.data)).catch(() => {}); }, []);

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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedSchool}
            onChange={(e) => loadClasses(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1"
          >
            <option value="">Выберите школу</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название класса (напр. 10А)"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus className="size-4" />
            Добавить
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{selectedSchool ? 'Классов нет' : 'Выберите школу'}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {classes.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <span className="text-sm text-gray-900">{c.name}</span>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
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

  useEffect(() => { directionsApi.getAll().then((r) => setDirections(r.data)).catch(() => {}); }, []);

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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedDir}
            onChange={(e) => loadSubjects(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1"
          >
            <option value="">Выберите направление</option>
            {directions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название предмета"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus className="size-4" />
            Добавить
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{selectedDir ? 'Предметов нет' : 'Выберите направление'}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <span className="text-sm text-gray-900">{s.name}</span>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => loadSubjects(selectedDir, p)} />
    </div>
  );
};

// ─── Moderators Tab ───────────────────────────────────────────────────────────
const ModeratorsTab: React.FC = () => {
  const [subjectId, setSubjectId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [moderators, setModerators] = useState<SubjectModeratorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadModerators = async () => {
    if (!subjectId) return;
    setLoading(true);
    try { const r = await adminModeratorsApi.listBySubject(Number(subjectId)); setModerators(r.data); }
    catch { toast.error('Ошибка'); } finally { setLoading(false); }
  };

  const handleAssign = async () => {
    if (!accountId || !subjectId) return toast.error('Заполните все поля');
    setAssigning(true);
    try {
      await adminModeratorsApi.assign(Number(accountId), Number(subjectId));
      toast.success('Модератор назначен');
      setAccountId('');
      loadModerators();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (accId: number, subId: number) => {
    if (!window.confirm('Снять модератора?')) return;
    try { await adminModeratorsApi.remove(accId, subId); toast.success('Модератор снят'); loadModerators(); }
    catch { toast.error('Ошибка'); }
  };

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h3 className="text-gray-900 mb-4">Назначить модератора на предмет</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="number"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="ID предмета"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
          />
          <input
            type="number"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="ID аккаунта"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
          />
          <button
            onClick={handleAssign}
            disabled={assigning}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60"
          >
            Назначить
          </button>
          <button
            onClick={loadModerators}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200"
          >
            Показать
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : moderators.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Введите ID предмета и нажмите «Показать»</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {moderators.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div>
                  <p className="text-sm text-gray-900">{m.nickname}</p>
                  <p className="text-xs text-gray-400">Предмет: {m.subjectName}</p>
                </div>
                <button
                  onClick={() => handleRemove(m.accountId, m.subjectId)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
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
  const [accountId, setAccountId] = useState('');
  const [moderators, setModerators] = useState<SchoolModeratorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { schoolsApi.getAll().then((r) => setSchools(r.data)).catch(() => {}); }, []);

  const loadModerators = async (schoolId: string) => {
    setSelectedSchool(schoolId);
    if (!schoolId) { setModerators([]); return; }
    setLoading(true);
    try { const r = await adminSchoolModeratorsApi.listBySchool(Number(schoolId)); setModerators(r.data); }
    catch { toast.error('Ошибка'); } finally { setLoading(false); }
  };

  const handleAssign = async () => {
    if (!accountId || !selectedSchool) return toast.error('Заполните все поля');
    setAssigning(true);
    try {
      await adminSchoolModeratorsApi.assign(Number(accountId), Number(selectedSchool));
      toast.success('Модератор назначен на школу');
      setAccountId('');
      loadModerators(selectedSchool);
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка'); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (accId: number, schoolId: number) => {
    if (!window.confirm('Снять модератора?')) return;
    try { await adminSchoolModeratorsApi.remove(accId, schoolId); toast.success('Снято'); loadModerators(selectedSchool); }
    catch { toast.error('Ошибка'); }
  };

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h3 className="text-gray-900 mb-4">Назначить модератора на школу</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedSchool}
            onChange={(e) => loadModerators(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1"
          >
            <option value="">Выберите школу</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="number"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="ID аккаунта"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
          />
          <button
            onClick={handleAssign}
            disabled={assigning}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60"
          >
            Назначить
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : moderators.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Выберите школу</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {moderators.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div>
                  <p className="text-sm text-gray-900">{m.nickname}</p>
                  <p className="text-xs text-gray-400">Школа: {m.schoolName}</p>
                </div>
                <button
                  onClick={() => handleRemove(m.accountId, m.schoolId)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
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
const SchedulerTab: React.FC = () => {
  const [cron, setCron] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastCron, setLastCron] = useState('');

  const PRESETS = [
    { label: 'Ежедневно в 08:00', value: '0 0 8 * * ?' },
    { label: 'Каждую неделю (Пн 09:00)', value: '0 0 9 ? * MON' },
    { label: 'Каждый час', value: '0 0 * * * ?' },
    { label: 'Каждые 30 минут', value: '0 0/30 * * * ?' },
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
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="size-5 text-indigo-600" />
          <h3 className="text-gray-900">Планировщик проверки</h3>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1.5">Cron-выражение</label>
          <input
            type="text"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="0 0 8 * * ?"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">Формат: секунды минуты часы день месяц день_недели</p>
        </div>

        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-2">Быстрый выбор:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setCron(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  cron === p.value
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {lastCron && (
          <div className="mb-4 px-4 py-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs text-green-600">Текущее расписание: <code>{lastCron}</code></p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {saving ? 'Сохранение...' : 'Установить расписание'}
        </button>
      </div>
    </div>
  );
};
