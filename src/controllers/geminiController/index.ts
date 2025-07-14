// controllers/geminiController.ts
import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4080';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-gemini-api-key';

const driveApiFunctions = [
    {
        name: 'getDriveStructure',
        description: 'Get the complete Google Drive folder and file structure',
    },
    {
        name: 'getDocsFromFolderOrFile',
        description: 'Get document content from a folder or file',
        parameters: {
            type: Type.OBJECT,
            properties: {
                folderId: {
                    type: Type.STRING,
                    description: 'ID of the folder to get documents from. If not provided, will use fileId.'

                },
                fileId: {
                    type: Type.STRING,
                    description: 'ID of the file content to retrieve. If not provided, will use folderId.'
                }
            }
        }
    }
];

// Map function names to API endpoints
const functionToEndpoint: { [key: string]: { endpoint: string; method: string } } = {
    'getDriveStructure': { endpoint: '/api/folders', method: 'GET' },
    'getDocsFromFolderOrFile': { endpoint: '/api/content', method: 'POST' }
};

async function callInternalAPI(endpoint: string, method: string = 'GET', body?: any, req?: Request) {
    const url = `${API_BASE_URL}${endpoint}`;

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': req?.headers['x-api-key'] as string || '',
        }
    };

    // Only add body for non-GET requests
    if (method !== 'GET' && body) {
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
}

export const geminiController = {
    chat: async (req: Request, res: Response) => {
        try {
            const { message } = req.body;
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: message }] }],
                config: {
                    tools: [{ functionDeclarations: driveApiFunctions }]
                }
            });

            if (response.functionCalls && response.functionCalls.length > 0) {
                const functionCall = response.functionCalls[0];
                console.log('Gemini wants to call:', functionCall.name);

                // Get the endpoint for this function
                const endpoint = functionToEndpoint[functionCall.name as string];
                if (!endpoint) {
                    res.status(400).json({ error: `Unknown function: ${functionCall.name}` });
                    return
                }

                // Call the appropriate endpoint
                const result = await callInternalAPI(endpoint.endpoint, endpoint.method, functionCall.args, req);
                res.json(result);
            } else {
                res.json({ message: 'No function called' });
            }

        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Failed' });
        }
    }
};