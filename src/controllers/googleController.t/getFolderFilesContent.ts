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
        const responseStats = {
            ...data,
            size: size.mb > 1 ? `${size.mb} MB` : `${size.kb} KB`,
            char: size.chars,
        };

        logger.info(`💾 Response size: ${size.kb} KB`);
        logger.info(`📄 Characters in response: ${size.chars}`);
        logger.info(`📁 Response contains - Files: ${fileCount}, Folders: ${folderCount}`);

        res.json(responseStats);
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

                let content = '';

                if (doc.data.body?.content) {
                    for (const element of doc.data.body.content) {
                        if (element.paragraph?.elements) {
                            const paragraphText = element.paragraph.elements
                                .map(el => el.textRun?.content || '')
                                .join('');
                            content += paragraphText;
                        }

                        if (element.table?.tableRows) {
                            content += '\n\n[TABLE]\n';
                            for (const row of element.table.tableRows) {
                                const rowData: string[] = [];
                                for (const cell of row.tableCells || []) {
                                    let cellText = '';
                                    for (const cellElement of cell.content || []) {
                                        if (cellElement.paragraph?.elements) {
                                            cellText += cellElement.paragraph.elements
                                                .map(el => el.textRun?.content || '')
                                                .join('');
                                        }
                                    }
                                    rowData.push(cellText.trim());
                                }
                                content += rowData.join(' | ') + '\n';
                            }
                            content += '[/TABLE]\n\n';
                        }
                    }
                }

                const responseData = {
                    success: true,
                    fileId: file.data.id!,
                    name: file.data.name!,
                    content: content || ''
                };

                sendResponseWithSize(responseData, 1, 0);
                return;
            }

            if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                try {

                    const copiedFile = await drive.files.copy({
                        fileId: fileId,
                        requestBody: {
                            name: `temp_${file.data.name}`,
                            mimeType: 'application/vnd.google-apps.document'
                        }
                    });

                    const doc = await docs.documents.get({ documentId: copiedFile.data.id! });
                    const content = doc.data.body?.content
                        ?.map(element =>
                            element.paragraph?.elements
                                ?.map(el => el.textRun?.content || '')
                                .join('')
                        )
                        .join('') || '';


                    await drive.files.delete({ fileId: copiedFile.data.id! });

                    const responseData = {
                        success: true,
                        fileId: file.data.id!,
                        name: file.data.name!,
                        content
                    };

                    sendResponseWithSize(responseData, 1, 0);
                    return;
                } catch (error) {
                    logger.error(`Failed to read .docx file: ${error}`);

                    const errorResponse = {
                        success: false,
                        message: `Failed to process .docx file: ${error}`
                    };

                    sendResponseWithSize(errorResponse, 0, 0);
                    return;
                }
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

                sendResponseWithSize(responseData, 1, 0);
                return;
            }

            const errorResponse = {
                success: false,
                message: `Unsupported file type: ${mimeType}`
            };

            sendResponseWithSize(errorResponse, 0, 0);
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

                    let content = '';

                    if (doc.data.body?.content) {
                        for (const element of doc.data.body.content) {

                            if (element.paragraph?.elements) {
                                const paragraphText = element.paragraph.elements
                                    .map(el => el.textRun?.content || '')
                                    .join('');
                                content += paragraphText;
                            }


                            if (element.table?.tableRows) {
                                content += '\n\n[TABLE]\n';
                                for (const row of element.table.tableRows) {
                                    const rowData: string[] = [];
                                    for (const cell of row.tableCells || []) {
                                        let cellText = '';
                                        for (const cellElement of cell.content || []) {
                                            if (cellElement.paragraph?.elements) {
                                                cellText += cellElement.paragraph.elements
                                                    .map(el => el.textRun?.content || '')
                                                    .join('');
                                            }
                                        }
                                        rowData.push(cellText.trim());
                                    }
                                    content += rowData.join(' | ') + '\n';
                                }
                                content += '[/TABLE]\n\n';
                            }
                        }
                    }

                    files.push({
                        fileId: file.id!,
                        name: file.name!,
                        content: content || ''
                    });
                }

                if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    try {

                        const copiedFile = await drive.files.copy({
                            fileId: file.id!,
                            requestBody: {
                                name: `temp_${file.name}`,
                                mimeType: 'application/vnd.google-apps.document'
                            }
                        });


                        const doc = await docs.documents.get({ documentId: copiedFile.data.id! });
                        const content = doc.data.body?.content
                            ?.map(element =>
                                element.paragraph?.elements
                                    ?.map(el => el.textRun?.content || '')
                                    .join('')
                            )
                            .join('') || '';


                        await drive.files.delete({ fileId: copiedFile.data.id! });

                        files.push({
                            fileId: file.id!,
                            name: file.name!,
                            content
                        });
                    } catch (error) {
                        logger.error(`Failed to read .docx file ${file.name}: ${error}`);
                    }
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

            sendResponseWithSize(responseData, files.length, 1);
            return;
        }

        const errorResponse = {
            success: false,
            message: "Missing folderId or fileId"
        };

        sendResponseWithSize(errorResponse, 0, 0);

    } catch (error: any) {
        logger.error(`❌ Error: ${error.message}`);

        const errorResponse = {
            success: false,
            message: error.message
        };

        sendResponseWithSize(errorResponse, 0, 0);
        res.status(500);
    }
};