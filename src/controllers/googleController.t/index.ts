import { createInExistingFolder } from "./createInExistingFolder"
import { createNewFoldersAndFiles } from "./createNewFolderAndFiles"
import { getFolderFilesContent } from "./getFolderFilesContent"
import { getFoldersWithFiles } from "./getFoldersWithFiles"
import { updateFileContent } from "./updateFileContent"


export const googleController = {
    getFoldersWithFiles,
    getFolderFilesContent,
    createNewFoldersAndFiles,
    createInExistingFolder,
    updateFileContent
}
