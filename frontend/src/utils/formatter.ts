// Format Rupiah
export const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

// Format Date
export const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

// Format Date Time
export const formatDateTime = (date: string): string => {
    return new Date(date).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Status Badge Color
export const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        completed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-800',
        processing: 'bg-blue-100 text-blue-800',
        phase_1_locked: 'bg-purple-100 text-purple-800',
        rolled_back: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};