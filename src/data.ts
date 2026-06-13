import type { FormulaConfig, FormulaToken } from './types'

// ── 属性相性表 ─────────────────────────────────────────────────────────────────
// 防御（鎧）属性の列順序。ELEM_TABLE_DATA の各配列とインデックスが対応する。
export const ELEM_ARMOR_COLS = ['無属性', '水', '地', '火', '風', '毒', '聖', '闇', '念', '不死'] as const

// 属性相性テーブル本体。
// キー = 攻撃属性、値 = 防御属性ごとの被ダメ倍率を「実際の% − 100」で格納する。
// 例: 0 → 100% 等倍、50 → 150% 弱点、-75 → 25% 耐性、-100 → 0% 無効
// 列順は ELEM_ARMOR_COLS に対応（無属性=index0, 水=1, ..., 不死=9）。
// Lv2〜4は jRO 仕様では存在しないため省略し、Lv1 のみを保持する。
const ELEM_TABLE_DATA: Record<string, number[]> = {
  //        無    水    地    火    風    毒    聖    闇    念   不死
  '無属性': [  0,   0,   0,   0,   0,   0,   0,   0, -75,   0],
  '水':     [  0, -75,   0,  50, -50,   0, -25,   0,   0,   0],
  '地':     [  0,   0, -75, -50,  50,   0, -25,   0,   0,   0],
  '火':     [  0, -50,  50, -75,   0,   0, -25,   0,   0,  25],
  '風':     [  0,  75, -50,   0, -75,   0, -25,   0,   0,   0],
  '毒':     [  0,   0,  25,  25,  25, -100, -25, -50,   0, -100],
  '聖':     [  0,   0,   0,   0,   0,   0, -100,  25,   0,  50],
  '闇':     [  0,   0,   0,   0,   0, -50,  25, -100,   0, -100],
  '念':     [-75,   0,   0,   0,   0,   0, -25, -25,  25,   0],
  '不死':   [  0,   0,   0,   0,   0, -50,   0, -100,   0, -100],
}

// 攻撃属性・攻撃Lvと防御（鎧）属性から被ダメ倍率（%）を返す。
// テーブル値に 100 を加えることで「差分 → 倍率%」に変換する。
// 攻撃属性または防御属性が不明な場合は等倍（100）を返す。
// _attackLv は Lv1 のみ存在するため現在は使用しない（将来拡張のために引数を残す）。
export function getElemMod(attackElem: string, _attackLv: number, armorElem: string): number {
  const row = ELEM_TABLE_DATA[attackElem]
  // 攻撃属性がテーブルに存在しない場合は等倍
  if (!row) return 100
  const col = ELEM_ARMOR_COLS.indexOf(armorElem as typeof ELEM_ARMOR_COLS[number])
  // 防御属性が列一覧に存在しない場合は等倍
  if (col === -1) return 100
  // 差分値に 100 を加えて被ダメ倍率%に変換する
  return row[col] + 100
}

// ── 属性定数 ──────────────────────────────────────────────────────────────────
// 攻撃属性の選択肢。計算式ビルダーの「攻撃属性」セレクタに使用する。
export const ELEMENT_OPTIONS = ['無属性', '火', '水', '地', '風', '毒', '聖', '闇', '念', '不死']

// 属性耐性%フィールドの定義リスト。
// key = PlayerStats のフィールド名、label = 全角表示名、jp = 短縮表示名（属性相性表に使用）。
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
// 計算式ビルダーの変数パレットに表示する1変数の定義型
export interface FormulaVarDef {
  key: string     // resolveFormulaValues が返すオブジェクトのキー名
  label: string   // ユーザー向け表示名（トークンチップや結果パネルに表示）
  group: string   // 変数パレットのグループタブ名（FORMULA_VAR_GROUPS の値と一致）
  desc?: string   // 追加説明（ツールチップや説明文に使用）
}

// 変数パレットのグループタブ一覧。順序がタブの表示順に対応する。
export const FORMULA_VAR_GROUPS = ['敵ステータス', 'プレイヤーステータス', '耐性%', '属性耐性%', '鎧相性'] as const
export type FormulaVarGroup = typeof FORMULA_VAR_GROUPS[number]

// 計算式ビルダーで使用できる全変数の定義一覧。
// resolveFormulaValues が返すキーと 1:1 で対応しており、
// 変数トークンをクリックすると varKey にここの key が格納される。
export const FORMULA_VARS: FormulaVarDef[] = [
  // 敵ステータス — 敵ステータス入力フォームの値をそのまま参照
  { key: 'ATK',  label: '敵ATK',  group: '敵ステータス', desc: '敵の物理攻撃力' },
  { key: 'MATK', label: '敵MATK', group: '敵ステータス', desc: '敵の魔法攻撃力' },
  { key: 'STR',  label: '敵STR',  group: '敵ステータス', desc: '敵のSTR' },
  { key: 'INT',  label: '敵INT',  group: '敵ステータス', desc: '敵のINT' },
  { key: 'LUK',  label: '敵LUK',  group: '敵ステータス', desc: '敵のLUK' },
  // プレイヤーステータス — 入力値または jRO 公式計算式から導出した係数
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
  // 耐性% — プレイヤーが入力するパーセント値をそのまま渡す
  { key: 'RACE_RES',   label: '種族耐性%',   group: '耐性%' },
  { key: 'BOSS_RES',   label: 'ボス耐性%',   group: '耐性%' },
  { key: 'RANGED_RES', label: '遠距離耐性%', group: '耐性%' },
  // 属性耐性% — 属性別耐性の入力値をそのまま渡す
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
  // 鎧相性 — getElemMod で計算した被ダメ倍率%
  // ARMOR_MOD は攻撃属性セレクタの選択値に連動する動的変数
  { key: 'ARMOR_MOD',         label: '鎧相性',      group: '鎧相性', desc: '攻撃属性セレクタに連動 vs 鎧属性' },
  // 属性固定の鎧相性変数（攻撃属性セレクタに関係なく常に同じ属性で計算）
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
// 組み込みテンプレートの ID 生成カウンタ。モジュールロード時に 0 から採番する。
let _tid = 0
// 組み込みテンプレート専用の連番 ID を発行する
function tid(): string { return `bt${++_tid}` }

// トークン定義の配列から FormulaToken[] を生成するヘルパー。
// テンプレートの tokens を手書きせずに簡潔な配列記法で記述できる。
// 各要素は ['op', 演算子文字列] | ['var', 変数キー] | ['num', 数値] のいずれか。
function mkTokens(defs: Array<['op', string] | ['var', string] | ['num', number]>): FormulaToken[] {
  return defs.map(d => {
    const id = tid()
    if (d[0] === 'op')  return { id, type: 'op'  as const, opValue:  d[1] }
    if (d[0] === 'var') return { id, type: 'var' as const, varKey:   d[1] }
    return                     { id, type: 'num' as const, numValue: d[1] }
  })
}

// 組み込みスキルテンプレート一覧。
// isBuiltin=true のものはユーザーが削除できず常にドロップダウンに表示される。
export const FORMULA_TEMPLATES: FormulaConfig[] = [
  {
    // アースクエイク: 無属性魔法、遠距離耐性のみ受ける
    // 式: MATK × 7.5 × 鎧相性[無] ÷ 100 × (100 - 遠距離耐性%) ÷ 100
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
    // テトラボルテックス①: 無属性魔法攻撃（無属性耐性あり）
    // 式: MATK × 25 × 鎧相性[無] ÷ 100
    //     × (100-無属性耐性%) ÷ 100 × (100-種族耐性%) ÷ 100 × (100-ボス耐性%) ÷ 100
    //     × Mres係数 × 除算MDEF係数 - 減算MDEF
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
    // テトラボルテックス②: 地属性魔法攻撃（属性耐性を受けない仕様）
    // 式: MATK × 25 × 鎧相性[地] ÷ 100
    //     × (100-種族耐性%) ÷ 100 × (100-ボス耐性%) ÷ 100
    //     × Mres係数 × 除算MDEF係数 - 減算MDEF
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
// 「敵テンプレート」ドロップダウンに表示する既知モンスターのステータス定義型
export interface EnemyPreset {
  id: string
  name: string
  atk: number
  matk: number
  str: number
  int: number
  luk: number
}

// 敵プリセット一覧。「適用」ボタンで敵ステータス入力欄に一括反映される。
export const ENEMY_PRESETS: EnemyPreset[] = [
  { id: 'betelgeuse',  name: 'ベテルギウス',                atk: 130000, matk: 520000, str: 0, int: 0, luk: 0 },
  { id: 'demi_freyja', name: 'デミフレイヤ',                atk: 130000, matk: 130000, str: 0, int: 0, luk: 0 },
  { id: 'rigel_2star', name: '次元犯罪者リゲル（★★）',     atk: 70000,  matk: 400000, str: 0, int: 0, luk: 0 },
  { id: 'rigel_3star', name: '次元犯罪者リゲル（★★★）',   atk: 150000, matk: 800000, str: 0, int: 0, luk: 0 },
  { id: 'rigel_4star', name: '次元犯罪者リゲル（★★★★）', atk: 150000, matk: 800000, str: 0, int: 0, luk: 0 },
]
