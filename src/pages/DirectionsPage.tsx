import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Search, Calculator, Code2, FlaskConical, Compass, Palette, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { toast } from 'sonner';

const PALETTE = [
    'from-blue-500 to-blue-700',
    'from-indigo-500 to-indigo-700',
    'from-emerald-500 to-teal-700',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-700',
    'from-amber-500 to-yellow-600',
    'from-purple-500 to-violet-700',
    'from-cyan-500 to-sky-700',
];
const ICONS = [Calculator, Code2, FlaskConical, Compass, Palette, Globe, BookOpen, ArrowRight];

export const DirectionsPage: React.FC = () => {
    const [directions, setDirections] = useState<DirectionResponse[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        directionsApi.getAll()
            .then(res => setDirections(res.data))
            .catch(() => toast.error('Ошибка загрузки направлений'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = search
        ? directions.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
        : directions;

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        className="flex items-center gap-4 mb-8">
                <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                    <BookOpen className="size-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Учебные материалы</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Выберите направление для просмотра дисциплин</p>
                </div>
            </motion.div>

            {/* Breadcrumb */}
            <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
                        className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                <span>Материалы</span>
                <span>/</span>
                <span className="text-foreground font-medium">Направления</span>
            </motion.nav>

            {/* Search */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                        className="relative mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти направление..."
                       className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </motion.div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="bg-card rounded-2xl border border-border h-32 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Search className="size-8 mx-auto mb-3 opacity-40" />
                    <p>{search ? `Ничего не найдено по «${search}»` : 'Нет доступных направлений'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filtered.map((dir, idx) => {
                        const Icon = ICONS[idx % ICONS.length];
                        const grad = PALETTE[idx % PALETTE.length];
                        return (
                            <motion.div key={dir.id}
                                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                                        whileHover={{ y: -2 }}>
                                <Link to={`/directions/${dir.id}/subjects`}
                                      className="group flex flex-col bg-card rounded-2xl border border-border hover:border-primary/25 hover:shadow-md hover:shadow-primary/5 transition-all overflow-hidden h-full min-h-[120px] p-5">
                                    <div className={`size-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center mb-3 shadow-md`}>
                                        <Icon className="size-5 text-white" />
                                    </div>
                                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">{dir.name}</p>
                                    <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        Открыть <ArrowRight className="size-3" />
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};