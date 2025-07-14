import { Request, Response } from 'express';
import { google } from 'googleapis';

export const handleOAuthCallback = async (req: Request, res: Response) => {
    const code = req.query.code as string;

    if (!code) {
        res.status(400).send('Missing authorization code');
        return
    }

    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        console.log('Access Token:', tokens.access_token);
        console.log('Refresh Token:', tokens.refresh_token);

        res.send(`Tokens received. Refresh Token: ${tokens.refresh_token}`);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).send('Token exchange failed');
    }
};