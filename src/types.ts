export interface PlayerStats {
  statusDef: number
  statusMdef: number
  equipDef: number
  equipMdef: number
  res: number
  mres: number
  raceRes: number
  rangedRes: number
  neutralRes: number
  fireRes: number
  waterRes: number
  earthRes: number
  windRes: number
  poisonRes: number
  holyRes: number
  shadowRes: number
  ghostRes: number
  undeadRes: number
  bossRes: number
  kongouActive: boolean
  crouchActive: boolean
  ironHowlingActive: boolean
  stoneSkinActive: boolean
  assumptioActive: boolean
  energyCoatLevel: number
  armorElement: string
  mresIgnored: boolean
}

export interface EnemyInput {
  atk: number
  matk: number
  str: number
  int: number
  luk: number
}

export interface FormulaToken {
  id: string
  type: 'op' | 'var' | 'num'
  opValue?: string
  varKey?: string
  numValue?: number
}

export interface FormulaConfig {
  id: string
  name: string
  tokens: FormulaToken[]
  damageType: 'physical' | 'magic'
  isBuiltin?: boolean
}

export interface AppSaveData {
  version: number
  playerStats: PlayerStats
  enemyInput: EnemyInput
  customFormulas: FormulaConfig[]
  activeFormulaTokens: FormulaToken[]
  activeFormulaDamageType: 'physical' | 'magic'
  activeFormulaAttackElement: string
  activeFormulaName: string
}

export interface FormulaEvalResult {
  formulaStr: string
  substitutedStr: string
  varValues: Array<{ key: string; label: string; value: number }>
  baseResult: number
  stateFactors: Array<{ label: string; factor: number }>
  finalResult: number
  perHit: number
  error?: string
}
