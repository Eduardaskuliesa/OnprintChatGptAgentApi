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
        const processedIds = new Set();

        for (const folder of folders) {
            if (!folder.parents) continue;
            if (processedIds.has(folder.id)) continue;

            const filesResponse = await drive.files.list({
                q: `'${folder.id}' in parents`,
                fields: 'files(id, name, mimeType)'
            })

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

            result.push({
                type: 'folder',
                name: folder.name,
                id: folder.id,
                files: files
            });

            processedIds.add(folder.id);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error });
    }
}