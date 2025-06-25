import { drive } from "../services/google";

export const createGoogleFile = async (name: string, type: 'folder' | 'sheet' | 'doc', parentId?: string) => {
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

    return response.data.id;
};