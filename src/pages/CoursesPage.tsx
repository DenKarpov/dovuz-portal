import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpenCheck, ArrowRight, GraduationCap, Layers, Trophy, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { coursesApi, type CourseModeratorResponse, type CourseShortResponse } from '../app/api/courses';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { CoursesTab } from './AdminPage';

export const CoursesPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseShortResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isModeratorOnly = user?.role === 'Модератор';

  useEffect(() => {
    if (isAdmin) return;
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    if (isModeratorOnly) {
      coursesApi.myAssignedCourses()
        .then(r => {
          const map = new Map<number, CourseShortResponse>();
          (r.data ?? []).forEach((a: CourseModeratorResponse) => {
            if (!map.has(a.course_id)) {
              map.set(a.course_id, {
                id: a.course_id,
                name: a.course_name,
                description: '',
                schools: [],
                is_active: true,
                lesson_count: 0,
                created_at: '',
              });
            }
          });
          setCourses(Array.from(map.values()));
        })
        .catch(() => toast.error('Ошибка загрузки курсов'))
        .finally(() => setLoading(false));
    } else {
      coursesApi.getMyCourses()
        .then(r => setCourses(r.data))
        .catch(() => toast.error('Ошибка загрузки курсов'))
        .finally(() => setLoading(false));
    }
  }, [user, navigate, isModeratorOnly, isAdmin]);

  const filtered = useMemo(() =>
    search ? courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : courses,
  [courses, search]);

  if (isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <CoursesTab />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-center gap-4 mb-8"
      >
        <div className="size-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <GraduationCap className="size-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-foreground text-2xl font-bold">
            {isModeratorOnly ? 'Мои курсы (модератор)' : 'Курсы проектной деятельности'}
          </h1>
          <p className="text-muted-foreground text-base mt-0.5">
            {isModeratorOnly ? 'Курсы, на которые вы назначены: материалы, проверка работ и редактирование уроков' : 'Обучение ведению проектов'}
          </p>
        </div>
      </motion.div>

      {courses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative mb-8"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Найти курс..."
            className="w-full border border-border rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:shadow-md"
          />
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="h-2 bg-muted" />
              <div className="p-6 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="size-12 bg-muted rounded-xl animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-muted rounded-lg animate-pulse" />
                    <div className="h-4 w-full bg-muted/60 rounded-lg animate-pulse" />
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="h-4 w-1/2 bg-muted/60 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-card rounded-3xl border border-dashed border-border"
        >
          <Layers className="size-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg mb-2">
            {isModeratorOnly ? 'Вам пока не назначены курсы для проверки' : 'Для вашей школы нет доступных курсов'}
          </p>
          <p className="text-muted-foreground/80 text-sm">
            {isModeratorOnly ? 'Администратор может назначить вас модератором курса' : 'Курсы назначаются администратором для конкретных школ'}
          </p>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14 bg-card rounded-2xl border border-border">
          <Search className="size-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Ничего не найдено по запросу «{search}»</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((course, idx) => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -4, boxShadow: '0 8px 30px -10px rgba(59, 130, 246, 0.15)' }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
              >
                <Link
                  to={`/courses/${course.id}`}
                  className="group block bg-card rounded-2xl border border-border hover:border-primary/30 transition-all overflow-hidden"
                >
                  <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/90" />
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <motion.div
                        whileHover={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.4 }}
                        className="shrink-0 size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center"
                      >
                        <BookOpenCheck className="size-5 text-primary" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-lg group-hover:text-primary truncate transition-colors">
                          {course.name}
                        </h3>
                        {course.description && (
                          <p className="text-muted-foreground line-clamp-2 mt-1.5 text-sm">{course.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {!isModeratorOnly && (
                          <>
                            <span className="flex items-center gap-1.5">
                              <Layers className="size-3.5" />
                              {course.lesson_count} {getLessonWord(course.lesson_count)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Trophy className="size-3.5" />
                              Баллы за задания
                            </span>
                          </>
                        )}
                        {isModeratorOnly && (
                          <span className="flex items-center gap-1.5 text-primary font-medium">
                            <BookOpenCheck className="size-3.5" />
                            Открыть курс — материалы и проверка
                          </span>
                        )}
                      </div>
                      <motion.div
                        className="size-8 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors"
                        whileHover={{ x: 3 }}
                      >
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

function getLessonWord(count: number): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'уроков';
  if (last > 1 && last < 5) return 'урока';
  if (last === 1) return 'урок';
  return 'уроков';
}
