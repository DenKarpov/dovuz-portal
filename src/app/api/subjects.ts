import api from './axios';
import type { PageResponse } from './accounts';

export interface SubjectResponse {
  id: number;
  name: string;
  directionId: number;
  directionName: string;
}

export const subjectsApi = {
  getByDirection: (directionId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<SubjectResponse>>('/subjects', {
      params: { directionId, pageNumber, pageSize },
    }),

  create: (name: string, directionId: number) =>
    api.post<SubjectResponse>('/subjects', { name, directionId }),

  delete: (id: number) =>
    api.delete(`/subjects/${id}`),
};
