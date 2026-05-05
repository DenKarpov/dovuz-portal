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
  course_id?: number;
  course_name?: string;
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

  getAll: (
      pageNumber: number,
      pageSize: number,
      query?: string,
      sortBy: 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc' = 'date_desc',
      minScore?: number,
      maxScore?: number,
      courseId?: number,
  ) =>
      api.get<PageResponse<IdeaBankEntryResponse>>(`/idea-bank`, {
        params: {
          pageNumber,
          pageSize,
          sortBy,
          sortByScore: false, // disable legacy param
          ...(query ? { query } : {}),
          ...(minScore !== undefined ? { minScore } : {}),
          ...(maxScore !== undefined ? { maxScore } : {}),
          ...(courseId !== undefined ? { courseId } : {}),
        },
      }),

  getById: (id: number) =>
      api.get<IdeaBankEntryResponse>(`/idea-bank/${id}`),

  update: (id: number, data: { title?: string; description?: string; comments?: string; score?: number }) =>
      api.patch<IdeaBankEntryResponse>(`/idea-bank/${id}`, data),

  assignToGroup: (id: number, groupId: number) =>
      api.post<IdeaBankEntryResponse>(`/idea-bank/${id}/assign-to-group`, { group_id: groupId }),

  assignToStudent: (id: number, courseId: number, studentId: number) =>
      api.post<IdeaBankEntryResponse>(`/idea-bank/${id}/assign-to-student`, { course_id: courseId, student_id: studentId }),

  delete: (id: number) => api.delete(`/idea-bank/${id}`),
};