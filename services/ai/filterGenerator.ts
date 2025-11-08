import { ColumnProfile, CsvRow, Settings, AiFilterResponse } from '../../types';
import { callGemini, callOpenAI } from './apiClient';
import { filterFunctionSchema, filterFunctionJsonSchema } from './schemas';
import { createFilterFunctionPrompt } from '../promptTemplates';

interface FilterFunctionOptions {
    signal?: AbortSignal;
}

export const generateFilterFunction = async (
    query: string,
    columns: ColumnProfile[],
    sampleData: CsvRow[],
    settings: Settings,
    options?: FilterFunctionOptions
): Promise<AiFilterResponse> => {
    
    let lastError: Error | undefined;

    for(let i=0; i < 2; i++) { // Self-correction loop: 1 initial attempt + 1 retry
        if (options?.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        try {
            let jsonStr: string;
            const promptContent = createFilterFunctionPrompt(query, columns, sampleData);

            if (settings.provider === 'openai') {
                const systemPrompt = "You are an expert data analyst. Your task is to convert a user's natural language query into a JavaScript filter function body for a dataset. You MUST respond with a single valid JSON object, and nothing else. The JSON object must adhere to the provided schema.";
                
                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: promptContent }
                ];
                jsonStr = await callOpenAI(
                    settings,
                    messages,
                    { name: 'FilterFunctionResponse', schema: filterFunctionJsonSchema, strict: true },
                    options?.signal
                );

            } else { // Google Gemini
                jsonStr = await callGemini(settings, promptContent, filterFunctionSchema, options?.signal);
            }
            
            const response = JSON.parse(jsonStr) as AiFilterResponse;

            // Basic validation
            if (response.jsFunctionBody && response.explanation) {
                return response;
            }
            throw new Error("AI response was missing required fields 'jsFunctionBody' or 'explanation'.");
        
        } catch (error) {
            if (options?.signal?.aborted) {
                throw error;
            }
            console.error(`Error in filter function generation (Attempt ${i+1}):`, error);
            lastError = error as Error;
        }
    }

    throw new Error(`AI failed to generate a valid filter function. Last error: ${lastError?.message}`);
};
