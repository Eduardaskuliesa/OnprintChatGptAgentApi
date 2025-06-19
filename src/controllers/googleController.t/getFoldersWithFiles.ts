import { Request, Response } from "express";
import { drive } from "../../services/google";



export const getFoldersWithFiles = async (req: Request, res: Response) => {
    try {
        const folderResponse = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder'",
            fields: 'files(id, name, parents)'
        })

        const folders = folderResponse.data.files || [];
        const result = [];

        for (const folder of folders) {
            if (!folder.parents) continue

            const filesResponse = await drive.files.list({
                q: `'${folder.id}' in parents`,
                fields: 'files(id, name, mimeType)'
            })

            const files = filesResponse.data.files?.map(file => ({
                type: 'file',
                name: file.name,
                id: file.id
            })) || [];

            result.push({
                type: 'folder',
                name: folder.name,
                id: folder.id,
                files: files
            });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error });
    }
}