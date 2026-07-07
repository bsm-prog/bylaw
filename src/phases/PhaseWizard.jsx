import { useState } from 'react'
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

  const handleStartWork = (config) => {
    if (onStartWork) {
      onStartWork(config, searchData)
    }
  }

  const handleExportReport = () => {
    // TODO: Word 내보내기 (1-6 작업에서 구현)
    alert('Word 내보내기 기능은 추후 구현됩니다.')
  }

  return (
    <div className="phase-layout">
      {/* 헤더 */}
      <header className="phase-header">
        <div className="phase-header-inner">
          <div className="phase-header-title">
            <h1>조례 작성 도우미</h1>
            <p>경기도의회 조례 제·개정 지원 도구</p>
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
          />
        )}
        {currentPhase === 3 && (
          <Phase3Decision
            searchData={searchData}
            onStart={handleStartWork}
            onBack={() => setCurrentPhase(2)}
            onExportReport={handleExportReport}
          />
        )}
      </main>
    </div>
  )
}
