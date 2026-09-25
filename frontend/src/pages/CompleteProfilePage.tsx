import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight, User, Calendar, School, Image, FileText, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { accountsApi } from '../app/api/accounts';
import { schoolsApi, type SchoolResponse } from '../app/api/schools';
import { schoolClassesApi, type SchoolClassResponse } from '../app/api/schoolClasses';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface StepField {
    id: string;
    label: string;
    icon: React.ReactNode;
    required?: boolean;
}

const STEPS: { title: string; subtitle: string; icon: React.ReactNode; fields: StepField[] }[] = [
    {
        title: 'Личные данные',
        subtitle: 'Расскажите о себе',
        icon: <User className="size-5 text-white" />,
        fields: [
            { id: 'lastName', label: 'Фамилия', icon: <User className="size-4 text-slate-400" /> },
            { id: 'firstName', label: 'Имя', icon: <User className="size-4 text-slate-400" /> },
            { id: 'middleName', label: 'Отчество', icon: <User className="size-4 text-slate-400" /> },
            { id: 'birthDate', label: 'Дата рождения', icon: <Calendar className="size-4 text-slate-400" /> },
        ],
    },
    {
        title: 'Учёба',
        subtitle: 'Ваша школа и класс',
        icon: <School className="size-5 text-white" />,
        fields: [
            { id: 'school', label: 'Школа', icon: <School className="size-4 text-slate-400" /> },
            { id: 'class', label: 'Класс', icon: <BookOpen className="size-4 text-slate-400" /> },
        ],
    },
    {
        title: 'О себе',
        subtitle: 'Напишите пару слов',
        icon: <FileText className="size-5 text-white" />,
        fields: [
            { id: 'description', label: 'Описание', icon: <FileText className="size-4 text-slate-400" /> },
        ],
    },
    {
        title: 'Фото',
        subtitle: 'Добавьте аватар',
        icon: <Image className="size-5 text-white" />,
        fields: [
            { id: 'photo', label: 'Фото профиля', icon: <Image className="size-4 text-slate-400" /> },
        ],
    },
];

function calcPercent(form: Record<string, string>, photo: File | null, schoolId: string, classId: string, showSchool: boolean): number {
    const fields = [
        form.firstName, form.lastName, form.middleName, form.birthDate,
        form.description, photo ? 'yes' : '',
        ...(showSchool ? [schoolId, classId] : []),
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export const CompleteProfilePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const showSchool = user?.role === 'Пользователь';
    const ACTIVE_STEPS = showSchool ? STEPS : STEPS.filter(s => s.title !== 'Учёба');
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({ firstName: '', lastName: '', middleName: '', birthDate: '', description: '' });
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [schools, setSchools] = useState<SchoolResponse[]>([]);
    const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
    const [schoolId, setSchoolId] = useState('');
    const [classId, setClassId] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const percent = calcPercent(form, photo, schoolId, classId, showSchool);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        schoolsApi.getAll().then(r => setSchools(r.data)).catch(() => {});
    }, [user]);

    const handleSchoolChange = async (id: string) => {
        setSchoolId(id);
        setClassId('');
        if (id) {
            const r = await schoolClassesApi.getBySchool(Number(id)).catch(() => ({ data: [] }));
            setClasses(r.data);
        } else {
            setClasses([]);
        }
    };

    const handlePhotoChange = (file: File) => {
        setPhoto(file);
        const reader = new FileReader();
        reader.onload = e => setPhotoPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!form.firstName.trim() || !form.lastName.trim() || !form.middleName.trim()) {
            toast.error('Пожалуйста, заполните ФИО (фамилия, имя, отчество)');
            return;
        }
        if (showSchool && !schoolId) {
            toast.error('Пожалуйста, выберите школу');
            return;
        }
        if (showSchool && !classId) {
            toast.error('Пожалуйста, выберите класс');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            if (form.firstName.trim()) fd.append('firstName', form.firstName.trim());
            if (form.lastName.trim()) fd.append('lastName', form.lastName.trim());
            if (form.middleName.trim()) fd.append('middleName', form.middleName.trim());
            if (form.birthDate) fd.append('birthDate', form.birthDate);
            if (form.description.trim()) fd.append('description', form.description.trim());
            if (showSchool && schoolId) fd.append('schoolId', schoolId);
            if (showSchool && classId) fd.append('classId', classId);
            if (user?.nickname) fd.append('nickname', user.nickname);
            if (photo) fd.append('photo', photo);
            await accountsApi.saveInfo(fd);
            setSaved(true);
            toast.success('Профиль заполнен!');
            setTimeout(() => navigate('/'), 1500);
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const circumference = 2 * Math.PI * 32;
    const dashOffset = circumference - (percent / 100) * circumference;

    const color = percent === 100 ? '#10b981' : percent >= 50 ? '#3b82f6' : '#f59e0b';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-white text-3xl font-bold mb-2">Завершите регистрацию</h1>
                    <p className="text-slate-400">Заполните профиль, чтобы стать частью сообщества</p>
                </motion.div>

                {/* Progress ring + percent */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-center mb-8"
                >
                    <div className="relative size-24">
                        <svg className="size-24 -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                            <circle
                                cx="40" cy="40" r="32" fill="none"
                                stroke={color}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-white text-xl font-bold leading-none">{percent}%</span>
                            <span className="text-slate-400 text-[10px] mt-0.5">готово</span>
                        </div>
                    </div>
                </motion.div>


                {/* Steps nav */}
                <div className="flex items-center gap-2 mb-8">
                    {ACTIVE_STEPS.map((s, i) => (
                        <React.Fragment key={i}>
                            <button
                                onClick={() => setStep(i)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-1 justify-center ${
                                    i === step
                                        ? 'bg-blue-600 text-white'
                                        : i < step
                                            ? 'bg-blue-900/50 text-blue-300'
                                            : 'bg-white/5 text-slate-500'
                                }`}
                            >
                                <span className="hidden sm:inline">{s.title}</span>
                                <span className="sm:hidden">{i + 1}</span>
                            </button>
                            {i < ACTIVE_STEPS.length - 1 && <ChevronRight className="size-4 text-slate-600 shrink-0" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm mb-5"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                {ACTIVE_STEPS[step].icon}
                            </div>
                            <div>
                                <h2 className="text-white font-bold">{ACTIVE_STEPS[step].title}</h2>
                                <p className="text-slate-400 text-sm">{ACTIVE_STEPS[step].subtitle}</p>
                            </div>
                        </div>

                        {ACTIVE_STEPS[step].title === 'Личные данные' && (
                            <div className="space-y-4">
                                {[
                                    { key: 'lastName', label: 'Фамилия', placeholder: 'Иванов' },
                                    { key: 'firstName', label: 'Имя', placeholder: 'Иван' },
                                    { key: 'middleName', label: 'Отчество', placeholder: 'Иванович' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="block text-slate-300 text-sm font-medium mb-1.5">{f.label}</label>
                                        <input
                                            type="text"
                                            value={(form as any)[f.key]}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            placeholder={f.placeholder}
                                            className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Дата рождения</label>
                                    <input
                                        type="date"
                                        value={form.birthDate}
                                        onChange={e => setForm({ ...form, birthDate: e.target.value })}
                                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {ACTIVE_STEPS[step].title === 'Учёба' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Школа</label>
                                    <select
                                        value={schoolId}
                                        onChange={e => handleSchoolChange(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    >
                                        <option value="" className="text-slate-800">Выберите школу</option>
                                        {schools.map(s => (
                                            <option key={s.id} value={s.id} className="text-slate-800">{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {classes.length > 0 && (
                                    <div>
                                        <label className="block text-slate-300 text-sm font-medium mb-1.5">Класс</label>
                                        <select
                                            value={classId}
                                            onChange={e => setClassId(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="" className="text-slate-800">Выберите класс</option>
                                            {classes.map(c => (
                                                <option key={c.id} value={c.id} className="text-slate-800">{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {ACTIVE_STEPS[step].title === 'О себе' && (
                            <div>
                                <label className="block text-slate-300 text-sm font-medium mb-1.5">О себе</label>
                                <textarea
                                    rows={5}
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Расскажите немного о себе, ваших интересах и целях..."
                                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                                <p className="text-slate-500 text-xs mt-2">{form.description.length}/500 символов</p>
                            </div>
                        )}

                        {ACTIVE_STEPS[step].title === 'Фото' && (
                            <div className="flex flex-col items-center gap-5">
                                <div className="size-28 rounded-2xl overflow-hidden bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="size-12 text-slate-500" />
                                    )}
                                </div>
                                <label className="cursor-pointer flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                                    <Image className="size-4" />
                                    {photo ? 'Изменить фото' : 'Выбрать фото'}
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp"
                                        className="sr-only"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f); }}
                                    />
                                </label>
                                {photo && <p className="text-slate-400 text-xs">{photo.name}</p>}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex gap-3">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className="flex-1 py-3 bg-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/15 transition-colors border border-white/10"
                        >
                            Назад
                        </button>
                    )}

                    {step < ACTIVE_STEPS.length - 1 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            className="flex-1 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Далее
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={saving || saved}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                        >
                            {saved ? (
                                <><CheckCircle className="size-4" /> Сохранено!</>
                            ) : saving ? (
                                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                '🎉 Завершить регистрацию'
                            )}
                        </button>
                    )}
                </div>

                {/*/!* Skip *!/*/}
                {/*<button*/}
                {/*    onClick={() => navigate('/')}*/}
                {/*    className="w-full mt-4 text-slate-500 text-sm hover:text-slate-300 transition-colors py-2"*/}
                {/*>*/}
                {/*    Пропустить и заполнить позже*/}
                {/*</button>*/}
            </div>
        </div>
    );
};