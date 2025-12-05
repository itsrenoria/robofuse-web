import { useState, useEffect, useRef, useCallback } from 'react';
import { rdClient } from '../services/realDebrid';
import { Trash2, Download, Calendar, Clock, HardDrive } from 'lucide-react';
import { format, addDays } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';

function Downloads() {
    const [downloads, setDownloads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Observer for infinite scroll
    const observer = useRef();
    const lastDownloadElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    useEffect(() => {
        loadDownloads(page);
    }, [page]);

    const loadDownloads = async (pageNum) => {
        setLoading(true);
        try {
            const data = await rdClient.getDownloads(pageNum, 100);
            if (pageNum === 1) {
                setDownloads(data);
            } else {
                setDownloads(prev => {
                    const existingIds = new Set(prev.map(d => d.id));
                    const newItems = data.filter(d => !existingIds.has(d.id));
                    return [...prev, ...newItems];
                });
            }
            setHasMore(data.length === 100);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load downloads', error);
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this download link?')) {
            try {
                await rdClient.deleteDownload(id);
                loadDownloads(1); // Reload first page after deletion
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="downloads-page">
            <header className="page-header flex-between">
                <h1>Downloads</h1>
            </header>

            {loading && page === 1 ? (
                <LoadingSpinner />
            ) : (
                <div className="downloads-list">
                    {downloads.map((download, index) => {
                        if (downloads.length === index + 1) {
                            return (
                                <div ref={lastDownloadElementRef} key={download.id} className="card download-card">
                                    <DownloadItem download={download} handleDelete={handleDelete} />
                                </div>
                            );
                        } else {
                            return (
                                <div key={download.id} className="card download-card">
                                    <DownloadItem download={download} handleDelete={handleDelete} />
                                </div>
                            );
                        }
                    })}
                    {loading && <LoadingSpinner />}
                </div>
            )}

            <style>{`
        .downloads-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .download-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .download-item-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            width: 100%;
            flex-wrap: nowrap; /* Prevent wrapping to keep buttons on side */
        }

        .download-card.selected {
            border-color: var(--accent-primary);
            background-color: rgba(14, 165, 233, 0.05);
        }

        .selection-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            width: 100%;
            justify-content: space-between;
            background-color: var(--bg-tertiary);
            padding: 0.5rem;
            border-radius: var(--radius-md);
            margin: -0.5rem;
        }
        
        /* page-header.flex-between handled by global classes */
        
        .download-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
          min-width: 0; /* Crucial for text overflow */
          margin-right: 1rem;
        }
        
        .download-name {
          font-size: 1rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .download-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          align-items: center;
          flex-wrap: wrap;
          min-height: 1.25rem; /* Enforce consistent row height */
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            white-space: nowrap; /* Prevent icon/text split */
        }
        
        .download-link {
          font-size: 0.75rem;
          color: var(--accent-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }
        
        .download-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0; /* Prevent buttons from shrinking */
        }
      `}</style>
        </div>
    );
}

const DownloadItem = ({ download, handleDelete }) => {
    const generatedDate = new Date(download.generated);
    const expirationDate = addDays(generatedDate, 7);

    return (
        <>
            <div className="download-info">
                <div className="download-name" title={download.filename}>{download.filename}</div>
                <div className="download-meta">
                    <span className="meta-item">
                        <HardDrive size={14} />
                        {(download.filesize / 1024 / 1024 / 1024).toFixed(2)} GB
                    </span>
                    <span className="meta-item" title={`Generated: ${format(generatedDate, 'PPpp')}`}>
                        <Calendar size={14} />
                        {format(generatedDate, 'MMM d, HH:mm')}
                    </span>
                </div>
                <div className="download-meta">
                    <span className="meta-item text-warning" title={`Expires: ${format(expirationDate, 'PPpp')}`}>
                        <Clock size={14} />
                        {format(expirationDate, 'MMM d, HH:mm')}
                    </span>
                </div>
            </div>

            <div className="download-actions">
                <a
                    href={download.download}
                    className="btn-icon"
                    target="_blank"
                    rel="noreferrer"
                    title="Download File"
                >
                    <Download size={20} color="var(--success)" />
                </a>
                <button
                    className="btn-icon"
                    onClick={() => handleDelete(download.id)}
                    title="Delete"
                >
                    <Trash2 size={20} color="var(--danger)" />
                </button>
            </div>
        </>
    );
};

export default Downloads;
