import { Request, Response } from "express";
import { drive } from "../../services/google";
import logger from "../../utils/logger";

const ARCHIVE_FOLDER_ID = '17fCNpZskdbJkqmayVkI82-hU4tvLC23U';

export const archiveFile = async (fileId: string) => {

    const file = await drive.files.get({
        fileId: fileId,
        fields: 'parents'
    });
    const currentParents = file.data.parents?.join(',') || '';

    const response = await drive.files.update({
        fileId: fileId,
        addParents: ARCHIVE_FOLDER_ID,
        removeParents: currentParents,
        fields: 'id'
    });

    logger.info(`File archived successfully", fileId: ${fileId}`);

    return response.data.id;
};

export const deleteFolderFiles = async (req: Request, res: Response) => {
    try {
        const { fileId } = req.body;

        await archiveFile(fileId);


        res.json({
            success: true,
            message: 'File archived successfully',
            fileId
        });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};