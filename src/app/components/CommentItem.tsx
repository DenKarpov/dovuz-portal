import React, { useState } from 'react';
import { MessageSquare, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { commentsApi, type CommentResponse } from '../api/comments';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Pagination } from './Pagination';

interface CommentItemProps {
  comment: CommentResponse;
  onDeleted?: (id: number) => void;
  onUpdated?: (updated: CommentResponse) => void;
  depth?: number;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onDeleted,
  onUpdated,
  depth = 0,
}) => {
  const { user, isModerator } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentResponse[]>([]);
  const [repliesPage, setRepliesPage] = useState(0);
  const [repliesTotalPages, setRepliesTotalPages] = useState(0);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const canEdit = user?.nickname === comment.nickname;
  const canDelete = isModerator || user?.nickname === comment.nickname;

  const handleDelete = async () => {
    if (!window.confirm('Удалить комментарий?')) return;
    try {
      await commentsApi.delete(comment.id);
      toast.success('Комментарий удалён');
      onDeleted?.(comment.id);
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await commentsApi.update(comment.id, editContent);
      toast.success('Комментарий обновлён');
      onUpdated?.(res.data);
      setEditing(false);
    } catch {
      toast.error('Ошибка при обновлении');
    }
  };

  const loadReplies = async (page = 0) => {
    setLoadingReplies(true);
    try {
      const res = await commentsApi.getReplies(comment.id, page, 5);
      setReplies(res.data.content);
      setRepliesTotalPages(res.data.total_pages);
      setRepliesPage(page);
    } catch {
      toast.error('Ошибка загрузки ответов');
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    if (!showReplies) {
      loadReplies(0);
    }
    setShowReplies(!showReplies);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return toast.error('Ответ не может быть пустым');
    try {
      await commentsApi.createReply(replyContent, comment.id, anonymous);
      toast.success('Ответ добавлен');
      setReplyContent('');
      setShowReplyForm(false);
      if (showReplies) loadReplies(repliesPage);
      else { setShowReplies(true); loadReplies(0); }
    } catch {
      toast.error('Ошибка при ответе');
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-indigo-100 pl-4' : ''}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3 hover:border-gray-200 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm shrink-0">
              {comment.anonymous ? '?' : (comment.nickname?.[0] ?? 'U').toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                {comment.anonymous ? 'Аноним' : comment.nickname}
              </p>
              <p className="text-xs text-gray-400">{formatDate(comment.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => setEditing(!editing)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Edit2 className="size-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="mt-3">
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
              rows={3}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleUpdate}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">{comment.content}</p>
        )}

        {/* Actions */}
        {depth === 0 && (
          <div className="flex items-center gap-3 mt-3">
            {user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <MessageSquare className="size-3.5" />
                Ответить
              </button>
            )}
            <button
              onClick={toggleReplies}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              {showReplies ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              Ответы
            </button>
          </div>
        )}

        {showReplyForm && depth === 0 && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3">
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none bg-white"
              rows={2}
              placeholder="Ваш ответ..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
            />
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="rounded"
                />
                Анонимно
              </label>
              <button
                onClick={handleReply}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Отправить
              </button>
              <button
                onClick={() => setShowReplyForm(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {showReplies && (
        <div className="mb-3">
          {loadingReplies ? (
            <div className="text-center py-4 text-gray-400 text-sm">Загрузка...</div>
          ) : (
            <>
              {replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  depth={depth + 1}
                  onDeleted={(id) => setReplies((prev) => prev.filter((c) => c.id !== id))}
                />
              ))}
              <Pagination
                currentPage={repliesPage}
                totalPages={repliesTotalPages}
                onPageChange={(p) => loadReplies(p)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
