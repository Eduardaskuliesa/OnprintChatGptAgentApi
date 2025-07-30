import { Request, Response } from 'express';
import { google } from 'googleapis';
import { GPT_ID, refreshToken } from '../../tokens/google-refresh-token';
import logger from '../../utils/logger';
import { updateCredentials } from '../../services/google';


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

        if (tokens.refresh_token) {
            refreshToken.set(GPT_ID, tokens.refresh_token);
            updateCredentials();
        }
        logger.info('Access Token:', tokens.access_token);
        logger.info('Refresh Token:', tokens.refresh_token);

        res.send(`Tokens received. Refresh Token: ${tokens.refresh_token}`);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).send('Token exchange failed');
    }
};