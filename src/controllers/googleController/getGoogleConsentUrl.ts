import { Request, Response } from 'express';
import { google } from 'googleapis';

export const getGoogleConsentUrl = (req: Request, res: Response) => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',  
        prompt: 'consent',  
        scope: scopes,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });

    res.json({ authUrl });
};
