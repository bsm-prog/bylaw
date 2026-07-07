import { useState } from 'react'

const TYPES = [
  {
    key: '제정',
    label: '신규 제정',
    desc: '새로운 조례를 처음부터 만듭니다.',
  },
  {
    key: '일부개정',
    label: '기존 조례 일부개정',
    desc: '기존 조례의 일부 조문을 수정·추가·삭제합니다.',
    needsTarget: true,
  },
  {
    key: '전부개정',
    label: '기존 조례 전부개정',
    desc: '기존 조례를 전면 재작성합니다.',
    needsTarget: true,
  },
]

export default function Phase3Decision({ searchData, onStart, onBack, onExportReport }) {
  const [selectedType, setSelectedType] = useState(null)
  const [selectedTarget, setSelectedTarget] = useState(null)

  const localItems = searchData?.localOrdinances?.items || []
  const needsTarget = TYPES.find(t => t.key === selectedType)?.needsTarget
  const canProceed = selectedType && (!needsTarget || selectedTarget)

  const handleStart = () => {
    if (!canProceed) return
    onStart({
      type: selectedType,
      targetOrdinance: needsTarget ? selectedTarget : null,
    })
  }

  return (
    <div className="phase3">
      <div className="phase3-header">
        <h2 className="phase3-title">조례 작성 진행</h2>
        <p className="phase3-meta">
          검색 키워드: {searchData?.keywords?.join(' + ')}
        </p>
      </div>

      <p className="phase3-question">어떤 방식으로 조례를 작성하시겠습니까?</p>

      {/* 유형 선택 카드 */}
      <div className="type-cards">
        {TYPES.map(type => (
          <div key={type.key} className="type-card-wrapper">
            <button
              className={`type-card ${selectedType === type.key ? 'selected' : ''}`}
              onClick={() => {
                setSelectedType(type.key)
                setSelectedTarget(null)
              }}
            >
              <div className="type-card-header">
                <span className="type-card-label">{type.label}</span>
                {selectedType === type.key && <span className="type-card-check">선택됨</span>}
              </div>
              <p className="type-card-desc">{type.desc}</p>
            </button>

            {/* 대상 조례 선택 (일부/전부개정) */}
            {selectedType === type.key && type.needsTarget && (
              <div className="target-select">
                <p className="target-label">대상 조례를 선택하세요.</p>
                {localItems.length > 0 ? (
                  <div className="target-list">
                    {localItems.map((item, i) => (
                      <label key={i} className="target-item">
                        <input
                          type="radio"
                          name="targetOrdinance"
                          checked={selectedTarget?.id === item.id}
                          onChange={() => setSelectedTarget(item)}
                        />
                        <span className="target-item-name">{item.name}</span>
                        <span className="target-item-date">{formatDate(item.date)}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="target-empty">
                    Phase 1에서 검색된 경기도 조례가 없습니다.
                    개정 대상 조례가 있는 경우 다시 검색해 주세요.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 작성하지 않음 */}
      <div className="phase3-skip">
        <span className="phase3-skip-label">지금은 작성하지 않음</span>
        <span className="phase3-skip-desc">
          리포트를 Word로 저장하고 나중에 이어합니다.
        </span>
        <button className="btn btn-outline" onClick={onExportReport}>
          리포트 저장 (.docx)
        </button>
      </div>

      {/* 하단 버튼 */}
      <div className="phase3-footer">
        <button className="btn btn-text" onClick={onBack}>이전 단계</button>
        <button
          className="btn btn-primary"
          onClick={handleStart}
          disabled={!canProceed}
        >
          작성 시작
        </button>
      </div>
    </div>
  )
}

function formatDate(d) {
  if (!d || d.length !== 8) return ''
  return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`
}
