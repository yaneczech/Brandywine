type SettingsRecord = Record<string, unknown>;

export function withoutManualPassword<T extends SettingsRecord>(settings: T): Omit<T, 'accessPassword'> {
	const safe: SettingsRecord = { ...settings };
	delete safe.accessPassword;
	return safe as Omit<T, 'accessPassword'>;
}

export function withoutManualSecrets<T extends SettingsRecord>(
	settings: T
): Omit<T, 'accessPassword' | 'emailWhitelist'> {
	const safe: SettingsRecord = { ...settings };
	delete safe.accessPassword;
	delete safe.emailWhitelist;
	return safe as Omit<T, 'accessPassword' | 'emailWhitelist'>;
}
