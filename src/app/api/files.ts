import api from './axios';

const BASE_URL = 'http://localhost:8080/v1';

export const filesApi = {
  downloadFile: async (fileNameInDirectory: string, initialFileName: string) => {
    const response = await api.get(`/files/${fileNameInDirectory}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = initialFileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  getPhotoUrl: (filename: string) => `${BASE_URL}/files/photos/${filename}`,
};
