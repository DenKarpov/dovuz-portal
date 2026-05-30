import api from './axios';
import type { PageResponse } from './accounts';

export interface SubjectResponse {
    id: number;
    name: string;
    // directionId и directionName отсутствуют в SubjectResponseDto бэкенда,
    // добавляем опциональными для обратной совместимости
    directionId?: number;
    directionName?: string;
}

export interface SubjectModeratorResponse {
    id: number;
    accountId: number;
    nickname: string;
    subjectId: number;
    subjectName: string;
}

export const subjectsApi = {
    getByDirection: (directionId: number, pageNumber: number, pageSize: number) =>
        api.get<PageResponse<SubjectResponse>>('/subjects', {
            params: { directionId, pageNumber, pageSize },
        }),

    getById: (id: number) =>
        api.get<SubjectResponse>(`/subjects/${id}`),

    create: (name: string, directionId: number) =>
        api.post<SubjectResponse>('/subjects', { name, directionId }),

    update: (id: number, name: string) =>
        api.put<SubjectResponse>(`/subjects/${id}`, { name }),

    delete: (id: number) =>
        api.delete<void>(`/subjects/${id}`),

};