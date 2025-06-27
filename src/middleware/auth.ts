import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
    apiKey?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string;

    let errorMessage

    if (!apiKey) {
        res.status(401).json({
            success: false,
            message: 'API key required'
        });
        return;
    }

    if (apiKey !== process.env.API_KEY) {
        res.status(401).json({
            success: false,
            message: 'Invalid API key'
        });
        return;
    }

    req.apiKey = apiKey;
    next();
};