import { useState } from 'react'
import PhaseWizard from './phases/PhaseWizard'
import StepDashboard from './steps/StepDashboard'

function App() {
  const [mode, setMode] = useState('phase') // 'phase' | 'step'
  const [workConfig, setWorkConfig] = useState(null)
  const [searchData, setSearchData] = useState(null)

  const handleStartWork = (config, data) => {
    setWorkConfig(config)
    setSearchData(data)
    setMode('step')
  }

  const handleBackToPhase = () => {
    setMode('phase')
  }

  if (mode === 'step' && workConfig) {
    return (
      <StepDashboard
        config={workConfig}
        searchData={searchData}
        onBackToPhase={handleBackToPhase}
      />
    )
  }

  return (
    <PhaseWizard onStartWork={handleStartWork} />
  )
}

export default App
