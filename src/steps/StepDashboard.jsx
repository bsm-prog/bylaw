import { useState } from 'react'
import Step1BasicInfo from './Step1BasicInfo'
import Step2ArticleEditor from './Step2ArticleEditor'
import Step3Supplement from './Step3Supplement'
import Step4Reason from './Step4Reason'
import Step5CompareTable from './Step5CompareTable'
import Step6Export from './Step6Export'
import './steps.css'

const STEP_MENU = [
  { key: 1, label: '기본정보' },
  { key: 2, label: '조문편집' },
  { key: 3, label: '부칙' },
  { key: 4, label: '제안이유·주요내용' },
  { key: 5, label: '신구조문대비표', amendOnly: true },
  { key: 6, label: '미리보기·내보내기' },
]

export default function StepDashboard({ config, searchData, onBackToPhase }) {
  const keywords = searchData?.keywords || []
  const autoTitle = keywords.length > 0
    ? '경기도 ' + keywords.join(' ') + '에 관한 조례'
    : ''

  const [currentStep, setCurrentStep] = useState(1)
  const [ordinanceData, setOrdinanceData] = useState({
    type: config.type,
    targetOrdinance: config.targetOrdinance,
    keywords: keywords,
    title: autoTitle,
    originalTitle: config.targetOrdinance?.name || '',
    billNumber: '',
    submitDate: '',
    submitterType: '의원',
    leadMember: '',
    coMembers: [],
    articles: [],
    supplements: [{ id: 'sup-1', content: '이 조례는 공포한 날부터 시행한다.' }],
    reason: '',
    mainContent: '',
    amendments: [],
    reportSummary: searchData?.localOrdinances ? '사전조사 완료' : '',
  })

  const isAmendment = config.type === '일부개정' || config.type === '전부개정'
  const visibleSteps = STEP_MENU.filter(s => !s.amendOnly || isAmendment)

  const updateData = (key, value) => {
    setOrdinanceData(prev => ({ ...prev, [key]: value }))
  }

  const getStepStatus = (stepKey) => {
    if (stepKey === currentStep) return 'current'
    if (stepKey === 1 && ordinanceData.title) return 'done'
    return 'pending'
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <h1 className="dashboard-header-title">조례 작성 도우미</h1>
          <div className="dashboard-header-info">
            <span className="dashboard-header-type">{config.type}</span>
            {ordinanceData.title && (
              <span className="dashboard-header-name">{ordinanceData.title}</span>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            {visibleSteps.map(step => {
              const status = getStepStatus(step.key)
              return (
                <button key={step.key} className={`sidebar-item ${status}`}
                  onClick={() => setCurrentStep(step.key)}>
                  <span className="sidebar-item-marker">
                    {status === 'done' ? '✓' : status === 'current' ? '▸' : '○'}
                  </span>
                  <span className="sidebar-item-label">
                    STEP {step.key}
                    <br />
                    <span className="sidebar-item-name">{step.label}</span>
                  </span>
                </button>
              )
            })}
          </nav>
          <div className="sidebar-divider" />
          <button className="sidebar-item report-link" onClick={onBackToPhase}>
            <span className="sidebar-item-marker">←</span>
            <span className="sidebar-item-label">
              사전조사<br />
              <span className="sidebar-item-name">리포트 보기</span>
            </span>
          </button>
        </aside>

        <main className="dashboard-main">
          {currentStep === 1 && (
            <Step1BasicInfo data={ordinanceData} onUpdate={updateData} onNext={() => setCurrentStep(2)} />
          )}
          {currentStep === 2 && (
            <Step2ArticleEditor data={ordinanceData} onUpdate={updateData} onNext={() => setCurrentStep(3)} />
          )}
          {currentStep === 3 && (
            <Step3Supplement data={ordinanceData} onUpdate={updateData} onNext={() => setCurrentStep(4)} onPrev={() => setCurrentStep(2)} />
          )}
          {currentStep === 4 && (
            <Step4Reason data={ordinanceData} onUpdate={updateData} onNext={() => setCurrentStep(isAmendment ? 5 : 6)} onPrev={() => setCurrentStep(3)} />
          )}
          {currentStep === 5 && (
            <Step5CompareTable data={ordinanceData} onUpdate={updateData} onNext={() => setCurrentStep(6)} onPrev={() => setCurrentStep(4)} />
          )}
          {currentStep === 6 && (
            <Step6Export data={ordinanceData} onPrev={() => setCurrentStep(isAmendment ? 5 : 4)} />
          )}
        </main>
      </div>
    </div>
  )
}

function StepPlaceholder({ step, label, onNext }) {
  return (
    <div className="step-placeholder">
      <h2 className="step-title">STEP {step}. {label}</h2>
      <p style={{ color: '#999', marginTop: 16 }}>이 화면은 다음 작업에서 구현됩니다.</p>
      {onNext && <button className="btn btn-outline" onClick={onNext} style={{ marginTop: 16 }}>다음 단계로</button>}
    </div>
  )
}
