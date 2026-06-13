import type { FormulaConfig, FormulaToken } from './types'

// ── 属性相性表 ─────────────────────────────────────────────────────────────────
export const ELEM_ARMOR_COLS = ['無属性', '水', '地', '火', '風', '毒', '聖', '闇', '念', '不死'] as const

const ELEM_TABLE_DATA: Record<string, number[][]> = {
  '無属性': [
    [  0,  0,  0,   0,   0,   0,   0,   0, -75,   0],
    [  0,  0,  0,   0,   0,   0,   0,   0,-100,   0],
    [  0,  0,  0,   0,   0,   0,   0,   0,-100,   0],
    [  0,  0,  0,   0,   0,   0,   0,   0,-100,   0],
  ],
  '水': [
    [  0,-75,  0, -50,  75,   0,   0,   0,   0,   0],
    [  0,-100, 0, -75,  75, -25,   0,   0, -25, -25],
    [  0,-100, 0,-100, 100, -50,   0,   0, -50, -50],
    [  0,-100, 0,-100, 100, -75, -25, -25, -75, -75],
  ],
  '地': [
    [  0,  0,-75,  50, -50,  25,   0,   0,   0,   0],
    [  0,  0,-100, 75, -75,  25,   0,   0, -25, -25],
    [  0,  0,-100,100,-100,   0,   0,   0, -50, -50],
    [  0,  0,-100,100,-100, -25, -25, -25, -75, -75],
  ],
  '火': [
    [  0, 50,-50, -75,   0,  25,   0,   0,   0,   0],
    [  0, 75,-75,-100,   0,  25,   0,   0, -25, -25],
    [  0,100,-100,-100,  0,   0,   0,   0, -50, -50],
    [  0,100,-100,-100,  0, -25, -25, -25, -75, -75],
  ],
  '風': [
    [  0,-50, 50,   0, -75,  25,   0,   0,   0,   0],
    [  0,-75, 75,   0,-100,  25,   0,   0, -25, -25],
    [  0,-100,100,  0,-100,   0,   0,   0, -50, -50],
    [  0,-100,100,  0,-100, -25, -25, -25, -75, -75],
  ],
  '毒': [
    [  0,  0,  0,   0,   0,-100,   0, -50,   0, -50],
    [  0,  0,  0,   0,   0,-100,   0, -75, -25, -75],
    [  0,  0,  0,   0,   0,-100,  25,-100, -50,-100],
    [  0,-25,-25, -25, -25,-100,  25,-100, -75,-100],
  ],
  '聖': [
    [  0,-25,-25, -25, -25, -25,-100,  25, -25,   0],
    [  0,-50,-50, -50, -50, -50,-100,  50, -50,  25],
    [  0,-75,-75, -75, -75, -75,-100,  75, -75,  50],
    [  0,-100,-100,-100,-100,-100,-100,100,-100,  75],
  ],
  '闇': [
    [  0,  0,  0,   0,   0, -50,  25,-100, -25,-100],
    [  0,-25,-25, -25, -25, -75,  50,-100, -50,-100],
    [  0,-50,-50, -50, -50,-100,  75,-100, -75,-100],
    [  0,-75,-75, -75, -75,-100, 100,-100,-100,-100],
  ],
  '念': [
    [-75,  0,  0,   0,   0,   0,   0,   0,  25,   0],
    [-75,  0,  0,   0,   0, -25,   0,   0,  50,   0],
    [-100, 0,  0,   0,   0, -50,   0,   0,  75,   0],
    [-100, 0,  0,   0,   0, -75,   0,   0, 100,   0],
  ],
  '不死': [
    [  0,  0,  0,  25,   0,-100,  50,-100,   0,-100],
    [  0,  0,  0,  50,   0,-100,  75,-100,  25,-100],
    [  0,-25,-25,  75,   0,-100, 100,-100,  50,-100],
    [  0,-50,-50, 100,   0,-100, 100,-100,  75,-100],
  ],
}

export function getElemMod(attackElem: string, attackLv: number, armorElem: string): number {
  const rows = ELEM_TABLE_DATA[attackElem]
  if (!rows) return 100
  const row = rows[Math.min(Math.max(attackLv, 1), 4) - 1]
  const col = ELEM_ARMOR_COLS.indexOf(armorElem as typeof ELEM_ARMOR_COLS[number])
  if (col === -1 || !row) return 100
  return row[col] + 100
}

// ── 属性定数 ──────────────────────────────────────────────────────────────────
export const ELEMENT_OPTIONS = ['無属性', '火', '水', '地', '風', '毒', '聖', '闇', '念', '不死']

export const ELEMENT_LABELS: { key: string; label: string; jp: string }[] = [
  { key: 'neutralRes', label: '無属性',   jp: '無' },
  { key: 'fireRes',    label: '火属性',   jp: '火' },
  { key: 'waterRes',   label: '水属性',   jp: '水' },
  { key: 'earthRes',   label: '地属性',   jp: '地' },
  { key: 'windRes',    label: '風属性',   jp: '風' },
  { key: 'poisonRes',  label: '毒属性',   jp: '毒' },
  { key: 'holyRes',    label: '聖属性',   jp: '聖' },
  { key: 'shadowRes',  label: '闇属性',   jp: '闇' },
  { key: 'ghostRes',   label: '念属性',   jp: '念' },
  { key: 'undeadRes',  label: '不死属性', jp: '不死' },
]

// ── 計算式変数定義 ─────────────────────────────────────────────────────────────
export interface FormulaVarDef {
  key: string
  label: string
  group: string
  desc?: string
}

export const FORMULA_VAR_GROUPS = ['敵ステータス', 'プレイヤーステータス', '耐性%', '属性耐性%', '鎧相性'] as const
export type FormulaVarGroup = typeof FORMULA_VAR_GROUPS[number]

export const FORMULA_VARS: FormulaVarDef[] = [
  // 敵ステータス
  { key: 'ATK',  label: '敵ATK',  group: '敵ステータス', desc: '敵の物理攻撃力' },
  { key: 'MATK', label: '敵MATK', group: '敵ステータス', desc: '敵の魔法攻撃力' },
  { key: 'STR',  label: '敵STR',  group: '敵ステータス', desc: '敵のSTR' },
  { key: 'INT',  label: '敵INT',  group: '敵ステータス', desc: '敵のINT' },
  { key: 'LUK',  label: '敵LUK',  group: '敵ステータス', desc: '敵のLUK' },
  // DEF値
  { key: 'STATUS_DEF',       label: '減算DEF',          group: 'プレイヤーステータス', desc: 'プレイヤーの減算DEF' },
  { key: 'STATUS_MDEF',      label: '減算MDEF',         group: 'プレイヤーステータス', desc: 'プレイヤーの減算MDEF' },
  { key: 'EQUIP_DEF',        label: '装備除算DEF(※)',   group: 'プレイヤーステータス', desc: '装備除算DEF（アスムプティオ時×2）' },
  { key: 'EQUIP_MDEF',       label: '装備除算MDEF(※)',  group: 'プレイヤーステータス', desc: '装備除算MDEF（アスムプティオ時×2）' },
  { key: 'HARD_DEF_FACTOR',  label: '除算DEF係数',   group: 'プレイヤーステータス', desc: '(4000+DEF)/(4000+DEF×10),min0.10' },
  { key: 'HARD_MDEF_FACTOR', label: '除算MDEF係数',  group: 'プレイヤーステータス', desc: '(1000+MDEF)/(1000+MDEF×10),min0.10' },
  { key: 'RES',              label: 'Res',            group: 'プレイヤーステータス', desc: 'Resステータス生値' },
  { key: 'MRES',             label: 'Mres',           group: 'プレイヤーステータス', desc: 'Mresステータス生値' },
  { key: 'RES_FACTOR',       label: 'Res係数',        group: 'プレイヤーステータス', desc: '(2000+Res)/(2000+Res×5)' },
  { key: 'MRES_FACTOR',      label: 'Mres係数',       group: 'プレイヤーステータス', desc: '(2000+Mres)/(2000+Mres×5)' },
  // 耐性%
  { key: 'RACE_RES',   label: '種族耐性%',   group: '耐性%' },
  { key: 'BOSS_RES',   label: 'ボス耐性%',   group: '耐性%' },
  { key: 'RANGED_RES', label: '遠距離耐性%', group: '耐性%' },
  // 属性耐性%
  { key: 'NEUTRAL_RES', label: '無属性耐性%',   group: '属性耐性%' },
  { key: 'FIRE_RES',    label: '火属性耐性%',   group: '属性耐性%' },
  { key: 'WATER_RES',   label: '水属性耐性%',   group: '属性耐性%' },
  { key: 'EARTH_RES',   label: '地属性耐性%',   group: '属性耐性%' },
  { key: 'WIND_RES',    label: '風属性耐性%',   group: '属性耐性%' },
  { key: 'POISON_RES',  label: '毒属性耐性%',   group: '属性耐性%' },
  { key: 'HOLY_RES',    label: '聖属性耐性%',   group: '属性耐性%' },
  { key: 'SHADOW_RES',  label: '闇属性耐性%',   group: '属性耐性%' },
  { key: 'GHOST_RES',   label: '念属性耐性%',   group: '属性耐性%' },
  { key: 'UNDEAD_RES',  label: '不死属性耐性%', group: '属性耐性%' },
  // 鎧相性 (Lv1固定)
  { key: 'ARMOR_MOD_NEUTRAL', label: '鎧相性[無]',   group: '鎧相性', desc: '無属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_FIRE',    label: '鎧相性[火]',   group: '鎧相性', desc: '火属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_WATER',   label: '鎧相性[水]',   group: '鎧相性', desc: '水属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_EARTH',   label: '鎧相性[地]',   group: '鎧相性', desc: '地属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_WIND',    label: '鎧相性[風]',   group: '鎧相性', desc: '風属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_POISON',  label: '鎧相性[毒]',   group: '鎧相性', desc: '毒属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_HOLY',    label: '鎧相性[聖]',   group: '鎧相性', desc: '聖属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_SHADOW',  label: '鎧相性[闇]',   group: '鎧相性', desc: '闇属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_GHOST',   label: '鎧相性[念]',   group: '鎧相性', desc: '念属性攻撃Lv1 vs 鎧属性' },
  { key: 'ARMOR_MOD_UNDEAD',  label: '鎧相性[不死]', group: '鎧相性', desc: '不死属性攻撃Lv1 vs 鎧属性' },
]

// ── 計算式テンプレート ─────────────────────────────────────────────────────────
let _tid = 0
function tid(): string { return `bt${++_tid}` }

function mkTokens(defs: Array<['op', string] | ['var', string] | ['num', number]>): FormulaToken[] {
  return defs.map(d => {
    const id = tid()
    if (d[0] === 'op') return { id, type: 'op' as const, opValue: d[1] }
    if (d[0] === 'var') return { id, type: 'var' as const, varKey: d[1] }
    return { id, type: 'num' as const, numValue: d[1] }
  })
}

export const FORMULA_TEMPLATES: FormulaConfig[] = [
  {
    id: 'tmpl_earthquake',
    name: 'アースクエイク',
    damageType: 'magic',
    isBuiltin: true,
    tokens: mkTokens([
      ['var','MATK'], ['op','*'], ['num',7.5],
      ['op','*'], ['var','ARMOR_MOD_NEUTRAL'], ['op','/'], ['num',100],
      ['op','*'], ['op','('], ['num',100], ['op','-'], ['var','RANGED_RES'], ['op',')'],
      ['op','/'], ['num',100],
    ]),
  },
  {
    id: 'tmpl_tetra1',
    name: 'テトラボルテックス①（無属性）',
    damageType: 'magic',
    isBuiltin: true,
    tokens: mkTokens([
      ['var','MATK'], ['op','*'], ['num',25],
      ['op','*'], ['var','ARMOR_MOD_NEUTRAL'], ['op','/'], ['num',100],
      ['op','*'], ['op','('], ['num',100], ['op','-'], ['var','NEUTRAL_RES'], ['op',')'], ['op','/'], ['num',100],
      ['op','*'], ['op','('], ['num',100], ['op','-'], ['var','RACE_RES'], ['op',')'], ['op','/'], ['num',100],
      ['op','*'], ['op','('], ['num',100], ['op','-'], ['var','BOSS_RES'], ['op',')'], ['op','/'], ['num',100],
      ['op','*'], ['var','MRES_FACTOR'],
      ['op','*'], ['var','HARD_MDEF_FACTOR'],
      ['op','-'], ['var','STATUS_MDEF'],
    ]),
  },
  {
    id: 'tmpl_tetra2',
    name: 'テトラボルテックス②（地属性魔法）',
    damageType: 'magic',
    isBuiltin: true,
    tokens: mkTokens([
      ['var','MATK'], ['op','*'], ['num',25],
      ['op','*'], ['var','ARMOR_MOD_EARTH'], ['op','/'], ['num',100],
      ['op','*'], ['op','('], ['num',100], ['op','-'], ['var','RACE_RES'], ['op',')'], ['op','/'], ['num',100],
      ['op','*'], ['op','('], ['num',100], ['op','-'], ['var','BOSS_RES'], ['op',')'], ['op','/'], ['num',100],
      ['op','*'], ['var','MRES_FACTOR'],
      ['op','*'], ['var','HARD_MDEF_FACTOR'],
      ['op','-'], ['var','STATUS_MDEF'],
    ]),
  },
]

// ── 敵プリセット ───────────────────────────────────────────────────────────────
export interface EnemyPreset {
  id: string
  name: string
  atk: number
  matk: number
  str: number
  int: number
  luk: number
}

export const ENEMY_PRESETS: EnemyPreset[] = [
  { id: 'betelgeuse',  name: 'ベテルギウス',                atk: 130000, matk: 520000, str: 0, int: 0, luk: 0 },
  { id: 'demi_freyja', name: 'デミフレイヤ',                atk: 130000, matk: 130000, str: 0, int: 0, luk: 0 },
  { id: 'rigel_2star', name: '次元犯罪者リゲル（★★）',     atk: 70000,  matk: 400000, str: 0, int: 0, luk: 0 },
  { id: 'rigel_3star', name: '次元犯罪者リゲル（★★★）',   atk: 150000, matk: 800000, str: 0, int: 0, luk: 0 },
  { id: 'rigel_4star', name: '次元犯罪者リゲル（★★★★）', atk: 150000, matk: 800000, str: 0, int: 0, luk: 0 },
]
