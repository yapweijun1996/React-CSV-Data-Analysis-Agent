import assert from 'node:assert/strict';
import { coerceChatResponseJson, AiChatResponseParsingError } from '../services/ai/chatResponseParser';
import type { AiChatResponse } from '../types';

const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const sampleResponse: AiChatResponse = {
    actions: [
        {
            type: 'text_response',
            responseType: 'text_response',
            stepId: 'acknowledge_user',
            reason: 'Confirming request status.',
            text: 'Plan updated and ready to continue.',
        },
    ],
};

await run('parses clean JSON strings', async () => {
    const raw = JSON.stringify(sampleResponse);
    const parsed = coerceChatResponseJson(raw);
    assert.deepEqual(parsed, sampleResponse);
});

await run('returns already-parsed objects untouched', async () => {
    const parsed = coerceChatResponseJson(sampleResponse);
    assert.strictEqual(parsed, sampleResponse);
});

await run('handles ```json fenced payloads', async () => {
    const fenced = `Sure thing!\n\`\`\`json\n${JSON.stringify(sampleResponse, null, 2)}\n\`\`\`\nAnything else?`;
    const parsed = coerceChatResponseJson(fenced);
    assert.strictEqual(parsed.actions[0].text, sampleResponse.actions[0].text);
});

await run('extracts JSON when wrapped with narration', async () => {
    const narrated = `The assistant responded with the following object: ${JSON.stringify(sampleResponse)}.`;
    const parsed = coerceChatResponseJson(narrated);
    assert.strictEqual(parsed.actions[0].reason, sampleResponse.actions[0].reason);
});

await run('throws a descriptive error when JSON is missing', async () => {
    assert.throws(
        () => coerceChatResponseJson('No structured data here, sorry!'),
        (error: unknown) => error instanceof AiChatResponseParsingError,
    );
});
