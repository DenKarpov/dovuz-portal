import api from './axios';

export interface SubjectModeratorResponse {
    id: number;
    accountId: number;
    nickname: string;
    subjectId: number;
    subjectName: string;
}

export const adminModeratorsApi = {
    assign: (accountId: number, subjectId: number) =>
        api.post<SubjectModeratorResponse>('/admin/moderators/assign', null, {
            params: { accountId, subjectId },
        }),

    listBySubject: (id: number) =>
        api.get<SubjectModeratorResponse[]>(`/admin/moderators/subject/${id}`),

    remove: (accountId: number, subjectId: number) =>
        api.delete('/admin/moderators/remove', {
            params: { accountId, subjectId },
        }),
};
