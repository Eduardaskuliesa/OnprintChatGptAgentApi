
import { checkStorageUsage } from "./checkGoogleStorageLimit"
import { createInExistingFolder } from "./createInExistingFolder"
import { createNewFoldersAndFiles } from "./createNewFolderAndFiles"
import { deleteFolderFiles } from "./deleteFolderFiles"
import { getFolderFilesContent } from "./getFolderFilesContent"
import { getFoldersWithFiles } from "./getFoldersWithFiles"
import { getGoogleConsentUrl } from "./getGoogleConsentUrl"
import { handleOAuthCallback } from "./handleOAuthCallback"
import { updateFileContent } from "./updateFileContent"


export const googleController = {
    getFoldersWithFiles,
    getFolderFilesContent,
    createNewFoldersAndFiles,
    createInExistingFolder,
    updateFileContent,
    deleteFolderFiles,
    checkStorageUsage,
    getGoogleConsentUrl,
    handleOAuthCallback
}
