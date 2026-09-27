import { pgTable, text, jsonb, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const accessModeEnum = ['public', 'password', 'email_whitelist', 'token'] as const;
export type AccessMode = (typeof accessModeEnum)[number];
export const manualThemeModeEnum = ['light', 'dark', 'system', 'toggle'] as const;
export type ManualThemeMode = (typeof manualThemeModeEnum)[number];
export const manualTypographyPresetEnum = ['editorial', 'neutral', 'technical'] as const;
export type ManualTypographyPreset = (typeof manualTypographyPresetEnum)[number];
export const manualLandingLayoutEnum = ['editorial', 'grid', 'gallery'] as const;
export type ManualLandingLayout = (typeof manualLandingLayoutEnum)[number];
// Digital units (screen/web)
export const unitDigitalEnum = ['px', 'rem', 'em', 'vw'] as const;
export type UnitDigital = (typeof unitDigitalEnum)[number];
// Print units (physical output)
export const unitPrintEnum  = ['mm', 'cm', 'pt', 'in', 'pc'] as const;
export type UnitPrint  = (typeof unitPrintEnum)[number];
// Typography size units
export const unitTypeEnum   = ['px', 'pt', 'rem', 'em'] as const;
export type UnitType   = (typeof unitTypeEnum)[number];
export type LocaleLangRules = {
	// Quotes
	quoteOpen:    string;      // „ cs  |  " en
	quoteClose:   string;      // " cs  |  " en
	// Dash
	dashStyle:    'en' | 'em'; // en-dash (–) or em-dash (—)
	// Numbers
	decimalSep:   ',' | '.';
	thousandsSep: string;      // ' ' (cs) | ',' (en) | '.' (de)
	// Date & time
	dateFormat:   string;      // 'D. M. YYYY' | 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
	timeFormat:   '24h' | '12h';
	// Lists & ordinals
	listSep:      ',' | ';' | ' |'; // cs uses ; (the comma is the decimal separator), en uses ,
	ordinalStyle: 'dot' | 'suffix'; // cs: 1. | en: 1st
	// Custom rules
	customRules: Array<{ rule: string; correct?: string; wrong?: string }>;
};
export type LocaleRules = Record<string, LocaleLangRules>;

export const brandSettings = pgTable('brand_settings', {
	id: integer('id').primaryKey().default(1),
	// Identity
	systemName: text('system_name').notNull().default('Brandywine'),
	logoPath: text('logo_path'),
	logoDarkPath: text('logo_dark_path'),
	faviconPath: text('favicon_path'),
	// Brand colors
	primaryColor: text('primary_color').default('#4A1204'),
	// Brand manual settings
	name: text('name').notNull().default('My Brand'),
	manualThemeMode: text('manual_theme_mode').$type<ManualThemeMode>().notNull().default('light'),
	manualBackgroundColor: text('manual_background_color').default('#FBFAF8'),
	manualBackgroundColorDark: text('manual_background_color_dark'),
	manualSurfaceColor: text('manual_surface_color').default('#FFFFFF'),
	manualSurfaceColorDark: text('manual_surface_color_dark'),
	manualTextColor: text('manual_text_color').default('#171717'),
	manualTextColorDark: text('manual_text_color_dark'),
	manualMutedColor: text('manual_muted_color').default('#737373'),
	manualMutedColorDark: text('manual_muted_color_dark'),
	manualAccentColor: text('manual_accent_color'),
	manualAccentColorDark: text('manual_accent_color_dark'),
	manualBorderRadius: integer('manual_border_radius').notNull().default(8),
	manualTypographyPreset: text('manual_typography_preset').$type<ManualTypographyPreset>().notNull().default('neutral'),
	manualLandingLayout: text('manual_landing_layout').$type<ManualLandingLayout>().notNull().default('grid'),
	// Brand typefaces for the manual (typography_fonts.id); null keeps the default
	manualHeadingFontId: text('manual_heading_font_id'),
	manualBodyFontId: text('manual_body_font_id'),
	// Hierarchical chapter numbers (1, 1.1, 1.1.1) in navigation and headings
	manualNumbering: boolean('manual_numbering').notNull().default(false),
	// Set when the first administrator finishes the welcome wizard
	onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
	// Access control
	accessMode: text('access_mode').$type<AccessMode>().notNull().default('public'),
	accessPassword: text('access_password'),
	emailWhitelist: jsonb('email_whitelist').$type<string[]>().default([]),
	activeLanguages: jsonb('active_languages').$type<string[]>().default(['en', 'cs']),
	defaultLanguage: text('default_language').notNull().default('en'),
	// Units per context
	unitDigital: text('unit_digital').$type<UnitDigital>().notNull().default('px'),
	unitPrint:   text('unit_print').$type<UnitPrint>().notNull().default('mm'),
	unitType:    text('unit_type').$type<UnitType>().notNull().default('px'),
	// Locale rules
	localeRules: jsonb('locale_rules').$type<LocaleRules>().notNull().default({}),
	// Attribution
	showAttribution: boolean('show_attribution').notNull().default(true),
	customFooterText: text('custom_footer_text')
});
