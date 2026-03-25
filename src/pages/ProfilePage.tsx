import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Mail, Phone, School, Edit3 } from 'lucide-react';
import { accountsApi, type AccountResponse } from '../app/api/accounts';
import { filesApi } from '../app/api/files';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const { nickname } = useParams<{ nickname: string }>();
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountsApi
      .getAccount(nickname!)
      .then((res) => setAccount(res.data))
      .catch(() => toast.error('Пользователь не найден'))
      .finally(() => setLoading(false));
  }, [nickname]);

  const isOwn = user?.nickname === nickname;

  const roleColors: Record<string, string> = {
    Администратор: 'bg-red-50 text-red-700',
    Модератор: 'bg-indigo-50 text-indigo-700',
    Пользователь: 'bg-gray-50 text-gray-600',
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center gap-6">
            <div className="size-20 rounded-full bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        {/* Avatar & Name */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="size-20 rounded-2xl bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
              {account.photoUrl ? (
                <img
                  src={filesApi.getPhotoUrl(account.photoUrl)}
                  alt={account.nickname}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <User className="size-8 text-indigo-400" />
              )}
            </div>
            <div>
              <h1 className="text-gray-900">{account.nickname}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs ${roleColors[account.role] ?? 'bg-gray-50 text-gray-600'}`}>
                  {account.role}
                </span>
                {!account.active && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs bg-red-50 text-red-600">
                    Заблокирован
                  </span>
                )}
              </div>
            </div>
          </div>
          {isOwn && (
            <Link
              to="/profile/edit"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 text-sm rounded-xl hover:bg-gray-100 transition-colors shrink-0"
            >
              <Edit3 className="size-4" />
              Редактировать
            </Link>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {(account.firstName || account.lastName) && (
            <div className="flex items-center gap-3 text-sm">
              <User className="size-4 text-gray-400 shrink-0" />
              <span className="text-gray-700">
                {[account.firstName, account.lastName].filter(Boolean).join(' ')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">{account.email}</span>
          </div>
          {account.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="size-4 text-gray-400 shrink-0" />
              <span className="text-gray-700">{account.phone}</span>
            </div>
          )}
          {account.school && (
            <div className="flex items-center gap-3 text-sm">
              <School className="size-4 text-gray-400 shrink-0" />
              <span className="text-gray-700">
                {account.school.name}
                {account.schoolClass && ` · ${account.schoolClass.name}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
