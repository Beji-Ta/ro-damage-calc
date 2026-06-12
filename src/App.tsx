import { useState, useEffect, useCallback } from 'react'

// ── 型定義 ─────────────────────────────────────────────────────────────────────

interface PlayerStats {
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
  assumptioActive: boolean  // 装備DEF・装備MDEF 2倍
  energyCoatLevel: number  // 0=OFF 1=10%カット 2=20%カット 3=30%カット
  armorElement: string
  mresIgnored: boolean
}

interface Skill {
  id: string
  name: string
  type: 'physical' | 'magic'
  element: string
  elementLevel?: number   // 攻撃属性レベル 1〜4、省略時1
  powerMultiplier: number
  hits: number
  isRanged?: boolean
  armorCalcElement?: string
  bypassResistances?: boolean      // うずくまる・金剛・エナジーコート・アイアンハウリング・ストーンスキン以外を無視
  bypassSpecialReductions?: boolean // 鎧属性・金剛・うずくまる・アイアンハウリング・エナジーコートを無視 (ストーンスキンは有効)
  fixedDamage?: number              // ATK計算を無視してこの値を rawBase に使用
  notes?: string
}

interface EnemyData {
  id: string
  name: string
  hp: number
  atk: number
  matk: number
  race: string
  element: string
  isBoss: boolean
  skills: Skill[]
}

interface DamageResult {
  skillId: string
  skillName: string
  type: 'physical' | 'magic'
  element: string
  hits: number
  rawBase: number
  afterResistances: number
  afterHardDef: number
  statusDefUsed: number
  elementResUsed: number
  armorElemMod: number
  armorCalcOverridden: boolean
  perHit: number
  total: number
  hardDefReductionPct: number
  notes?: string
}

// ── 敵データベース ─────────────────────────────────────────────────────────────

const ENEMY_LIST: EnemyData[] = [
  {
    id: 'edga',
    name: 'エドガ',
    hp: 2_364_000,
    atk: 4_800,
    matk: 3_200,
    race: '悪魔',
    element: '闇',
    isBoss: true,
    skills: [
      { id: 'normal',        name: '通常攻撃',            type: 'physical', element: '無属性', powerMultiplier: 1.0, hits: 1 },
      { id: 'double',        name: '二連撃',               type: 'physical', element: '無属性', powerMultiplier: 1.0, hits: 2 },
      { id: 'sonic_blow',    name: 'ソニックブロー',       type: 'physical', element: '無属性', powerMultiplier: 0.8, hits: 8, notes: '8ヒット合計' },
      { id: 'fire_pillar',   name: 'ファイアーピラー',     type: 'magic',    element: '火',     powerMultiplier: 5.0, hits: 1 },
      { id: 'demonstration', name: 'デモンストレーション',  type: 'magic',    element: '火',     powerMultiplier: 1.2, hits: 5, isRanged: true, notes: '5ヒット合計' },
      { id: 'dark_strike',   name: 'ダークストライク',     type: 'physical', element: '闇',     powerMultiplier: 3.0, hits: 1 },
      { id: 'blood_drain',   name: 'ブラッドドレイン',     type: 'magic',    element: '闇',     powerMultiplier: 2.5, hits: 1, isRanged: true },
    ],
  },
  {
    id: 'betelgeuse',
    name: 'ベテルギウス',
    hp: 999_999_999,
    atk: 130_000,
    matk: 520_000,
    race: '竜族',
    element: '闇',
    isBoss: true,
    skills: [
      { id: 'napalm_beat',  name: 'ナパームビート',     type: 'magic',    element: '念',     powerMultiplier: 3.0, hits: 1 },
      { id: 'holy_attack',  name: 'ホーリーアタック',   type: 'physical', element: '聖',     powerMultiplier: 2.5, hits: 1 },
      { id: 'earth_quake',  name: 'アースクエイク',     type: 'magic',    element: '地',     powerMultiplier: 7.5, hits: 1, isRanged: true, bypassSpecialReductions: true },
      { id: 'bg_tetra_neutral', name: 'テトラボルテックス①', type: 'magic', element: '無属性', powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '無属性hit / 鎧相性は常に無属性扱い' },
      { id: 'bg_tetra_earth',   name: 'テトラボルテックス②', type: 'magic', element: '地',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '地属性hit / 鎧相性は常に無属性扱い' },
      { id: 'bg_tetra_water',   name: 'テトラボルテックス③', type: 'magic', element: '水',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '水属性hit / 鎧相性は常に無属性扱い' },
      { id: 'bg_tetra_fire',    name: 'テトラボルテックス④', type: 'magic', element: '火',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '火属性hit / 鎧相性は常に無属性扱い' },
      { id: 'killing_oura', name: 'キリングオーラ',     type: 'physical', element: '無属性', powerMultiplier: 1.0, hits: 1, fixedDamage: 100000, bypassResistances: true },
      { id: 'wide_stone',   name: 'ワイドストーン',     type: 'magic',    element: '地',     powerMultiplier: 1.0, hits: 1 },
    ],
  },
  {
    id: 'demi_freyja',
    name: 'デミフレイヤ',
    hp: 999_999_999,
    atk: 130_000,
    matk: 130_000,
    race: '天使',
    element: '聖',
    isBoss: true,
    skills: [
      { id: 'df_holy_attack',    name: 'ホーリーアタック',       type: 'physical', element: '聖',     powerMultiplier:  2.5,  hits: 1 },
      { id: 'df_storm_gust',     name: 'ストームガスト',         type: 'magic',    element: '水',     powerMultiplier:  7.2,  hits: 1, notes: '倍率近似値' },
      { id: 'df_earth_quake',    name: 'アースクエイク',         type: 'magic',    element: '地',     powerMultiplier:  7.5,  hits: 1, isRanged: true, bypassSpecialReductions: true },
      { id: 'df_psychic_wave',   name: 'Mサイキックウェーブ',    type: 'magic',    element: '念',     powerMultiplier:  5.0,  hits: 3, notes: '3ヒット合計 ※倍率近似値' },
      { id: 'df_ray_genesis',    name: 'Mレイオブジェネシス',    type: 'magic',    element: '聖',     powerMultiplier: 20.0,  hits: 1, notes: '倍率近似値' },
      { id: 'df_tetra_neutral',  name: 'テトラボルテックス①',   type: 'magic',    element: '無属性', powerMultiplier: 25.0,  hits: 1, armorCalcElement: '無属性', notes: '無属性hit / 鎧相性は常に無属性扱い' },
      { id: 'df_tetra_earth',    name: 'テトラボルテックス②',   type: 'magic',    element: '地',     powerMultiplier: 25.0,  hits: 1, armorCalcElement: '無属性', notes: '地属性hit / 鎧相性は常に無属性扱い' },
      { id: 'df_tetra_water',    name: 'テトラボルテックス③',   type: 'magic',    element: '水',     powerMultiplier: 25.0,  hits: 1, armorCalcElement: '無属性', notes: '水属性hit / 鎧相性は常に無属性扱い' },
      { id: 'df_tetra_fire',     name: 'テトラボルテックス④',   type: 'magic',    element: '火',     powerMultiplier: 25.0,  hits: 1, armorCalcElement: '無属性', notes: '火属性hit / 鎧相性は常に無属性扱い' },
    ],
  },
  {
    id: 'rigel_2star',
    name: '次元犯罪者リゲル（★★）',
    hp: 2_000_000_000,
    atk: 70_000,
    matk: 400_000,
    race: '竜族',
    element: '無属性',
    isBoss: true,
    skills: [
      { id: 'rg2_earth_quake',    name: 'アースクエイク',      type: 'magic',    element: '地',     powerMultiplier:  7.5, hits: 1, isRanged: true, bypassSpecialReductions: true },
      { id: 'rg2_tetra_neutral',  name: 'テトラボルテックス①', type: 'magic',    element: '無属性', powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '無属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg2_tetra_earth',    name: 'テトラボルテックス②', type: 'magic',    element: '地',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '地属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg2_tetra_water',    name: 'テトラボルテックス③', type: 'magic',    element: '水',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '水属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg2_tetra_fire',     name: 'テトラボルテックス④', type: 'magic',    element: '火',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '火属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg2_killing_oura',   name: 'キリングオーラ',      type: 'physical', element: '無属性', powerMultiplier:  1.0, hits: 1, fixedDamage: 100000, bypassResistances: true },
    ],
  },
  {
    id: 'rigel_3star',
    name: '次元犯罪者リゲル（★★★）',
    hp: 2_000_000_000,
    atk: 150_000,
    matk: 800_000,
    race: '竜族',
    element: '無属性',
    isBoss: true,
    skills: [
      { id: 'rg3_earth_quake',    name: 'アースクエイク',      type: 'magic',    element: '地',     powerMultiplier:  7.5, hits: 1, isRanged: true, bypassSpecialReductions: true },
      { id: 'rg3_tetra_neutral',  name: 'テトラボルテックス①', type: 'magic',    element: '無属性', powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '無属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg3_tetra_earth',    name: 'テトラボルテックス②', type: 'magic',    element: '地',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '地属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg3_tetra_water',    name: 'テトラボルテックス③', type: 'magic',    element: '水',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '水属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg3_tetra_fire',     name: 'テトラボルテックス④', type: 'magic',    element: '火',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '火属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg3_killing_oura',   name: 'キリングオーラ',      type: 'physical', element: '無属性', powerMultiplier:  1.0, hits: 1, fixedDamage: 100000, bypassResistances: true },
    ],
  },
  {
    id: 'rigel_4star',
    name: '次元犯罪者リゲル（★★★★）',
    hp: 2_000_000_000,
    atk: 150_000,
    matk: 800_000,
    race: '竜族',
    element: '無属性',
    isBoss: true,
    skills: [
      { id: 'rg4_earth_quake',    name: 'アースクエイク',      type: 'magic',    element: '地',     powerMultiplier:  7.5, hits: 1, isRanged: true, bypassSpecialReductions: true },
      { id: 'rg4_tetra_neutral',  name: 'テトラボルテックス①', type: 'magic',    element: '無属性', powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '無属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg4_tetra_earth',    name: 'テトラボルテックス②', type: 'magic',    element: '地',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '地属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg4_tetra_water',    name: 'テトラボルテックス③', type: 'magic',    element: '水',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '水属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg4_tetra_fire',     name: 'テトラボルテックス④', type: 'magic',    element: '火',     powerMultiplier: 25.0, hits: 1, armorCalcElement: '無属性', notes: '火属性hit / 鎧相性は常に無属性扱い' },
      { id: 'rg4_killing_oura',   name: 'キリングオーラ',      type: 'physical', element: '無属性', powerMultiplier:  1.0, hits: 1, fixedDamage: 100000, bypassResistances: true },
    ],
  },
]

// ── 属性 → PlayerStats キーの対応 ─────────────────────────────────────────────

const ELEMENT_RES_KEY: Record<string, keyof PlayerStats> = {
  '無属性': 'neutralRes',
  '火':     'fireRes',
  '水':     'waterRes',
  '地':     'earthRes',
  '風':     'windRes',
  '毒':     'poisonRes',
  '聖':     'holyRes',
  '闇':     'shadowRes',
  '念':     'ghostRes',
  '不死':   'undeadRes',
}

const ELEMENT_LABELS: { key: keyof PlayerStats; label: string; jp: string }[] = [
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

const ELEMENT_OPTIONS = ['無属性', '火', '水', '地', '風', '毒', '聖', '闇', '念', '不死']

// ── 属性相性表（jRO公式準拠 鎧属性Lv1固定）─────────────────────────────────────
// 出典: roratorio-hub.github.io/ratorio/roro/other/element.html (etc.js zokusei配列)
// 列順: 無属性, 水, 地, 火, 風, 毒, 聖, 闇, 念, 不死 (鎧/防御側、常にLv1)
// 行順: 攻撃属性 × 攻撃レベル(1〜4)
// 値: デルタ値 + 100 = 実際のダメージ%

const ELEM_ARMOR_COLS = ['無属性', '水', '地', '火', '風', '毒', '聖', '闇', '念', '不死'] as const

const ELEM_TABLE_DATA: Record<string, number[][]> = {
  '無属性': [
    [  0,  0,  0,   0,   0,   0,   0,   0, -75,   0],  // Lv1
    [  0,  0,  0,   0,   0,   0,   0,   0,-100,   0],  // Lv2
    [  0,  0,  0,   0,   0,   0,   0,   0,-100,   0],  // Lv3
    [  0,  0,  0,   0,   0,   0,   0,   0,-100,   0],  // Lv4
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

function getElemMod(attackElem: string, attackLv: number, armorElem: string): number {
  const rows = ELEM_TABLE_DATA[attackElem]
  if (!rows) return 100
  const row = rows[Math.min(Math.max(attackLv, 1), 4) - 1]
  const col = ELEM_ARMOR_COLS.indexOf(armorElem as typeof ELEM_ARMOR_COLS[number])
  if (col === -1 || !row) return 100
  return row[col] + 100
}

// ── LocalStorage ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ro_calc_player_v10'

const DEFAULT_STATS: PlayerStats = {
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

function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATS }
    return { ...DEFAULT_STATS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStats(s: PlayerStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

// ── 計算ロジック ───────────────────────────────────────────────────────────────

function calcDamage(stats: PlayerStats, enemy: EnemyData): DamageResult[] {
  const effectiveEquipDef  = stats.assumptioActive ? stats.equipDef  * 2 : stats.equipDef
  const effectiveEquipMdef = stats.assumptioActive ? stats.equipMdef * 2 : stats.equipMdef
  const hardDefFactor  = 135 / (effectiveEquipDef  + 135)
  const hardMdefFactor = 135 / (effectiveEquipMdef + 135)

  const resFactor   = (2000 + stats.res)  / (2000 + stats.res  * 5)
  const mresFactor  = stats.mresIgnored ? 1.0 : (2000 + stats.mres) / (2000 + stats.mres * 5)
  const raceFactor  = Math.max(0, (100 - stats.raceRes) / 100)
  const bossFactor        = enemy.isBoss ? Math.max(0, (100 - stats.bossRes) / 100) : 1.0
  const kongouFactor      = stats.kongouActive      ? 0.10 : 1.0
  const crouchFactor      = stats.crouchActive      ? 0.20 : 1.0
  const ironHowlingFactor = stats.ironHowlingActive ? 0.60 : 1.0
  const energyCoatFactor  = stats.energyCoatLevel > 0 ? 1 - stats.energyCoatLevel * 0.10 : 1.0

  return enemy.skills.map(skill => {
    const isPhys     = skill.type === 'physical'
    const baseAtk    = isPhys ? enemy.atk : enemy.matk
    const rawBase    = skill.fixedDamage !== undefined ? skill.fixedDamage : baseAtk * skill.powerMultiplier
    const specFactor = isPhys ? resFactor : mresFactor
    const hardFactor = isPhys ? hardDefFactor : hardMdefFactor
    const sdUsed     = isPhys ? stats.statusDef : stats.statusMdef

    const elemResKey   = ELEMENT_RES_KEY[skill.element] ?? 'neutralRes'
    const elemResValue = stats[elemResKey] as number
    const elemFactor   = Math.max(0, (100 - elemResValue) / 100)

    const armorLookupElem = skill.armorCalcElement ?? skill.element
    const armorElemMod    = getElemMod(armorLookupElem, skill.elementLevel ?? 1, stats.armorElement)
    const rangedFactor    = skill.isRanged ? Math.max(0, (100 - stats.rangedRes) / 100) : 1.0

    const stoneSkinFactor = stats.stoneSkinActive ? (isPhys ? 0.80 : 1.20) : 1.0

    // bypassSpecialReductions: 鎧属性・金剛・うずくまる・アイアンハウリング・エナジーコートを無視
    const bsr = skill.bypassSpecialReductions
    const effArmorElemFactor = bsr ? 1.0 : armorElemMod / 100
    const effKongouFactor      = bsr ? 1.0 : kongouFactor
    const effCrouchFactor      = bsr ? 1.0 : crouchFactor
    const effIronHowlingFactor = bsr ? 1.0 : ironHowlingFactor
    const effEnergyCoatFactor  = bsr ? 1.0 : energyCoatFactor

    let afterResistances: number
    let afterHardDef: number
    let hardDefReductionPct: number

    if (skill.bypassResistances) {
      // 貫通: 種族・ボス・属性耐性・Res・遠距離・除算DEF・減算DEF
      // 有効: 鎧属性・エナジーコート・金剛・うずくまる・アイアンハウリング・ストーンスキン
      afterResistances   = rawBase * (armorElemMod / 100) * energyCoatFactor
        * kongouFactor * crouchFactor * ironHowlingFactor * stoneSkinFactor
      afterHardDef       = afterResistances
      hardDefReductionPct = 0
    } else {
      afterResistances   = rawBase * raceFactor * elemFactor * effArmorElemFactor * bossFactor * specFactor * rangedFactor
        * effKongouFactor * effCrouchFactor * effIronHowlingFactor * stoneSkinFactor * effEnergyCoatFactor
      afterHardDef       = afterResistances * hardFactor
      hardDefReductionPct = (1 - hardFactor) * 100
    }

    const perHit = Math.max(1, Math.floor(skill.bypassResistances ? afterHardDef : afterHardDef - sdUsed))
    const total  = perHit * skill.hits

    return {
      skillId: skill.id,
      skillName: skill.name,
      type: skill.type,
      element: skill.element,
      hits: skill.hits,
      rawBase,
      afterResistances,
      afterHardDef,
      statusDefUsed: sdUsed,
      elementResUsed: elemResValue,
      armorElemMod: bsr ? 100 : armorElemMod,
      armorCalcOverridden: !bsr && !!skill.armorCalcElement && skill.armorCalcElement !== skill.element,
      perHit,
      total,
      hardDefReductionPct,
      notes: skill.notes,
    }
  })
}

// ── Appコンポーネント ──────────────────────────────────────────────────────────

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(loadStats)
  const [selectedEnemyId, setSelectedEnemyId] = useState<string>(ENEMY_LIST[0]?.id ?? '')

  const enemy = ENEMY_LIST.find(e => e.id === selectedEnemyId) ?? null

  useEffect(() => { saveStats(stats) }, [stats])

  const setNum = useCallback((key: keyof PlayerStats, raw: string) => {
    const n = raw === '' ? 0 : parseInt(raw, 10)
    if (!isNaN(n)) setStats(prev => ({ ...prev, [key]: n }))
  }, [])

  const setStr = useCallback((key: keyof PlayerStats, val: string) => {
    setStats(prev => ({ ...prev, [key]: val }))
  }, [])

  const toggle = useCallback((key: keyof PlayerStats) => {
    setStats(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const results = enemy ? calcDamage(stats, enemy) : []

  const defReductionPct  = (stats.equipDef  / (stats.equipDef  + 135)) * 100
  const mdefReductionPct = (stats.equipMdef / (stats.equipMdef + 135)) * 100
  const resReductionPct  = (1 - (2000 + stats.res)  / (2000 + stats.res  * 5)) * 100
  const mresReductionPct = (1 - (2000 + stats.mres) / (2000 + stats.mres * 5)) * 100

  return (
    <div style={S.root}>
      {/* ヘッダー */}
      <header style={S.header}>
        {/* ヒーロー画像 */}
        <div style={S.heroWrap}>
          <img src={`${import.meta.env.BASE_URL}popcorn-warrior.jpg`} alt="ポップコーン戦士" style={S.heroImg} />
          <div style={S.heroOverlay}>
            <div style={S.heroPopcornRow}>🍿 ✨ 🍿 ✨ 🍿</div>
            <h1 style={S.title}>
              <span style={S.titleRo}>RO</span>
              <span style={S.titleMain}> 被ダメージ計算機</span>
            </h1>
            <p style={S.heroTagline}>― ポップコーン戦士に守られし 計算の聖地 ―</p>
            <p style={S.subtitle}>Ragnarok Online — jRO仕様 / モンスターから受ける被害のシミュレーション</p>
          </div>
        </div>

        {/* 讃えバナー */}
        <div style={S.celebBanner}>
          {'🍿✨🍿✨🍿✨🍿✨🍿'.split('').map((c, i) => (
            <span key={i} style={{ opacity: 0.7 }}>{c}</span>
          ))}
          <span style={S.celebText}>　讃 え よ ！　ポップコーン戦士！　</span>
          {'🍿✨🍿✨🍿✨🍿✨🍿'.split('').map((c, i) => (
            <span key={i + 99} style={{ opacity: 0.7 }}>{c}</span>
          ))}
        </div>
      </header>

      <main style={S.main}>

        {/* ══ プレイヤーステータス ══ */}
        <section style={S.panel}>
          <PanelHeader icon="🛡️" title="プレイヤーステータス" color={C.blue}>
            <button style={S.resetBtn} onClick={() => setStats({ ...DEFAULT_STATS })}>リセット</button>
          </PanelHeader>

          <SectionLabel color={C.blue}>減算防御 (直接入力)</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="減算DEF"  value={stats.statusDef}  min={0} max={99999} onChange={v => setNum('statusDef', v)}  color={C.blue} />
            <NumField label="減算MDEF" value={stats.statusMdef} min={0} max={99999} onChange={v => setNum('statusMdef', v)} color={C.purple} />
          </div>

          <SectionLabel color={C.blue}>装備 除算DEF / MDEF</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="装備除算DEF"  value={stats.equipDef}  min={0} max={9999} onChange={v => setNum('equipDef', v)}  color={C.blue} />
            <NumField label="装備除算MDEF" value={stats.equipMdef} min={0} max={9999} onChange={v => setNum('equipMdef', v)} color={C.purple} />
          </div>

          <div style={S.derivedRow}>
            <DerivedStat label="物理 除算軽減率" value={`${defReductionPct.toFixed(1)}%`}  color={C.orange} />
            <DerivedStat label="魔法 除算軽減率" value={`${mdefReductionPct.toFixed(1)}%`} color={C.purple} />
          </div>

          <SectionLabel color={C.blue}>特殊ステータス (Res / Mres)</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="Res (物理軽減)"  value={stats.res}  min={-400} max={500} onChange={v => setNum('res', v)}  color={C.orange} />
            <NumField label="Mres (魔法軽減)" value={stats.mres} min={-400} max={500} onChange={v => setNum('mres', v)} color={C.purple} />
          </div>
          <div style={S.derivedRow}>
            <DerivedStat label="Res 軽減率" value={`${resReductionPct.toFixed(1)}%`}  color={C.orange} />
            <DerivedStat label="Mres 軽減率" value={`${mresReductionPct.toFixed(1)}%`} color={C.purple} />
          </div>
          <p style={{ ...S.saveNote, fontSize: '0.72rem', color: C.textMuted }}>※ Res/Mres は生ステータス値 — (2000+val)/(2000+val×5) で軽減率に換算 (上限80%カット)</p>

          <p style={S.saveNote}>※ 入力値はブラウザに自動保存されます 🍿</p>
        </section>

        {/* ══ 耐性設定 ══ */}
        <section style={S.panel}>
          <PanelHeader icon="⚙️" title="耐性設定" color={C.green} />

          <SectionLabel color={C.green}>種族・ボス・遠距離耐性 (%)</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="種族耐性 %"   value={stats.raceRes}   min={-100} max={100} onChange={v => setNum('raceRes', v)}   color={C.green} />
            <NumField label="ボス耐性 %"   value={stats.bossRes}   min={-100} max={100} onChange={v => setNum('bossRes', v)}   color={C.green} />
            <NumField label="遠距離耐性 %" value={stats.rangedRes} min={-100} max={100} onChange={v => setNum('rangedRes', v)} color={C.green} />
          </div>

          <SectionLabel color={C.green}>鎧属性</SectionLabel>
          <SelectField
            label="鎧属性"
            value={stats.armorElement}
            options={ELEMENT_OPTIONS}
            onChange={v => setStr('armorElement', v)}
            color={C.green}
          />

          <SectionLabel color={C.green}>属性耐性 (%) — 属性別</SectionLabel>
          <div style={S.elementGrid}>
            {ELEMENT_LABELS.map(({ key, label, jp }) => (
              <NumField
                key={key}
                label={`${jp} (${label})`}
                value={stats[key] as number}
                min={-200}
                max={95}
                onChange={v => setNum(key, v)}
                color={C.teal}
              />
            ))}
          </div>
        </section>

        {/* ══ 特殊設定・敵選択 ══ */}
        <section style={S.panel}>
          <PanelHeader icon="🌟" title="特殊設定・敵選択" color={C.gold} />

          <SectionLabel color={C.gold}>特殊状態</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ToggleRow
              label="金剛状態"
              description="全ダメージ 90% カット (×0.10)"
              active={stats.kongouActive}
              onToggle={() => toggle('kongouActive')}
              activeColor={C.gold}
            />
            <ToggleRow
              label="うずくまる状態"
              description="全ダメージ 80% カット (×0.20)"
              active={stats.crouchActive}
              onToggle={() => toggle('crouchActive')}
              activeColor={C.gold}
            />
            <ToggleRow
              label="アイアンハウリング状態"
              description="全ダメージ 40% カット (×0.60)"
              active={stats.ironHowlingActive}
              onToggle={() => toggle('ironHowlingActive')}
              activeColor={C.gold}
            />
            <ToggleRow
              label="ストーンスキン状態"
              description="物理ダメージ 20% カット (×0.80) / 魔法ダメージ 20% アップ (×1.20)"
              active={stats.stoneSkinActive}
              onToggle={() => toggle('stoneSkinActive')}
              activeColor={C.teal}
            />
            <ToggleRow
              label="アスムプティオ状態"
              description="装備DEF・装備MDEF が 2倍になる"
              active={stats.assumptioActive}
              onToggle={() => toggle('assumptioActive')}
              activeColor={C.blue}
            />
            <StepToggleRow
              label="エナジーコート"
              description="SP残量に応じてダメージカット — 多い: 30% / 中: 20% / 少ない: 10%"
              level={stats.energyCoatLevel}
              steps={[
                { label: '10%', value: 1 },
                { label: '20%', value: 2 },
                { label: '30%', value: 3 },
              ]}
              onStep={v => setStats(prev => ({ ...prev, energyCoatLevel: v }))}
              activeColor={C.blue}
            />
          </div>

          <SectionLabel color={C.gold}>特殊トグル</SectionLabel>
          <ToggleRow
            label="Mres 100% 無視"
            description="プレイヤーのMresによる魔法ダメージ軽減が無効化される（敵のMres貫通攻撃を想定）"
            active={stats.mresIgnored}
            onToggle={() => toggle('mresIgnored')}
            activeColor={C.danger}
          />

          {/* 敵選択 */}
          <div style={{ marginTop: '28px' }}>
            <PanelHeader icon="☠️" title="敵の選択" color={C.red} />
            <div style={S.selectWrapper}>
              <select
                style={S.select}
                value={selectedEnemyId}
                onChange={e => setSelectedEnemyId(e.target.value)}
              >
                {ENEMY_LIST.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <span style={S.selectArrow}>▾</span>
            </div>

            {enemy && (
              <div style={S.enemyCard}>
                <div style={S.enemyCardHeader}>
                  <span style={S.enemyName}>{enemy.name}</span>
                  {enemy.isBoss && <span style={S.bossBadge}>👑 BOSS</span>}
                </div>
                <div style={S.enemyStatGrid}>
                  <EnemyStat label="HP"   value={enemy.hp.toLocaleString()} />
                  <EnemyStat label="ATK"  value={enemy.atk.toLocaleString()} />
                  <EnemyStat label="MATK" value={enemy.matk.toLocaleString()} />
                  <EnemyStat label="種族" value={enemy.race} />
                  <EnemyStat label="属性" value={enemy.element} />
                </div>
                <div style={S.skillListHeader}>スキル一覧</div>
                <div style={S.skillList}>
                  {enemy.skills.map(sk => (
                    <div key={sk.id} style={S.skillItem}>
                      <span style={{ ...S.skillTypeDot, background: sk.type === 'physical' ? C.orange : C.purple }} />
                      <span style={S.skillItemName}>{sk.name}</span>
                      <span style={S.skillItemMeta}>
                        {sk.element} · {sk.powerMultiplier}× · {sk.hits}hit{sk.isRanged ? ' · 遠距離' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══ 計算結果 ══ */}
        <section style={{ ...S.panel, ...S.resultPanel }}>
          <PanelHeader icon="✨" title="被ダメージ計算結果" color={C.orange} />

          {/* 計算パラメータ サマリー */}
          {enemy && (
            <div style={S.paramSummary}>
              <ParamChip label="減算DEF"      value={stats.statusDef}  color={C.blue} />
              <ParamChip label="減算MDEF"     value={stats.statusMdef} color={C.purple} />
              <ParamChip label="物理除算軽減"  value={`${defReductionPct.toFixed(1)}%`}  color={C.orange} />
              <ParamChip label="魔法除算軽減"  value={`${mdefReductionPct.toFixed(1)}%`} color={C.purple} />
              <ParamChip label="鎧属性"        value={stats.armorElement} color={C.teal} />
              <ParamChip label="種族耐性"      value={`${stats.raceRes}%`}    color={C.green} />
              {stats.rangedRes !== 0 && <ParamChip label="遠距離耐性" value={`${stats.rangedRes}%`} color={C.green} />}
              {ELEMENT_LABELS.filter(({ key }) => (stats[key] as number) !== 0).map(({ key, jp }) => (
                <ParamChip key={key} label={`${jp}属性耐性`} value={`${stats[key] as number}%`} color={C.teal} />
              ))}
              {enemy.isBoss && <ParamChip label="ボス耐性" value={`${stats.bossRes}%`} color={C.green} />}
              {stats.kongouActive      && <ParamChip label="金剛"           value="×0.10" color={C.gold} />}
              {stats.crouchActive      && <ParamChip label="うずくまる"     value="×0.20" color={C.gold} />}
              {stats.ironHowlingActive && <ParamChip label="アイアンハウリング" value="×0.60" color={C.gold} />}
              {stats.stoneSkinActive   && <ParamChip label="ストーンスキン" value="物理×0.80 魔法×1.20" color={C.teal} />}
              {stats.assumptioActive   && <ParamChip label="アスムプティオ" value="装備DEF/MDEF×2" color={C.blue} />}
              {stats.energyCoatLevel > 0 && <ParamChip label="エナジーコート" value={`×${(1 - stats.energyCoatLevel * 0.10).toFixed(2)}`} color={C.blue} />}
              {stats.mresIgnored && <ParamChip label="Mres無視" value="ON" color={C.danger} />}
            </div>
          )}

          {results.length === 0 ? (
            <p style={{ color: C.textMuted, margin: '24px 0', textAlign: 'center', fontSize: '1rem' }}>
              🐕 敵を選択してください 🍿
            </p>
          ) : (
            <div style={S.resultsContainer}>
              {results.map(r => (
                <DamageRow key={r.skillId} result={r} armorElement={stats.armorElement} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer style={S.footer}>
        <p>🐕⚔️🍿 jRO Damage Calculator — 計算式はjRO公式仕様に基づく近似値です 🍿⚔️🐕</p>
      </footer>
    </div>
  )
}

// ── サブコンポーネント ─────────────────────────────────────────────────────────

function PanelHeader({ icon, title, color, children }: { icon: string; title: string; color: string; children?: React.ReactNode }) {
  return (
    <div style={{ ...S.panelHeader, borderBottomColor: `${color}40` }}>
      <span style={{ ...S.panelIcon, color }}>{icon}</span>
      <h2 style={{ ...S.panelTitle, color }}>{title}</h2>
      {children}
    </div>
  )
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ ...S.sectionLabel, color, borderLeftColor: color }}>
      {children}
    </div>
  )
}

function NumField({ label, value, min, max, onChange, color }: {
  label: string; value: number; min: number; max: number; onChange: (v: string) => void; color: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={S.statField}>
      <label style={{ ...S.statLabel, color }}>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...S.statInput,
          borderColor: focused ? color : C.inputBorder,
          boxShadow: focused ? `0 0 0 3px ${color}25` : 'none',
        }}
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange, color }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; color: string
}) {
  return (
    <div style={S.statField}>
      <label style={{ ...S.statLabel, color }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <select
          style={{ ...S.inlineSelect, borderColor: C.inputBorder }}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <span style={{ ...S.inlineSelectArrow, color }}>{`▾`}</span>
      </div>
    </div>
  )
}

function DerivedStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={S.derivedStat}>
      <span style={S.derivedLabel}>{label}</span>
      <span style={{ ...S.derivedValue, color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

function ToggleRow({ label, description, active, onToggle, activeColor }: {
  label: string; description: string; active: boolean; onToggle: () => void; activeColor: string
}) {
  return (
    <div style={{
      ...S.toggleRow,
      border: `2px solid ${active ? activeColor : '#e5e7eb'}`,
      background: active ? `${activeColor}12` : '#f9fafb',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ ...S.toggleLabel, color: active ? activeColor : C.textPrimary }}>{label}</div>
        <div style={S.toggleDesc}>{description}</div>
      </div>
      <button
        style={{
          ...S.toggleBtn,
          color: active ? '#fff' : C.textMuted,
          background: active ? activeColor : '#e5e7eb',
          border: 'none',
        }}
        onClick={onToggle}
      >
        {active ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

function StepToggleRow({ label, description, level, steps, onStep, activeColor }: {
  label: string; description: string; level: number
  steps: { label: string; value: number }[]
  onStep: (v: number) => void; activeColor: string
}) {
  const active = level > 0
  return (
    <div style={{
      ...S.toggleRow,
      border: `2px solid ${active ? activeColor : '#e5e7eb'}`,
      background: active ? `${activeColor}12` : '#f9fafb',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ ...S.toggleLabel, color: active ? activeColor : C.textPrimary }}>{label}</div>
        <div style={S.toggleDesc}>{description}</div>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button
          style={{
            ...S.toggleBtn,
            fontSize: '0.7rem', padding: '4px 8px',
            color: level === 0 ? '#fff' : C.textMuted,
            background: level === 0 ? '#6b7280' : '#e5e7eb',
            border: 'none',
          }}
          onClick={() => onStep(0)}
        >OFF</button>
        {steps.map(s => (
          <button
            key={s.value}
            style={{
              ...S.toggleBtn,
              fontSize: '0.7rem', padding: '4px 8px',
              color: level === s.value ? '#fff' : C.textMuted,
              background: level === s.value ? activeColor : '#e5e7eb',
              border: 'none',
            }}
            onClick={() => onStep(s.value)}
          >{s.label}</button>
        ))}
      </div>
    </div>
  )
}

function EnemyStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.enemyStatItem}>
      <span style={S.enemyStatLabel}>{label}</span>
      <span style={S.enemyStatValue}>{value}</span>
    </div>
  )
}

function ParamChip({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ ...S.paramChip, borderColor: `${color}50`, background: `${color}10` }}>
      <span style={{ ...S.paramChipLabel, color: `${color}cc` }}>{label}</span>
      <span style={{ ...S.paramChipValue, color }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  )
}

function DamageRow({ result, armorElement }: { result: DamageResult; armorElement: string }) {
  const isPhys    = result.type === 'physical'
  const typeColor = isPhys ? C.orange : C.purple
  const typeBg    = isPhys ? '#fff7ed' : '#faf5ff'
  const resPct    = result.hardDefReductionPct.toFixed(1)
  const multiHit  = result.hits > 1

  return (
    <div style={{
      background: typeBg,
      border: `2px solid ${typeColor}40`,
      borderLeft: `5px solid ${typeColor}`,
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: `0 2px 8px ${typeColor}15`,
    }}>
      {/* 上段: スキル名 + ダメージ数 */}
      <div style={S.damageRowTop}>
        <div style={S.damageRowLeft}>
          <span style={{ ...S.typeBadge, color: '#fff', background: typeColor }}>
            {isPhys ? '⚔️ 物理' : '✨ 魔法'}
          </span>
          <span style={{ ...S.elemBadge, borderColor: `${typeColor}40`, color: typeColor }}>{result.element}</span>
          <span style={{ ...S.skillName, color: C.textPrimary }}>{result.skillName}</span>
          {result.notes && <span style={S.notesBadge}>{result.notes}</span>}
        </div>
        <div style={S.damageNumbers}>
          {multiHit && (
            <span style={S.perHitText}>
              {result.perHit.toLocaleString()} <span style={{ color: C.textMuted }}>×</span> {result.hits}hit
            </span>
          )}
          <span style={{ ...S.totalDmg, color: typeColor }}>
            {result.total.toLocaleString()}
          </span>
          <span style={S.dmgUnit}>ダメージ</span>
        </div>
      </div>

      {/* 下段: 計算ステップ内訳 */}
      <div style={{ ...S.breakdown, background: `${typeColor}08`, border: `1px solid ${typeColor}20` }}>
        <BkStep val={`基礎: ${Math.floor(result.rawBase).toLocaleString()}`} />
        <BkArrow color={typeColor} />
        <BkStep val={`耐性後: ${Math.floor(result.afterResistances).toLocaleString()}`} />
        {(result.armorElemMod !== 100 || result.armorCalcOverridden) && (
          <span style={{ ...S.bkStep, color: result.armorElemMod > 100 ? C.danger : C.green, fontWeight: 700, fontSize: '0.65rem' }}>
            (鎧:{armorElement} {result.armorElemMod}%{result.armorCalcOverridden ? ' ※無属性扱い' : ''})
          </span>
        )}
        {result.elementResUsed !== 0 && (
          <span style={{ ...S.bkStep, color: C.teal, fontWeight: 700, fontSize: '0.65rem' }}>
            ({result.element}耐性 {result.elementResUsed > 0 ? '+' : ''}{result.elementResUsed}%)
          </span>
        )}
        <BkArrow color={typeColor} />
        <BkStep val={`除算DEF(−${resPct}%): ${Math.floor(result.afterHardDef).toLocaleString()}`} />
        <BkArrow color={typeColor} />
        <BkStep
          val={`減算DEF(−${result.statusDefUsed}): `}
          highlight={`${result.perHit.toLocaleString()}/hit`}
          highlightColor={typeColor}
        />
        {multiHit && (
          <>
            <BkArrow color={typeColor} />
            <BkStep
              val={`×${result.hits}hit = `}
              highlight={result.total.toLocaleString()}
              highlightColor={typeColor}
            />
          </>
        )}
      </div>
    </div>
  )
}

function BkStep({ val, highlight, highlightColor }: { val: string; highlight?: string; highlightColor?: string }) {
  return (
    <span style={S.bkStep}>
      {val}
      {highlight && <strong style={{ color: highlightColor }}>{highlight}</strong>}
    </span>
  )
}

function BkArrow({ color }: { color: string }) {
  return <span style={{ ...S.bkArrow, color }}>{`→`}</span>
}

// ── カラーパレット ─────────────────────────────────────────────────────────────

const C = {
  bg: '#fef6e4',
  panel: '#ffffff',
  panelBorder: '#f0d9a0',
  orange: '#ea580c',
  blue: '#2563eb',
  purple: '#7c3aed',
  green: '#16a34a',
  teal: '#0891b2',
  red: '#dc2626',
  gold: '#d97706',
  popcorn: '#f59e0b',
  textPrimary: '#1c1917',
  textSecondary: '#57534e',
  textMuted: '#a8a29e',
  inputBg: '#fffbf0',
  inputBorder: '#e0ccaa',
  danger: '#dc2626',
}

// ── スタイル定義 ───────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: C.bg,
    color: C.textPrimary,
    fontFamily: "'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    position: 'relative',
    overflow: 'hidden',
    borderBottom: `4px solid ${C.popcorn}`,
    background: '#0f0800',
  },

  heroWrap: {
    position: 'relative',
    width: '100%',
    height: '260px',
    overflow: 'hidden',
  },
  heroImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 15%',
    display: 'block',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(0deg, rgba(10,4,0,0.92) 0%, rgba(10,4,0,0.55) 55%, transparent 100%)',
    padding: '12px 24px 18px',
    textAlign: 'center',
  },
  heroPopcornRow: {
    fontSize: '1.1rem', letterSpacing: '6px',
    marginBottom: '4px',
    filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.9))',
  },
  heroTagline: {
    color: '#f59e0b',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
    margin: '4px 0 2px',
    textShadow: '0 0 12px rgba(245,158,11,0.7), 0 1px 4px rgba(0,0,0,0.9)',
  },

  celebBanner: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    flexWrap: 'wrap',
    background: 'linear-gradient(90deg, #78350f 0%, #b45309 20%, #d97706 40%, #f59e0b 50%, #d97706 60%, #b45309 80%, #78350f 100%)',
    padding: '7px 16px',
    gap: '1px',
  },
  celebText: {
    color: '#fff',
    fontWeight: 900,
    fontSize: '0.95rem',
    letterSpacing: '0.22em',
    textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 16px rgba(255,200,50,0.5)',
  },

  title: {
    fontSize: '2.1rem', fontWeight: 900, letterSpacing: '0.04em',
    margin: '2px 0 4px', lineHeight: 1,
    textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 24px rgba(245,158,11,0.4)',
  },
  titleRo: {
    color: '#fbbf24',
    display: 'inline-block',
    textShadow: '0 0 20px rgba(251,191,36,0.6)',
  },
  titleMain: {
    color: '#ffffff',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem',
    marginTop: '2px', letterSpacing: '0.06em',
    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
  },

  main: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    padding: '24px 20px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },

  panel: {
    background: C.panel,
    border: `1.5px solid ${C.panelBorder}`,
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '16px', borderBottom: `2px solid #f0e0c0`, paddingBottom: '12px',
  },
  panelIcon: { fontSize: '1.3rem' },
  panelTitle: { fontSize: '1rem', fontWeight: 700, margin: 0, flex: 1, letterSpacing: '0.04em' },

  sectionLabel: {
    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.12em', marginBottom: '10px', marginTop: '20px',
    borderLeft: '3px solid', paddingLeft: '8px',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
  },
  elementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px',
  },
  statField: { display: 'flex', flexDirection: 'column', gap: '5px' },
  statLabel: {
    fontSize: '0.7rem', textTransform: 'uppercase',
    letterSpacing: '0.08em', fontWeight: 700,
  },
  statInput: {
    background: C.inputBg,
    border: `1.5px solid`,
    borderRadius: '8px',
    color: C.textPrimary,
    fontSize: '1.05rem',
    padding: '8px 12px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    width: '100%',
    boxSizing: 'border-box',
    fontWeight: 600,
  },

  inlineSelect: {
    width: '100%',
    background: C.inputBg,
    border: `1.5px solid`,
    borderRadius: '8px',
    color: C.textPrimary,
    fontSize: '1.05rem',
    padding: '8px 36px 8px 12px',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
    fontWeight: 600,
  },
  inlineSelectArrow: {
    position: 'absolute', right: '10px', top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    fontSize: '0.9rem', fontWeight: 700,
  },

  derivedRow: {
    display: 'flex', gap: '20px', flexWrap: 'wrap',
    background: '#fffbf0',
    border: `1.5px solid ${C.panelBorder}`,
    borderRadius: '10px',
    padding: '10px 14px',
    marginTop: '10px',
  },
  derivedStat: { display: 'flex', flexDirection: 'column', gap: '2px' },
  derivedLabel: {
    fontSize: '0.62rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
  },
  derivedValue: { fontSize: '1.15rem', fontWeight: 800 },

  saveNote: {
    fontSize: '0.7rem', color: C.textMuted, marginTop: '16px', marginBottom: 0, textAlign: 'right',
  },
  resetBtn: {
    background: '#fff1f2', border: `1.5px solid ${C.danger}`, color: C.danger,
    borderRadius: '8px', padding: '4px 14px', fontSize: '0.75rem',
    cursor: 'pointer', letterSpacing: '0.05em', fontWeight: 700,
    transition: 'background 0.15s',
  },

  toggleRow: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '12px', borderRadius: '10px',
    transition: 'background 0.15s, border-color 0.15s',
  },
  toggleLabel: { fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' },
  toggleDesc: { fontSize: '0.7rem', color: C.textMuted, lineHeight: 1.5 },
  toggleBtn: {
    minWidth: '52px', padding: '6px 10px', borderRadius: '8px',
    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
    transition: 'all 0.15s', letterSpacing: '0.05em', flexShrink: 0,
  },

  selectWrapper: { position: 'relative', marginBottom: '14px' },
  select: {
    width: '100%', background: C.inputBg, border: `1.5px solid ${C.inputBorder}`,
    borderRadius: '10px', color: C.textPrimary, fontSize: '1rem',
    padding: '10px 36px 10px 14px', outline: 'none', appearance: 'none',
    cursor: 'pointer', boxSizing: 'border-box', fontWeight: 600,
  },
  selectArrow: {
    position: 'absolute', right: '12px', top: '50%',
    transform: 'translateY(-50%)', color: C.orange, pointerEvents: 'none', fontWeight: 700,
  },

  enemyCard: {
    background: 'linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)',
    border: `2px solid ${C.popcorn}60`,
    borderRadius: '12px', padding: '14px',
    boxShadow: `0 4px 12px rgba(245,158,11,0.1)`,
  },
  enemyCardHeader: {
    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px',
  },
  enemyName: {
    fontSize: '1.1rem', fontWeight: 800, color: C.orange,
  },
  bossBadge: {
    fontSize: '0.65rem', padding: '2px 8px', borderRadius: '99px', fontWeight: 800,
    letterSpacing: '0.1em', background: '#fef9c3',
    color: C.gold, border: `1.5px solid ${C.gold}60`,
  },
  enemyStatGrid: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' },
  enemyStatItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  enemyStatLabel: {
    fontSize: '0.62rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
  },
  enemyStatValue: { fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary },

  skillListHeader: {
    fontSize: '0.62rem', color: C.textMuted, textTransform: 'uppercase',
    letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 700,
    borderTop: `1.5px solid ${C.panelBorder}`, paddingTop: '10px',
  },
  skillList: { display: 'flex', flexDirection: 'column', gap: '5px' },
  skillItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  skillTypeDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  skillItemName: { fontSize: '0.85rem', color: C.textPrimary, flex: 1, fontWeight: 600 },
  skillItemMeta: { fontSize: '0.7rem', color: C.textMuted },

  resultPanel: {
    borderColor: `${C.orange}40`,
    boxShadow: `0 4px 24px rgba(234,88,12,0.08)`,
  },

  paramSummary: {
    display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
    padding: '12px', background: '#fffbf0', borderRadius: '10px',
    border: `1.5px solid ${C.panelBorder}`,
  },
  paramChip: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    padding: '6px 10px', borderRadius: '8px', border: '1.5px solid',
  },
  paramChipLabel: { fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 },
  paramChipValue: { fontSize: '0.9rem', fontWeight: 800 },

  resultsContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },

  damageRowTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '8px', marginBottom: '8px',
  },
  damageRowLeft: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  typeBadge: {
    fontSize: '0.68rem', padding: '3px 10px', borderRadius: '99px',
    fontWeight: 800, letterSpacing: '0.05em',
  },
  elemBadge: {
    fontSize: '0.68rem', padding: '3px 10px', borderRadius: '99px',
    background: '#fff', fontWeight: 700,
    border: `1.5px solid`,
  },
  skillName: { fontSize: '0.95rem', fontWeight: 700 },
  notesBadge: {
    fontSize: '0.65rem', padding: '2px 8px', borderRadius: '99px',
    background: '#fef9c3', color: C.gold,
    border: `1.5px solid ${C.gold}50`, fontWeight: 700,
  },

  damageNumbers: { display: 'flex', alignItems: 'baseline', gap: '6px' },
  perHitText: { fontSize: '0.85rem', color: C.textMuted },
  totalDmg: { fontSize: '2rem', fontWeight: 900, lineHeight: 1 },
  dmgUnit: { fontSize: '0.78rem', color: C.textMuted, fontWeight: 600 },

  breakdown: {
    display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap',
    fontSize: '0.7rem',
    padding: '8px 12px', borderRadius: '8px',
    border: '1px solid',
  },
  bkStep: { color: C.textSecondary, whiteSpace: 'nowrap', fontWeight: 600 },
  bkArrow: { fontSize: '0.75rem', fontWeight: 700 },

  footer: {
    textAlign: 'center', padding: '16px',
    borderTop: `2px solid ${C.panelBorder}`,
    color: C.textMuted, fontSize: '0.8rem', letterSpacing: '0.05em',
    background: '#fff8e1', fontWeight: 600,
  },
}
