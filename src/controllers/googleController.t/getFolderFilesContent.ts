import { Request, Response } from 'express';
import { drive, docs, sheets } from '../../services/google';
import logger from '../../utils/logger';

interface RequestBody {
    fileId?: string;
    folderId?: string;
}

interface FileResponse {
    success: boolean;
    fileId?: string;
    name?: string;
    content?: string;
    message?: string;
    size?: string;
}

interface FolderResponse {
    success: boolean;
    folderName?: string;
    files?: Array<{
        fileId: string;
        name: string;
        content: string;
    }>;
    message?: string;
    size?: string;
}

export const getFolderFilesContent = async (req: Request<{}, FileResponse | FolderResponse, RequestBody>, res: Response<FileResponse | FolderResponse>) => {
    const { fileId, folderId } = req.body;

    const calculateResponseSize = (data: any): { bytes: number; kb: number; mb: number } => {
        const jsonString = JSON.stringify(data);
        const bytes = Buffer.byteLength(jsonString, 'utf8');
        return {
            bytes,
            kb: parseFloat((bytes / 1024).toFixed(2)),
            mb: parseFloat((bytes / (1024 * 1024)).toFixed(2))
        };
    };

    const sendResponseWithSize = (data: any) => {
        const size = calculateResponseSize(data);
        const responseWithSize = {
            ...data,
            size: size.mb > 1 ? `${size.mb} MB` : `${size.kb} KB`
        };

        logger.info(`Response size: ${size.kb} KB`);

        res.json(responseWithSize);
    };

    try {
        if (fileId) {
            const file = await drive.files.get({
                fileId,
                fields: 'id,name,mimeType'
            });

            const mimeType = file.data.mimeType;

            if (mimeType === 'application/vnd.google-apps.document') {
                const doc = await docs.documents.get({ documentId: fileId });
                const content = doc.data.body?.content
                    ?.map(element =>
                        element.paragraph?.elements
                            ?.map(el => el.textRun?.content || '')
                            .join('')
                    )
                    .join('') || '';

                const responseData = {
                    success: true,
                    fileId: file.data.id!,
                    name: file.data.name!,
                    content
                };

                sendResponseWithSize(responseData);
                return;
            }

            if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                const sheet = await sheets.spreadsheets.values.get({
                    spreadsheetId: fileId,
                    range: 'A:Z'
                });

                const values = sheet.data.values || [];
                const headers = values[0] || [];
                const rows = values.slice(1).map(row => {
                    const obj: Record<string, any> = {};
                    row.forEach((val, i) => {
                        if (headers[i]) {
                            obj[headers[i]] = val;
                        }
                    });
                    return obj;
                });

                const responseData = {
                    success: true,
                    fileId: file.data.id!,
                    name: file.data.name!,
                    content: JSON.stringify(rows, null, 2)
                };

                sendResponseWithSize(responseData);
                return;
            }

            const errorResponse = {
                success: false,
                message: "Unsupported file type"
            };

            sendResponseWithSize(errorResponse);
            return;
        }

        if (folderId) {
            const folderInfo = await drive.files.get({
                fileId: folderId,
                fields: 'name'
            });

            const filesResponse = await drive.files.list({
                q: `'${folderId}' in parents`,
                fields: 'files(id,name,mimeType)'
            });

            const files: Array<{ fileId: string; name: string; content: string }> = [];

            for (const file of filesResponse.data.files || []) {
                const mimeType = file.mimeType;

                if (mimeType === 'application/vnd.google-apps.document') {
                    const doc = await docs.documents.get({ documentId: file.id! });
                    const content = doc.data.body?.content
                        ?.map(element =>
                            element.paragraph?.elements
                                ?.map(el => el.textRun?.content || '')
                                .join('')
                        )
                        .join('') || '';

                    files.push({
                        fileId: file.id!,
                        name: file.name!,
                        content
                    });
                }

                if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                    const sheet = await sheets.spreadsheets.values.get({
                        spreadsheetId: file.id!,
                        range: 'A:Z'
                    });

                    const values = sheet.data.values || [];
                    const headers = values[0] || [];
                    const rows = values.slice(1).map(row => {
                        const obj: Record<string, any> = {};
                        row.forEach((val, i) => {
                            if (headers[i]) {
                                obj[headers[i]] = val;
                            }
                        });
                        return obj;
                    });

                    files.push({
                        fileId: file.id!,
                        name: file.name!,
                        content: JSON.stringify(rows, null, 2)
                    });
                }
            }

            const responseData = {
                success: true,
                folderName: folderInfo.data.name!,
                files
            };

            sendResponseWithSize(responseData);
            return;
        }

        const errorResponse = {
            success: false,
            message: "Missing folderId or fileId"
        };

        sendResponseWithSize(errorResponse);

    } catch (error: any) {
        const errorResponse = {
            success: false,
            message: error.message
        };

        sendResponseWithSize(errorResponse);
        res.status(500);
    }
};