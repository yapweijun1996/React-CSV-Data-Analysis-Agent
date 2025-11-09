import { VectorStoreDocument } from '../types';

type TransformersModule = {
    pipeline: any;
    env: any;
};

let transformersPromise: Promise<TransformersModule> | null = null;

const loadTransformers = async (): Promise<TransformersModule> => {
    if (!transformersPromise) {
        transformersPromise = (async () => {
            const cdnSpecifier = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js';
            try {
                return await import(/* @vite-ignore */ cdnSpecifier);
            } catch (error) {
                console.error('Failed to load @xenova/transformers from CDN.', error);
                throw error;
            }
        })();
    }
    return transformersPromise;
};


class VectorStore {
    private embedder: any = null;
    private documents: VectorStoreDocument[] = [];
    private isInitializing = false;
    private isInitialized = false;

    // Use a singleton pattern to ensure the model is loaded only once.
    private static instance: VectorStore;
    public static getInstance(): VectorStore {
        if (!VectorStore.instance) {
            VectorStore.instance = new VectorStore();
        }
        return VectorStore.instance;
    }

    public getIsInitialized(): boolean {
        return this.isInitialized;
    }

    public async init(progressCallback?: (message: string) => void): Promise<void> {
        if (this.isInitialized || this.isInitializing) return;

        try {
            this.isInitializing = true; 
            const { pipeline, env } = await loadTransformers();

            // Prefer remote download the first time, but allow IndexedDB/OPFS caching for reuse.
            env.allowRemoteModels = true;
            env.allowLocalModels = true;
            env.useBrowserCache = true;
            env.cacheDir = env.cacheDir || 'indexeddb://ai-memory-models';
            env.localModelPath = env.localModelPath || 'indexeddb://ai-memory-models';
            
            progressCallback?.("Loading AI memory model (~34MB). We'll cache it locally after the first download.");
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: (progress: any) => {
                     if (progress.status === 'progress' && progress.total > 0) {
                        const loaded = (progress.loaded / 1024 / 1024).toFixed(2);
                        const total = (progress.total / 1024 / 1024).toFixed(2);
                        progressCallback?.(`Downloading AI memory model: ${loaded}MB / ${total}MB`);
                     }
                }
            });
            progressCallback?.("AI memory model ready (cached locally for future sessions).");
            this.isInitialized = true;
        } catch (error) {
            console.error("Failed to initialize vector store:", error);
            progressCallback?.(`Error loading AI memory model: ${error instanceof Error ? error.message : String(error)}`);
            this.isInitialized = false; // Reset on failure
        } finally {
            this.isInitializing = false;
        }
    }
    
    /**
     * Rehydrates the store from a saved state. This is used when loading a report from history.
     * It assumes the model is already initialized or will be shortly.
     * @param documents - The array of documents (with embeddings) to load into the store.
     */
    public rehydrate(documents: VectorStoreDocument[]): void {
        this.documents = documents;
    }

    public async addDocument(doc: { id: string; text: string; metadata?: any }): Promise<void> {
        if (!this.embedder) {
            console.warn("Vector store not initialized. Skipping document add/update.");
            return;
        }

        try {
            const embedding = await this.embedder(doc.text, { pooling: 'mean', normalize: true });
            const newDoc: VectorStoreDocument = {
                ...doc,
                embedding: Array.from(embedding.data),
            };

            const existingDocIndex = this.documents.findIndex(d => d.id === doc.id);
            if (existingDocIndex > -1) {
                // Update existing document
                this.documents[existingDocIndex] = newDoc;
            } else {
                // Add new document
                this.documents.push(newDoc);
            }
        } catch (error) {
            console.error(`Failed to create embedding for document ${doc.id}:`, error);
        }
    }

    public deleteDocument(id: string): boolean {
        const initialLength = this.documents.length;
        this.documents = this.documents.filter(doc => doc.id !== id);
        return this.documents.length < initialLength;
    }
    
    public getDocumentCount(): number {
        return this.documents.length;
    }

    public getDocuments(): VectorStoreDocument[] {
        // Return a copy to prevent direct mutation of the internal array
        return [...this.documents];
    }
    
    public clear() {
        this.documents = [];
    }

    private async withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
        if (!signal) return promise;
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        return new Promise<T>((resolve, reject) => {
            const onAbort = () => {
                signal.removeEventListener('abort', onAbort);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', onAbort);
            promise.then(
                value => {
                    signal.removeEventListener('abort', onAbort);
                    resolve(value);
                },
                err => {
                    signal.removeEventListener('abort', onAbort);
                    reject(err);
                }
            );
        });
    }

    public async search(
        queryText: string,
        k: number = 5,
        options?: { signal?: AbortSignal }
    ): Promise<{ id: string; text: string; score: number }[]> {
        if (!this.embedder || this.documents.length === 0) {
            return [];
        }

        try {
            const queryEmbedding = await this.withAbort(
                this.embedder(queryText, { pooling: 'mean', normalize: true }),
                options?.signal
            );
            // Fix: Cast the result of Array.from to number[] to satisfy TypeScript.
            const queryVector = Array.from(queryEmbedding.data) as number[];
            
            const results = this.documents.map(doc => {
                const score = this.cosineSimilarity(queryVector, doc.embedding);
                return { id: doc.id, text: doc.text, score };
            });

            // Filter out results with low similarity before sorting
            return results
                .filter(r => r.score > 0.5)
                .sort((a, b) => b.score - a.score)
                .slice(0, k);

        } catch (error) {
            console.error("Failed to perform vector search:", error);
            return [];
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export const vectorStore = VectorStore.getInstance();
