import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, ArrowRight } from 'lucide-react';
import { directionsApi, type DirectionResponse } from '../app/api/directions';
import { toast } from 'sonner';

const DIRECTION_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-yellow-500 to-amber-600',
];

export const DirectionsPage: React.FC = () => {
  const [directions, setDirections] = useState<DirectionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    directionsApi
      .getAll()
      .then((res) => setDirections(res.data))
      .catch(() => toast.error('Ошибка загрузки направлений'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <BookOpen className="size-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-gray-900">Учебные материалы</h1>
          <p className="text-xs text-gray-400">Выберите направление для просмотра дисциплин</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <span className="text-indigo-600">Направления</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : directions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="size-12 mx-auto mb-3 opacity-30" />
          <p>Направлений пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directions.map((dir, idx) => (
            <Link
              key={dir.id}
              to={`/directions/${dir.id}/subjects`}
              className="group relative overflow-hidden rounded-2xl p-6 text-white hover:shadow-lg transition-all hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${idx % 2 === 0 ? '#6366f1, #8b5cf6' : '#3b82f6, #06b6d4'})`,
              }}
            >
              <div className="flex flex-col h-full gap-4">
                <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <BookOpen className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs mb-1">Направление #{dir.id}</p>
                  <h3 className="text-white">{dir.name}</h3>
                </div>
                <div className="flex items-center gap-1 text-white/80 text-sm mt-auto group-hover:text-white transition-colors">
                  Перейти к предметам
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
