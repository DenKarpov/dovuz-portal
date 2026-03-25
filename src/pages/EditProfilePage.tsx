import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User } from 'lucide-react';
import { accountsApi } from '../app/api/accounts';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const EditProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    schoolId: '',
    classId: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const init = async () => {
      try {
        const accRes = await accountsApi.getAccount(user.nickname);
        const acc = accRes.data;
        setForm({
          firstName: acc.firstName ?? '',
          lastName: acc.lastName ?? '',
          phone: acc.phone ?? '',
          schoolId: acc.school?.id.toString() ?? '',
          classId: acc.schoolClass?.id.toString() ?? '',
        });
        if (acc.school?.id) {
          const clRes = await schoolClassesApi.getBySchool(acc.school.id);
          setClasses(clRes.data);
        }
        const schRes = await schoolsApi.getAll();
        setSchools(schRes.data);
      } catch {
        toast.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const handleSchoolChange = async (schoolId: string) => {
    setForm({ ...form, schoolId, classId: '' });
    if (schoolId) {
      try {
        const res = await schoolClassesApi.getBySchool(Number(schoolId));
        setClasses(res.data);
      } catch { setClasses([]); }
    } else {
      setClasses([]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('firstName', form.firstName.trim());
      fd.append('lastName', form.lastName.trim());
      fd.append('phone', form.phone.trim());
      if (form.schoolId) fd.append('schoolId', form.schoolId);
      if (form.classId) fd.append('classId', form.classId);
      if (photo) fd.append('photo', photo);
      await accountsApi.saveInfo(fd);
      toast.success('Профиль обновлён!');
      navigate(`/profile/${user!.nickname}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 animate-pulse">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Назад
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <h1 className="text-gray-900 mb-6">Редактирование профиля</h1>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="size-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <User className="size-7 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Фото профиля</p>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Имя</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Фамилия</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Иванов"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Телефон</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+7 (999) 000-00-00"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Школа</label>
            <select
              value={form.schoolId}
              onChange={(e) => handleSchoolChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Не выбрано</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {classes.length > 0 && (
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Класс</label>
              <select
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Не выбрано</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 mt-2"
          >
            {saving ? (
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};
