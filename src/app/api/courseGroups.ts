import api from './axios';

export interface CourseGroupMemberResponse {
  id: number;
  account_id: number;
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  is_owner: boolean;
}

export interface CourseGroupResponse {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  school_id: number;
  school_name: string;
  members: CourseGroupMemberResponse[];
  created_at: string;
}

export interface CreateGroupRequest {
  title: string;
  description?: string;
  school_id: number;
  student_ids: number[];
}

export interface UpdateGroupRequest {
  title?: string;
  description?: string;
  student_ids?: number[];
}

export const courseGroupsApi = {
  getGroups: (courseId: number) =>
    api.get<CourseGroupResponse[]>(`/courses/${courseId}/groups`),

  createGroup: (courseId: number, data: CreateGroupRequest) =>
    api.post<CourseGroupResponse>(`/courses/${courseId}/groups`, data),

  updateGroup: (courseId: number, groupId: number, data: UpdateGroupRequest) =>
    api.patch<CourseGroupResponse>(`/courses/${courseId}/groups/${groupId}`, data),

  getMyGroup: (courseId: number) =>
    api.get<CourseGroupResponse | null>(`/courses/${courseId}/groups/my`),
};
