
import React, { useEffect } from 'react';

interface MessageProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClear: () => void;
}

export const Message: React.FC<MessageProps> = ({ message, type, onClear }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => onClear(), 4000);
            return () => clearTimeout(timer);
        }
    }, [message, onClear]);

    if (!message) return null;
    
    let bgColor = 'bg-green-500';
    if (type === 'error') bgColor = 'bg-red-500';
    if (type === 'info') bgColor = 'bg-blue-500';

    return (
        <div className={`fixed top-5 right-5 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-transform transform-gpu animate-slide-in`}>
            {message}
        </div>
    );
};
