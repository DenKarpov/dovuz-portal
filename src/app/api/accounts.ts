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
  schoolId?: number;
  schoolName?: string;
  classId?: number;
  className?: string;
}

export interface GetAllUserResponse {
  id: number;
  nickname: string;
  email: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  photo_name_in_directory?: string;
  school_id?: number;
  school_name?: string;
  class_id?: number;
  class_name?: string;
  role: string;
  is_banned: boolean;
  is_lagging: boolean;
}

export interface StatusAccountResponse {
  id: number;
  is_banned: boolean;
}

export interface AccountUpdateRoleResponse {
  id: number;
  role: string;
}

export interface HearingStageStatus {
  stage: string;
  status: string;
}

export interface CourseProgressResponse {
  course_id: number;
  course_name: string;
  total_lessons: number;
  submitted_lessons: number;
  accepted_lessons: number;
  average_score: number;
  max_possible_score: number;
  hearing_statuses: HearingStageStatus[];
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
    api.put<AccountResponse>('/accounts', formData),

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

  getCourseProgress: (nickname: string) =>
    api.get<CourseProgressResponse[]>(`/accounts/${nickname}/course-progress`),
};
