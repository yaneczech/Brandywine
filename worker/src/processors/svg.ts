import type { Job } from 'bullmq';
import { readFile, writeFile } from 'fs/promises';
import { optimize } from 'svgo';
import { safeJoin } from './pathGuard.js';

const DANGEROUS_PATTERNS = [/<script/i, /on\w+\s*=/i, /<foreignObject/i, /javascript:/i];

export async function svgProcessor(job: Job<{ assetId: string; storagePath: string }>) {
	const fullPath = safeJoin(job.data.storagePath);
	const svg = await readFile(fullPath, 'utf8');

	for (const pattern of DANGEROUS_PATTERNS) {
		if (pattern.test(svg)) {
			throw new Error(`SVG contains dangerous content matching ${pattern}`);
		}
	}

	const result = optimize(svg, {
		multipass: true,
		plugins: ['removeScripts', 'removeXMLNS']
	});
	await writeFile(fullPath, result.data, 'utf8');
}
