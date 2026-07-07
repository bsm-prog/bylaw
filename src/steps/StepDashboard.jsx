import { useState } from 'react'
'./Step1BasicInfo'에서 Step1BasicInfo를 가져옵니다.
'./Step2ArticleEditor'에서 Step2ArticleEditor를 가져옵니다.
'./Step3Supplement'에서 Step3Supplement를 가져옵니다.
'./Step4Reason'에서 Step4Reason을 가져옵니다.
'./Step5CompareTable'에서 Step5CompareTable을 가져옵니다.
'./Step6Export'에서 Step6Export를 가져옵니다.
'./steps.css' 파일을 임포트합니다.

const STEP_MENU = [
  { 키: 1, 라벨: '기본정보' },
  { 키: 2, 라벨: '조문편집' },
  { 키: 3, 라벨: '부칙' },
  { 키: 4, 라벨: '제안이유·주요내용' },
  { 키: 5, 라벨: '신구조문대비표', amendOnly: true },
  { 키: 6, 라벨: '미리보기·내보내기' },
]

기본 함수 StepDashboard({ config, searchData, selectedRefs, onBackToPhase })를 내보냅니다.
  const keywords = searchData?.keywords || []
  const autoTitle = keywords.length > 0
    ? '경기도' + 키워드.join(' ') + '에 관한 조례'
    : ''

  const [currentStep, setCurrentStep] = useState(1)
  const [ordinanceData, setOrdinanceData] = useState({
    유형: config.type,
    대상 조례: config.targetOrdinance,
    키워드: 키워드,
    제목: 자동 제목,
    원래 제목: config.targetOrdinance?.name || '',
    청구 번호: '',
    제출 날짜: '',
    submitterType: '의원',
    리드 멤버: '',
    공동 구성원: [],
    기사: [],
    보충물: [{ id: 'sup-1', content: '이 조례는 날부터 찾아온다.' }],
    이유: '',
    주요 내용: '',
    수정 사항: [],
    selectedRefs: selectedRefs || [],
    보고서 요약: searchData?.localOrdinances ? '사전조사끝' : '',
  })

  const isAmendment = config.type === '일부개정' || config.type === '전부개정'
  const visibleSteps = STEP_MENU.filter(s => !s.amendOnly || isAmendment)

  const updateData = (key, value) => {
    setOrdinanceData(prev => ({ ...prev, [key]: value }))
  }

  const getStepStatus = (stepKey) => {
    stepKey가 currentStep과 같으면 'current'를 반환합니다.
    stepKey가 1이고 ordinanceData.title이 일치하는 경우 '완료'를 반환합니다.
    '대기 중'을 반환합니다.
  }

  반품 (
    <div className="대시보드 레이아웃">
      <header className="대시보드 헤더">
        <div className="대시보드-헤더-내부">
          <h1 className="dashboard-header-title">조례 작성 목록</h1>
          <div className="대시보드 헤더 정보">
            <span className="dashboard-header-type">{config.type}</span>
            {ordinanceData.title && (
              <span className="dashboard-header-name">{ordinanceData.title}</span>
            )}
          </div>
        </div>
      </헤더>

      <div className="대시보드-바디">
        <aside className="대시보드-사이드바">
          <nav className="sidebar-nav">
            {visibleSteps.map(step => {
              const status = getStepStatus(step.key)
              반품 (
                <button key={step.key} className={`sidebar-item ${status}`}
                  onClick={() => setCurrentStep(step.key)}>
                  <span className="sidebar-item-marker">
                    {상태 === '완료' ? '✓' : 상태 === '현재' ? '▸' : '○'}
                  </span>
                  <span className="sidebar-item-label">
                    단계 {step.key}
                    <br />
                    <span className="sidebar-item-name">{step.label}</span>
                  </span>
                </버튼>
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
          </버튼>
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
  반품 (
    <div className="step-placeholder">
      <h2 className="step-title">단계 {step}. {label}</h2>
      <p style={{ color: '#999', marginTop: 16 }}>이 화면은 다음 작업에서 구현됩니다.</p>
      {onNext && <button className="btn btn-outline" onClick={onNext} style={{ marginTop: 16 }}>다음 단계로</button>}
    </div>
  )
}
