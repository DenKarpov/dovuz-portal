import React from 'react';
import { Download, FileText } from 'lucide-react';
import { filesApi } from '../api/files';
import { toast } from 'sonner';
import type { FileInfo } from '../api/newsPublications';

interface FileListProps {
  files: FileInfo[];
}

export const FileList: React.FC<FileListProps> = ({ files }) => {
  if (!files || files.length === 0) return null;

  const handleDownload = async (file: FileInfo) => {
    try {
      await filesApi.downloadFile(file.file_name_in_directory, file.initial_file_name);
    } catch {
      toast.error('Ошибка при загрузке файла');
    }
  };

  const getExtension = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'FILE';

  const extColors: Record<string, string> = {
    PDF: 'bg-red-100 text-red-700',
    DOC: 'bg-blue-100 text-blue-700',
    DOCX: 'bg-blue-100 text-blue-700',
    PPT: 'bg-orange-100 text-orange-700',
    PPTX: 'bg-orange-100 text-orange-700',
    JPG: 'bg-green-100 text-green-700',
    PNG: 'bg-green-100 text-green-700',
  };

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-2">Прикреплённые файлы ({files.length}):</p>
      <div className="flex flex-col gap-2">
        {files.map((file) => {
          const ext = getExtension(file.initial_file_name);
          const colorClass = extColors[ext] ?? 'bg-gray-100 text-gray-700';
          return (
            <button
              key={file.id}
              onClick={() => handleDownload(file)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors group text-left"
            >
              <div className={`flex items-center justify-center size-9 rounded-lg text-xs ${colorClass}`} style={{ fontWeight: 700 }}>
                {ext}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{file.initial_file_name}</p>
              </div>
              <Download className="size-4 text-gray-400 group-hover:text-blue-600 shrink-0 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
