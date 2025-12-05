import JSZip from 'jszip';

export const generateStrmZip = async (torrent, unrestrictFn) => {
    const zip = new JSZip();
    const folderName = torrent.filename.replace(/[\\/:*?"<>|]/g, '_'); // Sanitize filename

    // Filter files that are selected
    const files = torrent.files.filter(f => f.selected === 1);

    if (files.length !== torrent.links.length) {
        console.warn('Mismatch between selected files and links count');
    }

    // We need to process sequentially to avoid rate limits if any, 
    // but RD is usually fast. Parallel is better for speed.
    // However, unrestrictFn might fail if token is invalid etc.

    const promises = files.map(async (file, index) => {
        if (index < torrent.links.length) {
            const link = torrent.links[index];
            let downloadLink = link;

            // Unrestrict if function provided
            if (unrestrictFn) {
                try {
                    const data = await unrestrictFn(link);
                    downloadLink = data.download;
                } catch (e) {
                    console.error(`Failed to unrestrict ${link}`, e);
                    // Fallback to original link or skip? 
                    // If we put restricted link in STRM, it won't work.
                    // Let's create an error file or just skip.
                    zip.file(`ERROR_${file.id}.txt`, `Failed to unrestrict: ${e.message}`);
                    return;
                }
            }

            let filePath = file.path;
            if (filePath.startsWith('/')) filePath = filePath.substring(1);

            const strmPath = filePath.replace(/\.[^/.]+$/, "") + ".strm";
            zip.file(strmPath, downloadLink);
        }
    });

    await Promise.all(promises);

    const content = await zip.generateAsync({ type: "blob" });
    return { content, filename: `${folderName}.zip` };
};
