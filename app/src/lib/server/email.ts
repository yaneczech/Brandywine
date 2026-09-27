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

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * A one-button transactional email (sign-in link, password reset…) as HTML
 * and plain text. Pass already-translated copy; `link` is the button target.
 */
export function actionEmail({ title, body, action, footer, link, textIntro }: {
	title: string;
	body: string;
	action: string;
	footer: string;
	link: string;
	/** First line of the plain-text version */
	textIntro: string;
}): { text: string; html: string } {
	const text = `${textIntro}\n\n${link}\n\n${footer}`;
	const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#171717">
  <p style="font-size:1.125rem;font-weight:600;margin:0 0 8px">${escapeHtml(title)}</p>
  <p style="color:#737373;margin:0 0 24px">${escapeHtml(body)}</p>
  <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;background:#4A1204;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(action)}</a>
  <p style="font-size:.8125rem;color:#a3a3a3;margin:24px 0 0">${escapeHtml(footer)}</p>
</div>`;
	return { text, html };
}
