import api from './axios';
import type { PageResponse } from './accounts';

export interface ProjectMemberResponse {
  accountId: number;
  nickname: string;
  isOwner: boolean;
  joinedAt?: string;
}

export interface FileResponse {
  id: number;
  fileNameInDirectory: string;
  initialFileName: string;
}

export interface StageReviewResponse {
  id: number;
  submissionId: number;
  moderatorNickname: string;
  comment: string;
  grade: number;
  reviewedAt: string;
}

/** Версия файла из истории загрузок */
export interface SubmissionFileHistoryResponse {
  id: number;
  versionNumber: number;
  file?: FileResponse;
  uploadedAt: string;
  /** Статус подачи НА МОМЕНТ этой загрузки: ON_REVIEW = до проверки, NEEDS_REVISION = доработка */
  statusAtUpload: string;
}

export interface ProjectStageSubmissionResponse {
  id: number;
  stage: string;            // "STAGE_1", "STAGE_2", "STAGE_3"
  stageDescription: string;
  status: string;           // "ON_REVIEW", "ACCEPTED", "REJECTED", "NEEDS_REVISION"
  statusDescription: string;
  file?: FileResponse;
  currentVersion: number;
  submittedAt: string;
  updatedAt: string;
  reviews?: StageReviewResponse[];
  history?: SubmissionFileHistoryResponse[];
}

export interface ProjectResponse {
  id: number;
  title: string;
  description: string;
  schoolId: number;
  schoolName: string;
  createdAt: string;
  members: ProjectMemberResponse[];
  submissions: ProjectStageSubmissionResponse[];
}

export interface ReviewSubmissionRequest {
  submissionId: number;
  comment: string;
  grade: number;
  newStatus: string;
}

/** Parse stage number from backend enum name, e.g. "STAGE_1" → 1 */
export function getStageNumber(stage: string): number {
  const match = stage?.match(/STAGE_(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function normalizeFile(raw: any): FileResponse | undefined {
  if (!raw) return undefined;
  return {
    id: raw.id,
    fileNameInDirectory: raw.fileNameInDirectory ?? raw.file_name_in_directory,
    initialFileName: raw.initialFileName ?? raw.initial_file_name,
  };
}

function normalizeHistory(raw: any): SubmissionFileHistoryResponse {
  return {
    id: raw.id,
    versionNumber: raw.versionNumber ?? raw.version_number,
    file: normalizeFile(raw.file),
    uploadedAt: raw.uploadedAt ?? raw.uploaded_at,
    statusAtUpload: raw.statusAtUpload ?? raw.status_at_upload,
  };
}

function normalizeSubmission(raw: any): ProjectStageSubmissionResponse {
  return {
    id: raw.id,
    stage: raw.stage,
    stageDescription: raw.stageDescription ?? raw.stage_description,
    status: raw.status,
    statusDescription: raw.statusDescription ?? raw.status_description,
    file: normalizeFile(raw.file),
    currentVersion: raw.currentVersion ?? raw.current_version ?? 1,
    submittedAt: raw.submittedAt ?? raw.submitted_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
    reviews: raw.reviews,
    history: (raw.history ?? []).map(normalizeHistory),
  };
}

function normalizeMember(raw: any): ProjectMemberResponse {
  return {
    accountId: raw.accountId ?? raw.account_id,
    nickname: raw.nickname,
    isOwner: raw.isOwner ?? raw.is_owner,
    joinedAt: raw.joinedAt ?? raw.joined_at,
  };
}

function normalizeProject(raw: any): ProjectResponse {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    schoolId: raw.schoolId ?? raw.school_id,
    schoolName: raw.schoolName ?? raw.school_name,
    createdAt: raw.createdAt ?? raw.created_at,
    members: (raw.members ?? []).map(normalizeMember),
    submissions: (raw.submissions ?? []).map(normalizeSubmission),
  };
}

function normalizeProjectPage(raw: any): PageResponse<ProjectResponse> {
  return {
    ...raw,
    content: (raw?.content ?? []).map(normalizeProject),
  };
}

export const projectsApi = {
  create: (formData: FormData) =>
      api.post('/projects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => ({ ...r, data: normalizeProject(r.data) })),

  submitStage: (projectId: number, formData: FormData) =>
      api.post(`/projects/${projectId}/stages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => ({ ...r, data: normalizeProject(r.data) })),

  /**
   * Замена файла ДО проверки модератора — только когда статус ON_REVIEW.
   */
  resubmitStage: (projectId: number, stageNumber: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.put(
        `/projects/${projectId}/stages/${stageNumber}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then((r) => ({ ...r, data: normalizeProject(r.data) }));
  },

  /**
   * Отправка доработки после замечаний модератора — только когда NEEDS_REVISION.
   * Комментарии и история сохраняются.
   */
  submitRevision: (projectId: number, stageNumber: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(
        `/projects/${projectId}/stages/${stageNumber}/revision`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then((r) => ({ ...r, data: normalizeProject(r.data) }));
  },

  getById: (id: number) =>
      api.get(`/projects/${id}`).then((r) => ({ ...r, data: normalizeProject(r.data) })),

  getBySchool: (schoolId: number, pageNumber: number, pageSize: number) =>
      api.get(`/projects/school/${schoolId}`, {
        params: { pageNumber, pageSize },
      }).then((r) => ({ ...r, data: normalizeProjectPage(r.data) })),

  getMyProjects: (pageNumber: number, pageSize: number) =>
      api.get('/projects/my', {
        params: { pageNumber, pageSize },
      }).then((r) => ({ ...r, data: normalizeProjectPage(r.data) })),

  getCurrentStage: (projectId: number) =>
      api.get<ProjectStageSubmissionResponse>(`/projects/${projectId}/current-stage`),

  /** Отзыв модератора — использует camelCase как ожидает Spring @RequestBody */

  reviewSubmission: (data: ReviewSubmissionRequest) =>
      api.post<StageReviewResponse>('/projects/submissions/review', {
        submission_id: data.submissionId,
        comment: data.comment,
        grade: data.grade,
        new_status: data.newStatus,
      }),

  getReviews: (submissionId: number) =>
      api.get<StageReviewResponse[]>(`/projects/submissions/${submissionId}/reviews`),
};