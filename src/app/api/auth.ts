import api from './axios';

export interface AuthResponse {
    nickname: string;
    role: string;
}

export const authApi = {
    register: (email: string, nickname: string, password: string) =>
        api.post<AuthResponse>('/auth/register', { email, nickname, password }),

    login: (email: string, password: string) =>
        api.post<AuthResponse>('/auth/login', { email, password }),
};
