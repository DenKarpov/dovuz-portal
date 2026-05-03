import React, { useCallback, useEffect, useState } from 'react';
import {
  Award, School, BookOpen, ChevronDown, Loader2, AlertTriangle, Users, TrendingUp,
  ArrowRightLeft, X,
} from 'lucide-react';
import { filesApi } from '../app/api/files';
import { studentsApi, type RatingWorkSnippet, type StudentRatingResponse } from '../app/api/students';
import { coursesApi, type CourseShortResponse } from '../app/api/courses';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { Pagination } from '../app/components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type TabKey = 'rating' | 'lagging';

export const StudentRatingPage: React.FC = () => {
  const { isModerator } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('rating');
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');

  const [students, setStudents] = useState<StudentRatingResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Transfer modal state
  const [transferStudent, setTransferStudent] = useState<StudentRatingResponse | null>(null);
  const [courses, setCourses] = useState<CourseShortResponse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [transferring, setTransferring] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [workModal, setWorkModal] = useState<{ title: string; snippet: RatingWorkSnippet } | null>(null);

  useEffect(() => {
    if (!isModerator) { toast.error('Недостаточно прав'); navigate('/'); return; }
    schoolsApi.getAll().then(r => setSchools(r.data)).catch(() => {});
  }, [isModerator, navigate]);

  useEffect(() => {
    if (selectedSchool != null) {
      schoolClassesApi.getBySchool(selectedSchool).then(r => setClasses(r.data)).catch(() => {});
      setSelectedClass('');
    } else {
      setClasses([]);
      setSelectedClass('');
    }
  }, [selectedSchool]);

  const fetchData = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const schoolParam = selectedSchool === null ? undefined : selectedSchool;
      const res = tab === 'lagging'
          ? await studentsApi.getLagging(schoolParam, p, 20)
          : await studentsApi.getRatings(schoolParam, p, 20, selectedClass ? Number(selectedClass) : undefined);
      setStudents(res.data.content);
      setTotalPages(res.data.total_pages);
      setPage(p);
    } catch { toast.error('Ошибка загрузки'); } finally { setLoading(false); }
  }, [selectedSchool, selectedClass, tab]);

  useEffect(() => { fetchData(0); }, [fetchData]);

  const studentName = (s: StudentRatingResponse) => {
    const parts = [s.last_name, s.first_name, s.middle_name].filter(Boolean);
    return parts.length ? parts.join(' ') : s.nickname;
  };

  const ratingBadge = (val?: number) => {
    if (val == null) return <span className="text-muted-foreground">—</span>;
    const color = val >= 7 ? 'text-emerald-600 bg-emerald-50' :
        val >= 4 ? 'text-amber-600 bg-amber-50' :
            'text-red-600 bg-red-50';
    return <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${color}`}>{val.toFixed(1)}</span>;
  };

  const ratingBadgeInteractive = (
      val: number | undefined,
      snippet: RatingWorkSnippet | null | undefined,
      modalTitle: string,
  ) => {
    if (val == null) return <span className="text-muted-foreground">—</span>;
    const badge = ratingBadge(val);
    if (!snippet) return badge;
    return (
      <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setWorkModal({ title: modalTitle, snippet });
          }}
          className="inline-flex rounded-lg hover:ring-2 hover:ring-primary/25 transition-[box-shadow]"
          title="Показать работу"
      >
        {badge}
      </button>
    );
  };

  const filteredSchoolOptions = schools.filter(s =>
      !schoolSearch.trim() || s.name.toLowerCase().includes(schoolSearch.trim().toLowerCase()),
  );

  // Open transfer modal: load courses
  const openTransferModal = async (s: StudentRatingResponse) => {
    setTransferStudent(s);
    setSelectedCourseId('');
    setCoursesLoading(true);
    try {
      const res = await coursesApi.adminGetAll(0, 200);
      const all = res.data.content ?? [];
      const marked = all.filter(c => c.for_lagging_students);
      setCourses(marked.length > 0 ? marked : all);
    } catch {
      toast.error('Не удалось загрузить список курсов');
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferStudent || !selectedCourseId) return;
    setTransferring(true);
    try {
      await studentsApi.transferToLaggingCourse(transferStudent.account_id, Number(selectedCourseId));
      toast.success(`${studentName(transferStudent)} перенесён в курс для отстающих`);
      setTransferStudent(null);
      fetchData(page);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Ошибка переноса';
      toast.error(msg);
    } finally {
      setTransferring(false);
    }
  };

  return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Award className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Рейтинг и отстающие</h1>
            <p className="text-sm text-muted-foreground">Комбинированный рейтинг учеников и контроль дедлайнов</p>
          </div>
        </div>

        <div className="flex gap-1 bg-muted p-1 rounded-xl mb-5 w-fit">
          <button
              type="button"
              onClick={() => setTab('rating')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  tab === 'rating' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <TrendingUp className="size-4" /> Рейтинг
          </button>
          <button
              type="button"
              onClick={() => setTab('lagging')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  tab === 'lagging' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <AlertTriangle className="size-4" /> Отстающие
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="relative md:col-span-1">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <select
                value={selectedSchool === null ? '' : selectedSchool}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '') setSelectedSchool(null);
                  else setSelectedSchool(Number(v));
                }}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Все школы</option>
              {filteredSchoolOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative md:col-span-1">
            <input
                type="search"
                value={schoolSearch}
                onChange={e => setSchoolSearch(e.target.value)}
                placeholder="Поиск школы в списке..."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {tab === 'rating' && (
              <div className="relative md:col-span-1">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    disabled={selectedSchool === null}
                    title={selectedSchool === null ? 'Выберите одну школу, чтобы фильтровать по классу' : undefined}
                >
                  <option value="">Все классы</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" /><span className="text-sm">Загрузка...</span>
              </div>
          ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{tab === 'lagging' ? 'Нет отстающих учеников' : 'Нет данных'}</p>
              </div>
          ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ученик</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">Школа</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">Класс</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Проекты</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Курсы</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Общий</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Статус</th>
                    {tab === 'lagging' && (
                        <th className="px-3 py-3 text-center font-medium text-muted-foreground">Действия</th>
                    )}
                  </tr>
                  </thead>
                  <tbody>
                  {students.map(s => (
                      <tr key={s.account_id} onClick={() => navigate(`/profile/${s.nickname}`)} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{studentName(s)}</p>
                          <p className="text-xs text-muted-foreground">@{s.nickname}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{s.school_name ?? '—'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{s.class_name ?? '—'}</td>
                        <td className="px-3 py-3 text-center">{ratingBadgeInteractive(s.project_rating, s.project_rating_work, 'Работа по проекту (слушания)')}</td>
                        <td className="px-3 py-3 text-center">{ratingBadgeInteractive(s.course_rating, s.course_rating_work, 'Работа по курсу (уроки)')}</td>
                        <td className="px-3 py-3 text-center">{ratingBadge(s.combined_rating)}</td>
                        <td className="px-3 py-3 text-center">
                          {s.is_lagging ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                  Отстающий
                                </span>
                                <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await studentsApi.unmarkLagging(s.account_id);
                                        toast.success('Флаг отстающего снят');
                                        fetchData(page);
                                      } catch { toast.error('Ошибка'); }
                                    }}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 border border-border transition-colors"
                                    title="Снять отметку отстающего"
                                >
                                  ✕
                                </button>
                              </div>
                          ) : (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                В норме
                              </span>
                          )}
                        </td>
                        {tab === 'lagging' && (
                            <td className="px-3 py-3 text-center">
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTransferModal(s);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/15 transition-colors border border-primary/20"
                                  title="Перевести в курс для отстающих"
                              >
                                <ArrowRightLeft className="size-3" />
                                Перевести
                              </button>
                            </td>
                        )}
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          )}

          {totalPages > 1 && (
              <div className="p-3 border-t border-border">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchData} />
              </div>
          )}
        </div>

        {/* Transfer modal */}
        {workModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setWorkModal(null)}>
              <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg p-6 mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{workModal.title}</h3>
                  <button type="button" onClick={() => setWorkModal(null)} className="p-1 rounded-lg hover:bg-muted transition">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Курс:</span> {workModal.snippet.course_name}</p>
                  <p><span className="text-muted-foreground">Урок / этап:</span> {workModal.snippet.lesson_title}</p>
                  {workModal.snippet.group_title ? (
                      <p><span className="text-muted-foreground">Группа:</span> {workModal.snippet.group_title}</p>
                  ) : null}
                  {workModal.snippet.kind === 'LESSON' && workModal.snippet.score != null && (
                      <p><span className="text-muted-foreground">Баллы:</span> {workModal.snippet.score}</p>
                  )}
                  {workModal.snippet.kind === 'HEARING' && workModal.snippet.representative_grade != null && (
                      <p><span className="text-muted-foreground">Оценка:</span> {workModal.snippet.representative_grade}</p>
                  )}
                  {workModal.snippet.status && (
                      <p><span className="text-muted-foreground">Статус:</span> {workModal.snippet.status}</p>
                  )}
                  {workModal.snippet.text_content?.trim() ? (
                      <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 whitespace-pre-wrap text-foreground">
                        {workModal.snippet.text_content}
                      </div>
                  ) : null}
                  {workModal.snippet.file_name_in_directory && workModal.snippet.file_name ? (
                      <button
                          type="button"
                          onClick={() => filesApi.downloadFile(workModal.snippet.file_name_in_directory!, workModal.snippet.file_name!)}
                          className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                      >
                        Скачать файл
                      </button>
                  ) : null}
                  {!workModal.snippet.text_content?.trim() && !workModal.snippet.file_name_in_directory && (
                      <p className="text-muted-foreground text-xs mt-2">Только статус / оценка (файл или текст не прикреплены).</p>
                  )}
                </div>
              </div>
            </div>
        )}

        {transferStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTransferStudent(null)}>
              <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Перевести в курс для отстающих</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {studentName(transferStudent)} ({transferStudent.school_name ?? '—'}, {transferStudent.class_name ?? '—'})
                    </p>
                  </div>
                  <button onClick={() => setTransferStudent(null)} className="p-1 rounded-lg hover:bg-muted transition">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Целевой курс</label>
                  {coursesLoading ? (
                      <div className="flex items-center gap-2 py-3 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">Загрузка курсов...</span>
                      </div>
                  ) : (
                      <select
                          value={selectedCourseId}
                          onChange={e => setSelectedCourseId(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Выберите курс...</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}{c.schools?.length ? ` (${c.schools.map(s => s.name).join(', ')})` : ''}
                            </option>
                        ))}
                      </select>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4">
                  <p className="text-xs text-amber-800">
                    Ученик будет удалён из текущих групп и перенесён в выбранный курс.
                    Для него автоматически создастся индивидуальная группа, а флаг отстающего будет снят.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                      onClick={() => setTransferStudent(null)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition"
                  >
                    Отмена
                  </button>
                  <button
                      onClick={handleTransfer}
                      disabled={!selectedCourseId || transferring}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 transition disabled:opacity-40"
                  >
                    <ArrowRightLeft className="size-3.5" />
                    {transferring ? 'Перевод...' : 'Перевести'}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};