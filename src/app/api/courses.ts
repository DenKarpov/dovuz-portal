import api from './axios';
import type { PageResponse } from './accounts';

export interface CourseSchoolRef {
  id: number;
  name: string;
}

export interface CourseShortResponse {
  id: number;
  name: string;
  description: string;
  schools: CourseSchoolRef[];
  is_active: boolean;
  lesson_count: number;
  created_at: string;
}

export type LessonCategory = 'LESSON' | 'HEARING';
export type HearingStage = 'TOPIC_APPROVAL' | 'INTERMEDIATE' | 'FINAL';

export interface CourseLessonResponse {
  id: number;
  order_number: number;
  title: string;
  category: LessonCategory;
  hearing_stage: HearingStage | null;
  lecture_content: string;
  practice_description: string;
  submission_type: 'TEXT' | 'FILE' | 'TEXT_AND_FILE';
  lecture_file_name: string | null;
  lecture_file_name_in_directory: string | null;
  video_url: string | null;
  max_score: number;
  /** Крайний срок сдачи работы, с сервера в формате `yyyy-MM-dd HH:mm:ss` */
  submission_deadline?: string | null;
}

export interface CourseResponse {
  id: number;
  name: string;
  description: string;
  schools: CourseSchoolRef[];
  is_active: boolean;
  created_at: string;
  lessons: CourseLessonResponse[];
}

export interface HearingReviewResponse {
  id: number;
  moderator_id: number;
  moderator_name: string;
  comment: string | null;
  grade: number | null;
  reviewed_at: string;
}

export interface HearingSubmissionResponse {
  id: number;
  lesson_id: number;
  group_id: number;
  file_name: string | null;
  file_name_in_directory: string | null;
  status: 'ON_REVIEW' | 'NEEDS_REVISION' | 'ACCEPTED' | 'REJECTED';
  current_version: number;
  submitted_at: string;
  updated_at: string;
  reviews: HearingReviewResponse[];
}

export interface CriterionGradeResponse {
  id: number;
  criterion_id: number;
  criterion_name: string;
  max_points: number;
  points: number;
}

export interface CriterionSnapshotEntry {
  criterion_id: number;
  criterion_name: string;
  max_points: number;
  points: number;
}

export interface SubmissionReviewHistoryEntry {
  id: number;
  status_after: 'SUBMITTED' | 'ACCEPTED' | 'NEEDS_REVISION';
  score: number | null;
  reviewer_comment: string | null;
  created_at: string;
  reviewer_nickname: string | null;
  criterion_snapshot: CriterionSnapshotEntry[];
}

export interface LessonSubmissionResponse {
  id: number;
  lesson_id: number;
  lesson_title: string;
  account_id: number;
  account_nickname: string;
  text_content: string | null;
  file_name: string | null;
  file_name_in_directory: string | null;
  status: 'SUBMITTED' | 'ACCEPTED' | 'NEEDS_REVISION';
  reviewer_comment: string | null;
  score: number | null;
  max_score: number | null;
  submitted_at: string;
  updated_at: string;
  criterion_grades: CriterionGradeResponse[];
}

export interface GradingCriterionResponse {
  id: number;
  order_number: number;
  name: string;
  description: string | null;
  max_points: number;
}

export interface CriterionScoreInput {
  criterion_id: number;
  points: number;
}

export interface CreateCourseRequest {
  name: string;
  description: string;
  school_id?: number;
}

export interface CreateLessonRequest {
  title: string;
  lecture_content: string;
  practice_description: string;
  submission_type: 'TEXT' | 'FILE' | 'TEXT_AND_FILE';
  order_number: number;
  video_url?: string;
  max_score?: number;
  /** `yyyy-MM-dd HH:mm:ss` или `null`, чтобы сбросить дедлайн */
  submission_deadline?: string | null;
  category?: LessonCategory;
  hearing_stage?: HearingStage;
}

/** Ответ API дедлайна → значение для input[type=datetime-local] */
export function apiDeadlineToDatetimeLocal(raw: string | null | undefined): string {
  if (!raw) return '';
  const normalized = raw.trim().includes('T') ? raw.trim() : raw.trim().replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → ISO-8601 для LocalDateTime на сервере (yyyy-MM-dd'T'HH:mm:ss) */
export function datetimeLocalToApiDeadline(v: string): string | null {
  const t = v?.trim();
  if (!t) return null;
  const withSec = t.length === 16 ? `${t}:00` : t;
  return withSec.includes('T') ? withSec : withSec.replace(' ', 'T');
}

export interface CourseSummaryLessonHeader {
  id: number;
  title: string;
  max_score: number;
  category: string;
}
export interface CourseSummaryLessonScore {
  lesson_id: number;
  status: string | null;
  score: number | null;
}
export interface CourseSummaryStudentRow {
  account_id: number;
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  school_name: string | null;
  class_name: string | null;
  scores: CourseSummaryLessonScore[];
  total_score: number;
}
export interface CourseSummaryResponse {
  lessons: CourseSummaryLessonHeader[];
  students: CourseSummaryStudentRow[];
}

export interface CourseModeratorResponse {
  id: number;
  account_id: number;
  nickname: string;
  course_id: number;
  course_name: string;
  assigned_at: string;
}

export const coursesApi = {
  getMyCourses: () =>
    api.get<CourseShortResponse[]>('/courses/my'),

  getCourse: (courseId: number) =>
    api.get<CourseResponse>(`/courses/${courseId}`),

  getLessons: (courseId: number) =>
    api.get<CourseLessonResponse[]>(`/courses/${courseId}/lessons`),

  getMySubmission: (lessonId: number) =>
    api.get<LessonSubmissionResponse | null>(`/courses/lessons/${lessonId}/my-submission`),

  getMySubmissionsForCourse: (courseId: number) =>
    api.get<LessonSubmissionResponse[]>(`/courses/${courseId}/my-submissions`),

  submitWork: (lessonId: number, formData: FormData) =>
    api.post<LessonSubmissionResponse>(`/courses/lessons/${lessonId}/submit`, formData),

  updateSubmission: (lessonId: number, formData: FormData) =>
    api.put<LessonSubmissionResponse>(`/courses/lessons/${lessonId}/submit`, formData),

  getSubmissionsByLesson: (lessonId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<LessonSubmissionResponse>>(`/courses/lessons/${lessonId}/submissions`, {
      params: { pageNumber, pageSize },
    }),

  reviewSubmission: (submissionId: number, status: string, reviewerComment: string, score?: number) =>
    api.post<LessonSubmissionResponse>(`/courses/submissions/${submissionId}/review`, {
      status,
      reviewer_comment: reviewerComment,
      score,
    }),

  // ── Admin endpoints ────────────────────────────────────────────────────────
  adminGetAll: (pageNumber = 0, pageSize = 50) =>
    api.get<PageResponse<CourseShortResponse>>('/courses', { params: { pageNumber, pageSize } }),

  adminGetBySchool: (schoolId: number, pageNumber = 0, pageSize = 50) =>
    api.get<PageResponse<CourseShortResponse>>(`/courses/school/${schoolId}`, {
      params: { pageNumber, pageSize },
    }),

  adminCreateCourse: (data: CreateCourseRequest) =>
    api.post<CourseResponse>('/courses', {
      name: data.name,
      description: data.description,
      ...(data.school_id != null && { school_id: data.school_id }),
    }),

  adminGetAllCourses: (pageNumber = 0, pageSize = 50) =>
    api.get<PageResponse<CourseShortResponse>>('/courses/all', { params: { pageNumber, pageSize } }),

  adminDeleteCourse: (courseId: number) =>
    api.delete<void>(`/courses/${courseId}`),

  addSchoolToCourse: (courseId: number, schoolId: number) =>
    api.post<CourseResponse>(`/courses/${courseId}/schools/${schoolId}`),

  removeSchoolFromCourse: (courseId: number, schoolId: number) =>
    api.delete<CourseResponse>(`/courses/${courseId}/schools/${schoolId}`),

  getCourseSchools: (courseId: number) =>
    api.get<CourseSchoolRef[]>(`/courses/${courseId}/schools`),

  getSubmissionsByCourse: (courseId: number, status?: string, pageNumber = 0, pageSize = 20) =>
    api.get<PageResponse<LessonSubmissionResponse>>(`/courses/${courseId}/submissions`, {
      params: { ...(status && { status }), pageNumber, pageSize },
    }),

  getCourseSummary: (courseId: number) =>
    api.get<CourseSummaryResponse>(`/courses/${courseId}/summary`),

  adminToggleActive: (courseId: number) =>
    api.patch<CourseResponse>(`/courses/${courseId}/toggle-active`),

  adminAddLesson: (courseId: number, data: CreateLessonRequest) =>
    api.post<CourseLessonResponse>(`/courses/${courseId}/lessons`, {
      title: data.title,
      lecture_content: data.lecture_content,
      practice_description: data.practice_description,
      submission_type: data.submission_type,
      order_number: data.order_number,
      video_url: data.video_url,
      max_score: data.max_score,
      submission_deadline: data.submission_deadline ?? null,
      category: data.category ?? 'LESSON',
      hearing_stage: data.hearing_stage ?? null,
    }),

  adminUpdateLesson: (courseId: number, lessonId: number, data: CreateLessonRequest) =>
    api.put<CourseLessonResponse>(`/courses/${courseId}/lessons/${lessonId}`, {
      title: data.title,
      lecture_content: data.lecture_content,
      practice_description: data.practice_description,
      submission_type: data.submission_type,
      order_number: data.order_number,
      video_url: data.video_url,
      max_score: data.max_score,
      submission_deadline: data.submission_deadline ?? null,
      category: data.category ?? 'LESSON',
      hearing_stage: data.hearing_stage ?? null,
    }),

  deleteLesson: (courseId: number, lessonId: number) =>
    api.delete<void>(`/courses/${courseId}/lessons/${lessonId}`),

  adminUploadLectureFile: (courseId: number, lessonId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<CourseLessonResponse>(`/courses/${courseId}/lessons/${lessonId}/upload-file`, fd);
  },

  // ── Course moderator endpoints ─────────────────────────────────────────────
  assignModerator: (accountId: number, courseId: number) =>
    api.post<CourseModeratorResponse>('/admin/course-moderators/assign', null, {
      params: { accountId, courseId },
    }),

  listModeratorsByCourse: (courseId: number) =>
    api.get<CourseModeratorResponse[]>(`/admin/course-moderators/course/${courseId}`),

  listCoursesByModerator: (accountId: number) =>
    api.get<CourseModeratorResponse[]>(`/admin/course-moderators/moderator/${accountId}`),

  removeCourseModerator: (accountId: number, courseId: number) =>
    api.delete('/admin/course-moderators/remove', {
      params: { accountId, courseId },
    }),

  myAssignedCourses: () =>
    api.get<CourseModeratorResponse[]>('/courses/my-moderated'),

  searchCourses: (query: string, pageNumber = 0, pageSize = 50) =>
    api.get<PageResponse<CourseShortResponse>>('/courses/search', { params: { query, pageNumber, pageSize } }),

  // ── Grading criteria endpoints (per lesson) ────────────────────────────────
  getLessonCriteria: (lessonId: number) =>
    api.get<GradingCriterionResponse[]>(`/courses/lessons/${lessonId}/criteria`),

  setLessonCriteria: (lessonId: number, criteria: Array<{ name: string; description?: string; max_points: number }>) =>
    api.put<GradingCriterionResponse[]>(`/courses/lessons/${lessonId}/criteria`, criteria),

  gradeSubmission: (submissionId: number, grades: CriterionScoreInput[], reviewerComment?: string) =>
    api.post<LessonSubmissionResponse>(`/courses/submissions/${submissionId}/grade`, {
      grades,
      reviewer_comment: reviewerComment,
    }),

  getSubmissionGrades: (submissionId: number) =>
    api.get<CriterionGradeResponse[]>(`/courses/submissions/${submissionId}/grades`),

  getSubmissionReviewHistory: (submissionId: number) =>
    api.get<SubmissionReviewHistoryEntry[]>(`/courses/submissions/${submissionId}/review-history`),

  // ── Hearing (слушания) endpoints ──────────────────────────────────────────

  submitHearing: (lessonId: number, groupId: number, file?: File) => {
    const fd = new FormData();
    fd.append('group_id', String(groupId));
    if (file) fd.append('file', file);
    return api.post<HearingSubmissionResponse>(`/courses/lessons/${lessonId}/hearing-submit`, fd);
  },

  resubmitHearing: (lessonId: number, groupId: number, file?: File) => {
    const fd = new FormData();
    fd.append('group_id', String(groupId));
    if (file) fd.append('file', file);
    return api.put<HearingSubmissionResponse>(`/courses/lessons/${lessonId}/hearing-submit`, fd);
  },

  getHearingSubmissions: (lessonId: number) =>
    api.get<HearingSubmissionResponse[]>(`/courses/lessons/${lessonId}/hearing-submissions`),

  getMyHearingSubmission: (lessonId: number, groupId: number) =>
    api.get<HearingSubmissionResponse | null>(`/courses/lessons/${lessonId}/my-hearing-submission`, {
      params: { group_id: groupId },
    }),

  reviewHearing: (submissionId: number, comment: string, grade: number, newStatus: string) =>
    api.post<HearingSubmissionResponse>(`/courses/hearing-submissions/${submissionId}/review`, {
      comment,
      grade,
      new_status: newStatus,
    }),
};
