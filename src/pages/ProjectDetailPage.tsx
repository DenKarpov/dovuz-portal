import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Star, CheckCircle, XCircle, Clock, AlertCircle, Download
} from 'lucide-react';
import { projectsApi, type ProjectResponse, type StageReviewResponse, type StageSubmission } from '../app/api/projects';
import { filesApi } from '../app/api/files';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Ожидает проверки', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: <Clock className="size-4" /> },
  ACCEPTED: { label: 'Принято', color: 'text-green-700 bg-green-50 border-green-200', icon: <CheckCircle className="size-4" /> },
  REJECTED: { label: 'Отклонено', color: 'text-red-700 bg-red-50 border-red-200', icon: <XCircle className="size-4" /> },
  REVISION: { label: 'На доработку', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: <AlertCircle className="size-4" /> },
};

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth();

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitStageNum, setResubmitStageNum] = useState<number | null>(null);
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmissionId, setReviewSubmissionId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({ comment: '', grade: '', newStatus: 'ACCEPTED' });
  const [reviews, setReviews] = useState<Record<number, StageReviewResponse[]>>({});

  const fetchProject = async () => {
    try {
      const res = await projectsApi.getById(Number(id));
      setProject(res.data);
    } catch {
      toast.error('Проект не найден');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (submissionId: number) => {
    try {
      const res = await projectsApi.getReviews(submissionId);
      setReviews((prev) => ({ ...prev, [submissionId]: res.data }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (project?.stages) {
      project.stages.forEach((s) => fetchReviews(s.id));
    }
  }, [project]);

  const isOwner = project?.owner?.nickname === user?.nickname;
  const isTeamMember = isOwner || project?.teammates?.some((t) => t.nickname === user?.nickname);

  const getNextStageNumber = () => {
    if (!project?.stages || project.stages.length === 0) return null;
    const last = project.stages[project.stages.length - 1];
    if (last.status === 'ACCEPTED') return last.stageNumber + 1;
    return null;
  };

  const handleSubmitStage = async () => {
    const nextStage = getNextStageNumber();
    if (!submitFile) return toast.error('Прикрепите файл');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', submitFile);
      fd.append('stageNumber', String(nextStage ?? 1));
      await projectsApi.submitStage(Number(id), fd);
      toast.success('Этап подан!');
      setSubmitOpen(false);
      setSubmitFile(null);
      fetchProject();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!resubmitFile || !resubmitStageNum) return toast.error('Прикрепите файл');
    setSubmitting(true);
    try {
      await projectsApi.resubmitStage(Number(id), resubmitStageNum, resubmitFile);
      toast.success('Этап переотправлен!');
      setResubmitStageNum(null);
      setResubmitFile(null);
      fetchProject();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewSubmissionId) return;
    if (!reviewForm.grade) return toast.error('Введите оценку');
    setSubmitting(true);
    try {
      await projectsApi.reviewSubmission(
        reviewSubmissionId,
        reviewForm.comment,
        Number(reviewForm.grade),
        reviewForm.newStatus
      );
      toast.success('Отзыв сохранён');
      setReviewOpen(false);
      setReviewForm({ comment: '', grade: '', newStatus: 'ACCEPTED' });
      fetchProject();
      fetchReviews(reviewSubmissionId);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-40 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!project) return null;

  const nextStage = getNextStageNumber();
  const canSubmitNext = isOwner && nextStage !== null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Назад к проектам
      </button>

      {/* Project Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
        <h1 className="text-gray-900 mb-2">{project.title}</h1>
        {project.description && (
          <p className="text-gray-500 text-sm mb-4">{project.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <div>
            <span className="text-gray-400 text-xs">Владелец</span>
            <p className="text-gray-700">{project.owner?.nickname}</p>
          </div>
          {project.teammates?.length > 0 && (
            <div>
              <span className="text-gray-400 text-xs">Команда</span>
              <p className="text-gray-700">{project.teammates.map((t) => t.nickname).join(', ')}</p>
            </div>
          )}
          {project.school && (
            <div>
              <span className="text-gray-400 text-xs">Школа</span>
              <p className="text-gray-700">{project.school.name}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          {canSubmitNext && (
            <button
              onClick={() => setSubmitOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Upload className="size-4" />
              Подать этап {nextStage}
            </button>
          )}
        </div>
      </div>

      {/* Stages */}
      <h2 className="text-gray-900 mb-4">Этапы проекта</h2>
      {(!project.stages || project.stages.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <p>Этапов ещё нет</p>
          {isOwner && (
            <button
              onClick={() => setSubmitOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Подать первый этап
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {project.stages.map((stage) => {
            const sc = STATUS_CONFIG[stage.status] ?? STATUS_CONFIG.PENDING;
            const canResubmit = isTeamMember && (stage.status === 'REVISION' || stage.status === 'REJECTED');
            const stageReviews = reviews[stage.id] ?? [];

            return (
              <div key={stage.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-gray-900">Этап {stage.stageNumber}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Подан: {new Date(stage.submittedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border ${sc.color}`}>
                    {sc.icon}
                    {sc.label}
                  </div>
                </div>

                {/* File */}
                <button
                  onClick={() => filesApi.downloadFile(stage.fileNameInDirectory, stage.initialFileName).catch(() => toast.error('Ошибка загрузки'))}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 mb-4"
                >
                  <Download className="size-4" />
                  {stage.initialFileName}
                </button>

                {/* Actions for stage */}
                <div className="flex flex-wrap gap-3">
                  {canResubmit && (
                    <button
                      onClick={() => setResubmitStageNum(stage.stageNumber)}
                      className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 text-sm rounded-xl hover:bg-orange-100 transition-colors"
                    >
                      <Upload className="size-3.5" />
                      Переотправить
                    </button>
                  )}
                  {isModerator && stage.status === 'PENDING' && (
                    <button
                      onClick={() => { setReviewSubmissionId(stage.id); setReviewOpen(true); }}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                      <Star className="size-3.5" />
                      Оставить отзыв
                    </button>
                  )}
                </div>

                {/* Reviews */}
                {stageReviews.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Отзывы модераторов:</p>
                    {stageReviews.map((r) => (
                      <div key={r.id} className="bg-gray-50 rounded-xl p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{r.moderatorNickname}</span>
                          <span className="text-sm text-indigo-600">{r.grade}/10</span>
                        </div>
                        {r.comment && <p className="text-xs text-gray-500">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit next stage modal */}
      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title={`Подача этапа ${nextStage}`}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Файл презентации *</label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubmitStage}
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Отправка...' : 'Подать этап'}
            </button>
            <button
              onClick={() => setSubmitOpen(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Resubmit modal */}
      <Modal
        open={resubmitStageNum !== null}
        onClose={() => setResubmitStageNum(null)}
        title={`Переотправить этап ${resubmitStageNum}`}
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Новый файл *</label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={(e) => setResubmitFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleResubmit}
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Отправка...' : 'Переотправить'}
            </button>
            <button
              onClick={() => setResubmitStageNum(null)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Review modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Отзыв на этап">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Оценка (0-10) *</label>
            <input
              type="number"
              min={0}
              max={10}
              value={reviewForm.grade}
              onChange={(e) => setReviewForm({ ...reviewForm, grade: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Статус *</label>
            <select
              value={reviewForm.newStatus}
              onChange={(e) => setReviewForm({ ...reviewForm, newStatus: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACCEPTED">Принято</option>
              <option value="REJECTED">Отклонено</option>
              <option value="REVISION">На доработку</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Комментарий</label>
            <textarea
              rows={3}
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Рекомендации по доработке..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReview}
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Сохранение...' : 'Сохранить отзыв'}
            </button>
            <button
              onClick={() => setReviewOpen(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
