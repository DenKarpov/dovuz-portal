import api from './axios';
import type { PageResponse } from './accounts';

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
};
