import api from './axios';
import type { PageResponse } from './accounts';

// DTO ответа с вложенным объектом subject
export interface SubjectResponse {
    id: number;
    name: string;
    directionId: number;
    directionName: string;
}

export interface SubjectTopicResponse {
    id: number;
    name: string;
    subject: SubjectResponse; // Вложенный объект, а не отдельные поля
}

export const subjectTopicsApi = {
    getBySubject: (subjectId: number, pageNumber: number, pageSize: number) =>
        api.get<PageResponse<SubjectTopicResponse>>('/subject-topics', {
            params: { subjectId, pageNumber, pageSize },
        }),

    create: (name: string, subjectId: number) =>
        api.post<SubjectTopicResponse>('/subject-topics', {
            name,
            subjectId,
        }),
};