import type { AppSaveData, PlayerStats, EnemyInput } from './types'

// ── ストレージキー ──────────────────────────────────────────────────────────────
// バージョン番号をキー名に含めることで、スキーマ変更時に古いデータを無視する
const STORAGE_KEY = 'ro_calc_v11'

// ── プレイヤーステータスの初期値 ────────────────────────────────────────────────
// 「リセット」ボタンや初回起動時に使用するデフォルト値
// bossRes=85 は jRO 標準的なボス耐性値として設定
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

// ── 敵ステータスの初期値 ────────────────────────────────────────────────────────
// 敵プリセット未選択時のデフォルト値（ベテルギウス相当）
export const DEFAULT_ENEMY_INPUT: EnemyInput = {
  atk: 130000,
  matk: 520000,
  str: 0,
  int: 0,
  luk: 0,
}

// ── アプリ保存データの初期値 ────────────────────────────────────────────────────
// localStorage にデータがない場合や、バージョン不一致時のフォールバック値
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

// ── データ読み込み ──────────────────────────────────────────────────────────────
// localStorage から保存済みデータを取得して AppSaveData 型に変換して返す。
// キーが存在しない・JSON 解析失敗・型不一致はすべてデフォルト値にフォールバックする。
// スプレッド構文でデフォルトとマージすることで、バージョンアップ時に追加した
// 新フィールドが undefined にならないよう保護している。
export function loadData(): AppSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // データなし → デフォルト値を返す
    if (!raw) return { ...DEFAULT_SAVE_DATA, playerStats: { ...DEFAULT_PLAYER_STATS }, enemyInput: { ...DEFAULT_ENEMY_INPUT } }
    const p = JSON.parse(raw)
    // デフォルトとマージして未知フィールドを補完する
    return {
      ...DEFAULT_SAVE_DATA,
      ...p,
      playerStats: { ...DEFAULT_PLAYER_STATS, ...p.playerStats },
      enemyInput: { ...DEFAULT_ENEMY_INPUT, ...p.enemyInput },
      // 配列でない場合は空配列に置き換えて壊れたデータを防ぐ
      customFormulas: Array.isArray(p.customFormulas) ? p.customFormulas : [],
      activeFormulaTokens: Array.isArray(p.activeFormulaTokens) ? p.activeFormulaTokens : [],
    }
  } catch {
    // JSON 解析エラーなどで例外が発生した場合はデフォルト値を返す
    return { ...DEFAULT_SAVE_DATA, playerStats: { ...DEFAULT_PLAYER_STATS }, enemyInput: { ...DEFAULT_ENEMY_INPUT } }
  }
}

// ── データ自動保存 ──────────────────────────────────────────────────────────────
// App の useEffect から毎回呼ばれ、state が変わるたびに localStorage を上書きする。
// version を常に最新値で上書きすることでスキーマバージョンを最新に保つ。
export function saveData(data: AppSaveData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 11 }))
}

// ── JSON ファイルエクスポート ────────────────────────────────────────────────────
// 現在の全データを整形済み JSON ファイルとしてブラウザにダウンロードさせる。
// Blob → ObjectURL → 仮 <a> タグのクリック → URL 解放 の手順で実装する。
export function exportData(data: AppSaveData): void {
  const json = JSON.stringify({ ...data, version: 11 }, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  // DOM に一時的に <a> タグを追加してクリックしダウンロードを起動する
  const a = document.createElement('a')
  a.href = url
  a.download = `ro-calc-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // ObjectURL はメモリリークを防ぐため即座に解放する
  URL.revokeObjectURL(url)
}

// ── JSON ファイルインポート ──────────────────────────────────────────────────────
// ユーザーが選択した JSON ファイルを FileReader で読み込み、
// デフォルト値とマージして型安全な AppSaveData に変換して返す Promise。
// 読み込み失敗・JSON 解析失敗は reject で伝播する。
export function importData(file: File): Promise<AppSaveData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const p = JSON.parse(e.target?.result as string)
        // loadData と同じマージ戦略でデフォルト値を補完する
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
