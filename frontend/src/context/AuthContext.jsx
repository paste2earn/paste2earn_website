import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            // Ignore stale cache from before we added 'status'/'username' fields to localstorage
            if (!parsed.username || !parsed.status) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                return null;
            }
            return parsed;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/auth/me')
                .then(res => { setUser(res.data); localStorage.setItem('user', JSON.stringify(res.data)); })
                .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
