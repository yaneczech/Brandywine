/** Shared motion parameters so every overlay moves the same way. */
import { cubicOut } from 'svelte/easing';

export const reducedMotion = () =>
	typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const EASE = cubicOut;
export const DUR = () => (reducedMotion() ? 0 : 180);
export const DUR_FAST = () => (reducedMotion() ? 0 : 120);
