import api from './axios';

export interface TopicTypeResponse {
  id: number;
  name: string;
}

export const topicsApi = {
  getAll: () => api.get<TopicTypeResponse[]>('/topics'),
};
