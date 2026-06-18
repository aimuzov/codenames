import { reatomComponent } from '@reatom/react'
import { Smartphone, Users } from 'lucide-react'
import { BOARD_SIZE } from '@/game/index.ts'
import { modeAtom, startGame } from '@/state/session.ts'
import { goBack, goTo, selectedWordsAtom } from '@/state/ui.ts'
import { Footer } from '@/ui/components/Footer.tsx'
import { MenuButton } from '@/ui/components/MenuButton.tsx'
import { MenuLayout } from '@/ui/components/MenuLayout.tsx'
import { Screen } from '@/ui/components/Screen.tsx'
import { TopBar } from '@/ui/components/TopBar.tsx'

export const Play = reatomComponent(() => {
	const words = selectedWordsAtom()
	const ready = words.length >= BOARD_SIZE

	const startLocal = () => {
		modeAtom.set('local')
		startGame({ words })
		goTo('board')
	}

	const back = () => goBack()

	return (
		<Screen staticBody onBack={back} header={<TopBar title="Играть" onBack={back} />}>
			<MenuLayout>
				<MenuButton icon={<Users />} onClick={() => goTo('lobby')}>
					Лобби
				</MenuButton>
				<MenuButton icon={<Smartphone />} variant="outline" onClick={startLocal} disabled={!ready}>
					Одно устройство
				</MenuButton>
				{!ready && (
					<button
						type="button"
						className="text-sm text-destructive underline-offset-4 hover:underline"
						onClick={() => goTo('dicts')}
					>
						Слов выбрано: {words.length} — нужно минимум {BOARD_SIZE}. Выбрать словари
					</button>
				)}
			</MenuLayout>
			<Footer />
		</Screen>
	)
})
