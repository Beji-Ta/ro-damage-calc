import type { AppSaveData, PlayerStats, EnemyInput } from './types'

const STORAGE_KEY = 'ro_calc_v11'

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  statusDef: 100,
  statusMdef: 60,
  equipDef: 0,
  equipMdef: 0,
  res: 0,
  mres: 0,
  raceRes: 0,
  rangedRes: 0,
  neutralRes: 0,
  fireRes: 0,
  waterRes: 0,
  earthRes: 0,
  windRes: 0,
  poisonRes: 0,
  holyRes: 0,
  shadowRes: 0,
  ghostRes: 0,
  undeadRes: 0,
  bossRes: 85,
  kongouActive: false,
  crouchActive: false,
  ironHowlingActive: false,
  stoneSkinActive: false,
  assumptioActive: false,
  energyCoatLevel: 0,
  armorElement: '無属性',
  mresIgnored: false,
}

export const DEFAULT_ENEMY_INPUT: EnemyInput = {
  atk: 130000,
  matk: 520000,
  str: 0,
  int: 0,
  luk: 0,
}

export const DEFAULT_SAVE_DATA: AppSaveData = {
  version: 11,
  playerStats: { ...DEFAULT_PLAYER_STATS },
  enemyInput: { ...DEFAULT_ENEMY_INPUT },
  customFormulas: [],
  activeFormulaTokens: [],
  activeFormulaDamageType: 'magic',
  activeFormulaAttackElement: '無属性',
  activeFormulaName: '',
}

export function loadData(): AppSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SAVE_DATA, playerStats: { ...DEFAULT_PLAYER_STATS }, enemyInput: { ...DEFAULT_ENEMY_INPUT } }
    const p = JSON.parse(raw)
    return {
      ...DEFAULT_SAVE_DATA,
      ...p,
      playerStats: { ...DEFAULT_PLAYER_STATS, ...p.playerStats },
      enemyInput: { ...DEFAULT_ENEMY_INPUT, ...p.enemyInput },
      customFormulas: Array.isArray(p.customFormulas) ? p.customFormulas : [],
      activeFormulaTokens: Array.isArray(p.activeFormulaTokens) ? p.activeFormulaTokens : [],
    }
  } catch {
    return { ...DEFAULT_SAVE_DATA, playerStats: { ...DEFAULT_PLAYER_STATS }, enemyInput: { ...DEFAULT_ENEMY_INPUT } }
  }
}

export function saveData(data: AppSaveData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 11 }))
}

export function exportData(data: AppSaveData): void {
  const json = JSON.stringify({ ...data, version: 11 }, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ro-calc-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importData(file: File): Promise<AppSaveData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const p = JSON.parse(e.target?.result as string)
        const data: AppSaveData = {
          ...DEFAULT_SAVE_DATA,
          ...p,
          playerStats: { ...DEFAULT_PLAYER_STATS, ...p.playerStats },
          enemyInput: { ...DEFAULT_ENEMY_INPUT, ...p.enemyInput },
          customFormulas: Array.isArray(p.customFormulas) ? p.customFormulas : [],
          activeFormulaTokens: Array.isArray(p.activeFormulaTokens) ? p.activeFormulaTokens : [],
        }
        resolve(data)
      } catch {
        reject(new Error('JSONの解析に失敗しました'))
      }
    }
    reader.onerror = () => reject(new Error('ファイル読み込みに失敗しました'))
    reader.readAsText(file)
  })
}
