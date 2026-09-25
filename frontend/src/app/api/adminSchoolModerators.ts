import api from './axios';

export interface SchoolModeratorResponse {
    id: number;
    accountId: number;
    nickname: string;
    schoolId: number;
    schoolName: string;
}

function normalizeSchoolModerator(raw: any): SchoolModeratorResponse {
    return {
        id: raw.id,
        accountId: raw.accountId ?? raw.account_id,
        nickname: raw.nickname,
        schoolId: raw.schoolId ?? raw.school_id,
        schoolName: raw.schoolName ?? raw.school_name,
    };
}

export const adminSchoolModeratorsApi = {
    assign: (accountId: number, schoolId: number) =>
        api.post('/admin/school-moderators/assign', null, {
            params: { accountId, schoolId },
        }).then((r) => ({ ...r, data: normalizeSchoolModerator(r.data) })),

    listBySchool: (schoolId: number) =>
        api.get(`/admin/school-moderators/school/${schoolId}`)
            .then((r) => ({ ...r, data: (r.data ?? []).map(normalizeSchoolModerator) })),

    listByModerator: (accountId: number) =>
        api.get(`/admin/school-moderators/moderator/${accountId}`)
            .then((r) => ({ ...r, data: (r.data ?? []).map(normalizeSchoolModerator) })),

    remove: (accountId: number, schoolId: number) =>
        api.delete('/admin/school-moderators/remove', {
            params: { accountId, schoolId },
        }),
};
