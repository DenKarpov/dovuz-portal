import api from './axios';

export interface SchoolModeratorResponse {
    id: number;
    accountId: number;
    nickname: string;
    schoolId: number;
    schoolName: string;
}

export const adminSchoolModeratorsApi = {
    assign: (accountId: number, schoolId: number) =>
        api.post<SchoolModeratorResponse>('/admin/school-moderators/assign', null, {
            params: { accountId, schoolId },
        }),

    listBySchool: (schoolId: number) =>
        api.get<SchoolModeratorResponse[]>(`/admin/school-moderators/school/${schoolId}`),

    listByModerator: (accountId: number) =>
        api.get<SchoolModeratorResponse[]>(`/admin/school-moderators/moderator/${accountId}`),

    remove: (accountId: number, schoolId: number) =>
        api.delete('/admin/school-moderators/remove', {
            params: { accountId, schoolId },
        }),
};
