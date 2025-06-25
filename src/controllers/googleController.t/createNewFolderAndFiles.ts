import { Request, Response } from "express";
import { findFolderByName } from "../../heleprs/findFolderByName";
import { CreateItem, processItems } from "../../heleprs/proccessItems";
import logger from "../../utils/logger";


interface RequestBody {
    items: CreateItem[];
}

export const createNewFoldersAndFiles = async (req: Request, res: Response) => {
    try {
        const { items }: RequestBody = req.body;

        const targetFolderId = await findFolderByName('chat-gpt-duombazė');
        if (!targetFolderId) {
            res.status(404).json({ error: 'chat-gpt-duombazė folder not found' });
        }

        const createdItems = await processItems(items, targetFolderId as string);
        
        logger.success(`Created items in folder: chat-gpt-duombazė`);
        
        res.json({
            success: true,
            message: 'Files and folders created successfully',
            created: createdItems
        });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};