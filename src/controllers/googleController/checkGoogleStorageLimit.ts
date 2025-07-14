import { Request, Response } from 'express';
import { google } from 'googleapis';
import path from 'path';
import { drive } from '../../services/google';


export const checkStorageUsage = async (req: Request, res: Response) => {
    try {
        let totalSize = 0;
        let pageToken: string | undefined = undefined;
        const files: any[] = [];

        do {
            const response : any = await drive.files.list({
                pageSize: 100,
                fields: 'nextPageToken, files(id, name, size)',
                pageToken: pageToken,
                q: 'trashed = false',
            });

            const currentFiles = response.data.files || [];
            currentFiles.forEach((file: any) => {
                totalSize += parseInt(file.size || '0');
            });
            files.push(...currentFiles);

            pageToken = response.data.nextPageToken || undefined;
        } while (pageToken);

        res.json({
            totalFiles: files.length,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
            files: files,
        });
    } catch (error) {
        console.error('Error fetching storage usage:', error);
        res.status(500).json({ error: 'Failed to fetch storage usage' });
    }
};