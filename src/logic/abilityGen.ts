export const ABILITIES: string[] = [
  '🔄Reroll',
  '🔄Mega Reroll',
  '🔄Lucky Reroll',
  '🔄Unlucky Reroll',
  '🎲Loaded',
  '🎲Second Chance',
  '🧮Average',
  '🐈‍⬛Copycat',
  '2️⃣Evens',
  '3️⃣Odds',
  '2️⃣Evil Evens',
  '3️⃣Evil Odds',
  '🔒Lockdown',
  '📖Read the Play',
  '💪🏻2nd-Half Player',
  '💪🏻Clutch',
  '🚗Road Warrior',
  '🌧️Rain Man',
  '❄️Snow Man',
  '🏈Goal Line',
  '⏱️Two Minute Drill',
]

export function assignAbility(): string {
  const ability = ABILITIES[Math.floor(Math.random() * ABILITIES.length)]
  if (ability === '🎲Loaded') {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 11
    return `🎲Loaded: ${num1} become ${num2}`
  }
  return ability
}
