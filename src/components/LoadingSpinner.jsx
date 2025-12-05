import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 24, className = '' }) => {
    return (
        <div className={`loading-spinner ${className}`}>
            <Loader2 size={size} className="animate-spin" />
        </div>
    );
};

export default LoadingSpinner;
