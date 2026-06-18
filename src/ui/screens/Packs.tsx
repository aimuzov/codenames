import { reatomComponent } from '@reatom/react'
import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { parseWordList } from '@/data/packs.ts'
import { addCustomPack, customPacksAtom, goBack, removeCustomPack } from '@/state/ui.ts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Screen } from '@/ui/components/Screen.tsx'
import { TopBar } from '@/ui/components/TopBar.tsx'

const SectionTitle = ({ children }: { children: string }) => (
	<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
		{children}
	</h3>
)

export const Packs = reatomComponent(() => {
	const custom = customPacksAtom()
	const [title, setTitle] = useState('')
	const [text, setText] = useState('')

	const preview = parseWordList(text)

	const add = () => {
		if (preview.length === 0) return
		void addCustomPack(title, text)
		setTitle('')
		setText('')
	}

	const back = () => goBack()

	return (
		<Screen onBack={back} header={<TopBar title="Свои паки" onBack={back} />}>
			<Card>
				<CardContent className="flex flex-col gap-3">
					<SectionTitle>Новый пак</SectionTitle>
					<Input
						placeholder="Название пака"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
					<Textarea
						placeholder="Слова через запятую или с новой строки"
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={6}
					/>
					<div className="flex items-center justify-between gap-2.5">
						<span className="text-sm text-muted-foreground">Слов: {preview.length}</span>
						<Button onClick={add} disabled={preview.length === 0}>
							<Save />
							Сохранить
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex flex-col gap-3">
					<SectionTitle>{`Сохранённые (${custom.length})`}</SectionTitle>
					{custom.length === 0 ? (
						<p className="text-sm text-muted-foreground">Пока нет своих паков.</p>
					) : (
						<ul className="flex flex-col gap-1.5">
							{custom.map((pack) => (
								<li
									key={pack.id}
									className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5"
								>
									<span className="flex-1 font-medium">{pack.title}</span>
									<span className="font-medium tabular-nums text-muted-foreground">
										{pack.words.length}
									</span>
									<Button
										variant="outline"
										size="icon-sm"
										aria-label="Удалить"
										onClick={() => void removeCustomPack(pack.id)}
									>
										<Trash2 />
									</Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</Screen>
	)
})
