import React, { useState } from 'react';
import {
    Upload, Download, FileSpreadsheet, Users, School, CheckCircle,
    Shield, GraduationCap, FileDown,
} from 'lucide-react';
import { importExportApi, downloadBlob } from '../app/api/importExport';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type ImportTab = 'schools' | 'students' | 'moderators';

interface ImportResult {
    message: string;
    importedCount: number;
    items: string[];
}

function UploadZone({ onFile, fileName }: { onFile: (f: File) => void; fileName?: string | null }) {
    const [dragOver, setDragOver] = useState(false);
    return (
        <label
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
            className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-slate-100'
            }`}
        >
            <input type="file" accept=".xlsx,.xls" className="sr-only"
                   onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            <div className="size-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                <FileSpreadsheet className="size-6 text-blue-500" />
            </div>
            {fileName ? (
                <div className="text-center">
                    <p className="text-sm font-semibold text-blue-700">{fileName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Нажмите, чтобы изменить</p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Перетащите или нажмите для выбора</p>
                    <p className="text-xs text-slate-400 mt-0.5">Поддерживается .xlsx</p>
                </div>
            )}
        </label>
    );
}

export const ImportExportPage: React.FC = () => {
    const [tab, setTab] = useState<ImportTab>('schools');
    const [schoolFile, setSchoolFile] = useState<File | null>(null);
    const [studentFile, setStudentFile] = useState<File | null>(null);
    const [moderatorFile, setModeratorFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [exportingSchools, setExportingSchools] = useState(false);
    const [exportingStudents, setExportingStudents] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const downloadExampleSchools = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Название школы'],
            ['ГБОУ Школа "Свиблово"'],
            ['ГБОУ Школа имени Маяковского'],
            ['ГБОУ Школа № 1158'],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Школы');
        XLSX.writeFile(wb, 'example_schools_import.xlsx');
        toast.success('Пример файла школ скачан');
    };

    const downloadExampleStudents = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Email', 'Nickname', 'Имя', 'Фамилия', 'Школа', 'Класс'],
            ['kater1@gmail.com', 'kate183', 'Катерина', 'Бельская', 'Лицей №10', '11-Б'],
            ['ivanov@example.com', 'ivan2024', 'Иван', 'Иванов', 'ГБОУ Школа №1158', '10-А'],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ученики');
        XLSX.writeFile(wb, 'example_students_import.xlsx');
        toast.success('Пример файла учеников скачан');
    };

    const downloadExampleModerators = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Email', 'Nickname', 'Имя', 'Фамилия', 'Отчество'],
            ['moderator1@example.com', 'mod1', 'Анна', 'Смирнова', 'Александровна'],
            ['moderator2@example.com', 'mod2', 'Дмитрий', 'Кузнецов', 'Игоревич'],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Модераторы');
        XLSX.writeFile(wb, 'example_moderators_import.xlsx');
        toast.success('Пример файла модераторов скачан');
    };

    const handleExportSchools = async () => {
        setExportingSchools(true);
        try {
            const res = await importExportApi.exportSchools();
            downloadBlob(res.data, `schools_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`);
            toast.success('Файл школ скачан');
        } catch { toast.error('Ошибка экспорта школ'); }
        finally { setExportingSchools(false); }
    };

    const handleExportStudents = async () => {
        setExportingStudents(true);
        try {
            const res = await importExportApi.exportStudents();
            downloadBlob(res.data, `students_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`);
            toast.success('Файл учеников скачан');
        } catch { toast.error('Ошибка экспорта учеников'); }
        finally { setExportingStudents(false); }
    };

    const handleImportSchools = async () => {
        if (!schoolFile) return toast.error('Выберите файл');
        setImporting(true); setImportResult(null);
        try {
            const res = await importExportApi.importSchools(schoolFile);
            setImportResult({ message: res.data.message, importedCount: res.data.importedCount, items: res.data.importedNames });
            toast.success(`Импортировано ${res.data.importedCount} школ`);
            setSchoolFile(null);
        } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка импорта'); }
        finally { setImporting(false); }
    };

    const handleImportStudents = async () => {
        if (!studentFile) return toast.error('Выберите файл');
        setImporting(true); setImportResult(null);
        try {
            const res = await importExportApi.importStudents(studentFile);
            setImportResult({ message: res.data.message, importedCount: res.data.importedCount, items: res.data.importedEmails });
            toast.success(`Импортировано ${res.data.importedCount} учеников`);
            setStudentFile(null);
        } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка импорта'); }
        finally { setImporting(false); }
    };

    const handleImportModerators = async () => {
        if (!moderatorFile) return toast.error('Выберите файл');
        setImporting(true); setImportResult(null);
        try {
            const fd = new FormData();
            fd.append('file', moderatorFile);
            const { default: api } = await import('../app/api/axios');
            const res = await api.post<{ message: string; importedCount: number; importedEmails: string[] }>(
                '/admin/import-export/moderators/import', fd,
            );
            setImportResult({ message: res.data.message, importedCount: res.data.importedCount, items: res.data.importedEmails });
            toast.success(`Импортировано ${res.data.importedCount} модераторов`);
            setModeratorFile(null);
        } catch (err: any) { toast.error(err.response?.data?.message ?? 'Ошибка импорта'); }
        finally { setImporting(false); }
    };

    const TABS: { key: ImportTab; label: string; icon: React.ReactNode }[] = [
        { key: 'schools',    label: 'Школы',      icon: <School className="size-4" /> },
        { key: 'students',   label: 'Ученики',     icon: <GraduationCap className="size-4" /> },
        { key: 'moderators', label: 'Модераторы',  icon: <Shield className="size-4" /> },
    ];

    return (
        <div className="space-y-5">

            {/* ── Экспорт ── */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="size-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <Download className="size-4 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-slate-800 font-semibold text-sm">Экспорт данных</h2>
                        <p className="text-slate-400 text-xs">Выгрузка данных в формате .xlsx</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <School className="size-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">Экспорт школ</p>
                                <p className="text-xs text-slate-400">Школы с классами и числом учеников</p>
                            </div>
                        </div>
                        <button onClick={handleExportSchools} disabled={exportingSchools}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 text-sm font-semibold border border-blue-100 disabled:opacity-50 transition-colors">
                            <Download className="size-4" />
                            {exportingSchools ? 'Подготовка...' : 'Скачать .xlsx'}
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <Users className="size-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">Экспорт учеников</p>
                                <p className="text-xs text-slate-400">Все аккаунты с ролью ученика</p>
                            </div>
                        </div>
                        <button onClick={handleExportStudents} disabled={exportingStudents}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 text-sm font-semibold border border-blue-100 disabled:opacity-50 transition-colors">
                            <Download className="size-4" />
                            {exportingStudents ? 'Подготовка...' : 'Скачать .xlsx'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Импорт ── */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="size-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                        <Upload className="size-4 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-slate-800 font-semibold text-sm">Импорт данных</h2>
                        <p className="text-slate-400 text-xs">Загрузка из файла .xlsx; дубликаты пропускаются</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100">
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => { setTab(t.key); setImportResult(null); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                                        tab === t.key
                                            ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/30'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}>
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-5 space-y-4">

                        {/* Schools */}
                        {tab === 'schools' && (
                            <>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-700 mb-2 text-xs">Формат файла — импорт школ</p>
                                            <div className="font-mono text-xs bg-white rounded-lg border border-slate-100 p-3 space-y-0.5">
                                                <p className="text-slate-400">Строка 1 (заголовок)</p>
                                                <p><span className="text-blue-600">A:</span> Название школы</p>
                                                <p className="text-slate-400 mt-1">Пример:</p>
                                                <p><span className="text-blue-600">A2:</span> ГБОУ Школа "Свиблово"</p>
                                            </div>
                                        </div>
                                        <button onClick={downloadExampleSchools}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0">
                                            <FileDown className="size-3.5" /> Скачать пример
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Дубликаты по названию пропускаются автоматически.</p>
                                </div>
                                <UploadZone onFile={setSchoolFile} fileName={schoolFile?.name} />
                                <button onClick={handleImportSchools} disabled={importing || !schoolFile}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-colors">
                                    <Upload className="size-4" />
                                    {importing ? 'Импортирование...' : 'Начать импорт школ'}
                                </button>
                            </>
                        )}

                        {/* Students */}
                        {tab === 'students' && (
                            <>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-700 mb-2 text-xs">Формат файла — импорт учеников</p>
                                            <div className="font-mono text-xs bg-white rounded-lg border border-slate-100 p-3 space-y-0.5">
                                                <p className="text-slate-400">Строка 1 (заголовок)</p>
                                                <p>
                                                    <span className="text-blue-600">A:</span> Email &nbsp;
                                                    <span className="text-blue-600">B:</span> Никнейм &nbsp;
                                                    <span className="text-blue-600">C:</span> Имя &nbsp;
                                                    <span className="text-blue-600">D:</span> Фамилия &nbsp;
                                                    <span className="text-blue-600">E:</span> Школа &nbsp;
                                                    <span className="text-blue-600">F:</span> Класс
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={downloadExampleStudents}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0">
                                            <FileDown className="size-3.5" /> Скачать пример
                                        </button>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-xs text-amber-600 font-medium">
                                            Временный пароль: <code className="bg-amber-50 px-1 rounded font-mono">ChangeMe123!</code> — попросите учеников сменить после входа.
                                        </p>
                                        <p className="text-xs text-blue-600 font-medium">
                                            Роль: автоматически назначается <strong>ROLE_USER</strong> (ученик).
                                        </p>
                                        <p className="text-xs text-slate-400">Аккаунты с существующим email пропускаются.</p>
                                    </div>
                                </div>
                                <UploadZone onFile={setStudentFile} fileName={studentFile?.name} />
                                <button onClick={handleImportStudents} disabled={importing || !studentFile}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-colors">
                                    <Upload className="size-4" />
                                    {importing ? 'Импортирование...' : 'Начать импорт учеников'}
                                </button>
                            </>
                        )}

                        {/* Moderators */}
                        {tab === 'moderators' && (
                            <>
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-sm text-slate-600">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-emerald-800 mb-2 flex items-center gap-1.5 text-xs">
                                                <Shield className="size-3.5 text-emerald-600" />
                                                Формат файла — импорт модераторов
                                            </p>
                                            <div className="font-mono text-xs bg-white rounded-lg border border-emerald-100 p-3 space-y-0.5">
                                                <p className="text-slate-400">Строка 1 (заголовок)</p>
                                                <p>
                                                    <span className="text-emerald-600">A:</span> Email &nbsp;
                                                    <span className="text-emerald-600">B:</span> Никнейм &nbsp;
                                                    <span className="text-emerald-600">C:</span> Имя &nbsp;
                                                    <span className="text-emerald-600">D:</span> Фамилия &nbsp;
                                                    <span className="text-emerald-600">E:</span> Отчество
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={downloadExampleModerators}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap shrink-0">
                                            <FileDown className="size-3.5" /> Скачать пример
                                        </button>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-xs text-amber-600 font-medium">
                                            Временный пароль: <code className="bg-amber-50 px-1 rounded font-mono">ChangeMe123!</code>
                                        </p>
                                        <p className="text-xs text-emerald-700 font-medium">
                                            Роль: автоматически назначается <strong>ROLE_MODERATOR</strong>.
                                        </p>
                                        <p className="text-xs text-slate-500">Поля «Школа» и «Класс» для модераторов не предусмотрены.</p>
                                        <p className="text-xs text-slate-400">После импорта назначьте модераторов на предметы через вкладку «Мод. предметов».</p>
                                    </div>
                                </div>
                                <UploadZone onFile={setModeratorFile} fileName={moderatorFile?.name} />
                                <button onClick={handleImportModerators} disabled={importing || !moderatorFile}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-semibold transition-colors">
                                    <Upload className="size-4" />
                                    {importing ? 'Импортирование...' : 'Начать импорт модераторов'}
                                </button>
                            </>
                        )}

                        {/* Result */}
                        {importResult && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                                    <p className="font-semibold text-emerald-700 text-sm">
                                        {importResult.message} — {importResult.importedCount} записей
                                    </p>
                                </div>
                                {importResult.items.length > 0 && (
                                    <ul className="text-xs text-emerald-600 space-y-0.5 max-h-40 overflow-y-auto">
                                        {importResult.items.map((item, i) => <li key={i}>✓ {item}</li>)}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};