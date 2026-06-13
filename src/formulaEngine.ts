import type { PlayerStats, EnemyInput, FormulaToken, FormulaConfig, FormulaEvalResult } from './types'
import { FORMULA_VARS, getElemMod } from './data'

export function resolveFormulaValues(stats: PlayerStats, enemy: EnemyInput): Record<string, number> {
  const eDef  = stats.assumptioActive ? stats.equipDef  * 2 : stats.equipDef
  const eMdef = stats.assumptioActive ? stats.equipMdef * 2 : stats.equipMdef
  return {
    ATK:  enemy.atk,
    MATK: enemy.matk,
    STR:  enemy.str,
    INT:  enemy.int,
    LUK:  enemy.luk,
    STATUS_DEF:       stats.statusDef,
    STATUS_MDEF:      stats.statusMdef,
    EQUIP_DEF:        eDef,
    EQUIP_MDEF:       eMdef,
    HARD_DEF_FACTOR:  135 / (eDef  + 135),
    HARD_MDEF_FACTOR: 135 / (eMdef + 135),
    RES:              stats.res,
    MRES:             stats.mres,
    RES_FACTOR:       (2000 + stats.res)  / (2000 + stats.res  * 5),
    MRES_FACTOR:      stats.mresIgnored ? 1 : (2000 + stats.mres) / (2000 + stats.mres * 5),
    RACE_RES:    stats.raceRes,
    BOSS_RES:    stats.bossRes,
    RANGED_RES:  stats.rangedRes,
    NEUTRAL_RES: stats.neutralRes,
    FIRE_RES:    stats.fireRes,
    WATER_RES:   stats.waterRes,
    EARTH_RES:   stats.earthRes,
    WIND_RES:    stats.windRes,
    POISON_RES:  stats.poisonRes,
    HOLY_RES:    stats.holyRes,
    SHADOW_RES:  stats.shadowRes,
    GHOST_RES:   stats.ghostRes,
    UNDEAD_RES:  stats.undeadRes,
    ARMOR_MOD_NEUTRAL: getElemMod('無属性', 1, stats.armorElement),
    ARMOR_MOD_FIRE:    getElemMod('火',     1, stats.armorElement),
    ARMOR_MOD_WATER:   getElemMod('水',     1, stats.armorElement),
    ARMOR_MOD_EARTH:   getElemMod('地',     1, stats.armorElement),
    ARMOR_MOD_WIND:    getElemMod('風',     1, stats.armorElement),
    ARMOR_MOD_POISON:  getElemMod('毒',     1, stats.armorElement),
    ARMOR_MOD_HOLY:    getElemMod('聖',     1, stats.armorElement),
    ARMOR_MOD_SHADOW:  getElemMod('闇',     1, stats.armorElement),
    ARMOR_MOD_GHOST:   getElemMod('念',     1, stats.armorElement),
    ARMOR_MOD_UNDEAD:  getElemMod('不死',   1, stats.armorElement),
  }
}

function numFmt(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString()
  if (Math.abs(v) < 0.001) return v.toExponential(3)
  return v.toFixed(4)
}

export function formulaToStr(tokens: FormulaToken[], values?: Record<string, number>): string {
  const OP_SYM: Record<string, string> = { '*': '×', '/': '÷', '+': '+', '-': '-', '(': '(', ')': ')' }
  return tokens.map(t => {
    if (t.type === 'op')  return OP_SYM[t.opValue!] ?? t.opValue ?? '?'
    if (t.type === 'num') return String(t.numValue ?? 0)
    if (t.type === 'var') {
      const def = FORMULA_VARS.find(v => v.key === t.varKey)
      const lbl = def?.label ?? t.varKey ?? '?'
      if (values) {
        const v = values[t.varKey!]
        return `${lbl}[${numFmt(v ?? 0)}]`
      }
      return lbl
    }
    return '?'
  }).join(' ')
}

function safeEval(tokens: FormulaToken[], values: Record<string, number>): { result: number; error?: string } {
  if (tokens.length === 0) return { result: 0 }
  const expr = tokens.map(t => {
    if (t.type === 'op')  return t.opValue
    if (t.type === 'num') return String(t.numValue ?? 0)
    if (t.type === 'var') return String(values[t.varKey!] ?? 0)
    return '0'
  }).join(' ')
  try {
    // eslint-disable-next-line no-new-func
    const r = new Function(`"use strict"; return (${expr})`)()
    if (typeof r !== 'number' || !isFinite(r)) return { result: 0, error: '計算結果が無効です' }
    return { result: r }
  } catch {
    return { result: 0, error: '計算式にエラーがあります（括弧の対応を確認してください）' }
  }
}

export function evaluateFormulaFull(
  formula: FormulaConfig,
  stats: PlayerStats,
  enemy: EnemyInput
): FormulaEvalResult {
  const values = resolveFormulaValues(stats, enemy)
  const formulaStr = formulaToStr(formula.tokens)
  const substitutedStr = formulaToStr(formula.tokens, values)

  const usedKeys = new Set(formula.tokens.filter(t => t.type === 'var').map(t => t.varKey!))
  const varValues = [...usedKeys].map(key => {
    const def = FORMULA_VARS.find(v => v.key === key)
    return { key, label: def?.label ?? key, value: values[key] ?? 0 }
  })

  const { result: baseResult, error } = safeEval(formula.tokens, values)

  const stateFactors: Array<{ label: string; factor: number }> = []
  if (stats.kongouActive)      stateFactors.push({ label: '金剛 ×0.10',              factor: 0.10 })
  if (stats.crouchActive)      stateFactors.push({ label: 'うずくまる ×0.20',         factor: 0.20 })
  if (stats.ironHowlingActive) stateFactors.push({ label: 'アイアンハウリング ×0.60', factor: 0.60 })
  if (stats.energyCoatLevel > 0) {
    const f = 1 - stats.energyCoatLevel * 0.10
    stateFactors.push({ label: `エナジーコート ×${f.toFixed(2)}`, factor: f })
  }
  if (stats.stoneSkinActive) {
    const f = formula.damageType === 'physical' ? 0.80 : 1.20
    const sign = formula.damageType === 'physical' ? '物理 ×0.80' : '魔法 ×1.20'
    stateFactors.push({ label: `ストーンスキン(${sign})`, factor: f })
  }

  const totalFactor = stateFactors.reduce((acc, s) => acc * s.factor, 1)
  const finalResult = baseResult * totalFactor
  const perHit = Math.max(1, Math.floor(finalResult))

  return { formulaStr, substitutedStr, varValues, baseResult, stateFactors, finalResult, perHit, error }
}

let _uid = Date.now()
export function newId(): string { return `u${++_uid}` }

export function cloneTokens(tokens: FormulaToken[]): FormulaToken[] {
  return tokens.map(t => ({ ...t, id: newId() }))
}
