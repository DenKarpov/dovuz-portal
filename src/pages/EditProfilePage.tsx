import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User } from 'lucide-react';
import { motion } from 'motion/react';
import { accountsApi } from '../app/api/accounts';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const EditProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const showSchool = user?.role === 'Пользователь';

  const [form, setForm] = useState({
    nickname: '',
    firstName: '',
    lastName: '',
    middleName: '',
    birthDate: '',
    description: '',
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
        const [accRes, schRes] = await Promise.all([
          accountsApi.getAccount(user.nickname),
          schoolsApi.getAll(),
        ]);

        const acc = accRes.data;
        const allSchools = schRes.data ?? [];
        setSchools(allSchools);

        let schoolId = '';
        let classId = '';

        if (showSchool && acc.schoolId) {
          schoolId = String(acc.schoolId);
          try {
            const clsRes = await schoolClassesApi.getBySchool(acc.schoolId);
            const cls = clsRes.data ?? [];
            setClasses(cls);
            if (acc.classId) classId = String(acc.classId);
          } catch {
            setClasses([]);
          }
        }

        setForm({
          nickname: acc.nickname ?? '',
          firstName: acc.firstName ?? '',
          lastName: acc.lastName ?? '',
          middleName: acc.middleName ?? '',
          birthDate: acc.birthDate ?? '',
          description: acc.description ?? '',
          schoolId,
          classId,
        });
      } catch {
        toast.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, navigate, showSchool]);

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
      if (form.nickname.trim()) fd.append('nickname', form.nickname.trim());
      if (form.firstName.trim()) fd.append('firstName', form.firstName.trim());
      if (form.lastName.trim()) fd.append('lastName', form.lastName.trim());
      if (form.middleName.trim()) fd.append('middleName', form.middleName.trim());
      if (form.birthDate) fd.append('birthDate', form.birthDate);
      if (form.description.trim()) fd.append('description', form.description.trim());
      if (showSchool && form.schoolId) fd.append('schoolId', form.schoolId);
      if (showSchool && form.classId) fd.append('classId', form.classId);
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
      <div className="max-w-xl mx-auto px-6 py-10 animate-pulse">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-5">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="max-w-xl mx-auto px-6 py-10"
    >
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="size-5 group-hover:-translate-x-0.5 transition-transform" />
        Назад
      </button>

      <div className="bg-card rounded-2xl border border-border p-8">
        <h1 className="text-foreground text-2xl font-bold mb-6">Редактирование профиля</h1>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-7 pb-7 border-b border-gray-100">
          <div className="size-18 rounded-2xl bg-blue-100 flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <User className="size-8 text-blue-400" />
          </div>
          <div>
            <p className="text-base text-gray-600 mb-2">Фото профиля</p>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-base text-gray-700 font-medium mb-2">Никнейм</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              placeholder="Ваш никнейм"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base text-gray-700 font-medium mb-2">Имя</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="block text-base text-gray-700 font-medium mb-2">Фамилия</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                placeholder="Иванов"
              />
            </div>
          </div>

          <div>
            <label className="block text-base text-gray-700 font-medium mb-2">Отчество</label>
            <input
              type="text"
              value={form.middleName}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              placeholder="Иванович"
            />
          </div>

          <div>
            <label className="block text-base text-gray-700 font-medium mb-2">Дата рождения</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-base text-gray-700 font-medium mb-2">О себе</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              placeholder="Расскажите о себе..."
            />
          </div>

          {showSchool && (
            <>
              <div>
                <label className="block text-base text-gray-700 font-medium mb-2">Школа</label>
                <select
                  value={form.schoolId}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value="">Не выбрано</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {classes.length > 0 && (
                <div>
                  <label className="block text-base text-gray-700 font-medium mb-2">Класс</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="">Не выбрано</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 mt-2"
          >
            {saving ? (
              <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="size-5" />
            )}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
