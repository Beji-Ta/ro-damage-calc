import { useState, useEffect, useCallback, useRef } from 'react'
import type { PlayerStats, EnemyInput, FormulaToken, FormulaConfig } from './types'
import {
  FORMULA_VARS, FORMULA_TEMPLATES, ENEMY_PRESETS,
  FORMULA_VAR_GROUPS, type FormulaVarGroup,
  ELEMENT_LABELS, ELEMENT_OPTIONS,
} from './data'
import {
  DEFAULT_PLAYER_STATS, DEFAULT_ENEMY_INPUT,
  loadData, saveData, exportData, importData,
} from './storage'
import { evaluateFormulaFull, resolveFormulaValues, cloneTokens, newId } from './formulaEngine'

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => loadData().playerStats)
  const [enemyInput, setEnemyInput]   = useState<EnemyInput>(() => loadData().enemyInput)
  const [customFormulas, setCustomFormulas] = useState<FormulaConfig[]>(() => loadData().customFormulas)
  const [activeTokens, setActiveTokens]     = useState<FormulaToken[]>(() => loadData().activeFormulaTokens)
  const [activeDmgType, setActiveDmgType]   = useState<'physical'|'magic'>(() => loadData().activeFormulaDamageType)
  const [activeFormName, setActiveFormName] = useState<string>(() => loadData().activeFormulaName)
  const [importErr, setImportErr] = useState<string>('')
  const importRef = useRef<HTMLInputElement>(null)

  // auto-save
  useEffect(() => {
    saveData({ version:11, playerStats, enemyInput, customFormulas,
      activeFormulaTokens: activeTokens, activeFormulaDamageType: activeDmgType, activeFormulaName: activeFormName })
  }, [playerStats, enemyInput, customFormulas, activeTokens, activeDmgType, activeFormName])

  const setNum = useCallback((key: keyof PlayerStats, raw: string) => {
    const n = raw === '' ? 0 : parseInt(raw, 10)
    if (!isNaN(n)) setPlayerStats(p => ({ ...p, [key]: n }))
  }, [])
  const setStr = useCallback((key: keyof PlayerStats, v: string) => {
    setPlayerStats(p => ({ ...p, [key]: v }))
  }, [])
  const toggle = useCallback((key: keyof PlayerStats) => {
    setPlayerStats(p => ({ ...p, [key]: !p[key] }))
  }, [])
  const setEnemyNum = useCallback((key: keyof EnemyInput, raw: string) => {
    const n = raw === '' ? 0 : parseInt(raw, 10)
    if (!isNaN(n)) setEnemyInput(p => ({ ...p, [key]: n }))
  }, [])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const d = await importData(file)
      setPlayerStats(d.playerStats)
      setEnemyInput(d.enemyInput)
      setCustomFormulas(d.customFormulas)
      setActiveTokens(d.activeFormulaTokens)
      setActiveDmgType(d.activeFormulaDamageType)
      setActiveFormName(d.activeFormulaName)
      setImportErr('')
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : 'インポート失敗')
    }
    if (importRef.current) importRef.current.value = ''
  }

  const handleSaveFormula = (name: string) => {
    if (!name.trim()) return
    const cfg: FormulaConfig = {
      id: newId(), name: name.trim(),
      tokens: cloneTokens(activeTokens),
      damageType: activeDmgType,
    }
    setCustomFormulas(prev => [...prev, cfg])
  }
  const handleDeleteCustomFormula = (id: string) => {
    setCustomFormulas(prev => prev.filter(f => f.id !== id))
  }

  const activeFormula: FormulaConfig = {
    id: 'active', name: activeFormName, tokens: activeTokens, damageType: activeDmgType
  }
  const evalResult = activeTokens.length > 0
    ? evaluateFormulaFull(activeFormula, playerStats, enemyInput)
    : null

  const defPct  = (1 - Math.max(0.10, (4000 + playerStats.equipDef)  / (4000 + playerStats.equipDef  * 10))) * 100
  const mdefPct = (1 - Math.max(0.10, (1000 + playerStats.equipMdef) / (1000 + playerStats.equipMdef * 10))) * 100
  const resPct  = (1 - (2000 + playerStats.res)  / (2000 + playerStats.res  * 5)) * 100
  const mresPct = (1 - (2000 + playerStats.mres) / (2000 + playerStats.mres * 5)) * 100

  // pre-compute all variable values (for palette display + formula evaluation)
  const paletteValues = resolveFormulaValues(playerStats, enemyInput)

  return (
    <div style={S.root}>

      {/* ── ヘッダー ── */}
      <header style={S.header}>
        <div style={S.roFrame}>
          <div style={S.roDecoRow}>⚔ ✦ ✦ ✦ ⚔</div>
          <h1 style={S.title}>
            <span style={S.titleRo}>Ragnarok Online</span>
            <span style={S.titleMain}>被ダメージ計算機</span>
          </h1>
          <p style={S.roTagline}>― jRO仕様 / モンスターから受ける被害のシミュレーション ―</p>
        </div>
        <div style={S.celebBanner}>
          <span style={S.celebText}>
            ⚔ Prontera ✦ Morroc ✦ Geffen ✦ Payon ✦ Alberta ✦ Izlude ✦ Aldebaran ✦ Lutie ✦ Juno ✦ Einbroch ✦ Lighthalzen ✦ Rachel ✦ Veins ✦ Hugel ⚔
          </span>
        </div>
      </header>

      {/* ── セーブ／ロードバー ── */}
      <div style={S.saveBar}>
        <span style={S.saveBarTitle}>💾 データ管理</span>
        <button style={{...S.saveBtn, background: C.blue}}
          onClick={() => exportData({ version:11, playerStats, enemyInput, customFormulas,
            activeFormulaTokens: activeTokens, activeFormulaDamageType: activeDmgType, activeFormulaName: activeFormName })}>
          エクスポート (JSON)
        </button>
        <button style={{...S.saveBtn, background: C.green}} onClick={() => importRef.current?.click()}>
          インポート (JSON)
        </button>
        <input ref={importRef} type="file" accept=".json,application/json"
          style={{ display:'none' }} onChange={handleImport} />
        <button style={{...S.saveBtn, background: C.danger}}
          onClick={() => { if (confirm('全設定をリセットしますか？')) {
            setPlayerStats({...DEFAULT_PLAYER_STATS})
            setEnemyInput({...DEFAULT_ENEMY_INPUT})
          }}}>
          全リセット
        </button>
        {importErr && <span style={{ color: C.danger, fontSize:'0.75rem' }}>{importErr}</span>}
        <span style={S.autoSaveNote}>✓ 自動保存中</span>
      </div>

      <main style={S.main}>

        {/* ══ パネル1: プレイヤーステータス ══ */}
        <section style={S.panel}>
          <PanelHeader icon="🛡️" title="プレイヤーステータス" color={C.blue}>
            <button style={S.resetBtn} onClick={() => setPlayerStats({...DEFAULT_PLAYER_STATS})}>リセット</button>
          </PanelHeader>

          <SectionLabel color={C.blue}>減算防御</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="減算DEF"  value={playerStats.statusDef}  min={0} max={99999} onChange={v=>setNum('statusDef',v)}  color={C.blue} />
            <NumField label="減算MDEF" value={playerStats.statusMdef} min={0} max={99999} onChange={v=>setNum('statusMdef',v)} color={C.purple} />
          </div>

          <SectionLabel color={C.blue}>装備 除算DEF / MDEF</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="装備除算DEF"  value={playerStats.equipDef}  min={0} max={9999} onChange={v=>setNum('equipDef',v)}  color={C.blue} />
            <NumField label="装備除算MDEF" value={playerStats.equipMdef} min={0} max={9999} onChange={v=>setNum('equipMdef',v)} color={C.purple} />
          </div>
          <div style={S.derivedRow}>
            <DerivedStat label="物理 除算軽減率" value={`${defPct.toFixed(1)}%`}  color={C.orange} />
            <DerivedStat label="魔法 除算軽減率" value={`${mdefPct.toFixed(1)}%`} color={C.purple} />
          </div>

          <SectionLabel color={C.blue}>特殊ステータス (Res / Mres)</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="Res (物理軽減)"  value={playerStats.res}  min={-400} max={500} onChange={v=>setNum('res',v)}  color={C.orange} />
            <NumField label="Mres (魔法軽減)" value={playerStats.mres} min={-400} max={500} onChange={v=>setNum('mres',v)} color={C.purple} />
          </div>
          <div style={S.derivedRow}>
            <DerivedStat label="Res 軽減率"  value={`${resPct.toFixed(1)}%`}  color={C.orange} />
            <DerivedStat label="Mres 軽減率" value={`${mresPct.toFixed(1)}%`} color={C.purple} />
          </div>
          <p style={{...S.saveNote, fontSize:'0.72rem', color:C.textMuted}}>
            ※ (2000+val)/(2000+val×5) で換算 (上限80%カット)
          </p>
          <p style={S.saveNote}>※ 入力値はブラウザに自動保存されます</p>
        </section>

        {/* ══ パネル2: 耐性設定 ══ */}
        <section style={S.panel}>
          <PanelHeader icon="⚙️" title="耐性設定" color={C.green} />

          <SectionLabel color={C.green}>種族・ボス・遠距離耐性 (%)</SectionLabel>
          <div style={S.statsGrid}>
            <NumField label="種族耐性 %"   value={playerStats.raceRes}   min={-100} max={100} onChange={v=>setNum('raceRes',v)}   color={C.green} />
            <NumField label="ボス耐性 %"   value={playerStats.bossRes}   min={-100} max={100} onChange={v=>setNum('bossRes',v)}   color={C.green} />
            <NumField label="遠距離耐性 %" value={playerStats.rangedRes} min={-100} max={100} onChange={v=>setNum('rangedRes',v)} color={C.green} />
          </div>

          <SectionLabel color={C.green}>鎧属性</SectionLabel>
          <SelectField label="鎧属性" value={playerStats.armorElement}
            options={ELEMENT_OPTIONS} onChange={v=>setStr('armorElement',v)} color={C.green} />

          <SectionLabel color={C.green}>属性耐性 (%) — 属性別</SectionLabel>
          <div style={S.elementGrid}>
            {ELEMENT_LABELS.map(({key, label, jp}) => (
              <NumField key={key} label={`${jp}(${label})`}
                value={playerStats[key as keyof PlayerStats] as number}
                min={-200} max={95}
                onChange={v=>setNum(key as keyof PlayerStats, v)}
                color={C.teal} />
            ))}
          </div>
        </section>

        {/* ══ パネル3: 特殊設定・敵選択・計算式 ══ */}
        <section style={S.panel}>
          <PanelHeader icon="🌟" title="特殊設定・敵選択・計算式" color={C.gold} />

          {/* 特殊状態 */}
          <SectionLabel color={C.gold}>特殊状態</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <ToggleRow label="金剛状態"             description="全ダメージ 90% カット (×0.10) ※計算式後に自動適用"
              active={playerStats.kongouActive}      onToggle={()=>toggle('kongouActive')}      activeColor={C.gold} />
            <ToggleRow label="うずくまる状態"        description="全ダメージ 80% カット (×0.20) ※計算式後に自動適用"
              active={playerStats.crouchActive}      onToggle={()=>toggle('crouchActive')}      activeColor={C.gold} />
            <ToggleRow label="アイアンハウリング状態" description="全ダメージ 40% カット (×0.60) ※計算式後に自動適用"
              active={playerStats.ironHowlingActive} onToggle={()=>toggle('ironHowlingActive')} activeColor={C.gold} />
            <ToggleRow label="ストーンスキン状態"    description="物理×0.80 / 魔法×1.20 ※計算式後に自動適用（式の種類に応じて）"
              active={playerStats.stoneSkinActive}   onToggle={()=>toggle('stoneSkinActive')}   activeColor={C.teal} />
            <ToggleRow label="アスムプティオ状態"    description="装備DEF・装備MDEF が 2倍 ※計算式内の 装備DEF(※)・装備MDEF(※) 変数に自動反映"
              active={playerStats.assumptioActive}   onToggle={()=>toggle('assumptioActive')}   activeColor={C.blue} />
            <StepToggleRow label="エナジーコート" description="SP残量によるダメージカット ※計算式後に自動適用"
              level={playerStats.energyCoatLevel}
              steps={[{label:'10%',value:1},{label:'20%',value:2},{label:'30%',value:3}]}
              onStep={v=>setPlayerStats(p=>({...p,energyCoatLevel:v}))} activeColor={C.blue} />
          </div>

          <SectionLabel color={C.gold}>特殊トグル</SectionLabel>
          <ToggleRow label="Mres 100% 無視"
            description="プレイヤーのMresによる魔法軽減が無効化（Mres係数=1になる）"
            active={playerStats.mresIgnored} onToggle={()=>toggle('mresIgnored')} activeColor={C.danger} />

          {/* 敵ステータス入力 */}
          <div style={{ marginTop:'28px' }}>
            <PanelHeader icon="☠️" title="敵ステータス入力" color={C.red} />
            <div style={S.statsGrid}>
              <NumField label="ATK"  value={enemyInput.atk}  min={0} max={9999999} onChange={v=>setEnemyNum('atk',v)}  color={C.orange} />
              <NumField label="MATK" value={enemyInput.matk} min={0} max={9999999} onChange={v=>setEnemyNum('matk',v)} color={C.purple} />
              <NumField label="STR"  value={enemyInput.str}  min={0} max={9999}    onChange={v=>setEnemyNum('str',v)}  color={C.red} />
              <NumField label="INT"  value={enemyInput.int}  min={0} max={9999}    onChange={v=>setEnemyNum('int',v)}  color={C.blue} />
              <NumField label="LUK"  value={enemyInput.luk}  min={0} max={9999}    onChange={v=>setEnemyNum('luk',v)}  color={C.green} />
            </div>
            <EnemyPresetSelector onApply={preset => setEnemyInput({
              atk: preset.atk, matk: preset.matk, str: preset.str, int: preset.int, luk: preset.luk
            })} />
          </div>

          {/* 計算式ビルダー */}
          <div style={{ marginTop:'24px' }}>
            <PanelHeader icon="⚗️" title="攻撃スキル計算式" color={C.purple} />
            <FormulaBuilder
              tokens={activeTokens}
              damageType={activeDmgType}
              formulaName={activeFormName}
              customFormulas={customFormulas}
              paletteValues={paletteValues}
              onTokensChange={setActiveTokens}
              onDamageTypeChange={setActiveDmgType}
              onFormulaNameChange={setActiveFormName}
              onSaveFormula={handleSaveFormula}
              onDeleteCustomFormula={handleDeleteCustomFormula}
            />
          </div>
        </section>

        {/* ══ パネル4: 被ダメージ計算結果 ══ */}
        <section style={{...S.panel, ...S.resultPanel}}>
          <PanelHeader icon="✨" title="被ダメージ計算結果" color={C.orange} />

          {activeTokens.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color: C.textMuted }}>
              <div style={{ fontSize:'2rem', marginBottom:'12px' }}>⚗️</div>
              <p style={{ fontSize:'0.95rem' }}>計算式を設定してください</p>
              <p style={{ fontSize:'0.78rem', marginTop:'8px' }}>パネル3でテンプレートを選択するか、手動で計算式を組み立ててください</p>
            </div>
          ) : evalResult ? (
            <FormulaResultDisplay
              result={evalResult}
              formulaName={activeFormName}
              damageType={activeDmgType}
              stats={playerStats}
            />
          ) : null}
        </section>

      </main>

      <footer style={S.footer}>
        <p>⚔️ jRO Damage Calculator — 計算式はjRO公式仕様に基づく近似値です ⚔️</p>
      </footer>
    </div>
  )
}

// ── EnemyPresetSelector ────────────────────────────────────────────────────────

function EnemyPresetSelector({ onApply }: { onApply: (p: typeof ENEMY_PRESETS[0]) => void }) {
  const [sel, setSel] = useState(ENEMY_PRESETS[0].id)
  const preset = ENEMY_PRESETS.find(p => p.id === sel) ?? ENEMY_PRESETS[0]
  return (
    <div style={{ marginTop:'12px', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
      <span style={{ fontSize:'0.72rem', color:C.textMuted, fontWeight:700 }}>敵テンプレート:</span>
      <div style={{ position:'relative', flex:1, minWidth:'180px' }}>
        <select style={{...S.select, padding:'6px 32px 6px 10px', fontSize:'0.82rem'}}
          value={sel} onChange={e=>setSel(e.target.value)}>
          {ENEMY_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span style={S.selectArrow}>▾</span>
      </div>
      <button style={{...S.applyBtn, background:C.red}} onClick={()=>onApply(preset)}>適用</button>
    </div>
  )
}

// ── FormulaBuilder ─────────────────────────────────────────────────────────────

interface FormulaBuilderProps {
  tokens: FormulaToken[]
  damageType: 'physical' | 'magic'
  formulaName: string
  customFormulas: FormulaConfig[]
  paletteValues: Record<string, number>
  onTokensChange: (t: FormulaToken[]) => void
  onDamageTypeChange: (t: 'physical' | 'magic') => void
  onFormulaNameChange: (n: string) => void
  onSaveFormula: (name: string) => void
  onDeleteCustomFormula: (id: string) => void
}

function FormulaBuilder({
  tokens, damageType, formulaName, customFormulas, paletteValues,
  onTokensChange, onDamageTypeChange, onFormulaNameChange,
  onSaveFormula, onDeleteCustomFormula,
}: FormulaBuilderProps) {
  const [activeGroup, setActiveGroup] = useState<FormulaVarGroup>('敵ステータス')
  const [numInput, setNumInput] = useState('')
  const [selTemplate, setSelTemplate] = useState(FORMULA_TEMPLATES[0].id)
  const [saveMsg, setSaveMsg] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null)

  const addToken = (t: Omit<FormulaToken, 'id'>) => {
    const newTok = { ...t, id: newId() }
    if (insertAfterIdx === null) {
      onTokensChange([...tokens, newTok])
    } else {
      const next = [...tokens]
      next.splice(insertAfterIdx + 1, 0, newTok)
      onTokensChange(next)
      setInsertAfterIdx(insertAfterIdx + 1)
    }
  }
  const removeToken = (id: string) => {
    onTokensChange(tokens.filter(t => t.id !== id))
    setInsertAfterIdx(null)
  }

  const allTemplates = [...FORMULA_TEMPLATES, ...customFormulas]

  const applyTemplate = () => {
    const tmpl = allTemplates.find(t => t.id === selTemplate)
    if (!tmpl) return
    onTokensChange(cloneTokens(tmpl.tokens))
    onDamageTypeChange(tmpl.damageType)
    onFormulaNameChange(tmpl.name)
    setInsertAfterIdx(null)
  }

  const handleSave = () => {
    if (!formulaName.trim()) { setSaveMsg('計算式名を入力してください'); return }
    onSaveFormula(formulaName)
    setSaveMsg(`「${formulaName}」を保存しました`)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const groupVars = FORMULA_VARS.filter(v => v.group === activeGroup)

  const numFmtSmall = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toLocaleString()
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(3)
  }

  const tokenColor = (t: FormulaToken): string => {
    if (t.type === 'op') return '#6b7280'
    if (t.type === 'num') return C.blue
    const varDef = FORMULA_VARS.find(v => v.key === t.varKey)
    const groupColors: Record<FormulaVarGroup, string> = {
      '敵ステータス': C.orange,
      'プレイヤーステータス': C.blue,
      '耐性%': C.green,
      '属性耐性%': C.teal,
      '鎧相性': C.purple,
    }
    return groupColors[varDef?.group as FormulaVarGroup] ?? C.gold
  }

  const OP_DISPLAY: Record<string, string> = { '*':'×', '/':'÷', '+':'+', '-':'−', '(':'(', ')':')' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* 式の種類 + 名前 */}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.72rem', color:C.textMuted, fontWeight:700 }}>式の種類:</span>
        {(['physical','magic'] as const).map(t => (
          <button key={t}
            style={{ ...S.typeBtn, background: damageType===t ? (t==='physical' ? C.orange : C.purple) : '#e5e7eb',
              color: damageType===t ? '#fff' : C.textMuted }}
            onClick={() => onDamageTypeChange(t)}>
            {t==='physical' ? '⚔️ 物理' : '✨ 魔法'}
          </button>
        ))}
        <input
          style={{ ...S.statInput, flex:1, minWidth:'120px', fontSize:'0.88rem', padding:'6px 10px' }}
          placeholder="計算式名（任意）"
          value={formulaName}
          onChange={e => onFormulaNameChange(e.target.value)}
        />
      </div>

      {/* テンプレート選択 */}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.72rem', color:C.textMuted, fontWeight:700 }}>テンプレート:</span>
        <div style={{ position:'relative', flex:1, minWidth:'180px' }}>
          <select style={{...S.select, padding:'6px 32px 6px 10px', fontSize:'0.82rem'}}
            value={selTemplate} onChange={e=>setSelTemplate(e.target.value)}>
            <optgroup label="── 組み込みテンプレート ──">
              {FORMULA_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
            {customFormulas.length > 0 && (
              <optgroup label="── 保存済み計算式 ──">
                {customFormulas.map(t => <option key={t.id} value={t.id}>★ {t.name}</option>)}
              </optgroup>
            )}
          </select>
          <span style={S.selectArrow}>▾</span>
        </div>
        <button style={{...S.applyBtn, background:C.purple}} onClick={applyTemplate}>適用</button>
        {customFormulas.find(f => f.id === selTemplate) && (
          <button style={{...S.applyBtn, background:C.danger, padding:'5px 10px', fontSize:'0.72rem'}}
            onClick={() => onDeleteCustomFormula(selTemplate)}>削除</button>
        )}
      </div>

      {/* 計算式フィールド */}
      <div>
        <div style={{ fontSize:'0.68rem', color:C.textMuted, fontWeight:700, marginBottom:'6px',
          letterSpacing:'0.1em', display:'flex', alignItems:'center', gap:'6px' }}>
          <span>計算式フィールド</span>
          {tokens.length === 0 && <span style={{ color:C.textMuted, fontStyle:'italic', fontWeight:400 }}>（空）</span>}
          <button onClick={() => setShowGuide(p => !p)}
            style={{ marginLeft:'auto', fontSize:'0.65rem', padding:'2px 9px', borderRadius:'4px', cursor:'pointer',
              background: showGuide ? `${C.gold}30` : '#f3f4f6',
              border:`1px solid ${showGuide ? C.gold : '#e5e7eb'}`,
              color: showGuide ? '#92400e' : C.textMuted, fontWeight:700, letterSpacing:0 }}>
            {showGuide ? '▲ ガイドを閉じる' : '❓ 操作ガイド'}
          </button>
        </div>
        <div style={S.formulaDisplay} onClick={() => setInsertAfterIdx(null)}>
          {tokens.length === 0
            ? <span style={{ color:C.textMuted, fontSize:'0.82rem', padding:'4px 8px' }}>ここに計算式のトークンが追加されます</span>
            : tokens.flatMap((t, idx) => {
                const col = tokenColor(t)
                const varDef = FORMULA_VARS.find(v => v.key === t.varKey)
                const val = t.type === 'var' ? paletteValues[t.varKey!] : undefined
                const label = t.type === 'op'
                  ? (OP_DISPLAY[t.opValue!] ?? t.opValue)
                  : t.type === 'num'
                    ? String(t.numValue)
                    : (varDef?.label ?? t.varKey)
                const isSelected = insertAfterIdx === idx
                const elems: JSX.Element[] = [
                  <div key={t.id}
                    style={{ ...S.tokenPill, background:`${col}18`, border:`1.5px solid ${isSelected ? col : `${col}60`}`,
                      color: col, cursor:'pointer',
                      outline: isSelected ? `2px solid ${col}80` : 'none',
                      boxShadow: isSelected ? `0 0 7px ${col}50` : 'none' }}
                    onClick={(e) => { e.stopPropagation(); setInsertAfterIdx(prev => prev === idx ? null : idx) }}>
                    <span style={{ fontSize: t.type==='op' ? '1rem' : '0.75rem', fontWeight:700 }}>{label}</span>
                    {t.type === 'var' && val !== undefined && (
                      <span style={{ fontSize:'0.6rem', color:`${col}99`, display:'block', lineHeight:1, marginTop:'1px' }}>
                        {numFmtSmall(val)}
                      </span>
                    )}
                    <button style={S.tokenRemove} onClick={(e) => { e.stopPropagation(); removeToken(t.id) }}>×</button>
                  </div>
                ]
                if (isSelected) {
                  elems.push(
                    <div key={`cur-${idx}`} style={{ width:'3px', background:C.gold, borderRadius:'2px',
                      margin:'0 1px', minHeight:'28px', alignSelf:'stretch', flexShrink:0 }} />
                  )
                }
                return elems
              })
          }
        </div>
        <div style={{ fontSize:'0.65rem', marginTop:'4px', minHeight:'14px',
          color: insertAfterIdx !== null ? C.gold : C.textMuted }}>
          {insertAfterIdx !== null
            ? `▶ ${insertAfterIdx + 1}番目の後に挿入（背景クリックで末尾追加に戻す）`
            : 'トークンをクリックして挿入位置を選択（未選択時は末尾に追加）'}
        </div>

        {/* ── 操作ガイド ── */}
        {showGuide && (
          <div style={{ background:'#fefce8', border:'1.5px solid #fbbf24', borderRadius:'8px',
            padding:'13px 15px', fontSize:'0.73rem', lineHeight:1.65, marginTop:'6px' }}>

            <p style={{ fontWeight:700, color:'#92400e', margin:'0 0 8px 0' }}>操作方法</p>
            {([
              ['トークンをクリック',       'そのトークンの直後を挿入位置に設定（ハイライト＋カーソルバー表示）'],
              ['演算子・変数ボタンを押す', 'カーソル位置の直後に挿入。連続で押すと右に移動'],
              ['同じトークンを再クリック', '選択解除 → 末尾追加モードに戻る'],
              ['フィールド背景をクリック', '選択解除 → 末尾追加モードに戻る'],
            ] as [string,string][]).map(([k, v], i) => (
              <div key={i} style={{ display:'flex', gap:'6px', marginBottom:'3px', flexWrap:'wrap' }}>
                <span style={{ fontWeight:700, color:'#78350f', minWidth:'160px', flexShrink:0 }}>{k}</span>
                <span style={{ color:'#44403c' }}>→ {v}</span>
              </div>
            ))}

            <p style={{ fontWeight:700, color:'#92400e', margin:'12px 0 6px 0' }}>操作例（推移図）</p>
            <p style={{ color:'#78716c', margin:'0 0 8px 0', fontSize:'0.68rem' }}>
              例：「敵ATK × 種族耐性%」の間に数値「100」を挿入する
            </p>

            {/* ① クリック前 */}
            <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#b45309', marginBottom:'3px' }}>
              ① クリック前（末尾追加モード）
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'3px', alignItems:'center',
              background:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'6px 8px', marginBottom:'2px' }}>
              {[['敵ATK', C.orange], ['×', '#6b7280'], ['種族耐性%', C.green]].map(([lbl, col], i) => (
                <span key={i} style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                  fontWeight:700, background:`${col}18`, border:`1.5px solid ${col}55`, color:col }}>{lbl}</span>
              ))}
            </div>

            <div style={{ textAlign:'center', color:'#7c3aed', fontWeight:700, margin:'4px 0', fontSize:'0.78rem' }}>
              ↓「×」トークンをクリック
            </div>

            {/* ② 選択後 */}
            <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#b45309', marginBottom:'3px' }}>
              ② 挿入位置を選択（「×」の直後にカーソル）
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'3px', alignItems:'center',
              background:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'6px 8px', marginBottom:'2px' }}>
              <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                fontWeight:700, background:`${C.orange}18`, border:`1.5px solid ${C.orange}55`, color:C.orange }}>敵ATK</span>
              <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                fontWeight:700, background:'#6b728018', border:`1.5px solid #6b7280`, color:'#6b7280',
                outline:'2px solid #6b728080', boxShadow:'0 0 6px #6b728045' }}>×</span>
              <span style={{ display:'inline-block', width:'3px', background:C.gold,
                borderRadius:'2px', margin:'0 1px', height:'20px', alignSelf:'stretch' }} />
              <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                fontWeight:700, background:`${C.green}18`, border:`1.5px solid ${C.green}55`, color:C.green }}>種族耐性%</span>
            </div>

            <div style={{ textAlign:'center', color:'#7c3aed', fontWeight:700, margin:'4px 0', fontSize:'0.78rem' }}>
              ↓ 数値「100」を追加
            </div>

            {/* ③ 挿入後 */}
            <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#b45309', marginBottom:'3px' }}>
              ③ 挿入完了（カーソルが次の位置に移動）
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'3px', alignItems:'center',
              background:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'6px 8px', marginBottom:'2px' }}>
              <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                fontWeight:700, background:`${C.orange}18`, border:`1.5px solid ${C.orange}55`, color:C.orange }}>敵ATK</span>
              <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                fontWeight:700, background:'#6b728018', border:`1.5px solid ${C.blue}55`, color:'#6b7280' }}>×</span>
              <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                fontWeight:700, background:`${C.blue}18`, border:`1.5px solid ${C.blue}`, color:C.blue,
                outline:`2px solid ${C.blue}80`, boxShadow:`0 0 6px ${C.blue}45` }}>100</span>
              <span style={{ display:'inline-block', width:'3px', background:C.gold,
                borderRadius:'2px', margin:'0 1px', height:'20px', alignSelf:'stretch' }} />
              <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:'4px', fontSize:'0.7rem',
                fontWeight:700, background:`${C.green}18`, border:`1.5px solid ${C.green}55`, color:C.green }}>種族耐性%</span>
            </div>

            <p style={{ color:'#78716c', margin:'6px 0 0 0', fontSize:'0.68rem' }}>
              ✔ そのまま続けてボタンを押すと「100」の直後にさらに挿入できます
            </p>
          </div>
        )}
      </div>

      {/* 演算子パレット */}
      <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.68rem', color:C.textMuted, fontWeight:700 }}>演算子:</span>
        {['+','-','*','/',  '(', ')'].map(op => (
          <button key={op} style={S.opBtn} onClick={() => addToken({type:'op', opValue:op})}>
            {OP_DISPLAY[op] ?? op}
          </button>
        ))}
        <span style={{ marginLeft:'12px', fontSize:'0.68rem', color:C.textMuted, fontWeight:700 }}>数値:</span>
        <input
          type="number"
          style={{ ...S.statInput, width:'90px', fontSize:'0.88rem', padding:'5px 8px' }}
          placeholder="数値"
          value={numInput}
          onChange={e => setNumInput(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && numInput!=='') {
            addToken({ type:'num', numValue: parseFloat(numInput) })
            setNumInput('')
          }}}
        />
        <button style={{...S.opBtn, background:`${C.blue}20`, color:C.blue, border:`1.5px solid ${C.blue}50`}}
          onClick={() => { if (numInput!=='') { addToken({type:'num', numValue:parseFloat(numInput)}); setNumInput('') }}}>
          追加
        </button>
      </div>

      {/* 変数パレット */}
      <div>
        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'8px' }}>
          {FORMULA_VAR_GROUPS.map(g => (
            <button key={g} style={{ ...S.groupTab, background: activeGroup===g ? C.purple : '#f3f4f6',
              color: activeGroup===g ? '#fff' : C.textSecondary,
              border: `1.5px solid ${activeGroup===g ? C.purple : '#e5e7eb'}` }}
              onClick={() => setActiveGroup(g)}>
              {g}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {groupVars.map(v => {
            const val = paletteValues[v.key]
            const col = (() => {
              const gmap: Record<FormulaVarGroup, string> = {
                '敵ステータス': C.orange, 'プレイヤーステータス': C.blue,
                '耐性%': C.green, '属性耐性%': C.teal, '鎧相性': C.purple
              }
              return gmap[v.group as FormulaVarGroup] ?? C.gold
            })()
            return (
              <button key={v.key}
                style={{ ...S.varBtn, background:`${col}12`, border:`1.5px solid ${col}40`, color:col }}
                title={v.desc ?? v.label}
                onClick={() => addToken({ type:'var', varKey:v.key })}>
                <span style={{ fontSize:'0.75rem', fontWeight:700 }}>{v.label}</span>
                {val !== undefined && (
                  <span style={{ fontSize:'0.6rem', display:'block', color:`${col}cc`, marginTop:'1px' }}>
                    {numFmtSmall(val)}
                  </span>
                )}
                {v.desc?.includes('/') && (
                  <span style={{ fontSize:'0.55rem', display:'block', color:`${col}88`, marginTop:'2px',
                    maxWidth:'100px', whiteSpace:'normal', lineHeight:1.3, textAlign:'center' }}>
                    {v.desc}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 保存・クリア */}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginTop:'4px' }}>
        <button style={{...S.applyBtn, background:C.green}} onClick={handleSave}>
          この計算式を保存
        </button>
        <button style={{...S.applyBtn, background:'#6b7280'}}
          onClick={() => { onTokensChange([]); onFormulaNameChange('') }}>
          計算式をクリア
        </button>
        {saveMsg && <span style={{ fontSize:'0.78rem', color:C.green, fontWeight:700 }}>{saveMsg}</span>}
      </div>

      {/* 注記 */}
      <div style={{ fontSize:'0.68rem', color:C.textMuted, lineHeight:1.6, background:'#fffbf0', padding:'8px 10px', borderRadius:'8px', border:`1px solid ${C.panelBorder}` }}>
        <div>※ <b>装備DEF(※) / 装備MDEF(※)</b> はアスムプティオ状態時に自動で×2になります</div>
        <div>※ <b>金剛 / うずくまる / アイアンハウリング / エナジーコート / ストーンスキン</b> は計算式評価後に自動適用されます</div>
        <div>※ ストーンスキンは式の種類（物理/魔法）に応じて ×0.80 または ×1.20 が適用されます</div>
      </div>
    </div>
  )
}

// ── FormulaResultDisplay ───────────────────────────────────────────────────────

function FormulaResultDisplay({ result, formulaName, damageType, stats }: {
  result: NonNullable<ReturnType<typeof evaluateFormulaFull>>
  formulaName: string
  damageType: 'physical' | 'magic'
  stats: PlayerStats
}) {
  const typeColor = damageType === 'physical' ? C.orange : C.purple
  const numFmt = (v: number) => {
    if (Number.isInteger(v)) return v.toLocaleString()
    return v.toFixed(4)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

      {/* ヘッダー */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <span style={{ ...S.typeBadge, background:typeColor, color:'#fff', fontSize:'0.8rem' }}>
          {damageType==='physical' ? '⚔️ 物理' : '✨ 魔法'}
        </span>
        {formulaName && <span style={{ fontSize:'1rem', fontWeight:700, color:C.textPrimary }}>{formulaName}</span>}
        {result.error && (
          <span style={{ color:C.danger, fontSize:'0.78rem', fontWeight:700 }}>⚠ {result.error}</span>
        )}
      </div>

      {/* 計算式 */}
      <ResultBlock label="計算式" color={typeColor}>
        <code style={{ fontSize:'0.82rem', wordBreak:'break-all', lineHeight:1.8, color:C.textPrimary }}>
          {result.formulaStr || '（式なし）'}
        </code>
      </ResultBlock>

      {/* 使用変数 */}
      {result.varValues.length > 0 && (
        <ResultBlock label="使用変数の現在値" color={typeColor}>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {result.varValues.map(({ key, label, value }) => (
              <div key={key} style={{ ...S.paramChip, borderColor:`${typeColor}40`, background:`${typeColor}08` }}>
                <span style={{ ...S.paramChipLabel, color:`${typeColor}cc` }}>{label}</span>
                <span style={{ ...S.paramChipValue, color:typeColor }}>{numFmt(value)}</span>
              </div>
            ))}
          </div>
        </ResultBlock>
      )}

      {/* 値代入後の式 */}
      <ResultBlock label="値代入" color={typeColor}>
        <code style={{ fontSize:'0.75rem', wordBreak:'break-all', lineHeight:1.8, color:C.textSecondary }}>
          {result.substitutedStr}
        </code>
      </ResultBlock>

      {/* 計算式の結果 */}
      <ResultBlock label="計算式の結果（特殊状態適用前）" color={typeColor}>
        <span style={{ fontSize:'1.6rem', fontWeight:900, color:typeColor }}>
          {Math.floor(result.baseResult).toLocaleString()}
        </span>
        {result.stateFactors.length === 0 && (
          <span style={{ fontSize:'0.8rem', color:C.textMuted, marginLeft:'8px' }}>（特殊状態なし）</span>
        )}
      </ResultBlock>

      {/* 特殊状態適用 */}
      {result.stateFactors.length > 0 && (
        <ResultBlock label="特殊状態の適用" color={typeColor}>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
              {result.stateFactors.map((s, i) => (
                <span key={i} style={{ ...S.elemBadge, borderColor:`${typeColor}50`, color:typeColor, fontSize:'0.75rem' }}>
                  {s.label}
                </span>
              ))}
            </div>
            <div style={{ fontSize:'0.8rem', color:C.textSecondary, lineHeight:1.8 }}>
              {Math.floor(result.baseResult).toLocaleString()}
              {result.stateFactors.map((s, i) => (
                <span key={i}> × {s.factor}</span>
              ))}
              {' = '}
              <strong style={{ color:typeColor }}>{result.finalResult.toFixed(2)}</strong>
            </div>
          </div>
        </ResultBlock>
      )}

      {/* 最終結果 */}
      <div style={{
        background: `${typeColor}12`,
        border: `3px solid ${typeColor}`,
        borderRadius:'14px',
        padding:'16px 20px',
        display:'flex', alignItems:'baseline', gap:'12px', flexWrap:'wrap',
      }}>
        <span style={{ fontSize:'0.82rem', color:typeColor, fontWeight:700, letterSpacing:'0.08em' }}>最終ダメージ/hit</span>
        <span style={{ fontSize:'3rem', fontWeight:900, color:typeColor, lineHeight:1 }}>
          {result.perHit.toLocaleString()}
        </span>
        <span style={{ fontSize:'0.9rem', color:C.textMuted, fontWeight:600 }}>ダメージ</span>
        <span style={{ fontSize:'0.72rem', color:C.textMuted, marginLeft:'auto' }}>
          ※ floor(max(1, 計算結果{result.stateFactors.length>0?' × 特殊状態':''}))
        </span>
      </div>

      {/* アスムプティオ注記 */}
      {stats.assumptioActive && (
        <p style={{ fontSize:'0.7rem', color:C.blue, fontStyle:'italic' }}>
          ※ アスムプティオ有効: 計算式内の装備DEF(※)・装備MDEF(※)は×2の値が使用されています
        </p>
      )}
    </div>
  )
}

function ResultBlock({ label, color, children }: { label:string; color:string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:'0.62rem', color:`${color}cc`, fontWeight:700, textTransform:'uppercase',
        letterSpacing:'0.1em', marginBottom:'6px', borderLeft:`3px solid ${color}`, paddingLeft:'8px' }}>
        {label}
      </div>
      <div style={{ background:`${color}06`, border:`1px solid ${color}25`, borderRadius:'8px', padding:'10px 12px' }}>
        {children}
      </div>
    </div>
  )
}

// ── 共通サブコンポーネント ─────────────────────────────────────────────────────

function PanelHeader({ icon, title, color, children }: { icon:string; title:string; color:string; children?: React.ReactNode }) {
  return (
    <div style={{ ...S.panelHeader, borderBottomColor:`${color}40` }}>
      <span style={{ ...S.panelIcon, color }}>{icon}</span>
      <h2 style={{ ...S.panelTitle, color }}>{title}</h2>
      {children}
    </div>
  )
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ ...S.sectionLabel, color, borderLeftColor: color }}>{children}</div>
}

function NumField({ label, value, min, max, onChange, color }: {
  label:string; value:number; min:number; max:number; onChange:(v:string)=>void; color:string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={S.statField}>
      <label style={{ ...S.statLabel, color }}>{label}</label>
      <input type="number" value={value} min={min} max={max}
        onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ ...S.statInput, borderColor: focused ? color : C.inputBorder,
          boxShadow: focused ? `0 0 0 3px ${color}25` : 'none' }} />
    </div>
  )
}

function SelectField({ label, value, options, onChange, color }: {
  label:string; value:string; options:string[]; onChange:(v:string)=>void; color:string
}) {
  return (
    <div style={S.statField}>
      <label style={{ ...S.statLabel, color }}>{label}</label>
      <div style={{ position:'relative' }}>
        <select style={{ ...S.inlineSelect, borderColor: C.inputBorder }}
          value={value} onChange={e=>onChange(e.target.value)}>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <span style={{ ...S.inlineSelectArrow, color }}>▾</span>
      </div>
    </div>
  )
}

function DerivedStat({ label, value, color }: { label:string; value:number|string; color:string }) {
  return (
    <div style={S.derivedStat}>
      <span style={S.derivedLabel}>{label}</span>
      <span style={{ ...S.derivedValue, color }}>{typeof value==='number' ? value.toLocaleString() : value}</span>
    </div>
  )
}

function ToggleRow({ label, description, active, onToggle, activeColor }: {
  label:string; description:string; active:boolean; onToggle:()=>void; activeColor:string
}) {
  return (
    <div style={{ ...S.toggleRow, border:`2px solid ${active ? activeColor : '#e5e7eb'}`, background: active ? `${activeColor}12` : '#f9fafb' }}>
      <div style={{ flex:1 }}>
        <div style={{ ...S.toggleLabel, color: active ? activeColor : C.textPrimary }}>{label}</div>
        <div style={S.toggleDesc}>{description}</div>
      </div>
      <button style={{ ...S.toggleBtn, color: active ? '#fff' : C.textMuted, background: active ? activeColor : '#e5e7eb', border:'none' }}
        onClick={onToggle}>{active ? 'ON' : 'OFF'}</button>
    </div>
  )
}

function StepToggleRow({ label, description, level, steps, onStep, activeColor }: {
  label:string; description:string; level:number
  steps:{label:string;value:number}[]; onStep:(v:number)=>void; activeColor:string
}) {
  const active = level > 0
  return (
    <div style={{ ...S.toggleRow, border:`2px solid ${active ? activeColor : '#e5e7eb'}`, background: active ? `${activeColor}12` : '#f9fafb' }}>
      <div style={{ flex:1 }}>
        <div style={{ ...S.toggleLabel, color: active ? activeColor : C.textPrimary }}>{label}</div>
        <div style={S.toggleDesc}>{description}</div>
      </div>
      <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
        <button style={{ ...S.toggleBtn, fontSize:'0.7rem', padding:'4px 8px',
          color: level===0 ? '#fff' : C.textMuted, background: level===0 ? '#6b7280' : '#e5e7eb', border:'none' }}
          onClick={()=>onStep(0)}>OFF</button>
        {steps.map(s => (
          <button key={s.value} style={{ ...S.toggleBtn, fontSize:'0.7rem', padding:'4px 8px',
            color: level===s.value ? '#fff' : C.textMuted, background: level===s.value ? activeColor : '#e5e7eb', border:'none' }}
            onClick={()=>onStep(s.value)}>{s.label}</button>
        ))}
      </div>
    </div>
  )
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
  textPrimary: '#1c1917',
  textSecondary: '#57534e',
  textMuted: '#a8a29e',
  inputBg: '#fffbf0',
  inputBorder: '#e0ccaa',
  danger: '#dc2626',
}

// ── スタイル ───────────────────────────────────────────────────────────────────

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
    background: 'linear-gradient(180deg, #1a0800 0%, #4a1500 50%, #2d0a00 100%)',
    borderBottom: '4px solid #d97706',
    boxShadow: '0 4px 24px rgba(217,119,6,0.6)',
  },
  roFrame: {
    padding: '24px 24px 18px', textAlign: 'center',
    borderTop: '2px solid #d97706', borderBottom: '2px solid #d97706',
    margin: '14px 24px 0',
    background: 'radial-gradient(ellipse at center, rgba(217,119,6,0.12) 0%, transparent 70%)',
  },
  roDecoRow: {
    color: '#ff9500', fontSize: '1.1rem', letterSpacing: '12px',
    marginBottom: '10px', filter: 'drop-shadow(0 0 8px rgba(255,149,0,0.9))',
  },
  roTagline: { color: '#e07830', fontSize: '0.76rem', marginTop: '8px', letterSpacing: '0.12em' },
  celebBanner: {
    textAlign: 'center',
    background: 'linear-gradient(90deg, #1a0500 0%, #5c1a00 30%, #a03800 50%, #5c1a00 70%, #1a0500 100%)',
    padding: '6px 16px', marginTop: '14px', borderTop: '1px solid #7a3010',
  },
  celebText: { color: '#f0a050', fontWeight: 600, fontSize: '0.76rem', letterSpacing: '0.18em' },
  title: { margin: '0 0 6px', lineHeight: 1.2 },
  titleRo: {
    fontSize: '2.0rem', fontWeight: 900, color: '#ff9500', display: 'block',
    letterSpacing: '5px', fontFamily: 'Georgia, "Times New Roman", serif',
    textShadow: '0 0 28px rgba(255,149,0,0.9), 0 2px 6px rgba(0,0,0,0.9)',
  },
  titleMain: {
    fontSize: '1.05rem', color: '#ffcf7a', display: 'block', letterSpacing: '3px',
    textShadow: '0 0 14px rgba(255,207,122,0.5), 0 1px 4px rgba(0,0,0,0.9)',
  },

  saveBar: {
    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
    padding: '10px 20px',
    background: '#fff8e1', borderBottom: `2px solid ${C.panelBorder}`,
  },
  saveBarTitle: { fontSize: '0.8rem', fontWeight: 700, color: C.textSecondary, marginRight: '4px' },
  saveBtn: {
    color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px',
    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em',
  },
  autoSaveNote: { marginLeft: 'auto', fontSize: '0.72rem', color: C.green, fontWeight: 700 },

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
    borderRadius: '16px', padding: '20px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
  },
  resultPanel: { borderColor: `${C.orange}40`, boxShadow: `0 4px 24px rgba(234,88,12,0.08)` },

  panelHeader: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '16px', borderBottom: '2px solid #f0e0c0', paddingBottom: '12px',
  },
  panelIcon: { fontSize: '1.3rem' },
  panelTitle: { fontSize: '1rem', fontWeight: 700, margin: 0, flex: 1, letterSpacing: '0.04em' },

  sectionLabel: {
    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.12em', marginBottom: '10px', marginTop: '20px',
    borderLeft: '3px solid', paddingLeft: '8px',
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' },
  elementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
  statField: { display: 'flex', flexDirection: 'column', gap: '5px' },
  statLabel: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 },
  statInput: {
    background: C.inputBg, border: '1.5px solid', borderRadius: '8px',
    color: C.textPrimary, fontSize: '1.05rem', padding: '8px 12px',
    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
    width: '100%', boxSizing: 'border-box', fontWeight: 600,
  },
  inlineSelect: {
    width: '100%', background: C.inputBg, border: '1.5px solid', borderRadius: '8px',
    color: C.textPrimary, fontSize: '1.05rem', padding: '8px 36px 8px 12px',
    outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 600,
  },
  inlineSelectArrow: {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    pointerEvents: 'none', fontSize: '0.9rem', fontWeight: 700,
  },
  derivedRow: {
    display: 'flex', gap: '20px', flexWrap: 'wrap',
    background: '#fffbf0', border: `1.5px solid ${C.panelBorder}`,
    borderRadius: '10px', padding: '10px 14px', marginTop: '10px',
  },
  derivedStat: { display: 'flex', flexDirection: 'column', gap: '2px' },
  derivedLabel: { fontSize: '0.62rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 },
  derivedValue: { fontSize: '1.15rem', fontWeight: 800 },

  saveNote: { fontSize: '0.7rem', color: C.textMuted, marginTop: '16px', marginBottom: 0, textAlign: 'right' },
  resetBtn: {
    background: '#fff1f2', border: `1.5px solid ${C.danger}`, color: C.danger,
    borderRadius: '8px', padding: '4px 14px', fontSize: '0.75rem',
    cursor: 'pointer', letterSpacing: '0.05em', fontWeight: 700,
  },

  toggleRow: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '12px', borderRadius: '10px', transition: 'background 0.15s, border-color 0.15s',
  },
  toggleLabel: { fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' },
  toggleDesc: { fontSize: '0.7rem', color: C.textMuted, lineHeight: 1.5 },
  toggleBtn: {
    minWidth: '52px', padding: '6px 10px', borderRadius: '8px',
    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
    letterSpacing: '0.05em', flexShrink: 0,
  },

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
  applyBtn: {
    color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 16px',
    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  typeBtn: {
    border: 'none', borderRadius: '8px', padding: '6px 14px',
    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
  },

  formulaDisplay: {
    display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'flex-start',
    minHeight: '56px', padding: '10px 12px',
    background: '#fffbf0', border: `2px solid ${C.panelBorder}`,
    borderRadius: '10px', overflowX: 'auto',
  },
  tokenPill: {
    display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
    padding: '5px 8px 4px', borderRadius: '8px', position: 'relative',
    cursor: 'default', userSelect: 'none', minWidth: '36px',
  },
  tokenRemove: {
    position: 'absolute', top: '-6px', right: '-6px',
    width: '16px', height: '16px', borderRadius: '50%',
    background: '#dc2626', color: '#fff', border: 'none',
    fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, padding: 0,
  },
  opBtn: {
    background: '#f3f4f6', border: '1.5px solid #d1d5db', borderRadius: '8px',
    color: C.textPrimary, fontSize: '1rem', fontWeight: 700,
    padding: '6px 12px', cursor: 'pointer', minWidth: '38px',
  },
  groupTab: {
    border: 'none', borderRadius: '6px', padding: '4px 10px',
    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
  },
  varBtn: {
    border: 'none', borderRadius: '8px', padding: '6px 10px',
    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minWidth: '64px',
  },

  paramChip: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    padding: '6px 10px', borderRadius: '8px', border: '1.5px solid',
  },
  paramChipLabel: { fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 },
  paramChipValue: { fontSize: '0.9rem', fontWeight: 800 },

  typeBadge: {
    fontSize: '0.68rem', padding: '3px 10px', borderRadius: '99px', fontWeight: 800, letterSpacing: '0.05em',
  },
  elemBadge: {
    fontSize: '0.68rem', padding: '3px 10px', borderRadius: '99px',
    background: '#fff', fontWeight: 700, border: '1.5px solid',
  },

  footer: {
    textAlign: 'center', padding: '16px',
    borderTop: `2px solid ${C.panelBorder}`,
    color: C.textMuted, fontSize: '0.8rem', letterSpacing: '0.05em',
    background: '#fff8e1', fontWeight: 600,
  },
}
