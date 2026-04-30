import api from './axios';

/** Как в RoleResponseDto бэкенда (Jackson camelCase). */
export interface RoleResponse {
  id: number;
  /** Русское название для UI */
  label: string;
  role: string;
  name: string;
  code: string;
}

/** Подпись для select / списков */
export function roleDisplayLabel(r: RoleResponse): string {
  const s = r.label || r.role || r.name || r.code;
  return (s && String(s).trim()) || `Роль #${r.id}`;
}

export const rolesApi = {
  getAll: () => api.get<RoleResponse[]>('/roles'),
};
