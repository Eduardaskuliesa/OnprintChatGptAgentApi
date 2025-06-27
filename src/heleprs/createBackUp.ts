import { drive } from "../services/google";
import logger from "../utils/logger";

const BACKUP_FOLDER_ID = "1AjqzzPh3PzcRJAF1O-NimHG83CiyMBOs"

async function getNextVersion(fileId: string): Promise<number> {
    const response = await drive.files.list({
        q: `'${BACKUP_FOLDER_ID}' in parents and properties has {key='originalFileId' and value='${fileId}'}`,
        fields: 'files(properties)'
    });

    let maxVersion = 0;
    response.data.files?.forEach(file => {
        const version = parseInt(file.properties?.version || '0');
        if (version > maxVersion) maxVersion = version;
    });

    return maxVersion + 1;
}

async function getOriginalFileName(fileId: string): Promise<string> {
    const response = await drive.files.get({
        fileId: fileId,
        fields: 'name'
    });

    return response.data.name || 'Unknown';
}

async function checkLastBackUp(fileId: string, conversationId: string) {
    const response = await drive.files.list({
        q: `'${BACKUP_FOLDER_ID}' in parents and properties has {key='originalFileId' and value='${fileId}'} and properties has {key='conversationId' and value='${conversationId}'}`,
        fields: 'files(id)'
    });

    return response.data.files && response.data.files.length > 0;
}

export async function createBackUp(fileId: string, conversationId: string) {
    const backupExists = await checkLastBackUp(fileId, conversationId);

    const originalName = await getOriginalFileName(fileId);

    if (!backupExists) {

        const version = await getNextVersion(fileId);

        const response = await drive.files.copy({
            fileId: fileId,
            requestBody: {
                name: `${originalName}_${version}`,
                parents: [BACKUP_FOLDER_ID],
                properties: {
                    originalFileId: fileId,
                    conversationId: conversationId,
                    version: version.toString(),
                    createdAt: new Date().toISOString()
                }
            }
        });

        logger.success(`Backup created: ${response.data.name} Version: ${version} for file: ${originalName}`);

        return response.data.id;
    }

    logger.info(`Backup already exists for file: ${originalName} in conversation: ${conversationId}`);

    return null;
}