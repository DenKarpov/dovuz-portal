import api from './axios';

export interface DirectionResponse {
  id: number;
  name: string;
}

export const directionsApi = {
  getAll: () =>
      api.get<DirectionResponse[]>('/directions'),

  getById: (id: number) =>
      api.get<DirectionResponse>(`/directions/${id}`),

  create: (name: string) =>
      api.post<DirectionResponse>('/directions', { name }),

  update: (id: number, name: string) =>
      api.put<DirectionResponse>(`/directions/${id}`, { name }),

  delete: (id: number) =>
      api.delete<void>(`/directions/${id}`),
};