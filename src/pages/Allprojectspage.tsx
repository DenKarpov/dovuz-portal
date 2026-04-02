import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, Clock, CheckCircle, XCircle, AlertCircle,
  Search, SlidersHorizontal, School, User, BookOpen,
  ChevronDown, X, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectsApi, type ProjectResponse } from '../app/api/projects';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { Pagination } from '../app/components/Pagination';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ON_REVIEW: {
    label: '⏳ На проверке',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: <Clock className="size-4" />,
  },
  NEEDS_REVISION: {
    label: '🔄 На доработку',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    icon: <AlertCircle className="size-4" />,
  },
  ACCEPTED: {
    label: '✅ Принято',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: <CheckCircle className="size-4" />,
  },
  REJECTED: {
    label: '❌ Отклонено',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: <XCircle className="size-4" />,
  },
};

const ALL_STATUSES = ['ON_REVIEW', 'NEEDS_REVISION', 'ACCEPTED', 'REJECTED'];

interface Filters {
  search: string;
  status: string;
  schoolId: string;
  sortBy: 'newest' | 'oldest' | 'title';
}

export const AllProjectsPage: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [moderatorSchoolIds, setModeratorSchoolIds] = useState<number[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    schoolId: '',
    sortBy: 'newest',
  });

  function getLastStatus(p: ProjectResponse): string | null {
    if (!p.submissions || p.submissions.length === 0) return null;
    return p.submissions[p.submissions.length - 1].status;
  }

  // ── Stats (include REJECTED) ───────────────────────────────────────────────
  const stats = {
    total: projects.length,
    onReview: projects.filter(p => getLastStatus(p) === 'ON_REVIEW').length,
    accepted: projects.filter(p => getLastStatus(p) === 'ACCEPTED').length,
    needsRevision: projects.filter(p => getLastStatus(p) === 'NEEDS_REVISION').length,
    rejected: projects.filter(p => getLastStatus(p) === 'REJECTED').length,
  };

  // ── Init schools ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        if (isAdmin) {
          const schRes = await schoolsApi.getAll();
          setSchools(schRes.data);
        } else if (user) {
          const schRes = await schoolsApi.getAll();
          const allSchools = schRes.data;
          const checks = await Promise.all(
              allSchools.map(async (s) => {
                try {
                  await projectsApi.getBySchool(s.id, 0, 1);
                  return s;
                } catch {
                  return null;
                }
              })
          );
          const allowedSchools = checks.filter(Boolean) as SchoolResponse[];
          setSchools(allowedSchools);
          setModeratorSchoolIds(allowedSchools.map(s => s.id));
        }
      } catch { /* ignore */ }
      setInitialLoaded(true);
    };
    init();
  }, [isAdmin, user]);

  // ── Fetch projects ────────────────────────────────────────────────────────
  const fetchProjects = async (p = 0) => {
    setLoading(true);
    try {
      if (filters.schoolId) {
        const res = await projectsApi.getBySchool(Number(filters.schoolId), p, 12);
        setProjects(res.data.content ?? []);
        setTotalPages(res.data.total_pages ?? 0);
        setPage(p);
      } else if (isAdmin && schools.length > 0) {
        const promises = schools.map(s => projectsApi.getBySchool(s.id, 0, 100).catch(() => null));
        const results = await Promise.all(promises);
        const all: ProjectResponse[] = [];
        for (const r of results) if (r?.data?.content) all.push(...r.data.content);
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProjects(all);
        setTotalPages(1);
        setPage(0);
      } else if (!isAdmin && moderatorSchoolIds.length > 0) {
        const promises = moderatorSchoolIds.map(sid => projectsApi.getBySchool(sid, 0, 100).catch(() => null));
        const results = await Promise.all(promises);
        const all: ProjectResponse[] = [];
        for (const r of results) if (r?.data?.content) all.push(...r.data.content);
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProjects(all);
        setTotalPages(1);
        setPage(0);
      } else {
        setProjects([]);
        setTotalPages(0);
        setPage(0);
      }
    } catch {
      toast.error('Ошибка загрузки проектов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (initialLoaded) fetchProjects(0); }, [initialLoaded]);
  useEffect(() => { if (initialLoaded) fetchProjects(0); }, [filters.schoolId]);

  const clearFilters = () => setFilters({ search: '', status: '', schoolId: '', sortBy: 'newest' });
  const hasActiveFilters = filters.search || filters.status || filters.schoolId || filters.sortBy !== 'newest';

  const displayed = projects
      .filter(p => {
        if (filters.search && !p.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.status && getLastStatus(p) !== filters.status) return false;
        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'title') return a.title.localeCompare(b.title);
        if (filters.sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

  return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex items-start justify-between mb-10 gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="size-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <FolderOpen className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 text-2xl font-bold">
                {isAdmin ? '📋 Все проекты' : '📋 Проекты школьников'}
              </h1>
              <p className="text-slate-400 text-base mt-0.5">
                {isAdmin ? 'Управление проектными работами' : 'Проекты по вашим школам'}
              </p>
            </div>
          </div>
          <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-base font-medium border transition-all ${
                  filtersOpen || hasActiveFilters
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
          >
            <SlidersHorizontal className="size-5" />
            Фильтры
            {hasActiveFilters && (
                <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">!</span>
            )}
          </button>
        </motion.div>

        {/* Stats — 5 cards including REJECTED */}
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
        >
          {[
            { label: 'Всего', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100', icon: <TrendingUp className="size-5 text-slate-400" /> },
            { label: 'На проверке', value: stats.onReview, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', icon: <Clock className="size-5 text-amber-400" /> },
            { label: 'Принято', value: stats.accepted, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <CheckCircle className="size-5 text-emerald-400" /> },
            { label: 'На доработку', value: stats.needsRevision, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100', icon: <AlertCircle className="size-5 text-orange-400" /> },
            { label: 'Отклонено', value: stats.rejected, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100', icon: <XCircle className="size-5 text-red-400" /> },
          ].map((s, i) => (
              <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  whileHover={{ y: -2 }}
                  className={`${s.bg} border ${s.border} rounded-2xl p-4 flex items-center gap-3 cursor-default`}
              >
                {s.icon}
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">{s.label}</p>
                </div>
              </motion.div>
          ))}
        </motion.div>

        {/* Filter panel */}
        <AnimatePresence>
          {filtersOpen && (
              <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden mb-8"
              >
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                          value={filters.search}
                          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                          placeholder="Поиск по названию..."
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                      />
                    </div>
                    <div className="relative">
                      <select
                          value={filters.status}
                          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                          className="w-full appearance-none pl-4 pr-9 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                      >
                        <option value="">Все статусы</option>
                        {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{statusConfig[s]?.label ?? s}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select
                          value={filters.schoolId}
                          onChange={e => setFilters(f => ({ ...f, schoolId: e.target.value }))}
                          className="w-full appearance-none pl-4 pr-9 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                      >
                        <option value="">Все школы</option>
                        {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select
                          value={filters.sortBy}
                          onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as any }))}
                          className="w-full appearance-none pl-4 pr-9 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                      >
                        <option value="newest">Сначала новые</option>
                        <option value="oldest">Сначала старые</option>
                        <option value="title">По названию</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  {hasActiveFilters && (
                      <button onClick={clearFilters}
                              className="mt-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors">
                        <X className="size-4" /> Сбросить фильтры
                      </button>
                  )}
                </div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Project list */}
        {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
        ) : displayed.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="size-[72px] bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="size-9 text-slate-300" />
              </div>
              <p className="text-slate-400 text-lg">Проектов не найдено</p>
              {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-3 text-sm text-indigo-600 hover:underline">
                    Сбросить фильтры
                  </button>
              )}
            </motion.div>
        ) : (
            <div className="space-y-4">
              {displayed.map((p, idx) => {
                const lastStatus = getLastStatus(p);
                const sc = lastStatus ? statusConfig[lastStatus] : null;
                const submissionsCount = p.submissions?.length ?? 0;
                const owner = p.members?.find(m => m.isOwner);
                const teammatesCount = p.members?.filter(m => !m.isOwner).length ?? 0;

                return (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.04 }}
                        whileHover={{ x: 3 }}
                    >
                      <Link
                          to={`/projects/${p.id}`}
                          className="group flex items-center gap-5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all p-6"
                      >
                        <div className={`shrink-0 size-12 rounded-xl flex items-center justify-center border ${
                            sc ? sc.color : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}>
                          {sc?.icon ?? <FolderOpen className="size-5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <p className="font-semibold text-slate-900 text-base group-hover:text-indigo-700 truncate transition-colors">
                              {p.title}
                            </p>
                            {sc && (
                                <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5 text-sm text-slate-400">
                        <User className="size-3.5" />
                        {owner?.nickname ?? 'Неизвестно'}
                      </span>
                            {teammatesCount > 0 && (
                                <span className="text-sm text-slate-400">+{teammatesCount} участн.</span>
                            )}
                            {p.schoolName && (
                                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                          <School className="size-3.5" />
                                  {p.schoolName}
                        </span>
                            )}
                            <span className="flex items-center gap-1.5 text-sm text-slate-400">
                        <BookOpen className="size-3.5" />
                        Этапов: {submissionsCount} / 3
                      </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                );
              })}
            </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchProjects} />
      </div>
  );
};