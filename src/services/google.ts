import { google } from 'googleapis';

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || ""
)

oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN || ""
})

export const sheets = google.sheets({ version: "v4", auth: oAuth2Client })
export const drive = google.drive({ version: 'v3', auth: oAuth2Client });
export const docs = google.docs({ version: 'v1', auth: oAuth2Client });