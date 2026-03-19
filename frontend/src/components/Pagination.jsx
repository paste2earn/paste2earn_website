import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border)' }}>
            <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: '8px' }}
            >
                <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> of {totalPages}
            </span>
            <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: '8px' }}
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

export const paginate = (items, pageNumber, pageSize) => {
    const startIndex = (pageNumber - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
};
