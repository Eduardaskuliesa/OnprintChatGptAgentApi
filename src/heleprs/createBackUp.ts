import { log } from "console";
import { drive } from "../services/google";
import logger from "../utils/logger";

const BACKUP_FOLDER_ID = "1AjqzzPh3PzcRJAF1O-NimHG83CiyMBOs"


async function getOriginalFileName(fileId: string): Promise<string> {
    const response = await drive.files.get({
        fileId: fileId,
        fields: 'name'
    });
    return response.data.name || 'Unknown';
}


async function getOrCreateFileBackupFolder(fileId: string): Promise<string> {

    const originalFileName = await getOriginalFileName(fileId);

    const existingFolder = await drive.files.list({
        q: `'${BACKUP_FOLDER_ID}' in parents and name='${originalFileName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id)'
    });


    if (existingFolder.data.files && existingFolder.data.files.length > 0) {
        logger.info(`Found existing backup folder for file: ${originalFileName}`);
        return existingFolder.data.files[0].id!;
    }

    const newFolder = await drive.files.create({
        requestBody: {
            name: originalFileName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [BACKUP_FOLDER_ID]
        },
        fields: 'id'
    });
    logger.info(`Created new backup folder for file: ${originalFileName}`);
    return newFolder.data.id!;
}

async function cleanupOldBackups(backupFolderId: string) {
    const backups = await drive.files.list({
        q: `'${backupFolderId}' in parents`,
        orderBy: 'createdTime asc',
        fields: 'files(id, createdTime)'
    });

    const files = backups.data.files || [];

    while (files.length >= 8) {
        const oldestFile = files.shift()!;
        await drive.files.delete({ fileId: oldestFile.id! });
        logger.info(`Deleted old backup file: created at ${oldestFile.createdTime}`);
    }
}


export async function createBackUp(fileId: string) {

    const [originalName, backupFolderId] = await Promise.all([
        getOriginalFileName(fileId),
        getOrCreateFileBackupFolder(fileId)
    ]);

    await cleanupOldBackups(backupFolderId);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const response = await drive.files.copy({
        fileId: fileId,
        requestBody: {
            name: `${originalName}_${timestamp}`,
            parents: [backupFolderId]
        }
    });

    logger.info(`Backup created for file: ${originalName} at ${timestamp}`);

    return response.data.id;
}