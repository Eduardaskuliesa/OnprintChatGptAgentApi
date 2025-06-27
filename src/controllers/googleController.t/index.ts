import { createInExistingFolder } from "./createInExistingFolder"
import { createNewFoldersAndFiles } from "./createNewFolderAndFiles"
import { deleteFolderFiles } from "./deleteFolderFiles"
import { getFolderFilesContent } from "./getFolderFilesContent"
import { getFoldersWithFiles } from "./getFoldersWithFiles"
import { updateFileContent } from "./updateFileContent"


export const googleController = {
    getFoldersWithFiles,
    getFolderFilesContent,
    createNewFoldersAndFiles,
    createInExistingFolder,
    updateFileContent,
    deleteFolderFiles
}
