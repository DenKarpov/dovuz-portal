import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, Mail, School, Edit3, Calendar, BookOpen,
  CheckCircle, Clock, Award, MapPin, GraduationCap, Layers, Presentation,
} from 'lucide-react';
import { motion } from 'motion/react';
import { accountsApi, type AccountResponse, type CourseProgressResponse } from '../app/api/accounts';
import { ThemeSettingsCard } from '../app/components/ThemeSettingsCard';
import { filesApi } from '../app/api/files';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

function getCompletionFields(account: AccountResponse, role?: string) {
  const schoolRelevant = role === 'Пользователь';
  const fields = [
    { key: 'firstName', label: 'Имя', done: !!account.firstName },
    { key: 'lastName', label: 'Фамилия', done: !!account.lastName },
    { key: 'middleName', label: 'Отчество', done: !!account.middleName },
    { key: 'birthDate', label: 'Дата рождения', done: !!account.birthDate },
    { key: 'description', label: 'О себе', done: !!account.description },
    ...(schoolRelevant
      ? [
          { key: 'school', label: 'Школа', done: !!account.schoolName },
          { key: 'class', label: 'Класс', done: !!account.className },
        ]
      : []),
    { key: 'photo', label: 'Фото профиля', done: !!account.photoNameInDirectory },
  ];
  const done = fields.filter(f => f.done).length;
  return { fields, percent: fields.length ? Math.round((done / fields.length) * 100) : 0 };
}

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Администратор: {
    label: 'Администратор',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: <Award className="size-3.5" />,
  },
  Модератор: {
    label: 'Модератор',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: <CheckCircle className="size-3.5" />,
  },
  Пользователь: {
    label: 'Ученик',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: <GraduationCap className="size-3.5" />,
  },
};

export const ProfilePage: React.FC = () => {
  const { nickname } = useParams<{ nickname: string }>();
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<CourseProgressResponse[]>([]);

  useEffect(() => {
    accountsApi
        .getAccount(nickname!)
        .then(res => setAccount(res.data))
        .catch(() => toast.error('Пользователь не найден'))
        .finally(() => setLoading(false));
    accountsApi
        .getCourseProgress(nickname!)
        .then(res => setCourseProgress(res.data))
        .catch(() => {});
  }, [nickname]);

  const isOwn = user?.nickname === nickname;

  if (loading) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="max-w-2xl w-full mx-auto px-4 py-10 animate-pulse space-y-4">
            <div className="bg-card rounded-3xl p-8 space-y-5 shadow-sm border border-border">
              <div className="flex items-center gap-6">
                <div className="size-24 rounded-2xl bg-slate-200" />
                <div className="space-y-3 flex-1">
                  <div className="h-7 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (!account) return null;

  const { fields: completionFields, percent } = getCompletionFields(account, account.role);
  const rc = roleConfig[account.role] ?? roleConfig['Пользователь'];
  const fullName = [account.lastName, account.firstName, account.middleName].filter(Boolean).join(' ');

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Main Card */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden"
          >
            {/* Top banner */}
            <div className="h-28 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20"
                   style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
              />
            </div>

            <div className="px-7 pb-7">
              {/* Avatar row */}
              <div className="flex items-end justify-between -mt-12 mb-5">
                <div className="relative">
                  <div className="size-24 rounded-2xl bg-card border-4 border-card shadow-lg overflow-hidden">
                    {account.photoNameInDirectory ? (
                        <img
                            src={filesApi.getPhotoUrl(account.photoNameInDirectory)}
                            alt={account.nickname}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">
                        {account.nickname[0].toUpperCase()}
                      </span>
                        </div>
                    )}
                  </div>
                  {account.isBanned && (
                      <div className="absolute -bottom-1 -right-1 size-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">!</span>
                      </div>
                  )}
                </div>

                {isOwn && (
                    <Link
                        to="/profile/edit"
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-600 text-sm font-medium rounded-xl hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-all"
                    >
                      <Edit3 className="size-4" />
                      Редактировать
                    </Link>
                )}
              </div>

              {/* Name & role */}
              <div className="mb-5">
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {fullName || account.nickname}
                </h1>
                {fullName && (
                    <p className="text-muted-foreground text-sm mb-2">@{account.nickname}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${rc.bg} ${rc.color}`}>
                  {rc.icon}
                  {rc.label}
                </span>
                  {account.isBanned && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 text-red-600">
                    Заблокирован
                  </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {account.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5 bg-muted/40 rounded-xl p-4 border border-border">
                    {account.description}
                  </p>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail className="size-4 text-blue-500" />
                  </div>
                  <span className="text-muted-foreground">{account.email}</span>
                </div>

                {account.birthDate && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="size-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                        <Calendar className="size-4 text-pink-500" />
                      </div>
                      <span className="text-slate-600">
                    {new Date(account.birthDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                    </div>
                )}

                {account.schoolName && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <School className="size-4 text-emerald-500" />
                      </div>
                      <span className="text-slate-600">
                    {account.schoolName}
                        {account.className && (
                            <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium">
                        {account.className}
                      </span>
                        )}
                  </span>
                    </div>
                )}
              </div>
            </div>
          </motion.div>

          {isOwn && <ThemeSettingsCard />}

          {/* Course progress section */}
          {courseProgress.length > 0 && (
              <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className="bg-card rounded-3xl shadow-sm border border-border p-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BookOpen className="size-4 text-blue-500" />
                  </div>
                  <h2 className="text-foreground font-bold text-lg">
                    {account?.role === 'Модератор' ? 'Курсы (модератор)' : 'Прогресс по курсам'}
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {courseProgress.map(cp => {
                    const progressPct = cp.total_lessons > 0
                        ? Math.round((cp.accepted_lessons / cp.total_lessons) * 100)
                        : 0;
                    return (
                        <Link
                            key={cp.course_id}
                            to={`/courses/${cp.course_id}`}
                            className="block border border-border rounded-2xl p-4 hover:border-primary/30 hover:bg-muted/30 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-foreground">{cp.course_name}</p>
                            {account?.role !== 'Модератор' && (
                                <span className="text-xs font-medium text-primary">{progressPct}%</span>
                            )}
                          </div>
                          {account?.role !== 'Модератор' && (
                              <>
                                <div className="w-full h-1.5 bg-muted rounded-full mb-2 overflow-hidden">
                                  <div
                                      className="h-full rounded-full bg-primary transition-all"
                                      style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Layers className="size-3" />
                                    {cp.submitted_lessons}/{cp.total_lessons} сдано
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="size-3" />
                                    {cp.accepted_lessons} принято
                                  </span>
                                  {cp.average_score > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Award className="size-3" />
                                        Средний балл: {cp.average_score}
                                      </span>
                                  )}
                                </div>
                                {cp.hearing_statuses.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {cp.hearing_statuses.map((hs, i) => (
                                          <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                              hs.status === 'ACCEPTED'
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                  : hs.status === 'NOT_SUBMITTED'
                                                      ? 'bg-muted text-muted-foreground border-border'
                                                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          }`}>
                                            <Presentation className="size-2.5" />
                                            {hs.stage === 'TOPIC_APPROVAL' ? 'Тема' : hs.stage === 'INTERMEDIATE' ? 'Промежуточный' : 'Финальный'}
                                          </span>
                                      ))}
                                    </div>
                                )}
                              </>
                          )}
                          {account?.role === 'Модератор' && (
                              <p className="text-xs text-muted-foreground">{cp.total_lessons} уроков в курсе</p>
                          )}
                        </Link>
                    );
                  })}
                </div>
              </motion.div>
          )}

          {/* Profile completion card — only for owner */}
          {isOwn && (
              <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-card rounded-3xl shadow-sm border border-border p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-foreground font-bold text-lg">Заполненность профиля</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">Заполните все поля для лучшей видимости</p>
                  </div>
                  {/* Circular progress */}
                  <div className="relative size-14 shrink-0">
                    <svg className="size-14 -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                      <circle
                          cx="24" cy="24" r="20" fill="none"
                          stroke={percent === 100 ? '#10b981' : percent >= 60 ? '#2563eb' : '#f59e0b'}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          style={{ transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${percent === 100 ? 'text-emerald-600' : 'text-foreground'}`}>
                    {percent}%
                  </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
                  <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      className={`h-full rounded-full ${percent === 100 ? 'bg-emerald-500' : percent >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  />
                </div>

                {/* Fields grid */}
                <div className="grid grid-cols-2 gap-2">
                  {completionFields.map((f, i) => (
                      <motion.div
                          key={f.key}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.04 }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${
                              f.done
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                  : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}
                      >
                        {f.done
                            ? <CheckCircle className="size-3.5 shrink-0" />
                            : <Clock className="size-3.5 shrink-0" />
                        }
                        <span className="font-medium">{f.label}</span>
                      </motion.div>
                  ))}
                </div>

                {percent < 100 && (
                    <Link
                        to="/profile/edit"
                        className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Edit3 className="size-4" />
                      Дозаполнить профиль
                    </Link>
                )}

                {percent === 100 && (
                    <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-200">
                      <CheckCircle className="size-4" />
                      Профиль заполнен полностью!
                    </div>
                )}
              </motion.div>
          )}
        </div>
      </div>
  );
};