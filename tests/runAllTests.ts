import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INTEGRATION_PATTERN = /integration/i;

const discoverTestFiles = (): string[] => {
    return readdirSync(__dirname)
        .filter(file => file.endsWith('.test.ts') && !INTEGRATION_PATTERN.test(file))
        .sort((a, b) => a.localeCompare(b));
};

const pickFilesToRun = (allFiles: string[], filters: string[]): string[] => {
    if (filters.length === 0) {
        return allFiles;
    }
    const loweredFilters = filters.map(filter => filter.toLowerCase());
    return allFiles.filter(file => loweredFilters.some(filter => file.toLowerCase().includes(filter)));
};

const runTestFile = (file: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        const start = performance.now();
        console.log(`\n▶ Running ${file}`);
        const child = spawn(
            process.execPath,
            ['--import', 'tsx', path.join(__dirname, file)],
            { stdio: 'inherit' },
        );

        child.on('error', error => reject(error));
        child.on('exit', code => {
            const duration = Number(((performance.now() - start) / 1000).toFixed(2));
            if (code === 0) {
                console.log(`✔ Finished ${file} in ${duration}s`);
                resolve(duration);
            } else {
                reject(new Error(`${file} failed with exit code ${code}`));
            }
        });
    });
};

const run = async () => {
    const cliFilters = process.argv.slice(2);
    const allTests = discoverTestFiles();
    const filesToRun = pickFilesToRun(allTests, cliFilters);

    if (filesToRun.length === 0) {
        console.error(`No test files matched filters: ${cliFilters.join(', ') || '(none)'}`);
        process.exit(1);
    }

    const overallStart = performance.now();
    const workerCount = Math.min(
        Math.max(1, Number(process.env.TEST_WORKERS) || 2),
        Math.max(1, os.cpus().length - 1),
        filesToRun.length,
    );

    let nextIndex = 0;
    const durations: number[] = [];

    const launchWorker = async () => {
        while (nextIndex < filesToRun.length) {
            const file = filesToRun[nextIndex];
            nextIndex += 1;
            try {
                const duration = await runTestFile(file);
                durations.push(duration);
            } catch (error) {
                console.error(`✖ ${file} failed.`);
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error(error);
                }
                process.exit(1);
            }
        }
    };

    await Promise.all(Array.from({ length: workerCount }, () => launchWorker()));

    const totalElapsed = Number(((performance.now() - overallStart) / 1000).toFixed(2));
    const avg = durations.length ? (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(2) : '0.00';
    console.log(
        `\n✅ Completed ${filesToRun.length} test module${filesToRun.length > 1 ? 's' : ''} in ${totalElapsed}s (avg ${avg}s).`,
    );
};

await run();
