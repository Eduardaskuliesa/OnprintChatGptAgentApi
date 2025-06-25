import { docs, sheets } from "../services/google";

export const addContentToFile = async (fileId: string, type: 'doc' | 'sheet', content: string | string[][]) => {
    if (type === 'doc' && typeof content === 'string') {
        await docs.documents.batchUpdate({
            documentId: fileId,
            requestBody: {
                requests: [{
                    insertText: {
                        location: { index: 1 },
                        text: content
                    }
                }]
            }
        });
    } else if (type === 'sheet' && Array.isArray(content)) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: fileId,
            range: 'A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: content
            }
        });
    }
};

