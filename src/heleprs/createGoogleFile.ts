import { drive } from "../services/google";
import logger from "../utils/logger";



const SHARED_FOLDER_ID = '1h3bVdCaO1rq4AArJl7U_32WomA2N07Ji';


async function validateParentScope(parentId: string): Promise<{ success: boolean, error?: string }> {
    try {
        await drive.files.get({
            fileId: parentId,
            fields: 'id'
        });

    } catch (error: any) {
        await drive.files.delete({
            fileId: parentId
        });
        if (error.code === 404) {
            return { success: false, error: "NOT_EXIST" };
        }
        return { success: false, error: "NOT_EXIST" };
    }

    if (parentId === SHARED_FOLDER_ID) {
        return { success: true };
    }

    try {
        let currentId = parentId;
        while (currentId) {
            const folder = await drive.files.get({
                fileId: currentId,
                fields: 'parents'
            });

            const parents = folder.data.parents;
            if (!parents || parents.length === 0) {
                await drive.files.delete({
                    fileId: parentId
                });
                return { success: false, error: "SHARED_FOLDER_ONLY" };

            }

            currentId = parents[0];
            if (currentId === SHARED_FOLDER_ID) {
                return { success: true };
            }
        }

        return { success: false, error: "SHARED_FOLDER_ONLY" };
    } catch {
        return { success: false, error: "SHARED_FOLDER_ONLY" };
    }
}

export const createGoogleFile = async (name: string, type: 'folder' | 'sheet' | 'doc', parentId?: string) => {

    const isValid = await validateParentScope(parentId as string)
    if (!isValid.success && isValid.error === "SHARED_FOLDER_ONLY") {
        return {
            success: false,
            message: `Cannot create ${type}. Only files in the shared folder can be created.`,
        }
    }

    if (!isValid.success && isValid.error === "NOT_EXIST") {
        return {
            success: false,
            message: `Folder with ID ${parentId} does not exist.`,
        }
    }
    const mimeTypes = {
        folder: 'application/vnd.google-apps.folder',
        sheet: 'application/vnd.google-apps.spreadsheet',
        doc: 'application/vnd.google-apps.document'
    };

    const fileMetadata: any = {
        name,
        mimeType: mimeTypes[type]
    };

    if (parentId) {
        fileMetadata.parents = [parentId];
    }

    const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id'
    });

    const fileId = response.data.id;

    if (!fileId) {
        logger.error(`Failed to create ${type} with name "${name}"`);
        return {
            success: false,
            message: `Failed to create ${type} with name "${name}"`,
        }
    }


    return {
        success: true,
        fileId
    }
};