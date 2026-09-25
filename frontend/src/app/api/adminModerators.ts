import api from './axios';

export interface SubjectModeratorResponse {
    id: number;
    accountId: number;
    nickname: string;
    subjectId: number;
    subjectName: string;
}

/** Нормализуем ответ: бэкенд может отдавать как camelCase, так и snake_case */
function normalize(raw: any): SubjectModeratorResponse {
    return {
        id: raw.id,
        accountId: raw.accountId ?? raw.account_id,
        nickname: raw.nickname,
        subjectId: raw.subjectId ?? raw.subject_id,
        subjectName: raw.subjectName ?? raw.subject_name,
    };
}

export const adminModeratorsApi = {
    assign: (accountId: number, subjectId: number) =>
        api.post<SubjectModeratorResponse>('/admin/moderators/assign', null, {
            params: {accountId, subjectId},
        }).then(r => ({...r, data: normalize(r.data)})),

    listBySubject: (id: number) =>
        api.get<SubjectModeratorResponse[]>(`/admin/moderators/subject/${id}`)
            .then(r => ({...r, data: (r.data ?? []).map(normalize)})),

    remove: (accountId: number, subjectId: number) =>
        api.delete('/admin/moderators/remove', {
            params: {accountId, subjectId},
        }),
    getMySubjects: () =>
        api.get<SubjectModeratorResponse[]>('/admin/moderators/my')
            .then(r => r.data.map(normalize)),
};