// ── プレイヤーステータス ────────────────────────────────────────────────────────
// 画面パネル1・2で入力するプレイヤー側の防御・耐性・特殊状態を一括管理する型
export interface PlayerStats {
  statusDef: number       // 減算DEF（被ダメから直接引く固定値）
  statusMdef: number      // 減算MDEF（被魔法ダメから直接引く固定値）
  equipDef: number        // 除算DEF（装備由来。アスムプティオ時は×2）
  equipMdef: number       // 除算MDEF（装備由来。アスムプティオ時は×2）
  res: number             // Res（物理軽減に使うROステータス値）
  mres: number            // Mres（魔法軽減に使うROステータス値）
  raceRes: number         // 種族耐性%（モンスター種族による軽減率）
  rangedRes: number       // 遠距離耐性%（遠距離攻撃への軽減率）
  neutralRes: number      // 無属性耐性%
  fireRes: number         // 火属性耐性%
  waterRes: number        // 水属性耐性%
  earthRes: number        // 地属性耐性%
  windRes: number         // 風属性耐性%
  poisonRes: number       // 毒属性耐性%
  holyRes: number         // 聖属性耐性%
  shadowRes: number       // 闇属性耐性%
  ghostRes: number        // 念属性耐性%
  undeadRes: number       // 不死属性耐性%
  bossRes: number         // ボス耐性%（ボスモンスターからの攻撃軽減）
  kongouActive: boolean           // 金剛状態（全ダメージ ×0.10）
  crouchActive: boolean           // うずくまる状態（全ダメージ ×0.20）
  ironHowlingActive: boolean      // アイアンハウリング（全ダメージ ×0.60）
  stoneSkinActive: boolean        // ストーンスキン（物理×0.80 / 魔法×1.20）
  assumptioActive: boolean        // アスムプティオ（装備DEF/MDEF を×2）
  energyCoatLevel: number         // エナジーコートレベル（1〜3、0=OFF。Lv×10%軽減）
  armorElement: string            // プレイヤーの鎧属性（属性相性表の防御側）
  mresIgnored: boolean            // Mres 100%無視フラグ（Mres係数を強制的に1にする）
}

// ── 敵ステータス入力 ────────────────────────────────────────────────────────────
// 画面パネル3の「敵ステータス入力」フォームに対応する型
export interface EnemyInput {
  atk: number   // 敵の物理攻撃力
  matk: number  // 敵の魔法攻撃力
  str: number   // 敵のSTR（一部計算式で使用）
  int: number   // 敵のINT（一部計算式で使用）
  luk: number   // 敵のLUK（一部計算式で使用）
}

// ── 計算式トークン ───────────────────────────────────────────────────────────────
// 計算式フィールドに並ぶ1つのピース（演算子・変数・数値のいずれか）を表す型
export interface FormulaToken {
  id: string          // 各トークンを一意に識別するID（順序操作・削除に使用）
  type: 'op' | 'var' | 'num'  // トークン種別: op=演算子、var=変数、num=数値リテラル
  opValue?: string    // type='op' のとき使用（'+', '-', '*', '/', '(', ')'）
  varKey?: string     // type='var' のとき使用（FORMULA_VARS の key と対応）
  numValue?: number   // type='num' のとき使用（入力した数値リテラル）
}

// ── 計算式設定 ──────────────────────────────────────────────────────────────────
// 1つの攻撃スキル計算式（テンプレートや保存済み式）を表す型
export interface FormulaConfig {
  id: string                      // 計算式を一意に識別するID
  name: string                    // 表示名・テンプレートドロップダウンに表示
  tokens: FormulaToken[]          // 計算式を構成するトークン列
  damageType: 'physical' | 'magic' // 物理か魔法か（ストーンスキン適用の判定に使用）
  isBuiltin?: boolean             // 組み込みテンプレートなら true（削除不可）
}

// ── アプリ全体の保存データ ──────────────────────────────────────────────────────
// localStorage / JSON エクスポートで永続化するすべての状態をまとめた型
export interface AppSaveData {
  version: number                           // データスキーマのバージョン番号
  playerStats: PlayerStats                  // プレイヤーステータス一式
  enemyInput: EnemyInput                    // 敵ステータス入力値
  customFormulas: FormulaConfig[]           // ユーザーが保存した計算式一覧
  activeFormulaTokens: FormulaToken[]       // 現在編集中の計算式トークン列
  activeFormulaDamageType: 'physical' | 'magic' // 現在の式の種類（物理/魔法）
  activeFormulaAttackElement: string        // 現在選択中の攻撃属性（ARMOR_MOD の参照先）
  activeFormulaName: string                 // 現在の計算式名
}

// ── 計算式評価結果 ──────────────────────────────────────────────────────────────
// evaluateFormulaFull が返す、計算の全ステップを含む結果型
export interface FormulaEvalResult {
  formulaStr: string          // 変数名ラベルで表示した計算式文字列
  substitutedStr: string      // 変数を実際の数値に置換した計算式文字列
  varValues: Array<{ key: string; label: string; value: number }> // 使用変数の現在値一覧
  baseResult: number          // 特殊状態適用前の生計算結果
  stateFactors: Array<{ label: string; factor: number }>  // 適用された特殊状態と倍率
  finalResult: number         // 特殊状態倍率をすべて掛けた最終値
  perHit: number              // floor(max(0, finalResult)) — 1ヒット被ダメージ表示値
  error?: string              // 計算式にエラーがあった場合のメッセージ
}
