import React, { useEffect, useMemo, useState } from 'react';
import { Download, Search, RefreshCw, GraduationCap, Award, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { coursesApi, type CourseShortResponse, type GradingCriterionResponse, type HearingSubmissionResponse } from '../app/api/courses';
import { courseGroupsApi, type CourseGroupResponse } from '../app/api/courseGroups';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RowData {
  group_id: number;
  group_title: string;
  members: string;          // "Фамилия Имя" through comma
  school: string;
  submission_id: number | null;
  grades: Record<number, number | null>; // criterion_id → points
  total: number | null;
}

// ── Helper: export to xlsx ────────────────────────────────────────────────────

function exportXlsx(
  rows: RowData[],
  criteria: GradingCriterionResponse[],
  courseName: string,
) {
  const headers = [
    'Тема / Группа',
    'Участники (ФИО)',
    'Школа',
    ...criteria.map((c, i) => `${i + 1}. ${c.name} (0–${c.max_points})`),
    'Итого',
  ];

  const data = rows.map(r => [
    r.group_title,
    r.members,
    r.school,
    ...criteria.map(c => r.grades[c.id] ?? ''),
    r.total ?? '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Column widths
  ws['!cols'] = [
    { wch: 40 },
    { wch: 36 },
    { wch: 22 },
    ...criteria.map(() => ({ wch: 14 })),
    { wch: 10 },
  ];

  // Style header row bold (basic)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { wrapText: true } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Защита проекта');
  XLSX.writeFile(wb, `Итоги_защиты_${courseName.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, '_')}.xlsx`);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ConferenceDefenseExportPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseShortResponse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState<GradingCriterionResponse[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    coursesApi.adminGetAll(0, 200)
      .then(r => setCourses((r.data.content ?? []).filter((c: CourseShortResponse) => !c.for_lagging_students)))
      .catch(() => toast.error('Ошибка загрузки курсов'));
  }, [isAdmin, navigate]);

  const conferenceLesson = useMemo(() => {
    if (!selectedCourseId) return null;
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return null;
    return (course as any).lessons?.find((l: any) => l.hearing_stage === 'OPEN_CONFERENCE') ?? null;
  }, [courses, selectedCourseId]);

  const loadData = async () => {
    if (!selectedCourseId) return toast.error('Выберите курс');
    setLoading(true);
    try {
      // 1. Get full course with lessons
      const courseRes = await coursesApi.getCourse(Number(selectedCourseId));
      const course = courseRes.data;
      const confLesson = course.lessons?.find((l: any) => l.hearing_stage === 'OPEN_CONFERENCE');
      if (!confLesson) {
        toast.error('Урок «Защита проекта» не найден в этом курсе');
        setLoading(false);
        return;
      }

      // 2. Get criteria for the lesson
      const criteriaRes = await coursesApi.getLessonCriteria(confLesson.id);
      const loadedCriteria: GradingCriterionResponse[] = criteriaRes.data ?? [];
      setCriteria(loadedCriteria);

      // 3. Get all groups for the course
      const groupsRes = await courseGroupsApi.getGroups(Number(selectedCourseId));
      const groups: CourseGroupResponse[] = groupsRes.data ?? [];

      // 4. Get all hearing submissions for this lesson
      const subsRes = await coursesApi.getHearingSubmissions(confLesson.id);
      const submissions: HearingSubmissionResponse[] = subsRes.data ?? [];

      // Build submission map: group_id → submission
      const subByGroup = new Map<number, HearingSubmissionResponse>();
      submissions.forEach(s => subByGroup.set(s.group_id, s));

      // 5. For each group that has a submission, get grades per criterion
      const gradesBySubmission = new Map<number, Record<number, number | null>>();
      await Promise.all(
        submissions.map(async sub => {
          try {
            const gradesRes = await coursesApi.getSubmissionGrades(sub.id);
            const gradesMap: Record<number, number | null> = {};
            (gradesRes.data ?? []).forEach((g: any) => {
              gradesMap[g.criterion_id] = g.points;
            });
            gradesBySubmission.set(sub.id, gradesMap);
          } catch {
            gradesBySubmission.set(sub.id, {});
          }
        })
      );

      // 6. Build rows
      const newRows: RowData[] = groups.map(g => {
        const sub = subByGroup.get(g.id);
        const grades = sub ? (gradesBySubmission.get(sub.id) ?? {}) : {};
        const members = g.members
          .map(m => [m.last_name, m.first_name].filter(Boolean).join(' ') || m.nickname)
          .join(', ');
        const total = sub && Object.keys(grades).length > 0
          ? Object.values(grades).reduce<number>((acc, v) => acc + (v ?? 0), 0)
          : null;

        return {
          group_id: g.id,
          group_title: g.title,
          members,
          school: g.school_name ?? '—',
          submission_id: sub?.id ?? null,
          grades,
          total,
        };
      });

      // Sort: submitted first, by total desc
      newRows.sort((a, b) => {
        if (a.submission_id && !b.submission_id) return -1;
        if (!a.submission_id && b.submission_id) return 1;
        return (b.total ?? -1) - (a.total ?? -1);
      });

      setRows(newRows);
      toast.success(`Загружено ${newRows.length} групп`);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.group_title.toLowerCase().includes(q) ||
      r.members.toLowerCase().includes(q) ||
      r.school.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const maxTotal = criteria.reduce((s, c) => s + c.max_points, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Award className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 text-xl font-bold leading-none">Итоги защиты проектов</h1>
              <p className="text-slate-500 text-sm mt-0.5">Экспорт таблицы оценок по критериям</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex flex-wrap gap-3 items-end">
            {/* Course select */}
            <div className="flex-1 min-w-[260px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Курс</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <select
                  value={selectedCourseId}
                  onChange={e => { setSelectedCourseId(e.target.value ? Number(e.target.value) : ''); setRows([]); setCriteria([]); }}
                  className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none"
                >
                  <option value="">— Выберите курс —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Load button */}
            <button
              onClick={loadData}
              disabled={loading || !selectedCourseId}
              className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-blue-100 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                : <RefreshCw className="size-4" />
              }
              Загрузить
            </button>

            {/* Export button */}
            {rows.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => exportXlsx(filtered, criteria, selectedCourse?.name ?? 'курс')}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-100 transition-colors"
              >
                <FileSpreadsheet className="size-4" />
                Скачать XLSX ({filtered.length})
              </motion.button>
            )}

            {/* Search */}
            {rows.length > 0 && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск по теме, ФИО, школе..."
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Criteria summary */}
        <AnimatePresence>
          {criteria.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-700">Критерии оценивания</h2>
                <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100">
                  Максимум: {maxTotal} баллов
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {criteria.map((c, i) => (
                  <div key={c.id} className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Критерий {i + 1}</p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5 leading-tight line-clamp-2">{c.name}</p>
                    <p className="text-xs text-blue-600 font-bold mt-1">0–{c.max_points} б.</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <AnimatePresence>
          {filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 min-w-[200px] sticky left-0 bg-slate-50 z-10">
                        Тема / Группа
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 min-w-[180px]">Участники</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 min-w-[130px]">Школа</th>
                      {criteria.map((c, i) => (
                        <th key={c.id} className="text-center text-xs font-semibold text-slate-500 px-2 py-3 min-w-[64px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-blue-600 font-bold">К{i + 1}</span>
                            <span className="text-slate-400 font-normal">{c.max_points}б</span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center text-xs font-bold text-slate-700 px-3 py-3 min-w-[70px] bg-blue-50 border-l border-blue-100">
                        Итого
                        <div className="text-slate-400 font-normal">{maxTotal}б</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, idx) => {
                      const pct = row.total != null && maxTotal > 0 ? (row.total / maxTotal) * 100 : null;
                      return (
                        <motion.tr
                          key={row.group_id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${!row.submission_id ? 'opacity-60' : ''}`}
                        >
                          <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50/60 z-10">
                            <div className="font-semibold text-slate-800 text-sm leading-tight">{row.group_title}</div>
                            {!row.submission_id && (
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block">
                                Не сдано
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{row.members}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{row.school}</td>
                          {criteria.map(c => {
                            const pts = row.grades[c.id];
                            const filled = pts != null;
                            return (
                              <td key={c.id} className="px-2 py-3 text-center">
                                {filled ? (
                                  <span className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-sm font-bold
                                    ${pts === c.max_points ? 'bg-emerald-100 text-emerald-700' :
                                      pts === 0 ? 'bg-red-50 text-red-500' :
                                      'bg-blue-50 text-blue-700'}`}>
                                    {pts}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center bg-blue-50/40 border-l border-blue-100">
                            {row.total != null ? (
                              <div className="flex flex-col items-center">
                                <span className="text-base font-bold text-slate-800">{row.total}</span>
                                {pct != null && (
                                  <div className="w-12 h-1 bg-slate-200 rounded-full mt-1">
                                    <div
                                      className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer stats */}
              <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Всего групп: <b className="text-slate-700">{filtered.length}</b></span>
                <span>Сдали работу: <b className="text-slate-700">{filtered.filter(r => r.submission_id).length}</b></span>
                {filtered.some(r => r.total != null) && (
                  <span>
                    Средний балл:{' '}
                    <b className="text-slate-700">
                      {(
                        filtered
                          .filter(r => r.total != null)
                          .reduce((s, r) => s + (r.total ?? 0), 0) /
                        filtered.filter(r => r.total != null).length
                      ).toFixed(1)}
                    </b>
                    {' '}/ {maxTotal}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && rows.length === 0 && selectedCourseId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <FileSpreadsheet className="size-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-semibold">Нет данных</p>
            <p className="text-slate-400 text-sm mt-1">Нажмите «Загрузить» для получения данных курса</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};