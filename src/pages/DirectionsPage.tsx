import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, ChevronRight, Plus, Trash2, Search, Layers,
    Calculator, Code2, FlaskConical, Compass, Palette, Globe,
    Edit2, X, Check,
} from 'lucide-react';
import { motion } from 'motion/react';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { Modal } from '../app/components/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const PALETTE = [
    'from-blue-500 to-blue-700', 'from-indigo-500 to-indigo-700',
    'from-emerald-500 to-teal-700', 'from-orange-500 to-red-600',
    'from-pink-500 to-rose-700', 'from-amber-500 to-yellow-600',
    'from-purple-500 to-violet-700', 'from-cyan-500 to-sky-700',
];
const ICONS = [Calculator, Code2, FlaskConical, Compass, Palette, Globe, BookOpen, Layers];
const EMOJIS = ['📐', '💻', '🔬', '🧭', '🎨', '🌍', '📕', '📊', '⚡', '🔧', '🧮', '🎯'];

export const DirectionsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [directions, setDirections] = useState<DirectionResponse[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Create
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    // Edit (inline)
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);

    const loadDirections = () => {
        setLoading(true);
        directionsApi.getAll()
            .then(res => setDirections(res.data))
            .catch(() => toast.error('Ошибка загрузки направлений'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadDirections(); }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return toast.error('Введите название');
        setCreating(true);
        try {
            await directionsApi.create(newName.trim());
            toast.success('Направление создано');
            setCreateOpen(false);
            setNewName('');
            loadDirections();
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка');
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = async (id: number) => {
        if (!editName.trim()) return toast.error('Введите название');
        setSaving(true);
        try {
            await directionsApi.update(id, editName.trim());
            toast.success('Направление обновлено');
            setEditId(null);
            loadDirections();
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Удалить направление? Все связанные предметы и темы будут удалены.')) return;
        try {
            await directionsApi.delete(id);
            toast.success('Направление удалено');
            loadDirections();
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка');
        }
    };

    const filtered = search
        ? directions.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
        : directions;

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="flex items-center justify-between gap-4 mb-6"
            >
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                        <BookOpen className="size-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Учебные материалы</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Выберите направление для просмотра дисциплин</p>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setNewName(''); setCreateOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
                    >
                        <Plus className="size-4" /> Добавить направление
                    </button>
                )}
            </motion.div>

            {/* Breadcrumb */}
            <motion.nav
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
                className="flex items-center gap-2 text-xs text-muted-foreground mb-6"
            >
                <span>Материалы</span>
                <ChevronRight className="size-3.5" />
                <span className="text-foreground font-medium">Направления</span>
            </motion.nav>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="relative mb-6"
            >
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Найти направление..."
                    className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
            </motion.div>

            {/* Skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />
                    ))}
                </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
                    <Layers className="size-10 mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">
                        {directions.length === 0 ? 'Направлений пока нет' : `Ничего не найдено по «${search}»`}
                    </p>
                    {isAdmin && directions.length === 0 && (
                        <button
                            onClick={() => { setNewName(''); setCreateOpen(true); }}
                            className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90"
                        >
                            Создать первое направление
                        </button>
                    )}
                </div>
            )}

            {/* Grid */}
            {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((dir, idx) => {
                        const grad = PALETTE[idx % PALETTE.length];
                        const emoji = EMOJIS[idx % EMOJIS.length];
                        const isEditing = editId === dir.id;
                        return (
                            <motion.div
                                key={dir.id}
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.04 }} whileHover={{ y: -2 }}
                            >
                                <div className="group relative overflow-hidden rounded-2xl p-5 text-white min-h-[148px] flex flex-col">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                                    <div className="absolute -top-4 -right-4 size-24 rounded-full bg-white/8" />
                                    <div className="absolute -bottom-6 -left-3 size-16 rounded-full bg-black/10" />
                                    <div className="relative flex flex-col h-full gap-3">
                                        <div className="flex items-start justify-between">
                                            <span className="text-2xl">{emoji}</span>
                                            {isAdmin && !isEditing && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={e => { e.preventDefault(); setEditId(dir.id); setEditName(dir.name); }}
                                                        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                                        title="Редактировать"
                                                    >
                                                        <Edit2 className="size-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={e => { e.preventDefault(); handleDelete(dir.id); }}
                                                        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white/60 text-xs font-medium mb-1">Направление</p>
                                            {isEditing ? (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        autoFocus value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleEdit(dir.id);
                                                            if (e.key === 'Escape') setEditId(null);
                                                        }}
                                                        className="flex-1 text-sm font-bold bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:bg-white/30"
                                                    />
                                                    <button
                                                        onClick={() => handleEdit(dir.id)} disabled={saving}
                                                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-60"
                                                    >
                                                        <Check className="size-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditId(null)}
                                                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"
                                                    >
                                                        <X className="size-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <Link to={`/directions/${dir.id}/subjects`} className="block">
                                                    <h3 className="text-white text-base font-bold leading-snug group-hover:text-white/90">
                                                        {dir.name}
                                                    </h3>
                                                    <p className="text-white/70 text-xs font-medium mt-2 group-hover:text-white/90 transition-colors">
                                                        Открыть предметы →
                                                    </p>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create modal */}
            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новое направление">
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Название направления *</label>
                        <input
                            type="text" value={newName} onChange={e => setNewName(e.target.value)}
                            placeholder="Например: Математика" autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCreate} disabled={creating}
                            className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
                        >
                            {creating ? 'Создание...' : 'Создать'}
                        </button>
                        <button
                            onClick={() => setCreateOpen(false)}
                            className="flex-1 py-2.5 bg-muted text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};