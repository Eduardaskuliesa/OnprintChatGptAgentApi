import { Request, Response } from 'express';
import { drive, docs, sheets } from '../../services/google';

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
}

export const getFolderFilesContent = async (req: Request<{}, FileResponse | FolderResponse, RequestBody>, res: Response<FileResponse | FolderResponse>) => {
    const { fileId, folderId } = req.body;

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

                res.json({
                    success: true,
                    fileId: file.data.id!,
                    name: file.data.name!,
                    content
                });
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

                res.json({
                    success: true,
                    fileId: file.data.id!,
                    name: file.data.name!,
                    content: JSON.stringify(rows, null, 2)
                });
                return;
            }

            res.json({
                success: false,
                message: "Unsupported file type"
            });
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

            res.json({
                success: true,
                folderName: folderInfo.data.name!,
                files
            });
            return;
        }

        res.json({
            success: false,
            message: "Missing folderId or fileId"
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};