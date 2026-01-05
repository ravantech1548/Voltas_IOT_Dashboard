import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [settings, setSettings] = useState({
        timezone: 'Asia/Kolkata', // Default
        payload_timeout_minutes: 5,
        offline_check_interval_minutes: 1,
        heartbeat_interval_minutes: 15
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        if (!isAuthenticated) return;

        try {
            const response = await api.get('/settings');
            const loadedSettings = {};

            // Transform response array/object to flat object
            if (response.data) {
                Object.keys(response.data).forEach(key => {
                    loadedSettings[key] = response.data[key].value || response.data[key];
                });
            }

            setSettings(prev => ({
                ...prev,
                ...loadedSettings
            }));
        } catch (error) {
            console.error('Failed to load system settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchSettings();
        } else {
            setLoading(false); // Not loading if not authenticated
        }
    }, [isAuthenticated]);

    const refreshSettings = () => {
        return fetchSettings();
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
