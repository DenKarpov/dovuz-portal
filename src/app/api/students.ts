import api from './axios';
import type { PageResponse } from './accounts';

export interface RatingWorkSnippet {
    kind: 'LESSON' | 'HEARING';
    course_id: number;
    course_name: string;
    lesson_id: number;
    lesson_title: string;
    group_title?: string | null;
    text_content?: string | null;
    file_name?: string | null;
    file_name_in_directory?: string | null;
    score?: number | null;
    representative_grade?: number | null;
    status?: string | null;
}

export interface StudentRatingResponse {
    account_id: number;
    nickname: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    school_name?: string;
    class_name?: string;
    project_rating?: number;
    course_rating?: number;
    combined_rating?: number;
    is_lagging: boolean;
    course_rating_work?: RatingWorkSnippet | null;
    project_rating_work?: RatingWorkSnippet | null;
}

export const studentsApi = {
    getRatings: (schoolId: number | undefined, pageNumber: number, pageSize: number, classId?: number) =>
        api.get<PageResponse<StudentRatingResponse>>('/students/rating', {
            params: {
                ...(schoolId != null ? { schoolId } : {}),
                pageNumber,
                pageSize,
                ...(classId ? { classId } : {}),
            },
        }),

    getLagging: (schoolId: number | undefined, pageNumber: number, pageSize: number) =>
        api.get<PageResponse<StudentRatingResponse>>('/students/lagging', {
            params: {
                ...(schoolId != null ? { schoolId } : {}),
                pageNumber,
                pageSize,
            },
        }),

    /** Снять отметку отстающего с ученика */
    unmarkLagging: (accountId: number) =>
        api.post(`/students/lagging/${accountId}/unmark`),

    /** Перенести отстающего ученика в курс для отстающих */
    transferToLaggingCourse: (accountId: number, targetCourseId: number) =>
        api.post(`/students/lagging/${accountId}/transfer`, { target_course_id: targetCourseId }),
};