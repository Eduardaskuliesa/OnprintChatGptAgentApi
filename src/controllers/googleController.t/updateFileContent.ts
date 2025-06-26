import { Request, Response } from "express";
import { docs, sheets } from "../../services/google";
import logger from "../../utils/logger";

interface UpdateRequest {
    fileId: string;
    type: 'doc' | 'sheet';
    content: string | string[][];
    action: 'replace' | 'append';
}

const updateDocContent = async (fileId: string, content: string, action: 'replace' | 'append') => {
    switch (action) {
        case 'replace':
            const doc = await docs.documents.get({ documentId: fileId });
            const endIndex = doc.data.body?.content?.[doc.data.body.content.length - 1]?.endIndex || 1;

            await docs.documents.batchUpdate({
                documentId: fileId,
                requestBody: {
                    requests: [
                        { deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } },
                        { insertText: { location: { index: 1 }, text: content } }
                    ]
                }
            });
            break;

        case 'append':

            const docForAppend = await docs.documents.get({ documentId: fileId });
            const appendIndex = docForAppend.data.body?.content?.[docForAppend.data.body.content.length - 1]?.endIndex || 1;

            await docs.documents.batchUpdate({
                documentId: fileId,
                requestBody: {
                    requests: [{
                        insertText: {
                            location: { index: appendIndex - 1 },
                            text: `\n${content}`
                        }
                    }]
                }
            });
            break;

        default:
            throw new Error(`Unsupported action: ${action}`);
    }
};

const updateSheetContent = async (fileId: string, content: string[][], action: 'replace' | 'append') => {
    switch (action) {
        case 'replace':
            await sheets.spreadsheets.values.clear({
                spreadsheetId: fileId,
                range: 'A:Z'
            });

            await sheets.spreadsheets.values.update({
                spreadsheetId: fileId,
                range: 'A1',
                valueInputOption: 'RAW',
                requestBody: { values: content }
            });
            break;

        case 'append':
            await sheets.spreadsheets.values.append({
                spreadsheetId: fileId,
                range: 'A:Z',
                valueInputOption: 'RAW',
                requestBody: { values: content }
            });
            break;

        default:
            throw new Error(`Unsupported action: ${action}`);
    }
};

export const updateFileContent = async (req: Request, res: Response) => {
    try {
        logger.info('Received update file content request');
        const { fileId, type, content, action }: UpdateRequest = req.body;
        console.log(req.body)
        switch (type) {
            case 'doc':
                await updateDocContent(fileId, content as string, action);
                break;

            case 'sheet':
                await updateSheetContent(fileId, content as string[][], action);
                break;

            default:
                res.status(400).json({ error: `Unsupported file type: ${type}` });
                return
        }

        res.json({
            success: true,
            message: `File content ${action}d successfully`,
            fileId
        });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};