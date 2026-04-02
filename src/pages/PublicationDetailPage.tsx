import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, MessageSquare, Plus, Trash2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { publicationsApi, type PublicationDetailResponse } from '../app/api/publications';
import { subjectTopicsApi, type SubjectTopicResponse } from '../app/api/subjectTopics';
import { subjectsApi, type SubjectResponse } from '../app/api/subjects';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { commentsApi, type CommentResponse } from '../app/api/comments';
import { FileList } from '../app/components/FileList';
import { CommentItem } from '../app/components/CommentItem';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const PublicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth();

  const [pub, setPub] = useState<PublicationDetailResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsTotalPages, setCommentsTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [topicName, setTopicName] = useState('');
  const [topicId, setTopicId] = useState<number | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [directionName, setDirectionName] = useState('');
  const [directionId, setDirectionId] = useState<number | null>(null);

  const fetchComments = async (p = 0) => {
    try {
      const res = await commentsApi.getByPublication(Number(id), p, 10);
      setComments(res.data.content);
      setCommentsTotalPages(res.data.total_pages);
      setCommentsPage(p);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await publicationsApi.getById(Number(id));
        setPub(res.data);
      } catch {
        toast.error('Публикация не найдена');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchComments(0);

    // Build breadcrumb for this publication
    const buildBreadcrumb = async () => {
      try {
        const pubRes = await publicationsApi.getById(Number(id));
        const stId = pubRes.data.subject_topic_id;
        if (!stId) return;
        setTopicId(stId);

        const dirRes = await directionsApi.getAll();
        const dirs: DirectionResponse[] = dirRes.data;
        for (const dir of dirs) {
          const subRes = await subjectsApi.getByDirection(dir.id, 0, 100);
          for (const sub of subRes.data.content as SubjectResponse[]) {
            const topicsRes = await subjectTopicsApi.getBySubject(sub.id, 0, 100);
            const found = topicsRes.data.content.find((t: SubjectTopicResponse) => t.id === stId);
            if (found) {
              setTopicName(found.name);
              setSubjectName(sub.name);
              setSubjectId(sub.id);
              setDirectionName(dir.name);
              setDirectionId(dir.id);
              return;
            }
          }
        }
      } catch { /* ignore */ }
    };
    buildBreadcrumb();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Удалить публикацию?')) return;
    try {
      await publicationsApi.delete(Number(id));
      toast.success('Публикация удалена');
      navigate(-1);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleAddComment = async () => {
    if (!commentContent.trim()) return toast.error('Введите комментарий');
    setSubmitting(true);
    try {
      await commentsApi.create(commentContent, Number(id), anonymous);
      toast.success('Комментарий добавлен');
      setAddCommentOpen(false);
      setCommentContent('');
      fetchComments(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-10 bg-gray-100 rounded w-2/3" />
        <div className="h-40 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!pub) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="max-w-3xl mx-auto px-6 py-10"
    >
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-base text-slate-500 hover:text-slate-700 mb-4 transition-colors group"
      >
        <ArrowLeft className="size-5 group-hover:-translate-x-0.5 transition-transform" />
        Назад
      </button>

      {/* Breadcrumb */}
      {directionId && (
        <div className="flex items-center gap-2 text-base text-slate-400 mb-6 flex-wrap">
          <Link to="/directions" className="hover:text-indigo-600 transition-colors">📚 Направления</Link>
          <ChevronRight className="size-4" />
          <Link to={`/directions/${directionId}/subjects`} className="hover:text-indigo-600 transition-colors">{directionName}</Link>
          <ChevronRight className="size-4" />
          {subjectId && <Link to={`/subjects/${subjectId}/topics`} className="hover:text-indigo-600 transition-colors">{subjectName}</Link>}
          <ChevronRight className="size-4" />
          {topicId && <Link to={`/topics/${topicId}/publications`} className="hover:text-indigo-600 transition-colors">{topicName}</Link>}
          <ChevronRight className="size-4" />
          <span className="text-slate-700 font-medium truncate max-w-[200px]">{pub?.title}</span>
        </div>
      )}

      {/* Publication */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-gray-900 text-3xl font-bold leading-tight">{pub.title}</h1>
          {isModerator && (
            <button
              onClick={handleDelete}
              className="shrink-0 p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400 mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            {formatDate(pub.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="size-4" />
            <Link to={`/profile/${pub.nickname}`} className="hover:text-indigo-600 transition-colors">
              👤 {pub.nickname}
            </Link>
          </span>
        </div>
        {pub.files?.length > 0 && (
          <div className="mb-6 rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600">
            📎 Вложений: <span className="font-semibold">{pub.files.length}</span>
          </div>
        )}
        {pub.description && (
          <p className="text-gray-700 leading-relaxed mb-6 text-lg">{pub.description}</p>
        )}
        <FileList files={pub.files} />
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="flex items-center gap-2 text-gray-900">
            <MessageSquare className="size-5 text-indigo-600" />
            Комментарии
          </h3>
          {user && (
            <button
              onClick={() => setAddCommentOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Plus className="size-4" />
              Добавить
            </button>
          )}
        </div>

        {comments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Комментариев пока нет</p>
        ) : (
          <>
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                onDeleted={(cid) => setComments((prev) => prev.filter((x) => x.id !== cid))}
                onUpdated={(updated) =>
                  setComments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                }
              />
            ))}
            <Pagination
              currentPage={commentsPage}
              totalPages={commentsTotalPages}
              onPageChange={fetchComments}
            />
          </>
        )}
      </div>

      <Modal open={addCommentOpen} onClose={() => setAddCommentOpen(false)} title="Новый комментарий">
        <div className="p-6 space-y-4">
          <textarea
            rows={4}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Введите комментарий..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="rounded"
            />
            Отправить анонимно
          </label>
          <div className="flex gap-3">
            <button
              onClick={handleAddComment}
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </button>
            <button
              onClick={() => setAddCommentOpen(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
