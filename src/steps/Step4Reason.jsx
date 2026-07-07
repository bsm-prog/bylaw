import { useState } from 'react'
import { generateReason, generateMainContent } from '../api/aiApi'

const MAX_HISTORY = 5

export default function Step4Reason({ data, onUpdate, onNext, onPrev }) {
  const [reasonHistory, setReasonHistory] = useState([])
  const [contentHistory, setContentHistory] = useState([])
  const [reasonIdx, setReasonIdx] = useState(-1)
  const [contentIdx, setContentIdx] = useState(-1)
  const [generating, setGenerating] = useState(null) // null | 'reason' | 'content'

  const articlesReady = data.articles && data.articles.length > 0

  const handleGenerate = async (type) => {
    if (!articlesReady) {
      if (!confirm('조문편집(STEP 2)이 완료되지 않았습니다.\n현재 상태로 생성하시겠습니까?')) return
    }

    setGenerating(type)

    try {
      let draft
      if (type === 'reason') {
        draft = await generateReason(data)
        const newHistory = [...reasonHistory, draft].slice(-MAX_HISTORY)
        setReasonHistory(newHistory)
        setReasonIdx(newHistory.length - 1)
        onUpdate('reason', draft)
      } else {
        draft = await generateMainContent(data)
        const newHistory = [...contentHistory, draft].slice(-MAX_HISTORY)
        setContentHistory(newHistory)
        setContentIdx(newHistory.length - 1)
        onUpdate('mainContent', draft)
      }
    } catch (err) {
      // AI 연결 실패 시 임시 텍스트 생성
      console.warn('AI 생성 실패, 임시 텍스트 사용:', err.message)
      if (type === 'reason') {
        const draft = generateReasonDraft(data)
        const newHistory = [...reasonHistory, draft].slice(-MAX_HISTORY)
        setReasonHistory(newHistory)
        setReasonIdx(newHistory.length - 1)
        onUpdate('reason', draft)
      } else {
        const draft = generateContentDraft(data)
        const newHistory = [...contentHistory, draft].slice(-MAX_HISTORY)
        setContentHistory(newHistory)
        setContentIdx(newHistory.length - 1)
        onUpdate('mainContent', draft)
      }
    } finally {
      setGenerating(null)
    }
  }

  const switchVersion = (type, idx) => {
    if (type === 'reason') {
      setReasonIdx(idx)
      onUpdate('reason', reasonHistory[idx])
    } else {
      setContentIdx(idx)
      onUpdate('mainContent', contentHistory[idx])
    }
  }

  return (
    <div className="step-content">
      <h2 className="step-title">STEP 4. 제안이유·주요내용</h2>

      {/* 공통 소스 안내 */}
      <div className="reason-info">
        이 내용은 다음 문서에 공통으로 사용됩니다.
        <br />— 조례안 본문 · 제안설명서 · 입법예고문
      </div>

      {/* 조문 미완성 안내 */}
      {!articlesReady && (
        <div className="reason-warning">
          조문편집(STEP 2)이 완료된 후에 AI 초안을 생성하면 보다 정확한 결과를 얻을 수 있습니다.
          <br />
          <span className="reason-warning-sub">현재 조문 작성 상태: {data.articles ? data.articles.length : 0}조</span>
        </div>
      )}

      {/* 제안이유 */}
      <div className="form-section">
        <h3 className="form-section-title">제안이유 (제·개정이유)</h3>

        <div className="ai-btn-row">
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate('reason')}
            disabled={generating === 'reason'}
          >
            {generating === 'reason' ? '생성 중...' : 'AI 초안 생성'}
          </button>
          {reasonHistory.length > 0 && (
            <span className="ai-status">
              생성완료 — 수정 가능
            </span>
          )}
        </div>

        {/* 생성 이력 */}
        {reasonHistory.length > 1 && (
          <div className="version-tabs">
            <span className="version-label">생성 이력</span>
            {reasonHistory.map((_, i) => (
              <button
                key={i}
                className={'version-tab' + (reasonIdx === i ? ' active' : '')}
                onClick={() => switchVersion('reason', i)}
              >
                {(i + 1) + '차'}
              </button>
            ))}
            <span className="version-current">{'현재: ' + (reasonIdx + 1) + '차'}</span>
          </div>
        )}

        <textarea
          className="reason-textarea"
          value={data.reason || ''}
          onChange={(e) => onUpdate('reason', e.target.value)}
          placeholder="조례의 제정 또는 개정 사유를 기술합니다."
          rows={8}
        />
      </div>

      {/* 주요내용 */}
      <div className="form-section">
        <h3 className="form-section-title">주요내용</h3>

        <div className="ai-btn-row">
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate('content')}
            disabled={generating === 'content'}
          >
            {generating === 'content' ? '생성 중...' : 'AI 초안 생성'}
          </button>
          {!articlesReady && (
            <span className="ai-hint">
              조문을 먼저 완성한 뒤 눌러주세요
            </span>
          )}
          {contentHistory.length > 0 && (
            <span className="ai-status">
              생성완료 — 수정 가능
            </span>
          )}
        </div>

        {/* 생성 이력 */}
        {contentHistory.length > 1 && (
          <div className="version-tabs">
            <span className="version-label">생성 이력</span>
            {contentHistory.map((_, i) => (
              <button
                key={i}
                className={'version-tab' + (contentIdx === i ? ' active' : '')}
                onClick={() => switchVersion('content', i)}
              >
                {(i + 1) + '차'}
              </button>
            ))}
            <span className="version-current">{'현재: ' + (contentIdx + 1) + '차'}</span>
          </div>
        )}

        <textarea
          className="reason-textarea"
          value={data.mainContent || ''}
          onChange={(e) => onUpdate('mainContent', e.target.value)}
          placeholder={'주요내용을 기술합니다.\n\n가. 조례안 제정의 목적과 정의를 규정함(안 제1조 ~ 제2조).\n나. …에 관한 사항을 규정함(안 제3조 ~ 제6조).\n다. …'}
          rows={10}
        />
      </div>

      <div className="step-footer">
        <button className="btn btn-outline" onClick={onPrev}>이전</button>
        <button className="btn btn-primary" onClick={onNext}>
          {data.type === '제정' ? 'STEP 6로' : 'STEP 5로'}
        </button>
      </div>
    </div>
  )
}

/* ─── AI 초안 생성 (임시 — Claude API 연동 전) ─── */
function generateReasonDraft(data) {
  const title = data.title || '○○'
  const artCount = data.articles ? data.articles.length : 0

  if (data.type === '제정') {
    return '…의 필요성이 증대됨에 따라 ' + title + '에 관한 사항을 규정하여 ' +
      '도민의 삶의 질 향상과 지역사회 발전에 기여하고자 함.\n\n' +
      '「…법」 제○조에 정부와 지방자치단체가 관련 시책을 추진할 수 있는 ' +
      '근거규정이 마련됨에 따라 경기도 차원의 체계적 지원 근거를 마련하고자 함.'
  }
  return '현행 조례의 일부 규정이 상위법령 개정 사항을 반영하지 못하고 있어 ' +
    '이를 정비하고, 실효성 있는 지원 체계를 구축하기 위하여 관련 내용을 개정하고자 함.'
}

function generateContentDraft(data) {
  if (!data.articles || data.articles.length === 0) {
    return '가. (조문편집 완료 후 자동 생성됩니다.)'
  }

  const lines = []
  const chars = ['가', '나', '다', '라', '마', '바', '사', '아']
  let ci = 0

  data.articles.forEach((art, i) => {
    if (i === 0 || (i > 0 && art.title !== data.articles[i - 1].title)) {
      const start = '안 제' + art.number + '조'
      let end = start

      // 같은 그룹의 마지막 조 찾기
      let j = i + 1
      while (j < data.articles.length) {
        j++
      }
      if (j - 1 > i) {
        end = '제' + data.articles[j - 1].number + '조'
      }

      const range = i === data.articles.length - 1
        ? '(' + start + ')'
        : '(' + start + ' ~ ' + end + ')'

      const desc = art.title
        ? art.title + '에 관한 사항을 규정함'
        : '관련 사항을 규정함'

      if (ci < chars.length) {
        lines.push(chars[ci] + '. ' + desc + range + '.')
        ci++
      }
    }
  })

  return lines.join('\n')
}
