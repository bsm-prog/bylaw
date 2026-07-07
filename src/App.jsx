import { useState } from 'react'
import PhaseWizard from './phases/PhaseWizard'
import StepDashboard from './steps/StepDashboard'

function App() {
  const [mode, setMode] = useState('phase')
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

  if (mode === 'step' && workConfig) {
    return (
      <StepDashboard
        config={workConfig}
        searchData={searchData}
        selectedRefs={selectedRefs}
        onBackToPhase={handleBackToPhase}
      />
    )
  }

  return (
    <PhaseWizard onStartWork={handleStartWork} />
  )
}

export default App
