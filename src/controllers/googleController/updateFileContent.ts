import { Request, Response } from "express";
import { docs, sheets } from "../../services/google";
import logger from "../../utils/logger";
import { createBackUp} from "../../heleprs/createBackUp";

interface UpdateRequest {
    fileId: string;
    type: 'doc' | 'sheet';
    content: string | string[][];
    action: 'replace' | 'append' | 'update';
    conversationId: string
    sheetName?: string;
    targetCells?: string; // "A5:C7"
    updates?: Array<{ // For batch updates
        range: string;
        values: string[][];
    }>;
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



const updateSheetContent = async (fileId: string, content: string[][], action: string, options?: {
    sheetName?: string;
    targetCells?: string;
    updates?: Array<{ range: string; values: string[][]; }>;
}) => {
    const sheetName = options?.sheetName || 'Lapas1';



    switch (action) {
        case 'replace':
            await sheets.spreadsheets.values.clear({
                spreadsheetId: fileId,
                range: `${sheetName}!A:Z`
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: fileId,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: content }
            });
            break;

        case 'append':
            await sheets.spreadsheets.values.append({
                spreadsheetId: fileId,
                range: `${sheetName}!A:Z`,
                valueInputOption: 'RAW',
                requestBody: { values: content }
            });
            break;

        case 'update':
            if (options?.targetCells) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: fileId,
                    range: `${sheetName}!${options.targetCells}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: content }
                });
            } else if (options?.updates) {
                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId: fileId,
                    requestBody: {
                        valueInputOption: 'RAW',
                        data: options.updates.map(update => ({
                            range: `${sheetName}!${update.range}`,
                            values: update.values
                        }))
                    }
                });
            }
            break;

        default:
            throw new Error(`Unsupported action: ${action}`);
    }
};

export const updateFileContent = async (req: Request, res: Response) => {
    try {
        const { fileId, type, content, action, sheetName, targetCells, updates, conversationId }: UpdateRequest = req.body;

        await createBackUp(fileId)

        switch (type) {
            case 'doc':
                await updateDocContent(fileId, content as string, action as 'replace' | 'append');
                break;

            case 'sheet':
                await updateSheetContent(fileId, content as string[][], action, {
                    sheetName,
                    targetCells,
                    updates
                });
                break;
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