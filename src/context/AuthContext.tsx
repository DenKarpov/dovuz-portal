import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
    nickname: string;
    role: string; // e.g. "Администратор", "Модератор", "Пользователь"
}

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    isAdmin: boolean;
    isModerator: boolean;
    isUser: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {},
    isAdmin: false,
    isModerator: false,
    isUser: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const stored = sessionStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const login = (u: User) => {
        sessionStorage.setItem('user', JSON.stringify(u));
        setUser(u);
    };

    const logout = () => {
        sessionStorage.removeItem('user');
        setUser(null);
    };

    const role = user?.role ?? '';
    const isAdmin = role === 'Администратор';
    const isModerator = isAdmin || role === 'Модератор';
    const isUser = isModerator || role === 'Пользователь';

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, isModerator, isUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
