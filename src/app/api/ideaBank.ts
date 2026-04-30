import api from './axios';
import type { PageResponse } from './accounts';

export interface IdeaBankEntryResponse {
  id: number;
  title: string;
  description?: string;
  comments?: string;
  score: number;
  created_by_nickname: string;
  source_project_id?: number;
  created_at: string;
}

export const ideaBankApi = {
  create: (data: {
    title: string;
    description?: string;
    comments?: string;
    score?: number;
    source_project_id?: number;
  }) => api.post<IdeaBankEntryResponse>('/idea-bank', data),

  getAll: (pageNumber: number, pageSize: number, query?: string, sortByScore = true) =>
    api.get<PageResponse<IdeaBankEntryResponse>>(`/idea-bank`, {
      params: { pageNumber, pageSize, sortByScore, ...(query ? { query } : {}) },
    }),

  getById: (id: number) =>
    api.get<IdeaBankEntryResponse>(`/idea-bank/${id}`),

  update: (id: number, data: { title?: string; description?: string; comments?: string; score?: number }) =>
    api.patch<IdeaBankEntryResponse>(`/idea-bank/${id}`, data),

  assignToGroup: (id: number, groupId: number) =>
    api.post<IdeaBankEntryResponse>(`/idea-bank/${id}/assign-to-group`, { group_id: groupId }),

  delete: (id: number) => api.delete(`/idea-bank/${id}`),
};
