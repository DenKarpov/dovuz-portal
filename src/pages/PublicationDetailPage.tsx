import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { publicationsApi, type PublicationDetailResponse } from '../app/api/publications';
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Назад
      </button>

      {/* Publication */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-gray-900">{pub.title}</h1>
          {isModerator && (
            <button
              onClick={handleDelete}
              className="shrink-0 p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            {formatDate(pub.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="size-4" />
            <Link to={`/profile/${pub.author_nickname}`} className="hover:text-indigo-600 transition-colors">
              {pub.author_nickname}
            </Link>
          </span>
        </div>
        {pub.description && (
          <p className="text-gray-700 leading-relaxed mb-6">{pub.description}</p>
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
    </div>
  );
};
