import api from './axios';

export interface SchoolClassResponse {
  id: number;
  name: string;
  school: { id: number; name: string };
}

export const schoolClassesApi = {
  create: (name: string, schoolId: number) =>
    api.post<SchoolClassResponse>('/classes', { name, schoolId }),

  getBySchool: (schoolId: number) =>
    api.get<SchoolClassResponse[]>(`/classes/school/${schoolId}`),

  delete: (id: number) =>
    api.delete(`/classes/${id}`),
};
