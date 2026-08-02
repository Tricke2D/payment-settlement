import { useState, useCallback } from 'react';

interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

export function useApi<T>() {
    const [state, setState] = useState<ApiState<T>>({
        data: null,
        loading: false,
        error: null,
    });

    const execute = useCallback(async (apiCall: () => Promise<T>) => {
        setState({ data: null, loading: true, error: null });
        try {
            const result = await apiCall();
            setState({ data: result, loading: false, error: null });
            return result;
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Terjadi kesalahan';
            setState({ data: null, loading: false, error: errorMessage });
            throw err;
        }
    }, []);

    return { ...state, execute };
}