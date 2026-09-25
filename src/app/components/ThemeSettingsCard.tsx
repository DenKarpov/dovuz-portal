import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Accessibility } from 'lucide-react';
import { cn } from './ui/utils';

const OPTIONS = [
  { id: 'light' as const, label: 'Светлая', hint: 'Стандарт', Icon: Sun },
  { id: 'dark' as const, label: 'Тёмная', hint: 'Тёмный фон', Icon: Moon },
  { id: 'colorblind' as const, label: 'Дальтоники', hint: 'Без красн./зел.', Icon: Accessibility },
];

export const ThemeSettingsCard: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = theme ?? 'light';

  if (!mounted) {
    return (
      <div className={cn('rounded-2xl border border-border bg-card p-4 animate-pulse h-[88px]', className)} />
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="px-5 py-3.5 border-b border-border/80 bg-muted/25">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Оформление сайта</h2>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Тема сохраняется в браузере на этом устройстве
        </p>
      </div>
      <div className="p-3 sm:p-4">
        <div
          className="flex rounded-xl bg-muted/50 p-1 gap-1"
          role="radiogroup"
          aria-label="Тема оформления"
        >
          {OPTIONS.map(({ id, label, hint, Icon }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(id)}
                className={cn(
                  'flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg px-2 py-2.5 text-center transition-all',
                  selected
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                )}
              >
                <Icon className={cn('size-4 shrink-0', selected && 'text-primary')} />
                <span className="flex flex-col sm:items-start min-w-0">
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
