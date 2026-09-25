import api from './axios';
import type { PageResponse } from './accounts';

export interface SubjectTopicSubjectDto {
    id: number;
    name: string;
}

export interface SubjectTopicResponse {
    id: number;
    name: string;
    // Поле называется "subject" в JSON благодаря @JsonProperty("subject") на SubjectTopicResponseDto
    subject: SubjectTopicSubjectDto;
}

export const subjectTopicsApi = {
    getBySubject: (subjectId: number, pageNumber: number, pageSize: number) =>
        api.get<PageResponse<SubjectTopicResponse>>('/subject-topics', {
            params: { subjectId, pageNumber, pageSize },
        }),

    getById: (id: number) =>
        api.get<SubjectTopicResponse>(`/subject-topics/${id}`),

    create: (name: string, subjectId: number) =>
        api.post<SubjectTopicResponse>('/subject-topics', { name, subjectId }),

    update: (id: number, name: string) =>
        api.put<SubjectTopicResponse>(`/subject-topics/${id}`, { name }),

    delete: (id: number) =>
        api.delete<void>(`/subject-topics/${id}`),
};