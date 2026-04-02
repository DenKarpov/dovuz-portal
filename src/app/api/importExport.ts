import api from './axios';

export const importExportApi = {
    /** Скачать Excel со списком школ */
    exportSchools: () =>
        api.get('/admin/import-export/schools/export', { responseType: 'blob' }),

    /** Скачать Excel со списком учеников */
    exportStudents: () =>
        api.get('/admin/import-export/students/export', { responseType: 'blob' }),

    /** Импортировать школы из Excel (.xlsx) */
    importSchools: (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.post<{ message: string; importedCount: number; importedNames: string[] }>(
            '/admin/import-export/schools/import',
            fd,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
    },

    /** Импортировать учеников из Excel (.xlsx) */
    importStudents: (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.post<{ message: string; importedCount: number; importedEmails: string[] }>(
            '/admin/import-export/students/import',
            fd,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
    },
};

/** Вспомогательная функция: скачивает blob как файл */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}