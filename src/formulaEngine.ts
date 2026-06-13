import type { PlayerStats, EnemyInput, FormulaToken, FormulaConfig, FormulaEvalResult } from './types'
import { FORMULA_VARS, getElemMod } from './data'

// ── 変数値の解決 ───────────────────────────────────────────────────────────────
// 計算式トークンで使用できるすべての変数キーに対して現在の数値を計算し、
// キー→数値のマップとして返す。
// このマップが計算式評価・変数パレット表示・値代入文字列生成に共通して使われる。
export function resolveFormulaValues(stats: PlayerStats, enemy: EnemyInput, attackElement = '無属性'): Record<string, number> {
  // アスムプティオが有効な場合は装備DEF/MDEFを×2にする
  const eDef  = stats.assumptioActive ? stats.equipDef  * 2 : stats.equipDef
  const eMdef = stats.assumptioActive ? stats.equipMdef * 2 : stats.equipMdef
  return {
    // ── 敵ステータス（入力値をそのまま渡す） ──
    ATK:  enemy.atk,
    MATK: enemy.matk,
    STR:  enemy.str,
    INT:  enemy.int,
    LUK:  enemy.luk,

    // ── プレイヤーステータス（入力値） ──
    STATUS_DEF:  stats.statusDef,
    STATUS_MDEF: stats.statusMdef,
    EQUIP_DEF:   eDef,
    EQUIP_MDEF:  eMdef,

    // ── 除算DEF係数: (4000 + DEF) / (4000 + DEF × 10), 下限 10% ──
    // jRO 公式の物理除算防御計算式。DEFが大きいほど被ダメが小さくなる。
    HARD_DEF_FACTOR:  Math.max(0.10, (4000 + eDef)  / (4000 + eDef  * 10)),

    // ── 除算MDEF係数: (1000 + MDEF) / (1000 + MDEF × 10), 下限 10% ──
    // jRO 公式の魔法除算防御計算式。物理と分母の定数が異なる（4000 vs 1000）。
    HARD_MDEF_FACTOR: Math.max(0.10, (1000 + eMdef) / (1000 + eMdef * 10)),

    // ── Res/Mres 生値 ──
    RES:  stats.res,
    MRES: stats.mres,

    // ── Res 係数: (2000 + Res) / (2000 + Res × 5) ──
    // jRO 公式の物理軽減係数計算式
    RES_FACTOR: (2000 + stats.res) / (2000 + stats.res * 5),

    // ── Mres 係数: (2000 + Mres) / (2000 + Mres × 5) ──
    // mresIgnored フラグが true の場合は係数を強制的に 1（無軽減）にする
    MRES_FACTOR: stats.mresIgnored ? 1 : (2000 + stats.mres) / (2000 + stats.mres * 5),

    // ── 耐性% / 属性耐性%（入力値をそのまま渡す） ──
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

    // ── 鎧相性（攻撃属性 × 防御鎧属性 → 被ダメ倍率%） ──
    // ARMOR_MOD のみ攻撃属性セレクタの選択値に連動する動的変数
    ARMOR_MOD:         getElemMod(attackElement, 1, stats.armorElement),
    // 残りは攻撃属性固定（セレクタに関係なく常に指定属性で計算）
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

// ── 数値フォーマット（結果表示用） ─────────────────────────────────────────────
// 整数はカンマ区切り、極小値は指数表記、それ以外は小数点4桁で表示する。
// 「値代入後の計算式」文字列生成と変数パレットの表示に使用する。
function numFmt(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString()
  if (Math.abs(v) < 0.001) return v.toExponential(3)
  return v.toFixed(4)
}

// ── 計算式の文字列化 ───────────────────────────────────────────────────────────
// トークン列を人間が読める計算式文字列に変換する。
// values が指定された場合は変数を「ラベル[現在値]」形式に展開する（値代入表示用）。
// values が undefined の場合はラベル名のみで出力する（計算式ラベル表示用）。
export function formulaToStr(tokens: FormulaToken[], values?: Record<string, number>): string {
  // 内部演算子記号 → 表示用記号のマップ（* → ×、/ → ÷ など）
  const OP_SYM: Record<string, string> = { '*': '×', '/': '÷', '+': '+', '-': '-', '(': '(', ')': ')' }
  return tokens.map(t => {
    if (t.type === 'op')  return OP_SYM[t.opValue!] ?? t.opValue ?? '?'
    if (t.type === 'num') return String(t.numValue ?? 0)
    if (t.type === 'var') {
      // 変数キーから FORMULA_VARS の定義を検索して表示ラベルを取得する
      const def = FORMULA_VARS.find(v => v.key === t.varKey)
      const lbl = def?.label ?? t.varKey ?? '?'
      if (values) {
        // values が渡された場合は「ラベル[数値]」形式で現在値も表示する
        const v = values[t.varKey!]
        return `${lbl}[${numFmt(v ?? 0)}]`
      }
      return lbl
    }
    return '?'
  }).join(' ')
}

// ── 計算式の安全な評価 ────────────────────────────────────────────────────────
// トークン列を JavaScript 式文字列に変換し new Function() で評価する。
// グローバルスコープへのアクセスを "use strict" で制限することでセキュリティリスクを最小化する。
// トークンは事前に number か演算子のみに変換されているため任意コード実行のリスクはない。
function safeEval(tokens: FormulaToken[], values: Record<string, number>): { result: number; error?: string } {
  // トークンがなければ結果 0 を返す
  if (tokens.length === 0) return { result: 0 }
  // トークンを JS 評価可能な文字列に変換（変数は数値文字列に置換）
  const expr = tokens.map(t => {
    if (t.type === 'op')  return t.opValue
    if (t.type === 'num') return String(t.numValue ?? 0)
    if (t.type === 'var') return String(values[t.varKey!] ?? 0)
    return '0'
  }).join(' ')
  try {
    // eslint-disable-next-line no-new-func
    const r = new Function(`"use strict"; return (${expr})`)()
    // Infinity や NaN など無効な計算結果をエラーとして扱う
    if (typeof r !== 'number' || !isFinite(r)) return { result: 0, error: '計算結果が無効です' }
    return { result: r }
  } catch {
    // 括弧の不対応などで構文エラーになった場合
    return { result: 0, error: '計算式にエラーがあります（括弧の対応を確認してください）' }
  }
}

// ── 計算式の完全評価 ──────────────────────────────────────────────────────────
// 計算式設定・プレイヤーステータス・敵ステータス・攻撃属性を受け取り、
// 計算の全ステップ（式文字列・変数値・途中結果・特殊状態適用・最終値）を返す。
// 結果パネル (FormulaResultDisplay) がこの戻り値を直接表示する。
export function evaluateFormulaFull(
  formula: FormulaConfig,
  stats: PlayerStats,
  enemy: EnemyInput,
  attackElement = '無属性'
): FormulaEvalResult {
  // 全変数の現在値を解決する
  const values = resolveFormulaValues(stats, enemy, attackElement)
  // 変数ラベルで表示した計算式文字列（パネルの「計算式」欄）
  const formulaStr = formulaToStr(formula.tokens)
  // 変数を現在値に置換した計算式文字列（パネルの「値代入」欄）
  const substitutedStr = formulaToStr(formula.tokens, values)

  // 計算式中で使用している変数キーを重複なく抽出し、ラベルと現在値を付与する
  const usedKeys = new Set(formula.tokens.filter(t => t.type === 'var').map(t => t.varKey!))
  const varValues = [...usedKeys].map(key => {
    const def = FORMULA_VARS.find(v => v.key === key)
    return { key, label: def?.label ?? key, value: values[key] ?? 0 }
  })

  // 計算式本体を評価して特殊状態適用前の生ダメージを得る
  const { result: baseResult, error } = safeEval(formula.tokens, values)

  // ── 特殊状態による後処理倍率の収集 ──
  // 各特殊状態が有効かチェックし、適用する倍率とラベルを配列に積む
  const stateFactors: Array<{ label: string; factor: number }> = []
  if (stats.kongouActive)
    stateFactors.push({ label: '金剛 ×0.10', factor: 0.10 })
  if (stats.crouchActive)
    stateFactors.push({ label: 'うずくまる ×0.20', factor: 0.20 })
  if (stats.ironHowlingActive)
    stateFactors.push({ label: 'アイアンハウリング ×0.60', factor: 0.60 })
  if (stats.energyCoatLevel > 0) {
    // エナジーコートはレベルに応じて 10%/20%/30% 軽減
    const f = 1 - stats.energyCoatLevel * 0.10
    stateFactors.push({ label: `エナジーコート ×${f.toFixed(2)}`, factor: f })
  }
  if (stats.stoneSkinActive) {
    // ストーンスキンは物理攻撃を軽減し、魔法攻撃を増幅する（式の種類依存）
    const f    = formula.damageType === 'physical' ? 0.80 : 1.20
    const sign = formula.damageType === 'physical' ? '物理 ×0.80' : '魔法 ×1.20'
    stateFactors.push({ label: `ストーンスキン(${sign})`, factor: f })
  }

  // 全特殊状態倍率を掛け合わせた総合倍率を計算する
  const totalFactor = stateFactors.reduce((acc, s) => acc * s.factor, 1)
  const finalResult = baseResult * totalFactor
  // 小数切り捨て・最小0でヒットあたりダメージを確定する
  const perHit = Math.max(0, Math.floor(finalResult))

  return { formulaStr, substitutedStr, varValues, baseResult, stateFactors, finalResult, perHit, error }
}

// ── ユニークID発行 ─────────────────────────────────────────────────────────────
// トークン・カスタム計算式の id フィールド用に一意な文字列を生成する。
// タイムスタンプをシードにしてモジュールロード後もユニーク性を保つ。
let _uid = Date.now()
export function newId(): string { return `u${++_uid}` }

// ── トークン列の複製 ──────────────────────────────────────────────────────────
// テンプレートを「適用」する際に各トークンに新しい ID を割り当てて複製する。
// 元のトークン列を直接使いまわすと ID が重複して React のキーエラーになるため。
export function cloneTokens(tokens: FormulaToken[]): FormulaToken[] {
  return tokens.map(t => ({ ...t, id: newId() }))
}
