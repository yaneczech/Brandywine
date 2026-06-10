/**
 * Email sending utility.
 * Configure via environment variables:
 *
 *   SMTP_HOST   — e.g. smtp.mailgun.org (if not set, emails are only logged to console)
 *   SMTP_PORT   — default 587
 *   SMTP_USER   — SMTP username
 *   SMTP_PASS   — SMTP password
 *   SMTP_FROM   — sender address, e.g. "Brandywine <noreply@yourdomain.com>"
 *   APP_URL     — public app URL used in email links, e.g. https://brand.example.com
 */

import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

function getTransport() {
	if (!env.SMTP_HOST) return null;
	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT ?? 587),
		secure: Number(env.SMTP_PORT ?? 587) === 465,
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS
		}
	});
}

export async function sendEmail({
	to,
	subject,
	html,
	text
}: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}) {
	const transport = getTransport();
	const from = env.SMTP_FROM ?? 'Brandywine <noreply@localhost>';

	if (!transport) {
		console.log('\n📧  [EMAIL — dev/no SMTP]\n', { to, subject, text: text ?? '(html only)' });
		return;
	}

	await transport.sendMail({ from, to, subject, html, text });
}

export function getAppUrl(request?: Request): string {
	if (env.APP_URL) return env.APP_URL.replace(/\/$/, '');
	if (request) {
		const url = new URL(request.url);
		return `${url.protocol}//${url.host}`;
	}
	return 'http://localhost:5173';
}
