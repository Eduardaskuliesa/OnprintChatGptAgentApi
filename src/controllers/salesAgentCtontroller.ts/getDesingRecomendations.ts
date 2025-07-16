
import { Request, Response } from 'express';
import { docs } from '../../services/google';
import logger from '../../utils/logger';

const DESIGNER_RECOMMENDATIONS_FILE_ID = '1eZW1bdtwI_nAiYdhKGf4XN9dOcZLpbim4yY538q_Y78';

export async function getDesignRecommendations(req: Request, res: Response) {
   try {
       const doc = await docs.documents.get({ 
           documentId: DESIGNER_RECOMMENDATIONS_FILE_ID 
       });

       let content = '';

       if (doc.data.body?.content) {
           for (const element of doc.data.body.content) {
               if (element.paragraph?.elements) {
                   const paragraphText = element.paragraph.elements
                       .map(el => el.textRun?.content || '')
                       .join('');
                   content += paragraphText;
               }
           }
       }

       res.json({
           success: true,
           desing_recommendations: content || '',
           name: doc.data.title || 'Design Recommendations'
       });

   } catch (error: any) {
       logger.error(`Failed to fetch design recommendations: ${error.message}`);
       res.status(500).json({
           success: false,
           message: error.message
       });
   }
}