import { reatomComponent } from '@reatom/react'
import { useEffect } from 'react'
import { CHANGELOG } from '@/data/changelog.ts'
import { markChangelogSeen } from '@/state/changelog.ts'
import { goBack } from '@/state/ui.ts'
import { Badge } from '@/components/ui/badge'
import { Screen } from '@/ui/components/Screen.tsx'
import { TopBar } from '@/ui/components/TopBar.tsx'

const formatDate = (iso: string): string =>
	new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export const Changelog = reatomComponent(() => {
	const back = () => goBack()

	// Открыли журнал — гасим индикатор «новое».
	useEffect(() => {
		markChangelogSeen()
	}, [])

	return (
		<Screen bottomFade onBack={back} header={<TopBar title="Что нового" onBack={back} />}>
			<div className="flex flex-col gap-8">
				{CHANGELOG.map((entry) => (
					<article key={entry.version} className="flex flex-col gap-4">
						<header className="flex flex-col gap-1">
							<div className="flex items-center gap-2">
								<Badge>{entry.version}</Badge>
								<span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
							</div>
							<h2 className="font-heading text-xl font-bold tracking-tight">{entry.title}</h2>
						</header>

						{entry.sections.map((section) => (
							<section key={section.title} className="flex flex-col gap-1.5">
								<h3 className="font-heading text-sm font-semibold">{section.title}</h3>
								<ul className="flex flex-col gap-1.5">
									{section.items.map((item) => (
										<li
											key={item}
											className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
										>
											<span className="mt-[0.5rem] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
											<span>{item}</span>
										</li>
									))}
								</ul>
							</section>
						))}
					</article>
				))}
			</div>
		</Screen>
	)
})
