import type { PageServerLoad } from './$types';
import { db } from '$db';
import { assets, folders } from '$db/schema';
import { desc, count, eq, asc } from 'drizzle-orm';

export type FolderWithCount = {
	id: string;
	parentId: string | null;
	name: string;
	path: string;
	description: string | null;
	color: string | null;
	icon: string | null;
	sortOrder: number;
	assetCount: number;
	children?: FolderWithCount[];
};

function buildTree(rows: FolderWithCount[]): FolderWithCount[] {
	const map = new Map(rows.map(r => [r.id, { ...r, children: [] as FolderWithCount[] }]));
	const roots: FolderWithCount[] = [];
	for (const node of map.values()) {
		if (node.parentId && map.has(node.parentId)) {
			map.get(node.parentId)!.children!.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}

// Collect all unique tags with counts from all assets
function collectTags(assetRows: { tags: string[] | null }[]): { tag: string; count: number }[] {
	const map = new Map<string, number>();
	for (const a of assetRows) {
		for (const t of a.tags ?? []) {
			map.set(t, (map.get(t) ?? 0) + 1);
		}
	}
	return [...map.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count);
}

export const load: PageServerLoad = async () => {
	const [assetRows, folderRows, [{ total }]] = await Promise.all([
		db.select({
			id:             assets.id,
			filename:       assets.filename,
			mime:           assets.mime,
			size:           assets.size,
			storagePath:    assets.storagePath,
			thumbnailPath:  assets.thumbnailPath,
			convertedPaths: assets.convertedPaths,
			folderId:       assets.folderId,
			tags:           assets.tags,
			metadata:       assets.metadata,
			hash:           assets.hash,
			createdAt:      assets.createdAt,
			updatedAt:      assets.updatedAt,
		}).from(assets).orderBy(desc(assets.createdAt)).limit(200),
		db.select({
			id:          folders.id,
			parentId:    folders.parentId,
			name:        folders.name,
			path:        folders.path,
			description: folders.description,
			color:       folders.color,
			icon:        folders.icon,
			sortOrder:   folders.sortOrder,
			assetCount:  count(assets.id),
		})
		.from(folders)
		.leftJoin(assets, eq(assets.folderId, folders.id))
		.groupBy(folders.id)
		.orderBy(asc(folders.sortOrder), asc(folders.path)),
		db.select({ total: count() }).from(assets),
	]);

	return {
		assets: assetRows,
		folderTree: buildTree(folderRows as FolderWithCount[]),
		folderList: folderRows as FolderWithCount[],
		tags: collectTags(assetRows as { tags: string[] | null }[]),
		total,
	};
};
