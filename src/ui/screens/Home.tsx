import { reatomComponent } from '@reatom/react'
import { BookOpen, Play, ScrollText } from 'lucide-react'
import { goTo } from '@/state/ui.ts'
import { Footer } from '@/ui/components/Footer.tsx'
import { MenuButton } from '@/ui/components/MenuButton.tsx'
import { MenuLayout } from '@/ui/components/MenuLayout.tsx'
import { Screen } from '@/ui/components/Screen.tsx'
import { TopBar } from '@/ui/components/TopBar.tsx'

export const Home = reatomComponent(() => {
	return (
		<Screen staticBody header={<TopBar />}>
			<MenuLayout>
				<MenuButton icon={<Play />} accent onClick={() => goTo('play')}>
					Играть
				</MenuButton>
				<MenuButton icon={<BookOpen />} variant="outline" onClick={() => goTo('dicts')}>
					Словари
				</MenuButton>
				<MenuButton icon={<ScrollText />} variant="outline" onClick={() => goTo('rules')}>
					Правила
				</MenuButton>
			</MenuLayout>
			<Footer />
		</Screen>
	)
})
