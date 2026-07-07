import { useState } from 'react'
'./phases/PhaseWizard'에서 PhaseWizard를 가져옵니다.
'./steps/StepDashboard'에서 StepDashboard를 가져옵니다.

함수 App() {
  const [mode, setMode] = useState('phase') // 'phase' | 'step'
  const [workConfig, setWorkConfig] = useState(null)
  const [searchData, setSearchData] = useState(null)
  const [selectedRefs, setSelectedRefs] = useState([])

  const handleStartWork = (config, data, refs) => {
    setWorkConfig(config)
    setSearchData(data)
    setSelectedRefs(refs || [])
    setMode('step')
  }

  const handleBackToPhase = () => {
    setMode('phase')
  }

  모드가 'step'이고 workConfig가 설정되어 있으면 {
    반품 (
      <StepDashboard
        config={workConfig}
        searchData={searchData}
        selectedRefs={selectedRefs}
        onBackToPhase={handleBackToPhase}
      />
    )
  }

  반품 (
    <PhaseWizard onStartWork={handleStartWork} />
  )
}

내보내기 기본 앱
