import { NuxtThemeOptions, NuxtThemeTokens } from './module'

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T;

export const defineTheme = (options: DeepPartial<NuxtThemeOptions>): DeepPartial<NuxtThemeOptions> => options

export const defineThemeTokens = (tokens: DeepPartial<NuxtThemeTokens>): DeepPartial<NuxtThemeTokens> => tokens
