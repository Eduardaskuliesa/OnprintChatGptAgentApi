import { addContentToFile } from "./addContentToFile";
import { createGoogleFile } from "./createGoogleFile";

export interface CreatedItem {
    name: string;
    type: 'folder' | 'sheet' | 'doc';
    id: string;
    children?: CreatedItem[];
}

export interface CreateItem {
    name: string;
    type: 'folder' | 'sheet' | 'doc';
    content?: string | string[][];
    children?: CreateItem[];
}

export const processItems = async (items: CreateItem[], parentId?: string) => {
    const result: CreatedItem[] = [];

    for (const item of items) {
        const fileId = await createGoogleFile(item.name, item.type, parentId);

        if (fileId.success === false) {
            return {
                success: false,
                message: fileId.message
            }
        }

        if (item.content && (item.type === 'doc' || item.type === 'sheet')) {
            await addContentToFile(fileId.fileId as string, item.type, item.content);
        }

        const createdItem: CreatedItem = {
            name: item.name,
            type: item.type,
            id: fileId.fileId as string
        };

        if (item.children && item.children.length > 0) {
            createdItem.children = await processItems(item.children, fileId.fileId as string) as unknown as CreatedItem[];
        }

        result.push(createdItem);
    }

    return {
        success: true,
        created: result
    };
};