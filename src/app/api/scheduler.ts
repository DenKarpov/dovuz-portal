import api from './axios';

export interface SetScheduleResponse {
  cron: string;
}

export const schedulerApi = {
  /** POST /v1/scheduler — установить cron удаления комментариев */
  setVerificationTime: (cron: string) =>
      api.post<SetScheduleResponse>('/scheduler', { cron }),

  /** POST /v1/scheduler/run-comments — запустить удаление комментариев сейчас */
  runDeleteCommentsNow: () =>
      api.post<{ message: string }>('/scheduler/run-comments'),

  /** POST /v1/scheduler/lagging-check — установить cron проверки отстающих */
  setLaggingCheckTime: (cron: string) =>
      api.post<SetScheduleResponse>('/scheduler/lagging-check', { cron }),

  /** POST /v1/scheduler/run-lagging-check — запустить проверку отстающих сейчас */
  runLaggingCheckNow: () =>
      api.post<{ marked: number; message: string }>('/scheduler/run-lagging-check'),
};