import axios from 'axios';

const API_BASE = 'https://payment-settlement-app.fly.dev/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const settlementAPI = {
    // Dashboard
    getDashboard: () => api.get('/admin/dashboard'),

    // Settlements
    initiate: (data: any) => api.post('/settlements/initiate', data),
    lock: (id: string) => api.post(`/settlements/${id}/phase1-lock`, {}),
    commit: (id: string) => api.post(`/settlements/${id}/phase2-commit`, {}),
    getOne: (id: string) => api.get(`/settlements/${id}`),
    getAuditTrail: (id: string) => api.get(`/settlements/${id}/audit-trail`),

    // Notifications
    getNotifications: (sellerId: number) =>
        api.get(`/notifications?seller_id=${sellerId}`),

    // Reconciliation
    runReconciliation: () => api.post('/admin/reconciliation/run-manual'),

    // 🔥 TAMBAHKAN INI UNTUK SELLER
    addSeller: (data: any) => api.post('/admin/sellers', data),
};

export default api;