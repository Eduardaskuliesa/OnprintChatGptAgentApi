import { google } from 'googleapis';

export const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents'
    ],
});

export const sheets = google.sheets({ version: 'v4', auth });
export const drive = google.drive({ version: 'v3', auth });
export const docs = google.docs({ version: 'v1', auth });