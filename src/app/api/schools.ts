import api from './axios';

export interface SchoolResponse {
  id: number;
  name: string;
}

export const schoolsApi = {
  getAll: () => api.get<SchoolResponse[]>('/schools'),
  create: (name: string) => api.post<SchoolResponse>('/schools', { name }),
  delete: (id: number) => api.delete(`/schools/${id}`),
};
