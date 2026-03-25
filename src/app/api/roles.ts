import api from './axios';

export interface RoleResponse {
  id: number;
  name: string;
  description: string;
}

export const rolesApi = {
  getAll: () => api.get<RoleResponse[]>('/roles'),
};
