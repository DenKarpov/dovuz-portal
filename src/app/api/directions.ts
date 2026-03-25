import api from './axios';

export interface DirectionResponse {
  id: number;
  name: string;
}

export const directionsApi = {
  getAll: () => api.get<DirectionResponse[]>('/directions'),
};
