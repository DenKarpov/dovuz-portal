import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, Users, School, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { importExportApi, downloadBlob } from '../app/api/importExport';
import { toast } from 'sonner';

type Tab = 'schools' | 'students';

interface ImportResult {
    message: string;
    importedCount: number;
    items: string[];
}

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handle = (f: File) => {
        setFileName(f.name);
        onFile(f);
    };

    return (
        <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
            className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-slate-100'
            }`}
        >
            <input type="file" accept=".xlsx,.xls" className="sr-only"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
            <div className="size-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                <FileSpreadsheet className="size-6 text-indigo-500" />
            </div>
            {fileName ? (
                <div className="text-center">
                    <p className="text-sm font-semibold text-indigo-700">{fileName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Нажмите, чтобы изменить</p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Перетащите файл или нажмите для выбора</p>
                    <p className="text-xs text-slate-400 mt-0.5">Поддерживается формат .xlsx</p>
                </div>
            )}
        </label>
    );
}

export const ImportExportPage: React.FC = () => {
    const [tab, setTab] = useState<Tab>('schools');
    const [schoolFile, setSchoolFile] = useState<File | null>(null);
    const [studentFile, setStudentFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [exportingSchools, setExportingSchools] = useState(false);
    const [exportingStudents, setExportingStudents] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const handleExportSchools = async () => {
        setExportingSchools(true);
        try {
            const res = await importExportApi.exportSchools();
            downloadBlob(res.data, `schools_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`);
            toast.success('Файл школ скачан');
        } catch {
            toast.error('Ошибка экспорта школ');
        } finally {
            setExportingSchools(false);
        }
    };

    const handleExportStudents = async () => {
        setExportingStudents(true);
        try {
            const res = await importExportApi.exportStudents();
            downloadBlob(res.data, `students_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`);
            toast.success('Файл учеников скачан');
        } catch {
            toast.error('Ошибка экспорта учеников');
        } finally {
            setExportingStudents(false);
        }
    };

    const handleImportSchools = async () => {
        if (!schoolFile) return toast.error('Выберите файл');
        setImporting(true);
        setImportResult(null);
        try {
            const res = await importExportApi.importSchools(schoolFile);
            setImportResult({
                message: res.data.message,
                importedCount: res.data.importedCount,
                items: res.data.importedNames,
            });
            toast.success(`Импортировано ${res.data.importedCount} школ`);
            setSchoolFile(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка импорта');
        } finally {
            setImporting(false);
        }
    };

    const handleImportStudents = async () => {
        if (!studentFile) return toast.error('Выберите файл');
        setImporting(true);
        setImportResult(null);
        try {
            const res = await importExportApi.importStudents(studentFile);
            setImportResult({
                message: res.data.message,
                importedCount: res.data.importedCount,
                items: res.data.importedEmails,
            });
            toast.success(`Импортировано ${res.data.importedCount} учеников`);
            setStudentFile(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка импорта');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="flex items-center gap-3 mb-10"
            >
                <div className="size-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                    <FileSpreadsheet className="size-6 text-white" />
                </div>
                <div>
                    <h1 className="text-slate-900 text-2xl font-bold">📊 Импорт / Экспорт</h1>
                    <p className="text-slate-400">Загрузка и выгрузка данных в формате Excel</p>
                </div>
            </motion.div>

            {/* Quick export cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <School className="size-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Экспорт школ</p>
                            <p className="text-xs text-slate-400">Список всех школ с классами и учениками</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExportSchools}
                        disabled={exportingSchools}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-sm font-semibold border border-blue-100 disabled:opacity-50"
                    >
                        <Download className="size-4" />
                        {exportingSchools ? 'Подготовка...' : 'Скачать .xlsx'}
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Users className="size-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Экспорт учеников</p>
                            <p className="text-xs text-slate-400">Все аккаунты с ролью ученика</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExportStudents}
                        disabled={exportingStudents}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-50 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors text-sm font-semibold border border-violet-100 disabled:opacity-50"
                    >
                        <Download className="size-4" />
                        {exportingStudents ? 'Подготовка...' : 'Скачать .xlsx'}
                    </button>
                </motion.div>
            </div>

            {/* Import section */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    {(['schools', 'students'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setImportResult(null); }}
                            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                                tab === t
                                    ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/30'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {t === 'schools' ? '🏫 Импорт школ' : '👤 Импорт учеников'}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-5">
                    {tab === 'schools' ? (
                        <>
                            {/* Format hint */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600">
                                <p className="font-semibold text-slate-700 mb-2">📋 Формат файла для импорта школ</p>
                                <div className="font-mono text-xs bg-white rounded-lg border border-slate-100 p-3 space-y-0.5">
                                    <p className="text-slate-400">Строка 1 (заголовок — пропускается):</p>
                                    <p><span className="text-indigo-600">A:</span> Название школы</p>
                                    <p className="text-slate-400 mt-1">Пример данных:</p>
                                    <p><span className="text-indigo-600">A2:</span> МБОУ «Школа №5»</p>
                                    <p><span className="text-indigo-600">A3:</span> Гимназия №1</p>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Дубликаты по названию пропускаются автоматически.</p>
                            </div>
                            <UploadZone onFile={setSchoolFile} />
                            <button
                                onClick={handleImportSchools}
                                disabled={importing || !schoolFile}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold transition-colors"
                            >
                                <Upload className="size-4" />
                                {importing ? 'Импортирование...' : 'Начать импорт школ'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600">
                                <p className="font-semibold text-slate-700 mb-2">📋 Формат файла для импорта учеников</p>
                                <div className="font-mono text-xs bg-white rounded-lg border border-slate-100 p-3 space-y-0.5">
                                    <p className="text-slate-400">Строка 1 (заголовок — пропускается):</p>
                                    <p>
                                        <span className="text-indigo-600">A:</span> Email &nbsp;
                                        <span className="text-indigo-600">B:</span> Никнейм &nbsp;
                                        <span className="text-indigo-600">C:</span> Имя &nbsp;
                                        <span className="text-indigo-600">D:</span> Фамилия &nbsp;
                                        <span className="text-indigo-600">E:</span> Школа &nbsp;
                                        <span className="text-indigo-600">F:</span> Класс
                                    </p>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 font-medium">
                                    ⚠️ Временный пароль: <code className="bg-amber-50 px-1 rounded">ChangeMe123!</code> — попросите учеников сменить после первого входа.
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Аккаунты с существующим email пропускаются. Школа и класс должны уже существовать в системе.</p>
                            </div>
                            <UploadZone onFile={setStudentFile} />
                            <button
                                onClick={handleImportStudents}
                                disabled={importing || !studentFile}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold transition-colors"
                            >
                                <Upload className="size-4" />
                                {importing ? 'Импортирование...' : 'Начать импорт учеников'}
                            </button>
                        </>
                    )}

                    {/* Import result */}
                    {importResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="size-5 text-emerald-600" />
                                <p className="font-semibold text-emerald-700">
                                    {importResult.message} — {importResult.importedCount} записей
                                </p>
                            </div>
                            {importResult.items.length > 0 && (
                                <ul className="text-xs text-emerald-600 space-y-0.5 max-h-40 overflow-y-auto">
                                    {importResult.items.map((item, i) => (
                                        <li key={i}>✓ {item}</li>
                                    ))}
                                </ul>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};