import { reatomComponent } from '@reatom/react'
import { LogIn, Plus } from 'lucide-react'
import { BOARD_SIZE } from '@/game/index.ts'
import { goBack, goTo, selectedWordsAtom } from '@/state/ui.ts'
import { Footer } from '@/ui/components/Footer.tsx'
import { MenuButton } from '@/ui/components/MenuButton.tsx'
import { MenuLayout } from '@/ui/components/MenuLayout.tsx'
import { Screen } from '@/ui/components/Screen.tsx'
import { TopBar } from '@/ui/components/TopBar.tsx'

export const Lobby = reatomComponent(() => {
	const words = selectedWordsAtom()
	const ready = words.length >= BOARD_SIZE

	const back = () => goBack()

	return (
		<Screen staticBody onBack={back} header={<TopBar title="Лобби" onBack={back} />}>
			<MenuLayout>
				<MenuButton icon={<LogIn />} onClick={() => goTo('join')}>
					Подключиться
				</MenuButton>
				<MenuButton
					icon={<Plus />}
					variant="outline"
					onClick={() => goTo('host')}
					disabled={!ready}
				>
					Создать
				</MenuButton>
				{!ready && (
					<button
						type="button"
						className="text-sm text-destructive underline-offset-4 hover:underline"
						onClick={() => goTo('dicts')}
					>
						Чтобы создать игру, выбери словари (минимум {BOARD_SIZE} слов)
					</button>
				)}
			</MenuLayout>
			<Footer />
		</Screen>
	)
})
