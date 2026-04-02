import api from './axios';
import type { PageResponse } from './accounts';
import type { FileInfo } from './newsPublications';

export interface PublicationDetailResponse {
  id: number;
  title: string;
  description: string;
  created_at: string;
  nickname: string;
  files: FileInfo[];
  subject_topic_id: number;
}

export interface PublicationTitleAndId {
  id: number;
  title: string;
}

export const publicationsApi = {
  create: (formData: FormData) =>
    api.post<PublicationDetailResponse>('/publications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getById: (id: number) =>
    api.get<PublicationDetailResponse>(`/publications/${id}`),

  delete: (id: number) =>
    api.delete(`/publications/${id}`),

  getByTopic: (subjectTopicId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<PublicationTitleAndId>>('/publications', {
      params: { subjectTopicId, pageNumber, pageSize },
    }),
};
