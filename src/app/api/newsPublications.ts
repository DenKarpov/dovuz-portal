import api from './axios';
import type { PageResponse } from './accounts';

export interface FileInfo {
  id: number;
  file_name_in_directory: string;
  initial_file_name: string;
}

export interface PublicationResponse {
  id: number;
  title: string;
  description: string;
  created_at: string;
  nickname: string;
  files: FileInfo[];
}

export const newsPublicationsApi = {
  create: (formData: FormData) =>
    api.post<PublicationResponse>('/news_publications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAll: (pageNumber: number, pageSize: number) =>
    api.get<PageResponse<PublicationResponse>>('/news_publications', {
      params: { pageNumber, pageSize },
    }),
};
