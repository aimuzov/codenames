import { shuffle } from './random.ts'
import type { Card, CardType, GameConfig, GameState, Rng, Team } from './types.ts'

export const BOARD_SIZE = 25
const STARTING_TEAM_CARDS = 9
const SECOND_TEAM_CARDS = 8
const NEUTRAL_CARDS = 7
const ASSASSIN_CARDS = 1

const other = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

/**
 * Создаёт новую партию: берёт 25 слов из пула, раздаёт ключ 9/8/7/1 в пользу
 * стартовой команды, выставляет фазу подсказки. RNG инъектируется для тестов.
 */
export function createGame(config: GameConfig, rng: Rng = Math.random): GameState {
  const uniqueWords = [...new Set(config.words)]
  if (uniqueWords.length < BOARD_SIZE) {
    throw new Error(`Нужно минимум ${BOARD_SIZE} уникальных слов, получено ${uniqueWords.length}`)
  }

  const startingTeam: Team = config.startingTeam ?? (rng() < 0.5 ? 'red' : 'blue')

  const words = shuffle(uniqueWords, rng).slice(0, BOARD_SIZE)
  const types = shuffle(buildKey(startingTeam), rng)

  const cards: Card[] = words.map((word, i) => ({
    word,
    type: types[i]!,
    revealed: false,
  }))

  return {
    cards,
    startingTeam,
    currentTeam: startingTeam,
    phase: 'clue',
    clue: null,
    guessesRemaining: 0,
    prevClueWord: { red: null, blue: null },
    winner: null,
    log: [],
  }
}

/** Список из 25 типов карт согласно раскладу Codenames. */
function buildKey(startingTeam: Team): CardType[] {
  return [
    ...Array<CardType>(STARTING_TEAM_CARDS).fill(startingTeam),
    ...Array<CardType>(SECOND_TEAM_CARDS).fill(other(startingTeam)),
    ...Array<CardType>(NEUTRAL_CARDS).fill('neutral'),
    ...Array<CardType>(ASSASSIN_CARDS).fill('assassin'),
  ]
}
