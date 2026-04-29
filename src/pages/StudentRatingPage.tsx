import React, { useCallback, useEffect, useState } from 'react';
import {
  Award, School, BookOpen, ChevronDown, Loader2, AlertTriangle, Users, TrendingUp,
} from 'lucide-react';
import { studentsApi, type StudentRatingResponse } from '../app/api/students';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { Pagination } from '../app/components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type TabKey = 'rating' | 'lagging';

/** null = все школы (данные по умолчанию) */
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

  const deadlineInfo = selectedSchool != null ? schools.find(s => s.id === selectedSchool)?.topic_deadline : undefined;

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

  const filteredSchoolOptions = schools.filter(s =>
    !schoolSearch.trim() || s.name.toLowerCase().includes(schoolSearch.trim().toLowerCase()),
  );

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
        {deadlineInfo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 md:col-span-3">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            Дедлайн выбора темы (школа): {new Date(deadlineInfo).toLocaleDateString('ru-RU')}
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
                    <td className="px-3 py-3 text-center">{ratingBadge(s.project_rating)}</td>
                    <td className="px-3 py-3 text-center">{ratingBadge(s.course_rating)}</td>
                    <td className="px-3 py-3 text-center">{ratingBadge(s.combined_rating)}</td>
                    <td className="px-3 py-3 text-center">
                      {s.is_lagging ? (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                          Отстающий
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          В норме
                        </span>
                      )}
                    </td>
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
    </div>
  );
};
