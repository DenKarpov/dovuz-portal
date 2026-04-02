import api from './axios';

export interface PageResponse<T> {
  content: T[];
  total_pages: number;
  total_size: number;
  page_number: number;
  page_size: number;
}

export interface AccountResponse {
  id: number;
  nickname: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  description?: string;
  isBanned: boolean;
  role: string;
  photoNameInDirectory?: string;
  schoolName?: string;
  className?: string;
}

export interface GetAllUserResponse {
  id: number;
  nickname: string;
  email: string;
  role: string;
  isBanned: boolean;
}

export interface StatusAccountResponse {
  id: number;
  isBanned: boolean;
}

export interface AccountUpdateRoleResponse {
  id: number;
  role: string;
}

export const accountsApi = {
  getAllUsers: (pageNumber: number, pageSize: number) =>
    api.get<PageResponse<GetAllUserResponse>>('/accounts', {
      params: { pageNumber, pageSize },
    }),

  banUser: (id: number) =>
    api.post<StatusAccountResponse>(`/accounts/${id}/ban`),

  unbanUser: (id: number) =>
    api.post<StatusAccountResponse>(`/accounts/${id}/unban`),

  getAccount: (nickname: string) =>
    api.get<AccountResponse>(`/accounts/${nickname}`),

  saveInfo: (formData: FormData) =>
    api.put<AccountResponse>('/accounts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getBySchool: (schoolId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<GetAllUserResponse>>(`/accounts/school/${schoolId}`, {
      params: { pageNumber, pageSize },
    }),

  getByClass: (classId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<GetAllUserResponse>>(`/accounts/class/${classId}`, {
      params: { pageNumber, pageSize },
    }),

  updateRole: (id: number, roleId: number) =>
    api.put<AccountUpdateRoleResponse>(`/accounts/${id}/role`, { role_id: roleId }),
};
