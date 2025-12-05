import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { rdClient } from '../services/realDebrid';
import { generateStrmZip } from '../utils/strmGenerator';
import { Trash2, Download, Calendar, Clock, HardDrive, Plus, FileVideo, Check, X, Loader2, Magnet, FileUp, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

function Torrents() {
    const { addToast } = useToast();
    const [torrents, setTorrents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [magnetInput, setMagnetInput] = useState('');
    const [selectedTorrent, setSelectedTorrent] = useState(null); // For viewing details/selecting files
    const [torrentInfo, setTorrentInfo] = useState(null); // Detailed info for selected torrent
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const pendingAutoSelectRef = useRef(new Set()); // Track IDs that need auto-selection

    // We'll use a ref for the observer to avoid re-creating it constantly
    const observer = useRef();
    const lastTorrentElementRef = useCallback(node => {
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
        if (page > 1) {
            loadTorrents(page);
        }
    }, [page]);

    // Polling for pending auto-selects
    useEffect(() => {
        const checkPending = async () => {
            if (pendingAutoSelectRef.current.size === 0) return;

            // Check each pending ID directly from API to get latest status
            for (const id of pendingAutoSelectRef.current) {
                try {
                    const info = await rdClient.getTorrentInfo(id);
                    if (info.status === 'waiting_files_selection') {
                        // It's ready! Select all.
                        pendingAutoSelectRef.current.delete(id);
                        autoSelectAllFiles(id);
                    } else if (info.status === 'downloading' || info.status === 'downloaded') {
                        // Already done
                        pendingAutoSelectRef.current.delete(id);
                    }
                    // If still 'magnet_conversion' or 'queued', keep waiting
                } catch (error) {
                    console.error('Error checking pending torrent:', id, error);
                }
            }
        };

        const interval = setInterval(checkPending, 2000);
        return () => clearInterval(interval);
    }, []); // No dependencies needed, refs are stable

    // Polling for specific torrents that are converting (general fallback)
    useEffect(() => {
        const convertingTorrents = torrents.filter(t => t.status === 'magnet_conversion');
        if (convertingTorrents.length === 0) return;

        const pollInterval = setInterval(async () => {
            // We only need to check the status of these specific torrents
            // But RD API doesn't have bulk status check for specific IDs easily without getting all.
            // However, getting /torrents/info/{id} is one by one.
            // Getting /torrents (page 1) is efficient.

            const data = await rdClient.getTorrents(1, 100);
            const dataMap = new Map(data.map(t => [t.id, t]));

            setTorrents(prev => {
                return prev.map(t => {
                    if (dataMap.has(t.id)) {
                        const newData = dataMap.get(t.id);
                        // Only auto-select if it's not already being handled by pendingAutoSelectRef
                        if (t.status === 'magnet_conversion' && newData.status === 'waiting_files_selection' && !pendingAutoSelectRef.current.has(t.id)) {
                            // Status changed! Auto-select all files.
                            autoSelectAllFiles(t.id);
                            addToast(`Torrent ready: ${newData.filename}. Auto-selecting files...`, 'info');
                        }
                        return newData;
                    }
                    return t;
                });
            });

        }, 2000); // Check every 2 seconds if something is converting

        return () => clearInterval(pollInterval);
    }, [torrents, addToast]); // Re-run when torrents list changes (e.g. new magnet added)

    const autoSelectAllFiles = async (id) => {
        try {
            // Use 'all' to select all files without fetching info first
            await rdClient.selectFiles(id, 'all');
            addToast(`Started download for torrent`, 'success');
            // Refresh list to show 'downloading' status
            loadTorrents(1);
        } catch (error) {
            console.error('Auto-select failed', error);
            addToast('Auto-select failed, please select manually', 'error');
        }
    };

    useEffect(() => {
        loadTorrents(1); // Initial load
    }, []);

    const loadTorrents = async (pageNum = 1) => {
        setLoading(true);
        try {
            const data = await rdClient.getTorrents(pageNum, 100);
            if (pageNum === 1) {
                setTorrents(data);
            } else {
                setTorrents(prev => {
                    const existingIds = new Set(prev.map(t => t.id));
                    const newItems = data.filter(t => !existingIds.has(t.id));
                    return [...prev, ...newItems];
                });
            }
            setHasMore(data.length === 100);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load torrents', error);
            setLoading(false);
        }
    };

    const handleAddMagnet = async (e) => {
        e.preventDefault();
        if (!magnetInput) return;

        const magnets = magnetInput.split('\n').filter(m => m.trim());
        let successCount = 0;
        let errorCount = 0;

        for (const magnet of magnets) {
            try {
                const data = await rdClient.addMagnet(magnet.trim());
                if (data && data.id) {
                    pendingAutoSelectRef.current.add(data.id);
                }
                successCount++;
            } catch (error) {
                console.error(error);
                errorCount++;
            }
        }

        setMagnetInput('');
        setShowAddModal(false);
        loadTorrents(1); // Reload first page to see new torrents

        if (successCount > 0) addToast(`${successCount} magnets added`, 'success');
        if (errorCount > 0) addToast(`${errorCount} failed`, 'error');

        // Prompt to select files if needed (simple check for now)
        addToast('Check list to select files', 'info');
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        let successCount = 0;
        let errorCount = 0;

        for (const file of files) {
            try {
                const data = await rdClient.addTorrent(file);
                if (data && data.id) {
                    pendingAutoSelectRef.current.add(data.id);
                }
                successCount++;
            } catch (error) {
                console.error(error);
                errorCount++;
            }
        }

        setShowAddModal(false);
        loadTorrents(1); // Reload first page to see new torrents

        if (successCount > 0) addToast(`${successCount} torrents added`, 'success');
        if (errorCount > 0) addToast(`${errorCount} failed`, 'error');

        addToast('Check list to select files', 'info');
    }

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this torrent?')) {
            try {
                await rdClient.deleteTorrent(id);
                setTorrents(prev => prev.filter(t => t.id !== id)); // Optimistic update
                addToast('Torrent deleted', 'success');
            } catch (error) {
                console.error(error);
                addToast('Failed to delete torrent', 'error');
            }
        }
    };

    const handleSelectFiles = async (torrentId) => {
        // Fetch info first
        try {
            const info = await rdClient.getTorrentInfo(torrentId);
            setTorrentInfo(info);
            setSelectedTorrent(torrentId);
        } catch (error) {
            console.error(error);
        }
    };

    const submitFileSelection = async (fileIds) => {
        try {
            await rdClient.selectFiles(selectedTorrent, fileIds);
            setSelectedTorrent(null);
            setTorrentInfo(null);
            loadTorrents(1); // Reload first page to get updated status
            addToast('Files selected successfully', 'success');
        } catch (error) {
            addToast('Failed to select files: ' + error.message, 'error');
        }
    };

    const handleDownload = async (torrent, type = 'strm') => {
        try {
            const info = await rdClient.getTorrentInfo(torrent.id);
            if (info.status !== 'downloaded') {
                addToast('Torrent must be fully downloaded to generate files.', 'warning');
                return;
            }

            if (type === 'strm') {
                addToast('Generating STRM Zip...', 'info');
                // Pass unrestrict function to generator
                const unrestrictFn = (link) => rdClient.unrestrictLink(link);
                const { content, filename } = await generateStrmZip(info, unrestrictFn);

                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                addToast('STRM Zip generated', 'success');
            } else {
                // Direct Download
                // If single file, unrestrict and open
                // If multiple, show links or zip? RD doesn't zip for you.
                // Let's unrestrict all selected files and show them in a modal or open tabs (popup blocker risk)
                // Better: Show a modal with unrestricted links

                const selectedFiles = info.files.filter(f => f.selected === 1);
                if (selectedFiles.length === 0) {
                    addToast('No files selected in this torrent', 'error');
                    return;
                }

                // We need to map files to links. 
                // info.links matches the order of selected files.

                if (info.links.length === 1) {
                    const data = await rdClient.unrestrictLink(info.links[0]);
                    window.open(data.download, '_blank');
                    addToast('Download started', 'success');
                } else {
                    // Multi-file download - show modal with links? 
                    // For now, let's just open the first one or warn.
                    // User asked: "prompt me which file or files I want to download"
                    // So we need a "Download Selection" modal.
                    setSelectedTorrent(torrent.id);
                    setTorrentInfo(info);
                    // We'll reuse the modal but with "Download" mode
                }
            }

        } catch (error) {
            console.error(error);
            addToast('Failed: ' + error.message, 'error');
        }
    };

    return (
        <div className="torrents-page">
            <header className="page-header flex-between">
                <h1>Torrents</h1>
                <button className="btn-icon" onClick={() => setShowAddModal(true)} title="Add Torrent">
                    <Plus size={24} />
                </button>
            </header>

            {loading && page === 1 ? (
                <LoadingSpinner />
            ) : (
                <div className="torrents-list">
                    {torrents.map((torrent, index) => {
                        if (torrents.length === index + 1) {
                            return (
                                <div ref={lastTorrentElementRef} key={torrent.id} className="card torrent-card">
                                    <TorrentItem
                                        torrent={torrent}
                                        handleSelectFiles={handleSelectFiles}
                                        handleDownload={handleDownload}
                                        handleDelete={handleDelete}
                                    />
                                </div>
                            );
                        } else {
                            return (
                                <div key={torrent.id} className="card torrent-card">
                                    <TorrentItem
                                        torrent={torrent}
                                        handleSelectFiles={handleSelectFiles}
                                        handleDownload={handleDownload}
                                        handleDelete={handleDelete}
                                    />
                                </div>
                            );
                        }
                    })}
                    {loading && <LoadingSpinner />}
                </div>
            )}

            {showAddModal && createPortal(
                <div className="modal-overlay">
                    <div className="modal card animate-fade-in">
                        <div className="modal-header">
                            <h2 className="text-gradient" style={{ margin: 0 }}>Add Content</h2>
                            <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddMagnet} className="add-form">
                            <div className="form-group">
                                <label className="input-label">
                                    <Magnet size={16} />
                                    <span>Magnet Link</span>
                                </label>
                                <div className="input-wrapper">
                                    <textarea
                                        className="input textarea-magnet"
                                        rows="4"
                                        placeholder="magnet:?xt=urn:btih:..."
                                        value={magnetInput}
                                        onChange={(e) => setMagnetInput(e.target.value)}
                                    />
                                </div>
                                <small className="text-secondary">Paste one or more magnet links</small>
                            </div>
                            <button type="submit" className="btn btn-primary full-width btn-glow">
                                <Plus size={18} /> Add Magnet
                            </button>

                            <div className="divider">
                                <span>OR</span>
                            </div>

                            <div className="form-group">
                                <label className="input-label">
                                    <FileUp size={16} />
                                    <span>Upload .torrent File</span>
                                </label>
                                <label className="file-upload-zone">
                                    <input
                                        type="file"
                                        accept=".torrent"
                                        onChange={handleFileSelect}
                                        multiple
                                        hidden
                                    />
                                    <div className="upload-content">
                                        <FileUp size={32} className="upload-icon" />
                                        <span className="upload-text">Click to browse .torrent files</span>
                                        <span className="upload-hint">Supports multiple files</span>
                                    </div>
                                </label>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {selectedTorrent && torrentInfo && createPortal(
                <FileSelectionModal
                    info={torrentInfo}
                    onClose={() => { setSelectedTorrent(null); setTorrentInfo(null); }}
                    onSubmit={submitFileSelection}
                    mode={torrentInfo.status === 'downloaded' ? 'download' : 'select'}
                />,
                document.body
            )}

            <style>{`
        /* flex-between moved to global index.css */
        
        .torrents-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .torrent-card {
          /* display: flex; removed, handled by inner content */
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .torrent-item-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            width: 100%;
        }
        
        .torrent-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
          min-width: 0; /* For text overflow */
          margin-right: 1rem;
        }
        
        .torrent-name {
          font-size: 1rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .torrent-meta {
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
        }
        
        .status-badge {
          padding: 0.15rem 0.5rem; /* Reduced padding to match text height */
          border-radius: var(--radius-sm);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.65rem;
        }
        
        .status-badge.downloaded { background-color: rgba(34, 197, 94, 0.1); color: var(--success); }
        .status-badge.downloading { background-color: rgba(14, 165, 233, 0.1); color: var(--accent-primary); }
        .status-badge.waiting_files_selection { background-color: rgba(234, 179, 8, 0.1); color: var(--warning); }
        .status-badge.error { background-color: rgba(239, 68, 68, 0.1); color: var(--danger); }
        
        .torrent-actions {
          display: flex;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        
        /* Modal styles moved to global index.css */
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .add-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .input-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .textarea-magnet {
          font-family: monospace;
          font-size: 0.875rem;
          resize: vertical;
          min-height: 100px;
          background-color: var(--bg-primary);
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }
        
        .divider span {
          padding: 0 1rem;
        }

        .file-upload-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
          background-color: var(--bg-primary);
        }

        .file-upload-zone:hover {
          border-color: var(--accent-primary);
          background-color: rgba(14, 165, 233, 0.05);
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
        }

        .upload-icon {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .file-upload-zone:hover .upload-icon {
          color: var(--accent-primary);
        }

        .upload-text {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .upload-hint {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .btn-glow {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 600;
          letter-spacing: 0.025em;
          padding: 0.75rem;
        }

        .btn-glow:hover {
          box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
          transform: translateY(-1px);
        }

        .btn-glow:active {
          transform: translateY(0);
        }
      `}</style>
        </div>
    );
}

function FileSelectionModal({ info, onClose, onSubmit, mode = 'select' }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const { addToast } = useToast();

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Force scroll to top of modal when it opens
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // If mode is download, we only show files that are already selected in the torrent
    // But wait, the user wants to choose which files to download from the torrent.
    // If the torrent is 'downloaded', all files in 'files' array with selected=1 are available.

    const availableFiles = mode === 'download'
        ? info.files.filter(f => f.selected === 1)
        : info.files;

    const toggleFile = (id) => {
        if (selectedFiles.includes(id)) {
            setSelectedFiles(selectedFiles.filter(f => f !== id));
        } else {
            setSelectedFiles([...selectedFiles, id]);
        }
    };

    const selectAll = () => {
        setSelectedFiles(availableFiles.map(f => f.id));
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return;

        if (mode === 'select') {
            onSubmit(selectedFiles);
        } else {
            // Download mode
            // We need to find the links corresponding to these files.
            // info.links matches the order of selected files (files with selected=1)

            const selectedFileIndices = info.files
                .filter(f => f.selected === 1)
                .map((f, index) => ({ id: f.id, index })) // Map to index in the "selected files" list
                .filter(item => selectedFiles.includes(item.id));

            // Now we have the indices to pick from info.links
            for (const item of selectedFileIndices) {
                if (item.index < info.links.length) {
                    try {
                        const link = info.links[item.index];
                        const data = await rdClient.unrestrictLink(link);

                        // Use window.location.href for reliable download trigger
                        // This replaces the current page with the download, which browsers handle as a download
                        // For multiple files, this might be tricky, but usually browsers handle it or block popups.
                        // window.open is often blocked.
                        // Let's try window.location.href for the first one, and maybe warn for others?
                        // Or just use window.open but user needs to allow popups.
                        // User said "robofuse-reborn doesn't grab the download link".
                        // If we use window.location.href, it definitely will.

                        if (selectedFileIndices.length === 1) {
                            window.location.href = data.download;
                        } else {
                            window.open(data.download, '_blank');
                        }

                    } catch (err) {
                        console.error(err);
                        addToast('Failed to unrestrict link', 'error');
                    }
                }
            }
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal card animate-fade-in">
                <div className="modal-header">
                    <h2 className="text-gradient" style={{ margin: 0 }}>Select Files</h2>
                    <button className="btn-icon" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="files-list">
                    <div className="files-actions">
                        <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select All</button>
                    </div>
                    {availableFiles.map(file => (
                        <div key={file.id} className="file-item">
                            <input
                                type="checkbox"
                                checked={selectedFiles.includes(file.id)}
                                onChange={() => toggleFile(file.id)}
                                id={`file-${file.id}`}
                            />
                            <label htmlFor={`file-${file.id}`}>
                                <span className="file-path">{file.path}</span>
                                <span className="file-size">{(file.bytes / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                            </label>
                        </div>
                    ))}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary full-width btn-glow" onClick={handleSubmit}>
                        {mode === 'select' ? 'Start Download' : 'Download Files'} ({selectedFiles.length} files)
                    </button>
                </div>

                <style>{`
                    .files-list {
                        max-height: 300px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                        margin-bottom: 1.5rem;
                        border: 1px solid var(--border-color);
                        padding: 0.5rem;
                        border-radius: var(--radius-sm);
                    }
                    
                    .file-item {
                        display: flex;
                        align-items: flex-start;
                        gap: 0.75rem;
                        padding: 0.5rem;
                        border-bottom: 1px solid var(--border-color);
                    }

                    .file-item input {
                        margin-top: 0.35rem; /* Precise alignment with first line of text */
                    }
                    
                    .file-item:last-child {
                        border-bottom: none;
                    }
                    
                    .file-item label {
                        display: flex;
                        flex-direction: column;
                        font-size: 0.875rem;
                        cursor: pointer;
                        word-break: break-all;
                    }
                    
                    .file-size {
                        color: var(--text-secondary);
                        font-size: 0.75rem;
                    }
                    
                    .files-actions {
                        margin-bottom: 0.5rem;
                    }
                    
                    .btn-sm {
                        padding: 0.25rem 0.5rem;
                        font-size: 0.75rem;
                    }
                `}</style>
            </div>
        </div>
    );
}

// Helper component to render torrent item cleanly
const TorrentItem = ({ torrent, handleSelectFiles, handleDownload, handleDelete }) => (
    <>
        <div className="torrent-info">
            <div className="torrent-name" title={torrent.filename}>{torrent.filename}</div>
            <div className="torrent-meta">
                <span className="meta-item">
                    <HardDrive size={14} />
                    {(torrent.bytes / 1024 / 1024 / 1024).toFixed(2)} GB
                </span>
                <span className="meta-item">
                    <Calendar size={14} />
                    {format(new Date(torrent.added), 'MMM d, HH:mm')}
                </span>
            </div>
            <div className="torrent-meta">
                <span className={`status-badge ${torrent.status}`}>{torrent.status.replace(/_/g, ' ')}</span>
                <span className="meta-item">
                    {torrent.progress}%
                </span>
            </div>
        </div>
        <div className="torrent-actions">
            {torrent.status === 'waiting_files_selection' && (
                <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleSelectFiles(torrent.id)}
                    title="Select Files"
                >
                    <Check size={16} /> Select Files
                </button>
            )}

            {torrent.status === 'downloaded' && (
                <>
                    <button
                        className="btn-icon"
                        onClick={() => handleDownload(torrent, 'strm')}
                        title="Download STRM Zip"
                    >
                        <FileVideo size={20} color="var(--accent-primary)" />
                    </button>
                    <button
                        className="btn-icon"
                        onClick={() => handleDownload(torrent, 'file')}
                        title="Download Files"
                    >
                        <Download size={20} color="var(--success)" />
                    </button>
                </>
            )}

            <button
                className="btn-icon"
                onClick={() => handleDelete(torrent.id)}
                title="Delete"
            >
                <Trash2 size={20} color="var(--danger)" />
            </button>
        </div>
    </>
);

export default Torrents;
