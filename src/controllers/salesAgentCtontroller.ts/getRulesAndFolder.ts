import { Request, Response } from 'express';
import { drive, docs, sheets } from '../../services/google';
import logger from '../../utils/logger';

const SHARED_FOLDER_ID = '1h3bVdCaO1rq4AArJl7U_32WomA2N07Ji';
const SALES_AGENT_FOLDER_ID = "1_qW_fhOsNllPEjqY_3bIqmATguk2mNQt";

const EXCLUDED_FOLDER_IDS = [
    '17fCNpZskdbJkqmayVkI82-hU4tvLC23U',
    '1AjqzzPh3PzcRJAF1O-NimHG83CiyMBOs'
];

// Helper function to process file content (reused from your existing code)
const processFileContent = async (fileId: string, mimeType: string, fileName: string) => {
    try {
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
            return content;
        }

        if (mimeType === 'application/vnd.google-apps.spreadsheet') {
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                includeGridData: true
            });

            const result = {
                spreadsheetId: fileId,
                title: spreadsheet.data.properties?.title,
                sheets: spreadsheet.data.sheets?.map(sheet => ({
                    sheetId: sheet.properties?.sheetId,
                    sheetName: sheet.properties?.title,
                    rowCount: sheet.properties?.gridProperties?.rowCount,
                    columnCount: sheet.properties?.gridProperties?.columnCount,
                    cells: sheet.data?.[0]?.rowData?.map((row, rowIndex) => ({
                        row: rowIndex + 1,
                        data: row.values?.map((cell, colIndex) => ({
                            address: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`,
                            column: String.fromCharCode(65 + colIndex),
                            value: cell.effectiveValue?.stringValue ??
                                cell.effectiveValue?.numberValue ??
                                cell.effectiveValue?.boolValue ??
                                cell.formattedValue ?? '',
                            formula: cell.userEnteredValue?.formulaValue || null,
                            type: cell.effectiveValue?.stringValue !== undefined ? 'text' :
                                cell.effectiveValue?.numberValue !== undefined ? 'number' :
                                    cell.effectiveValue?.boolValue !== undefined ? 'boolean' :
                                        cell.userEnteredValue?.formulaValue ? 'formula' : 'empty'
                        })) || []
                    })).filter(row => row.data.some(cell => cell.value !== '')) || []
                })) || []
            };

            return JSON.stringify(result, null, 2);
        }

        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const copiedFile = await drive.files.copy({
                fileId: fileId,
                requestBody: {
                    name: `temp_${fileName}`,
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
            return content;
        }

        return `Unsupported file type: ${mimeType}`;
    } catch (error) {
        logger.error(`Error processing file ${fileName}: ${error}`);
        return `Error processing file: ${error}`;
    }
};

export async function getRulesAndFolder(req: Request, res: Response) {
    try {
        // Get main folders structure
        const folderResponse = await drive.files.list({
            q: `'${SHARED_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, parents, mimeType)'
        });

        const filteredFolders = folderResponse.data.files?.filter(file =>
            !EXCLUDED_FOLDER_IDS.includes(file.id as string)
        ) || [];

        let folders = [];
        const processedIds = new Set();

        for (const folder of filteredFolders) {
            if (!folder.parents) continue;
            if (processedIds.has(folder.id)) continue;

            const filesResponse = await drive.files.list({
                q: `'${folder.id}' in parents`,
                fields: 'files(id, name, mimeType)'
            });

            const files = [];

            for (const file of filesResponse.data.files || []) {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    processedIds.add(file.id);

                    const subFilesResponse = await drive.files.list({
                        q: `'${file.id}' in parents`,
                        fields: 'files(id, name, mimeType)'
                    });

                    const subFiles = subFilesResponse.data.files?.map(subFile => ({
                        type: 'file',
                        name: subFile.name,
                        id: subFile.id
                    })) || [];

                    files.push({
                        type: 'folder',
                        name: file.name,
                        id: file.id,
                        files: subFiles
                    });
                } else {
                    files.push({
                        type: 'file',
                        name: file.name,
                        id: file.id
                    });
                }
            }

            folders.push({
                type: 'folder',
                name: folder.name,
                id: folder.id,
                files: files
            });
            processedIds.add(folder.id);
        }

        // Get Sales Agent Rules from specific folder
        logger.info(`Getting sales agent rules from folder: ${SALES_AGENT_FOLDER_ID}`);
        
        const salesRulesResponse = await drive.files.list({
            q: `'${SALES_AGENT_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)'
        });

        const salesAgentRules = [];

        for (const file of salesRulesResponse.data.files || []) {
            const content = await processFileContent(file.id!, file.mimeType!, file.name!);
            
            salesAgentRules.push({
                fileId: file.id,
                name: file.name,
                mimeType: file.mimeType,
                content: content
            });
        }

        logger.info(`📁 Found ${folders.length} folders and ${salesAgentRules.length} sales rule files`);

        res.json({
            success: true,
            folders: folders,
            salesAgentRules: salesAgentRules
        });

    } catch (error: any) {
        logger.error(`❌ Error in getRulesAndFolder: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}