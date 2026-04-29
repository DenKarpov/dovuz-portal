import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export const Footer: React.FC = () => (
  <footer className="border-t border-border bg-card text-muted-foreground">
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Link to="/" className="inline-flex items-center gap-3 mb-4 group">
            <div className="size-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-foreground font-bold text-lg leading-none">МосПолитех</p>
              <p className="text-muted-foreground text-xs mt-0.5">Довузовская подготовка</p>
            </div>
          </Link>
          <p className="text-muted-foreground leading-relaxed max-w-sm">
            Образовательная платформа для школьников Московского Политехнического Университета 🎓
          </p>
        </div>

        <div>
          <h4 className="text-foreground font-semibold mb-4">📚 Разделы</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/news" className="hover:text-foreground transition-colors">Новости</Link></li>
            <li><Link to="/directions" className="hover:text-foreground transition-colors">Учебные материалы</Link></li>
            <li><Link to="/projects" className="hover:text-foreground transition-colors">Проекты</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-foreground font-semibold mb-4">🔗 Ссылки</h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="https://mospolytech.ru" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Сайт МосПолитеха</a></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Войти</Link></li>
            <li><Link to="/register" className="hover:text-foreground transition-colors">Регистрация</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} МосПолитех. Все права защищены.
        </p>
        <p className="text-sm text-muted-foreground/80">
          Сделано с 💜 для школьников
        </p>
      </div>
    </div>
  </footer>
);
