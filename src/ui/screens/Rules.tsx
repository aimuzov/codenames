import { reatomComponent } from '@reatom/react'
import type { ReactNode } from 'react'
import { goBack } from '../../state/ui.ts'
import { Screen } from '../components/Screen.tsx'
import { TopBar } from '../components/TopBar.tsx'

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  )
}

export const Rules = reatomComponent(() => {
  const back = () => goBack()

  return (
    <Screen bottomFade onBack={back} header={<TopBar title="Правила" onBack={back} />}>

      <div className="flex flex-col gap-5">
        <Rule title="Цель">
          Две команды — красные и синие — наперегонки открывают свои слова по подсказкам капитана.
          Побеждает команда, первой открывшая всех своих.
        </Rule>

        <Rule title="Роли">
          У каждой команды есть капитан и игроки. Капитан видит цвета всех карт и даёт подсказки.
          Игроки видят только слова и открывают карты.
        </Rule>

        <Rule title="Поле">
          На столе 25 слов. У начинающей команды 9 своих карт, у второй — 8. Ещё 7 нейтральных
          и 1 «ассасин» — его открывать нельзя.
        </Rule>

        <Rule title="Ход">
          Капитан называет одно слово-подсказку и число — сколько карт с ней связано. Игроки
          открывают карты по очереди: своя карта — можно продолжать (всего до «число + 1» догадок);
          чужая или нейтральная — ход переходит сопернику.
        </Rule>

        <Rule title="Ассасин">
          Если открыть карту-ассасина, команда сразу проигрывает.
        </Rule>

        <Rule title="Победа">
          Выигрывает команда, открывшая все свои слова первой — или та, чей соперник наткнулся на
          ассасина.
        </Rule>
      </div>
    </Screen>
  )
})
