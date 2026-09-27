import type { ComponentType } from 'svelte';
import type { IconSearch } from '@tabler/icons-svelte';

/** Any Tabler icon (legacy class components) — the admin's icon set. */
export type IconComponent = typeof IconSearch | ComponentType;
