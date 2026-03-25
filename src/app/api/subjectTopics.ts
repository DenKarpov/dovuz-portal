import api from './axios';
import type { PageResponse } from './accounts';

export interface SubjectTopicResponse {
  id: number;
  name: string;
  subjectId: number;
  subjectName: string;
  topicTypeName: string;
}

export const subjectTopicsApi = {
  getBySubject: (subjectId: number, pageNumber: number, pageSize: number) =>
    api.get<PageResponse<SubjectTopicResponse>>('/subject-topics', {
      params: { subjectId, pageNumber, pageSize },
    }),

  create: (name: string, subjectId: number, topicTypeId: number) =>
    api.post<SubjectTopicResponse>('/subject-topics', {
      name,
      subjectId,
      topicTypeId,
    }),
};
