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

    const calculateResponseSize = (data: any): { bytes: number; kb: number; mb: number; chars: number } => {
        const jsonString = JSON.stringify(data);
        const bytes = Buffer.byteLength(jsonString, 'utf8');
        const chars = jsonString.length;
        return {
            bytes,
            kb: parseFloat((bytes / 1024).toFixed(2)),
            mb: parseFloat((bytes / (1024 * 1024)).toFixed(2)),
            chars
        };
    };

    const sendResponseWithSize = (data: any, fileCount: number = 0, folderCount: number = 0) => {
        const size = calculateResponseSize(data);
        const responseWithSize = {
            ...data,
            size: size.mb > 1 ? `${size.mb} MB` : `${size.kb} KB`
        };

        logger.info(`💾 Response size: ${size.kb} KB`);
        logger.info(`📄 Characters in response: ${size.chars}`);
        logger.info(`📁 Response contains - Files: ${fileCount}, Folders: ${folderCount}`);

        res.json(responseWithSize);
    };

    const extractDocContent = async (fileId: string) => {
        const doc = await docs.documents.get({ documentId: fileId });
        return doc.data.body?.content
            ?.map(element =>
                element.paragraph?.elements
                    ?.map(el => el.textRun?.content || '')
                    .join('')
            )
            .join('') || '';
    };

    const extractDocxContent = async (fileId: string) => {
        try {
            const response = await drive.files.export({
                fileId: fileId,
                mimeType: 'text/plain'
            });
            return response.data as string;
        } catch (error) {
            logger.error(`Failed to extract .docx content: ${error}`);
            return 'Unable to extract content from .docx file';
        }
    };

    const extractSheetContent = async (fileId: string) => {
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

        return JSON.stringify(rows, null, 2);
    };

    try {
        if (fileId) {
            const file = await drive.files.get({
                fileId,
                fields: 'id,name,mimeType'
            });

            const mimeType = file.data.mimeType;
            logger.info(`🔍 Processing file: ${file.data.name} (${mimeType})`);

            let content = '';
            if (mimeType === 'application/vnd.google-apps.document') {
                content = await extractDocContent(fileId);
            }
            else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                content = await extractDocxContent(fileId);
            }
            else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                content = await extractSheetContent(fileId);
            }
            else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                try {
                    const response = await drive.files.export({
                        fileId: fileId,
                        mimeType: 'text/csv'
                    });
                    content = response.data as string;
                } catch (error) {
                    content = 'Unable to extract content from .xlsx file';
                }
            }
            else {
                const errorResponse = {
                    success: false,
                    message: `Unsupported file type: ${mimeType}`
                };
                sendResponseWithSize(errorResponse, 0, 0);
                return;
            }

            const responseData = {
                success: true,
                fileId: file.data.id!,
                name: file.data.name!,
                content
            };

            sendResponseWithSize(responseData, 1, 0);
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
                let content = '';
                if (mimeType === 'application/vnd.google-apps.document') {
                    content = await extractDocContent(file.id!);
                }
                else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    content = await extractDocxContent(file.id!);
                }
                else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                    content = await extractSheetContent(file.id!);
                }
                else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                    try {
                        const response = await drive.files.export({
                            fileId: file.id!,
                            mimeType: 'text/csv'
                        });
                        content = response.data as string;
                    } catch (error) {
                        content = 'Unable to extract content from .xlsx file';
                    }
                }

                if (content) {
                    files.push({
                        fileId: file.id!,
                        name: file.name!,
                        content
                    });
                }
            }

            const responseData = {
                success: true,
                folderName: folderInfo.data.name!,
                files
            };

            sendResponseWithSize(responseData, files.length, 1);
            return;
        }

        const errorResponse = {
            success: false,
            message: "Missing folderId or fileId"
        };

        sendResponseWithSize(errorResponse, 0, 0);

    } catch (error: any) {
        logger.error(`❌ Error occurred: ${error.message}`);

        const errorResponse = {
            success: false,
            message: error.message
        };

        sendResponseWithSize(errorResponse, 0, 0);
        res.status(500);
    }
};