import api from './axios';

export interface SetVerificationTimeResponse {
  cron: string;
}

export const schedulerApi = {
  setVerificationTime: (cron: string) =>
    api.post<SetVerificationTimeResponse>('/scheduler', { cron }),
};
