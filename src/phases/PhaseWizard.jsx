import { useState } from 'react'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType } from 'docx'
import { saveAs } from 'file-saver'
import Phase1Search from './Phase1Search'
import Phase2Report from './Phase2Report'
import Phase3Decision from './Phase3Decision'
import './phases.css'

const PHASE_LABELS = [
  { key: 1, label: '키워드 검색' },
  { key: 2, label: 'AI 분석 리포트' },
  { key: 3, label: '조례 작성 여부' },
]

export default function PhaseWizard({ onStartWork }) {
  const [currentPhase, setCurrentPhase] = useState(1)
  const [searchData, setSearchData] = useState(null)
  const [selectedRefs, setSelectedRefs] = useState([])

  const handleStartWork = (config) => {
    if (onStartWork) {
      onStartWork(config, searchData, selectedRefs)
    }
  }

  const handleExportReport = async () => {
    if (!searchData) return

    const keywords = searchData.keywords.join(' + ')
    const localItems = searchData.localOrdinances?.items || []
    const upperItems = searchData.upperLaws?.items || []
    const otherItems = searchData.otherRegions?.items || []

    const font = '맑은 고딕'
    const sz = 20

    const tr = (text, opts) => new TextRun({ text, font, size: opts?.size || sz, bold: opts?.bold, ...opts })
    const p = (text, opts) => new Paragraph({
      spacing: { after: 100, line: 300 },
      alignment: opts?.align || AlignmentType.LEFT,
      children: [tr(text, opts)],
    })

    const children = [
      p('AI 분석 리포트', { size: 32, bold: true, align: AlignmentType.CENTER }),
      p('검색 키워드: ' + keywords, { size: 18 }),
      p('분석 일시: ' + new Date().toLocaleDateString('ko-KR'), { size: 18 }),
      p(''),
      p('종합의견', { size: 24, bold: true }),
    ]

    if (localItems.length === 0) {
      children.push(p('경기도에 "' + keywords + '" 관련 조례가 현재 존재하지 않습니다. 신규 제정을 검토할 수 있습니다.'))
    } else {
      children.push(p('경기도에 "' + keywords + '" 관련 조례가 ' + localItems.length + '건 확인됩니다.'))
    }
    if (upperItems.length > 0) children.push(p('관련 상위법령 ' + upperItems.length + '건이 확인됩니다.'))
    if (otherItems.length > 0) children.push(p('타 시도 유사 조례 ' + otherItems.length + '건이 확인됩니다.'))

    children.push(p(''))
    children.push(p('경기도 기존 조례', { size: 24, bold: true }))
    if (localItems.length === 0) {
      children.push(p('해당 키워드 관련 경기도 조례가 없습니다.'))
    } else {
      localItems.forEach(function(item) { children.push(p('- ' + item.name + ' (' + (item.date || '') + ')')) })
    }

    children.push(p(''))
    children.push(p('상위법령', { size: 24, bold: true }))
    if (upperItems.length === 0) {
      children.push(p('관련 상위법령이 검색되지 않았습니다.'))
    } else {
      upperItems.forEach(function(item) { children.push(p('- ' + item.name + ' [' + (item.type || '') + ']')) })
    }

    children.push(p(''))
    children.push(p('타 시도 조례 현황', { size: 24, bold: true }))
    if (otherItems.length === 0) {
      children.push(p('타 시도 유사 조례가 검색되지 않았습니다.'))
    } else {
      otherItems.forEach(function(item) { children.push(p('- ' + (item.org || '') + ' | ' + item.name + ' (' + (item.date || '') + ')')) })
    }

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, '사전조사_리포트_' + searchData.keywords.join('_') + '.docx')
  }

  return (
    <div className="phase-layout">
      {/* 헤더 */}
      <header className="phase-header">
        <div className="phase-header-inner">
          <div className="phase-header-title">
            <h1>조례 작성 도우미</h1>
            <p>경기도의회 조례 제·개정 지원 도구</p> <p>전국의 조례현황을 조회하고, 제정.개정할 조례 초안작성을 돕는 도구입니다.</p>
          </div>
        </div>
      </header>

      {/* 진행 표시 */}
      <nav className="phase-progress">
        <div className="phase-progress-inner">
          {PHASE_LABELS.map((phase, idx) => (
            <div key={phase.key} className="phase-progress-item">
              {idx > 0 && (
                <div className={`phase-progress-line ${currentPhase > idx ? 'active' : ''}`} />
              )}
              <div className={`phase-progress-dot ${
                currentPhase === phase.key ? 'current' :
                currentPhase > phase.key ? 'done' : ''
              }`}>
                {currentPhase > phase.key ? '✓' : phase.key}
              </div>
              <span className={`phase-progress-label ${currentPhase === phase.key ? 'current' : ''}`}>
                {phase.label}
              </span>
            </div>
          ))}
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="phase-content">
        {currentPhase === 1 && (
          <Phase1Search
            searchData={searchData}
            onSearchComplete={(data) => setSearchData(data)}
            onNext={() => setCurrentPhase(2)}
          />
        )}
        {currentPhase === 2 && (
          <Phase2Report
            searchData={searchData}
            onNext={() => setCurrentPhase(3)}
            onBack={() => setCurrentPhase(1)}
            selectedRefs={selectedRefs}
            onSelectRefs={setSelectedRefs}
          />
        )}
        {currentPhase === 3 && (
          <Phase3Decision
            searchData={searchData}
            selectedRefs={selectedRefs}
            onStart={handleStartWork}
            onBack={() => setCurrentPhase(2)}
            onExportReport={handleExportReport}
          />
        )}
      </main>
    </div>
  )
}
