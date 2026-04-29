import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, MessageSquare, Plus } from 'lucide-react';
import { newsPublicationsApi, type PublicationResponse } from '../app/api/newsPublications';
import { commentsApi, type CommentResponse } from '../app/api/comments';
import { FileList } from '../app/components/FileList';
import { CommentItem } from '../app/components/CommentItem';
import { Pagination } from '../app/components/Pagination';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { filesApi } from '../app/api/files';
import type { FileInfo } from '../app/api/newsPublications';

/**
 * Normalize a raw comment from the API to ensure consistent field names.
 * The backend returns `is_anonymous` (snake_case) but CommentItem reads `anonymous`.
 * Also normalizes nickname so canEdit/canDelete in CommentItem work correctly.
 */
function normalizeComment(raw: any): CommentResponse {
  return {
    ...raw,
    // Handle both snake_case (is_anonymous) and camelCase (isAnonymous / anonymous)
    anonymous: raw.anonymous ?? raw.is_anonymous ?? raw.isAnonymous ?? false,
    // Ensure nickname is always a string so comparisons work
    nickname: raw.nickname ?? raw.author ?? '',
    created_at: raw.created_at ?? raw.createdAt ?? '',
  };
}

export const NewsPublicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pub, setPub] = useState<PublicationResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsTotalPages, setCommentsTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async (p = 0) => {
    setCommentsLoading(true);
    try {
      const res = await commentsApi.getByPublication(Number(id), p, 10);
      // Normalize each comment to ensure consistent field names
      const normalized = (res.data.content ?? []).map(normalizeComment);
      setComments(normalized);
      setCommentsTotalPages(res.data.total_pages ?? 0);
      setCommentsPage(p);
    } catch (err: any) {
      // Show error instead of silently swallowing it
      const msg = err.response?.data?.message ?? 'Ошибка загрузки комментариев';
      toast.error(msg);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        // NewsPublicationEntity shares the same ID as PublicationEntity,
        // so we can fetch it via the general publications endpoint.
        const { publicationsApi } = await import('../app/api/publications');
        const res = await publicationsApi.getById(Number(id));
        setPub({
          id: res.data.id,
          title: res.data.title,
          description: res.data.description,
          created_at: res.data.created_at ?? (res.data as any).createdAt ?? '',
          nickname: res.data.nickname,
          files: res.data.files ?? [],
        });
      } catch {
        toast.error('Публикация не найдена');
        navigate('/news');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadAll();
      fetchComments(0);
    }
  }, [id]);

  const handleAddComment = async () => {
    if (!commentContent.trim()) return toast.error('Комментарий не может быть пустым');
    setSubmitting(true);
    try {
      await commentsApi.create(commentContent, Number(id), anonymous);
      toast.success('Комментарий добавлен');
      setAddCommentOpen(false);
      setCommentContent('');
      setAnonymous(false);
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

  const getExtension = (name: string) => name.split('.').pop()?.toUpperCase() ?? '';
  const isImageFile = (file: FileInfo) => {
    const ext = getExtension(file.initial_file_name);
    return ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext);
  };

  const partitionFiles = (files: FileInfo[]) => {
    const imageFiles = files.filter(isImageFile);
    const otherFiles = files.filter((f) => !isImageFile(f));
    return { imageFiles, otherFiles };
  };

  if (loading) {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-6 bg-gray-100 rounded w-2/3" />
            <div className="h-40 bg-gray-100 rounded" />
          </div>
        </div>
    );
  }

  if (!pub) return null;

  return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/news" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="size-4" />
          Назад к новостям
        </Link>

        {/* Publication card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
          <h1 className="text-gray-900 mb-4">{pub.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            {pub.created_at ? formatDate(pub.created_at) : ''}
          </span>
            <span className="flex items-center gap-1.5">
            <User className="size-4" />
              {pub.nickname}
          </span>
          </div>
          {(() => {
            const { imageFiles, otherFiles } = partitionFiles(pub.files ?? []);
            return (
                <>
                  {imageFiles.length > 0 && (
                      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {imageFiles.map((f) => (
                            <img
                                key={f.id}
                                src={filesApi.getPhotoUrl(f.file_name_in_directory)}
                                alt={f.initial_file_name}
                                className="w-full h-36 object-cover rounded-xl border border-gray-100 bg-gray-50"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ))}
                      </div>
                  )}
                  {otherFiles.length > 0 && <FileList files={otherFiles} />}
                </>
            );
          })()}

          {pub.description && (
              <p className="text-gray-700 leading-relaxed mt-4 mb-6">{pub.description}</p>
          )}
        </div>

        {/* Comments section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-2 text-gray-900">
              <MessageSquare className="size-5 text-blue-600" />
              Комментарии
            </h3>
            {user && (
                <button
                    onClick={() => setAddCommentOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <Plus className="size-4" />
                  Добавить
                </button>
            )}
          </div>

          {commentsLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Загрузка комментариев...</div>
          ) : comments.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Комментариев пока нет</p>
          ) : (
              <div>
                {comments.map((c) => (
                    <CommentItem
                        key={c.id}
                        comment={c}
                        onDeleted={(cid) => setComments((prev) => prev.filter((x) => x.id !== cid))}
                        onUpdated={(updated) =>
                            setComments((prev) =>
                                prev.map((x) => (x.id === updated.id ? normalizeComment(updated) : x))
                            )
                        }
                    />
                ))}
                <Pagination
                    currentPage={commentsPage}
                    totalPages={commentsTotalPages}
                    onPageChange={fetchComments}
                />
              </div>
          )}
        </div>

        {/* Add Comment Modal */}
        <Modal open={addCommentOpen} onClose={() => setAddCommentOpen(false)} title="Новый комментарий">
          <div className="p-6 space-y-4">
          <textarea
              rows={4}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Введите комментарий..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
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