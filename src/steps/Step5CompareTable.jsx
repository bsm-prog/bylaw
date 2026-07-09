import { useState } from 'react'
import { generateCompareTable } from '../api/aiApi'

const uid = () => Math.random().toString(36).slice(2, 9)

const AMEND_TYPES = [
  { key: 'modify', label: '수정' },
  { key: 'add', label: '신설' },
  { key: 'delete', label: '삭제' },
]

export default function Step5CompareTable({ data, onUpdate, onNext, onPrev }) {
  const amendments = data.amendments || []
  const [generating, setGenerating] = useState(false)
  const [genHistory, setGenHistory] = useState([])
  const [genIdx, setGenIdx] = useState(-1)

  const addAmendment = () => {
    const newItem = {
      id: uid(),
      articleRef: '',
      type: 'modify',
      current: '',
      proposed: '',
    }
    onUpdate('amendments', [...amendments, newItem])
  }

  const removeAmendment = (id) => {
    onUpdate('amendments', amendments.filter(a => a.id !== id))
  }

  const updateAmendment = (id, field, value) => {
    onUpdate('amendments', amendments.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateCompareTable(
        data.originalArticles || [],
        data.articles || []
      )
      if (result && result.amendments) {
        const items = result.amendments.map(a => ({ ...a, id: uid() }))
        const newHist = [...genHistory, items].slice(-5)
        setGenHistory(newHist)
        setGenIdx(newHist.length - 1)
        onUpdate('amendments', items)
      }
    } catch (err) {
      console.warn('AI 대비표 생성 실패:', err.message)
      // 폴백: 원본과 수정본 직접 비교
      const origArts = data.originalArticles || []
      const newArts = data.articles || []
      let draft
      if (origArts.length > 0 && newArts.length > 0) {
        draft = compareArticlesDirect(origArts, newArts)
      } else {
        draft = generateMockAmendments(data)
      }
      const newHist = [...genHistory, draft].slice(-5)
      setGenHistory(newHist)
      setGenIdx(newHist.length - 1)
      onUpdate('amendments', draft)
    } finally {
      setGenerating(false)
    }
  }

  const switchVersion = (idx) => {
    setGenIdx(idx)
    onUpdate('amendments', genHistory[idx])
  }

  return (
    <div className="step-content">
      <h2 className="step-title">STEP 5. 신·구조문대비표</h2>

      {/* API 원문 안내 */}
      <div className="compare-api-notice">
        아래 현행 조문은 법제처 Open API를 통해 자동으로 불러온 내용입니다.
        반드시 법제처 원문과 대조하여 확인하시기 바랍니다.
        <a href="https://www.law.go.kr" target="_blank" rel="noopener noreferrer"
          className="compare-api-link">원문 확인하기</a>
      </div>

      {/* 원본 조문 상태 안내 */}
      {(!data.originalArticles || data.originalArticles.length === 0) && (
        <div className="compare-api-notice" style={{color: '#e67e22', borderColor: '#e67e22'}}>
          현행 조문(원본)이 아직 로드되지 않았습니다.
          STEP 2에서 대상 조례 원문을 불러온 후 수정하면
          자동으로 원본이 저장됩니다.
        </div>
      )}

      {/* AI 자동 생성 */}
      <div className="compare-generate">
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? '생성 중...' : 'AI 대비표 자동 생성'}
        </button>
        <span className="compare-generate-note">
          STEP 2에서 편집한 조문과 현행 조문을 비교하여 변경사항을 자동으로 찾아냅니다.
        </span>
      </div>

      {/* 생성 이력 */}
      {genHistory.length > 1 && (
        <div className="version-tabs">
          <span className="version-label">생성 이력</span>
          {genHistory.map((_, i) => (
            <button key={i}
              className={'version-tab' + (genIdx === i ? ' active' : '')}
              onClick={() => switchVersion(i)}>
              {(i + 1) + '차'}
            </button>
          ))}
        </div>
      )}

      {/* 대비표 */}
      {amendments.length === 0 ? (
        <div className="compare-empty">
          AI 대비표 자동 생성을 사용하거나, 아래에서 수동으로 항목을 추가하세요.
        </div>
      ) : (
        <div className="compare-table-wrap">
          {amendments.map((am, i) => (
            <div key={am.id} className="compare-row">
              <div className="compare-row-header">
                <span className="compare-row-num">개정 {i + 1}</span>
                <input
                  type="text"
                  className="compare-ref-input"
                  value={am.articleRef}
                  onChange={(e) => updateAmendment(am.id, 'articleRef', e.target.value)}
                  placeholder="예: 제3조제1항"
                />
                <div className="compare-type-btns">
                  {AMEND_TYPES.map(t => (
                    <button key={t.key}
                      className={'compare-type-btn' + (am.type === t.key ? ' active' : '')}
                      onClick={() => updateAmendment(am.id, 'type', t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <button className="compare-remove" onClick={() => removeAmendment(am.id)}>삭제</button>
              </div>
              <div className="compare-row-body">
                <div className="compare-col">
                  <div className="compare-col-header">현    행</div>
                  {am.type === 'add' ? (
                    <div className="compare-col-placeholder">(신    설)</div>
                  ) : (
                    <textarea
                      className="compare-textarea"
                      value={am.current}
                      onChange={(e) => updateAmendment(am.id, 'current', e.target.value)}
                      placeholder="현행 조문을 입력하세요"
                      rows={4}
                    />
                  )}
                </div>
                <div className="compare-col">
                  <div className="compare-col-header">개  정  안</div>
                  {am.type === 'delete' ? (
                    <div className="compare-col-placeholder">(삭    제)</div>
                  ) : (
                    <textarea
                      className="compare-textarea"
                      value={am.proposed}
                      onChange={(e) => updateAmendment(am.id, 'proposed', e.target.value)}
                      placeholder="개정 조문을 입력하세요"
                      rows={4}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-outline compare-add-btn" onClick={addAmendment}>
        + 대비 항목 수동 추가
      </button>

      {/* 범례 */}
      <div className="compare-legend">
        변경 유형 범례: 밑줄 = 변경 부분 / (신 설) = 새로 추가 / (삭 제) = 삭제 조문
      </div>

      <div className="step-footer">
        <button className="btn btn-outline" onClick={onPrev}>이전</button>
        <button className="btn btn-primary" onClick={onNext}>STEP 6로</button>
      </div>
    </div>
  )
}

function generateMockAmendments(data) {
  return [
    {
      id: uid(),
      articleRef: '제○조',
      type: 'modify',
      current: '(원본 조문이 없어 예시입니다)',
      proposed: '(STEP 2에서 조문을 먼저 작성해 주세요)',
    },
  ]
}

/* ─── 원본 vs 수정본 직접 비교 ─── */
function artText(art) {
  if (!art || !art.paragraphs) return ''
  return art.paragraphs.map(function(p) {
    var t = p.content || ''
    if (p.items) {
      p.items.forEach(function(item, ii) {
        t += '\n  ' + (ii+1) + '. '
        t += (item.content || '')
        if (item.subItems) {
          item.subItems.forEach(function(sub) {
            t += '\n    ' + (sub.content || '')
          })
        }
      })
    }
    return t
  }).join('\n')
}

function compareArticlesDirect(origArts, newArts) {
  var amendments = []
  var origMap = {}
  origArts.forEach(function(a) {
    origMap[a.number] = a
  })
  var newMap = {}
  newArts.forEach(function(a) {
    newMap[a.number] = a
  })

  origArts.forEach(function(orig) {
    var nw = newMap[orig.number]
    if (!nw) {
      amendments.push({
        id: uid(),
        articleRef: '제' + orig.number + '조',
        type: 'delete',
        current: artText(orig),
        proposed: '',
      })
    } else {
      var origT = artText(orig)
      var newT = artText(nw)
      if (origT !== newT) {
        amendments.push({
          id: uid(),
          articleRef: '제' + orig.number + '조',
          type: 'modify',
          current: origT,
          proposed: newT,
        })
      }
    }
  })

  newArts.forEach(function(nw) {
    if (!origMap[nw.number]) {
      amendments.push({
        id: uid(),
        articleRef: '제' + nw.number + '조',
        type: 'add',
        current: '',
        proposed: artText(nw),
      })
    }
  })

  amendments.sort(function(a, b) {
    var na = parseInt(
      a.articleRef.replace(/\D/g, '')
    ) || 0
    var nb = parseInt(
      b.articleRef.replace(/\D/g, '')
    ) || 0
    return na - nb
  })

  return amendments
}
