import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { accountsApi } from '../app/api/accounts';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';


// ──────────────────────────────────────────────
// Password validation helpers (shared with RegisterPage)
// ──────────────────────────────────────────────
interface PwdRule { label: string; test: (p: string) => boolean; }
const PWD_RULES: PwdRule[] = [
  { label: 'Минимум 8 символов',           test: (p) => p.length >= 8 },
  { label: 'Хотя бы одна заглавная буква', test: (p) => /[A-ZА-ЯЁ]/.test(p) },
  { label: 'Хотя бы одна строчная буква',  test: (p) => /[a-zа-яё]/.test(p) },
  { label: 'Хотя бы одна цифра',           test: (p) => /\d/.test(p) },
];

const STRENGTH_LABELS_EP = ['', 'Слабый', 'Средний', 'Хороший', 'Отличный'];
const STRENGTH_COLORS_EP = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
const STRENGTH_TEXT_EP   = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-emerald-600'];

function calcStrengthEP(p: string) { return PWD_RULES.filter(r => r.test(p)).length; }

function PwdStrengthBar({ password }: { password: string }) {
  const s = calcStrengthEP(password);
  if (!password) return null;
  return (
      <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-1.5 space-y-1"
      >
        <div className="flex gap-1">
          {[1,2,3,4].map(i => (
              <div key={i} className="h-1 flex-1 rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                    className={"h-full rounded-full " + (i <= s ? STRENGTH_COLORS_EP[s] : '')}
                    initial={{ width: 0 }}
                    animate={{ width: i <= s ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                />
              </div>
          ))}
        </div>
        {s > 0 && (
            <p className={`text-xs font-medium ${STRENGTH_TEXT_EP[s]}`}>
              {STRENGTH_LABELS_EP[s]}
            </p>
        )}
      </motion.div>
  );
}

function PwdRules({ password, show }: { password: string; show: boolean }) {
  if (!show) return null;
  return (
      <AnimatePresence>
        <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 space-y-1 overflow-hidden"
        >
          {PWD_RULES.map(rule => {
            const ok = rule.test(password);
            return (
                <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                  {ok
                      ? <Check className="size-3.5 text-emerald-500 shrink-0" />
                      : <X className="size-3.5 text-slate-300 shrink-0" />}
                  <span className={ok ? 'text-emerald-600' : 'text-slate-400'}>{rule.label}</span>
                </li>
            );
          })}
        </motion.ul>
      </AnimatePresence>
  );
}

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
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);
  const [pwdNewFocused, setPwdNewFocused] = useState(false);
  const allNewRulesPass = useMemo(() => PWD_RULES.every(r => r.test(pwdNew)), [pwdNew]);

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

  const handlePasswordChange = async () => {
    if (!pwdCurrent.trim()) {
      toast.error('Введите текущий пароль');
      return;
    }
    if (!allNewRulesPass) {
      toast.error('Новый пароль не соответствует требованиям безопасности');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error('Новый пароль и подтверждение не совпадают');
      return;
    }
    setPwdSaving(true);
    try {
      await accountsApi.changePassword(pwdCurrent, pwdNew);
      toast.success('Пароль изменён');
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Не удалось сменить пароль');
    } finally {
      setPwdSaving(false);
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

            <div className="pt-6 mt-6 border-t border-border space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Смена пароля</h2>
              <p className="text-sm text-muted-foreground">Доступно всем пользователям.</p>
              <div className="space-y-3">
                {/* Current password */}
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                      type={showPwdCurrent ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Текущий пароль"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-base bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setShowPwdCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPwdCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* New password + strength + rules */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                        type={showPwdNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Новый пароль"
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        onFocus={() => setPwdNewFocused(true)}
                        onBlur={() => setPwdNewFocused(false)}
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-base bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => setShowPwdNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPwdNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {pwdNew.length > 0 && <PwdStrengthBar password={pwdNew} />}
                  </AnimatePresence>
                  {/* Показываем правила пока поле в фокусе ИЛИ пока есть текст и не все правила выполнены */}
                  <PwdRules password={pwdNew} show={pwdNewFocused || (pwdNew.length > 0 && !allNewRulesPass)} />
                </div>

                {/* Confirm password */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                        type={showPwdConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Подтверждение нового пароля"
                        value={pwdConfirm}
                        onChange={(e) => setPwdConfirm(e.target.value)}
                        className={
                            "w-full border rounded-xl pl-10 pr-10 py-3 text-base bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
                            (pwdConfirm.length > 0
                                ? pwdConfirm === pwdNew
                                    ? 'border-emerald-400 focus:ring-emerald-400'
                                    : 'border-red-300 focus:ring-red-400'
                                : 'border-gray-200')
                        }
                    />
                    <button type="button" onClick={() => setShowPwdConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPwdConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {/* Индикатор совпадения под полем */}
                  {pwdConfirm.length > 0 && (
                      <p className={`text-xs mt-1 flex items-center gap-1 ${pwdConfirm === pwdNew ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pwdConfirm === pwdNew
                            ? <><Check className="size-3.5" /> Пароли совпадают</>
                            : <><X className="size-3.5" /> Пароли не совпадают</>}
                      </p>
                  )}
                </div>

                <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={pwdSaving || !pwdCurrent.trim() || !allNewRulesPass || pwdNew !== pwdConfirm}
                    className="w-full py-3 rounded-xl border border-border font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pwdSaving ? 'Сохранение…' : 'Обновить пароль'}
                </button>
              </div>
            </div>

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
              {saving ? 'Сохранение...' : 'Сохранить профиль'}
            </motion.button>
          </div>
        </div>
      </motion.div>
  );
};