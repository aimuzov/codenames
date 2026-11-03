import { pageTitle as sharedPageTitle } from '@aimuzov/infra-site-kit/title.js'

import { site } from '#frontend/data/site.ts'

/** Заголовок страницы: своё название и через тире название сайта, у главной -- только сайт. */
export function pageTitle(title?: string) {
	return sharedPageTitle(title, { siteName: site.name })
}
