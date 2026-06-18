import { reatomComponent } from '@reatom/react'
import { Pencil } from 'lucide-react'
import { BOARD_SIZE } from '../../game/index.ts'
import {
  allPacksAtom,
  goBack,
  goTo,
  selectedPackIdsAtom,
  selectedWordsAtom,
  togglePack,
} from '../../state/ui.ts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Screen } from '../components/Screen.tsx'
import { TopBar } from '../components/TopBar.tsx'

export const Dicts = reatomComponent(() => {
  const packs = allPacksAtom()
  const selectedIds = selectedPackIdsAtom()
  const words = selectedWordsAtom()
  const ready = words.length >= BOARD_SIZE

  const back = () => goBack()

  return (
    <Screen onBack={back} header={<TopBar title="Словари" onBack={back} />}>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5">
            {packs.map((pack) => (
              <li key={pack.id}>
                <Label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5 font-normal">
                  <Checkbox
                    checked={selectedIds.includes(pack.id)}
                    onCheckedChange={() => togglePack(pack.id)}
                  />
                  <span className="flex-1 font-medium">{pack.title}</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{pack.words.length}</span>
                </Label>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" onClick={() => goTo('packs')}>
            <Pencil />
            Свои паки…
          </Button>
        </CardContent>
      </Card>

      <p className={cn('text-sm', ready ? 'text-muted-foreground' : 'text-destructive')}>
        Слов выбрано: {words.length}
        {ready ? '' : ` (нужно минимум ${BOARD_SIZE})`}
      </p>
    </Screen>
  )
})
