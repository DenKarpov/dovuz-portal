import api from './axios';
import type { PageResponse } from './accounts';

export interface ProjectMember {
  id: number;
  nickname: string;
}

export interface StageSubmission {
  id: number;
  stageNumber: number;
  status: string;
  fileNameInDirectory: string;
  initialFileName: string;
  submittedAt: string;
}

export interface ProjectResponse {
  id: number;
  title: string;
  description: string;
  owner: ProjectMember;
  teammates: ProjectMember[];
  stages: StageSubmission[];
  school?: { id: number; name: string };
  createdAt: string;
}

export interface StageReviewResponse {
  id: number;
  submissionId: number;
  moderatorNickname: string;
  comment: string;
  grade: number;
  newStatus: string;
  createdAt: string;
}

export const projectsApi = {
  create: (formData: FormData) =>
    api.post<ProjectResponse>('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  submitStage: (projectId: number, formData: FormData) =>
    api.post<ProjectResponse>(`/projects/${projectId}/stages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  resubmitStage: (projectId: number, stageNumber: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.put<ProjectResponse>(
      `/projects/${projectId}/stages/${stageNumber}`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  getById: (id: number) =>
    api.get<ProjectResponse>(`/projects/${id}`),

  getBySchool: (schoolId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<ProjectResponse>>(`/projects/school/${schoolId}`, {
      params: { pageNumber, pageSize },
    }),

  getMyProjects: (pageNumber: number, pageSize: number) =>
    api.get<PageResponse<ProjectResponse>>('/projects/my', {
      params: { pageNumber, pageSize },
    }),

  getCurrentStage: (projectId: number) =>
    api.get<StageSubmission>(`/projects/${projectId}/current-stage`),

  reviewSubmission: (
    submissionId: number,
    comment: string,
    grade: number,
    newStatus: string
  ) =>
    api.post<StageReviewResponse>('/projects/submissions/review', {
      submissionId,
      comment,
      grade,
      newStatus,
    }),

  getReviews: (submissionId: number) =>
    api.get<StageReviewResponse[]>(`/projects/submissions/${submissionId}/reviews`),
};
