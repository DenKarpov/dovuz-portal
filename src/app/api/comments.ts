import api from './axios';
import type { PageResponse } from './accounts';

export interface CommentResponse {
  id: number;
  content: string;
  nickname: string;
  user_id: number;
  created_at: string;
  last_updated_at: string;
  publication_id: number;
  anonymous: boolean;
}

export const commentsApi = {
  create: (content: string, publicationId: number, isAnonymous: boolean) =>
    api.post<CommentResponse>('/comments', {
      content,
      publication_id: publicationId,
      is_anonymous: isAnonymous,
    }),

  getById: (id: number) =>
    api.get<CommentResponse>(`/comments/${id}`),

  update: (id: number, content: string) =>
    api.put<CommentResponse>('/comments', { id, content }),

  delete: (id: number) =>
    api.delete(`/comments/${id}`),

  getByPublication: (publicationId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<CommentResponse>>('/comments', {
      params: { publicationId, pageNumber, pageSize },
    }),

  createReply: (content: string, parentCommentId: number, isAnonymous: boolean) =>
    api.post<CommentResponse>('/comments/create-comment-reply', {
      content,
      parent_comment_id: parentCommentId,
      is_anonymous: isAnonymous,
    }),

  getReplies: (commentId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<CommentResponse>>(`/comments/${commentId}/replies`, {
      params: { pageNumber, pageSize },
    }),

  getRevisions: (commentId: number) =>
    api.get('/comments/revisions', { params: { commentId } }),
};
