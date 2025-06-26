import { drive } from "../services/google";

export const findFolderByName = async (folderName: string): Promise<string | null> => {
    const response = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
    });

    return response.data.files?.[0]?.id || null;
};