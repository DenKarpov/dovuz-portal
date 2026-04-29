import api from './axios';
import type { PageResponse } from './accounts';

export interface IdeaBankEntryResponse {
  id: number;
  title: string;
  description?: string;
  comments?: string;
  school_id: number;
  school_name: string;
  created_by_nickname: string;
  source_project_id?: number;
  created_at: string;
}

export const ideaBankApi = {
  create: (data: {
    title: string;
    description?: string;
    comments?: string;
    school_id: number;
    source_project_id?: number;
  }) => api.post<IdeaBankEntryResponse>('/idea-bank', data),

  getBySchool: (schoolId: number, pageNumber: number, pageSize: number, query?: string) =>
    api.get<PageResponse<IdeaBankEntryResponse>>(`/idea-bank/school/${schoolId}`, {
      params: { pageNumber, pageSize, ...(query ? { query } : {}) },
    }),

  update: (id: number, data: { title?: string; description?: string; comments?: string }) =>
    api.patch<IdeaBankEntryResponse>(`/idea-bank/${id}`, data),

  delete: (id: number) => api.delete(`/idea-bank/${id}`),
};
