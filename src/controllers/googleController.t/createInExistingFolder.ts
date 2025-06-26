import { Request, Response } from "express";
import { drive } from "../../services/google";
import { CreateItem, processItems } from "../../heleprs/proccessItems";
import logger from "../../utils/logger";





export const createInExistingFolder = async (req: Request, res: Response) => {
    try {
        const { parentFolderId, items }: { parentFolderId: string, items: CreateItem[] } = req.body;

        let folder;
        try {
            folder = await drive.files.get({
                fileId: parentFolderId,
                fields: 'id, name, mimeType'
            });
        } catch (error: any) {
            if (error.code === 404) {
                logger.error(`Folder with ID ${parentFolderId} not found`);
                res.status(404).json({ error: 'Folder not found' });
                return
            }
            throw error;
        }

        if (folder.data.mimeType !== 'application/vnd.google-apps.folder') {
            res.status(400).json({ error: 'Provided ID is not a folder' });
            return
        }

        const createdItems = await processItems(items, parentFolderId);

        res.json({
            success: true,
            message: `Files created in folder: ${folder.data.name}`,
            parentFolder: { id: parentFolderId, name: folder.data.name },
            created: createdItems
        });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};