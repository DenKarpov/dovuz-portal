import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Star, CheckCircle, XCircle, Clock,
  AlertCircle, Download, Users, School, History, ChevronDown,
  ChevronUp, Lock, FileText, RotateCcw, MessageSquare, Award, Calendar, User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  projectsApi,
  getStageNumber,
  type ProjectResponse,
  type ProjectStageSubmissionResponse,
  type StageReviewResponse,
} from '../app/api/projects';
import { filesApi } from '../app/api/files';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  ON_REVIEW: {
    label: 'На проверке',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <Clock className="size-4" />,
  },
  ACCEPTED: {
    label: 'Принято',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle className="size-4" />,
  },
  REJECTED: {
    label: 'Отклонено',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <XCircle className="size-4" />,
  },
  NEEDS_REVISION: {
    label: 'На доработку',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: <AlertCircle className="size-4" />,
  },
};

// ─── Stage Stepper ────────────────────────────────────────────────────────────

type StepState = 'done' | 'active' | 'locked';

function getStepState(stageNum: number, submissions: ProjectStageSubmissionResponse[]): StepState {
  const sub = submissions.find(s => getStageNumber(s.stage) === stageNum);
  if (!sub) return 'locked';
  if (sub.status === 'ACCEPTED') return 'done';
  return 'active';
}

function StageStepper({ submissions }: { submissions: ProjectStageSubmissionResponse[] }) {
  const stages = [
    { num: 1, name: 'Презентация проекта' },
    { num: 2, name: 'Техническая документация' },
    { num: 3, name: 'Финальная защита' },
  ];

  return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stages.map((stage) => {
          const sub = submissions.find(s => getStageNumber(s.stage) === stage.num);
          const state = getStepState(stage.num, submissions);
          const cfg = sub ? STATUS_CONFIG[sub.status] : null;

          return (
              <div
                  key={stage.num}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                      state === 'done' ? 'bg-emerald-50 border-emerald-200' :
                          state === 'active' ? `${cfg?.bg} ${cfg?.border} border` :
                              'bg-slate-50 border-slate-200'
                  }`}
              >
                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    state === 'done' ? 'bg-emerald-500 text-white' :
                        state === 'active' ? `${cfg?.color} ${cfg?.bg} border ${cfg?.border}` :
                            'bg-slate-200 text-slate-400'
                }`}>
                  {state === 'done' ? <CheckCircle className="size-4" /> : stage.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">Этап {stage.num}</p>
                  <p className="text-[10px] text-slate-500 truncate">{stage.name}</p>
                </div>
                {cfg && state !== 'locked' && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
                {cfg.label}
              </span>
                )}
              </div>
          );
        })}
      </div>
  );
}

// ─── File Button ──────────────────────────────────────────────────────────────

function FileButton({ file, version, isCurrent }: {
  file: NonNullable<ProjectStageSubmissionResponse['file']>;
  version?: number;
  isCurrent?: boolean;
}) {
  const handleDownload = () =>
      filesApi.downloadFile(file.fileNameInDirectory, file.initialFileName)
          .catch(() => toast.error('Файл недоступен'));

  return (
      <button
          onClick={handleDownload}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium border w-full sm:w-auto ${
              isCurrent
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
      >
        <FileText className="size-4 shrink-0" />
        <span className="truncate flex-1 text-left">{file.initialFileName}</span>
        {version !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                isCurrent ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'
            }`}>
              v{version}
            </span>
        )}
        <Download className="size-3.5 shrink-0 opacity-60" />
      </button>
  );
}

// ─── Review Card Component ────────────────────────────────────────────────────

function ReviewCard({ review }: { review: StageReviewResponse }) {
  const getGradeColor = (grade: number) => {
    if (grade >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (grade >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="size-3 text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{review.moderatorNickname}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="size-3" />
              {review.reviewedAt ? new Date(review.reviewedAt).toLocaleString('ru-RU') : 'Дата не указана'}
          </span>
          </div>
          {review.grade && (
              <div className={`px-2 py-0.5 rounded-lg text-sm font-bold ${getGradeColor(review.grade)}`}>
                {review.grade}/10
              </div>
          )}
        </div>
        {review.comment && (
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">
              {review.comment}
            </p>
        )}
        {!review.comment && (
            <p className="text-sm text-slate-400 italic">Без комментария</p>
        )}
      </div>
  );
}

// ─── Stage Card ───────────────────────────────────────────────────────────────

function StageCard({
                     submission,
                     stageNum,
                     isMember,
                     isModerator,
                     onResubmit,
                     onRevision,
                     onReview,
                   }: {
  submission: ProjectStageSubmissionResponse;
  stageNum: number;
  isMember: boolean;
  isModerator: boolean;
  onResubmit: () => void;
  onRevision: () => void;
  onReview: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const cfg = STATUS_CONFIG[submission.status] ?? STATUS_CONFIG.ON_REVIEW;
  const reviews = submission.reviews ?? [];
  const history = (submission.history ?? []).filter(h => h.versionNumber !== submission.currentVersion);

  const stageNames = [
    { num: 1, name: 'Презентация проекта' },
    { num: 2, name: 'Техническая документация' },
    { num: 3, name: 'Финальная защита' },
  ];
  const stageInfo = stageNames.find(s => s.num === stageNum);

  return (
      <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Card Header - кликабельный для сворачивания */}
        <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full px-5 py-4 flex items-center justify-between border-b ${cfg.border} ${cfg.bg} hover:opacity-80 transition-all`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`size-9 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center font-bold ${cfg.color} text-base shrink-0`}>
              {stageNum}
            </div>
            <div className="text-left min-w-0 flex-1">
              <h3 className={`font-semibold ${cfg.color} truncate`}>
                {stageInfo?.name || `Этап ${stageNum}`}
              </h3>
              <p className="text-xs text-slate-400">
                {new Date(submission.submittedAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
              {cfg.icon} {cfg.label}
            </span>
            {isExpanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
          </div>
        </button>

        {/* Контент - показываем только если развёрнуто */}
        <AnimatePresence>
          {isExpanded && (
              <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
              >
                <div className="p-5 space-y-5">
                  {/* Current file */}
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        📎 Текущий файл
                      </p>
                      {submission.currentVersion > 1 && (
                          <span className="text-[10px] text-slate-400">Версия {submission.currentVersion}</span>
                      )}
                    </div>
                    {submission.file ? (
                        <FileButton file={submission.file} version={submission.currentVersion} isCurrent />
                    ) : (
                        <div className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">
                          Файл не загружен
                        </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {(isMember || isModerator) && (submission.status === 'ON_REVIEW' || submission.status === 'NEEDS_REVISION') && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        {isMember && submission.status === 'ON_REVIEW' && (
                            <button
                                onClick={onResubmit}
                                className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <RotateCcw className="size-3.5" />
                              Заменить файл
                            </button>
                        )}

                        {isMember && submission.status === 'NEEDS_REVISION' && (
                            <button
                                onClick={onRevision}
                                className="flex items-center gap-2 text-sm bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                            >
                              <Upload className="size-3.5" />
                              Отправить доработку
                            </button>
                        )}

                        {isModerator && submission.status === 'ON_REVIEW' && (
                            <button
                                onClick={onReview}
                                className="flex items-center gap-2 text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <Star className="size-3.5" />
                              Проверить
                            </button>
                        )}
                      </div>
                  )}

                  {/* Moderator reviews */}
                  {reviews.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-3.5 text-slate-400" />
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Отзывы модераторов ({reviews.length})
                          </p>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                          {reviews.map((review) => (
                              <ReviewCard key={review.id} review={review} />
                          ))}
                        </div>
                      </div>
                  )}

                  {/* File version history */}
                  {history.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <button
                            onClick={() => setHistoryOpen(!historyOpen)}
                            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <History className="size-3.5" />
                          История версий ({history.length})
                          {historyOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>

                        <AnimatePresence>
                          {historyOpen && (
                              <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-3 space-y-2 overflow-hidden"
                              >
                                {history.map((h) => (
                                    <div key={h.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                      <div className="size-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                        <FileText className="size-4 text-slate-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        {h.file ? (
                                            <FileButton file={h.file} version={h.versionNumber} />
                                        ) : (
                                            <span className="text-xs text-slate-400">Файл удалён</span>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                              h.statusAtUpload === 'NEEDS_REVISION'
                                                  ? 'bg-orange-100 text-orange-700'
                                                  : 'bg-blue-100 text-blue-700'
                                          }`}>
                                            {h.statusAtUpload === 'NEEDS_REVISION' ? '🔄 Доработка' : '📤 Первичная загрузка'}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {new Date(h.uploadedAt).toLocaleString('ru-RU')}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                ))}
                              </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                  )}
                </div>
              </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
  );
}

// ─── Locked Stage Card ────────────────────────────────────────────────────────

function LockedStageCard({ num }: { num: number }) {
  const stageNames = [
    { num: 1, name: 'Презентация проекта', hint: 'Доступен после создания проекта' },
    { num: 2, name: 'Техническая документация', hint: 'Доступен после принятия этапа 1' },
    { num: 3, name: 'Финальная защита', hint: 'Доступен после принятия этапа 2' },
  ];
  const info = stageNames.find(s => s.num === num);

  return (
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shrink-0">
            <Lock className="size-3.5 text-slate-300" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-500 text-sm">Этап {num}: {info?.name}</p>
            <p className="text-xs text-slate-400 truncate">{info?.hint}</p>
          </div>
        </div>
      </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth();

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Submit next stage
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitFile, setSubmitFile] = useState<File | null>(null);

  // Resubmit (replace before review)
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitStageNum, setResubmitStageNum] = useState<number | null>(null);
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);

  // Revision (after NEEDS_REVISION)
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionStageNum, setRevisionStageNum] = useState<number | null>(null);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);

  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmissionId, setReviewSubmissionId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({ comment: '', grade: '5', newStatus: 'ACCEPTED' });

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await projectsApi.getById(Number(id));
      const projectData = res.data;
      await Promise.all(
          projectData.submissions.map(async (s) => {
            try {
              const r = await projectsApi.getReviews(s.id);
              s.reviews = r.data;
            } catch {
              s.reviews = [];
            }
          })
      );
      setProject({ ...projectData });
    } catch {
      toast.error('Проект не найден');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const isOwner = project?.members?.find(m => m.isOwner)?.nickname === user?.nickname;
  const isMember = !!project?.members?.some(m => m.nickname === user?.nickname);

  const getNextStageNumber = (): number | null => {
    if (!project?.submissions?.length) return 1;
    const sorted = [...project.submissions].sort(
        (a, b) => getStageNumber(b.stage) - getStageNumber(a.stage)
    );
    const last = sorted[0];
    if (last.status === 'ACCEPTED' && getStageNumber(last.stage) < 3) {
      return getStageNumber(last.stage) + 1;
    }
    return null;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmitStage = async () => {
    const nextStage = getNextStageNumber();
    if (!submitFile || !nextStage) {
      toast.error('Прикрепите файл');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', submitFile);
      fd.append('stageNumber', String(nextStage));  // ← stageNumber, не stage_number

      await projectsApi.submitStage(Number(id), fd);
      toast.success('Этап успешно подан!');
      setSubmitOpen(false);
      setSubmitFile(null);
      fetchProject();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка при отправке');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!resubmitStageNum || !resubmitFile) return toast.error('Выберите файл');
    setSubmitting(true);
    try {
      await projectsApi.resubmitStage(Number(id), resubmitStageNum, resubmitFile);
      toast.success('Файл заменён');
      setResubmitOpen(false);
      setResubmitFile(null);
      fetchProject();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка замены файла');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionStageNum || !revisionFile) return toast.error('Выберите файл');
    setSubmitting(true);
    try {
      await projectsApi.submitRevision(Number(id), revisionStageNum, revisionFile);
      toast.success('Доработка отправлена на проверку');
      setRevisionOpen(false);
      setRevisionFile(null);
      fetchProject();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка отправки доработки');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewSubmissionId || !reviewForm.grade) return toast.error('Укажите оценку');
    setSubmitting(true);
    try {
      await projectsApi.reviewSubmission({
        submissionId: reviewSubmissionId,
        comment: reviewForm.comment,
        grade: Number(reviewForm.grade),
        newStatus: reviewForm.newStatus,
      });
      toast.success('Отзыв сохранён');
      setReviewOpen(false);
      setReviewForm({ comment: '', grade: '5', newStatus: 'ACCEPTED' });
      fetchProject();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка сохранения отзыва');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
    );
  }
  if (!project) return null;

  const nextStage = getNextStageNumber();
  const sortedSubmissions = [...project.submissions].sort(
      (a, b) => getStageNumber(a.stage) - getStageNumber(b.stage)
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Назад
        </button>

        {/* Project Header - ИСПРАВЛЕН: описание не выходит за пределы */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2 break-words">{project.title}</h1>

          {/* Описание с ограничением высоты и переносом слов */}
          {project.description && (
              <div className="mb-4">
                <p className="text-slate-500 text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
            {project.schoolName && (
                <span className="flex items-center gap-1.5">
                  <School className="size-4 text-slate-400" />
                  <span className="truncate">{project.schoolName}</span>
                </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="size-4 text-slate-400" />
              {project.members?.length} участник(а)
            </span>
          </div>

          {/* Team members */}
          <div className="flex flex-wrap gap-2 mb-4">
            {project.members?.map(m => (
                <span
                    key={m.accountId}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        m.isOwner
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                >
                  {m.nickname}{m.isOwner && ' ★'}
                </span>
            ))}
          </div>

          {/* Submit next stage button */}
          {isOwner && nextStage && (
              <div className="pt-3 border-t border-slate-100">
                <button
                    onClick={() => setSubmitOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                >
                  <Upload className="size-4" />
                  Подать этап {nextStage}
                </button>
              </div>
          )}
        </div>

        {/* Stage Progress Stepper */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">📊 Прогресс проекта</h2>
          <StageStepper submissions={project.submissions} />
        </div>

        {/* Stage Cards */}
        <h2 className="text-base font-semibold text-slate-800 mb-3">📋 Этапы работы</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((num) => {
            const sub = sortedSubmissions.find(s => getStageNumber(s.stage) === num);
            if (!sub) return <LockedStageCard key={num} num={num} />;
            return (
                <StageCard
                    key={num}
                    submission={sub}
                    stageNum={num}
                    isMember={isMember}
                    isModerator={!!isModerator}
                    onResubmit={() => { setResubmitStageNum(num); setResubmitOpen(true); }}
                    onRevision={() => { setRevisionStageNum(num); setRevisionOpen(true); }}
                    onReview={() => { setReviewSubmissionId(sub.id); setReviewOpen(true); }}
                />
            );
          })}
        </div>

        {/* ── Modals (остаются без изменений, но с улучшенным стилем) ── */}

        {/* Submit next stage */}
        <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title={`📤 Подача этапа ${nextStage}`}>
          <div className="p-5 space-y-4">
            <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
              <p className="font-semibold mb-1">Этап {nextStage} из 3</p>
              <p className="text-indigo-600">Загрузите файл в формате PDF, PPT или PPTX</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Файл</label>
              <input
                  type="file"
                  accept=".pdf,.ppt,.pptx"
                  onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSubmitOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm">
                Отмена
              </button>
              <button onClick={handleSubmitStage} disabled={submitting || !submitFile} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold transition-colors">
                {submitting ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Resubmit modal */}
        <Modal open={resubmitOpen} onClose={() => { setResubmitOpen(false); setResubmitFile(null); }} title="🔄 Замена файла">
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
              <p>⚠️ Предыдущий файл будет удалён. История версий не сохраняется.</p>
            </div>
            <input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setResubmitFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setResubmitOpen(false)} className="flex-1 py-2 bg-slate-100 rounded-lg">Отмена</button>
              <button onClick={handleResubmit} disabled={submitting || !resubmitFile} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Заменить</button>
            </div>
          </div>
        </Modal>

        {/* Revision modal */}
        <Modal open={revisionOpen} onClose={() => { setRevisionOpen(false); setRevisionFile(null); }} title="✏️ Доработка">
          <div className="p-5 space-y-4">
            <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-700">
              <p>Предыдущая версия сохранится в истории. Работа снова уйдёт на проверку.</p>
            </div>
            <input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setRevisionFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setRevisionOpen(false)} className="flex-1 py-2 bg-slate-100 rounded-lg">Отмена</button>
              <button onClick={handleRevision} disabled={submitting || !revisionFile} className="flex-1 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50">Отправить</button>
            </div>
          </div>
        </Modal>

        {/* Review modal */}
        <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="⭐ Проверка работы">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Оценка (1–10)</label>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="10" value={reviewForm.grade} onChange={(e) => setReviewForm({ ...reviewForm, grade: e.target.value })} className="flex-1 h-1.5 rounded-full accent-indigo-600" />
                <span className="w-10 text-center font-bold text-indigo-600">{reviewForm.grade}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Решение</label>
              <select value={reviewForm.newStatus} onChange={(e) => setReviewForm({ ...reviewForm, newStatus: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="ACCEPTED">✅ Принять</option>
                <option value="NEEDS_REVISION">🔄 На доработку</option>
                <option value="REJECTED">❌ Отклонить</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Комментарий</label>
              <textarea rows={3} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Замечания и рекомендации..." />
            </div>
            <button onClick={handleReviewSubmit} disabled={submitting} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Сохранение...' : 'Сохранить отзыв'}
            </button>
          </div>
        </Modal>
      </div>
  );
};