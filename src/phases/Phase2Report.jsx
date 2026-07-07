import { useState, useEffect } from 'react'

export default function Phase2Report({ searchData, onNext, onBack }) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [sections, setSections] = useState({ local: true, upper: true, other: true })

  useEffect(() => {
    if (searchData && !report) {
      generateReport()
    }
  }, [searchData])

  const generateReport = async () => {
    setLoading(true)

    // TODO: 실제 Claude API 연동 (Cloudflare Worker 프록시 경유)
    // 현재는 검색 결과 기반으로 구조화된 리포트 틀을 생성
    setTimeout(() => {
      const r = buildReportFromSearchData(searchData)
      setReport(r)
      setLoading(false)
    }, 1500)
  }

  const toggleSection = (key) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleExportWord = () => {
    // TODO: docx.js를 이용한 Word 내보내기 (1-6 작업에서 구현)
    alert('Word 내보내기 기능은 추후 구현됩니다.')
  }

  if (loading) {
    return (
      <div className="report-loading">
        <h3 className="report-loading-title">AI 분석 리포트 생성 중</h3>
        <div className="report-loading-steps">
          <LoadingStep done label="경기도 기존 조례 분석" />
          <LoadingStep done label="상위법령 관련 조문 분석" />
          <LoadingStep label="타 시도 조례 비교 분석 중..." />
        </div>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="phase2">
      {/* 리포트 헤더 */}
      <div className="report-header">
        <div className="report-header-left">
          <h2 className="report-title">AI 분석 리포트</h2>
          <p className="report-meta">
            검색 키워드: {report.keywords.join(' + ')} | 분석 일시: {formatTimestamp(report.timestamp)}
          </p>
        </div>
        <div className="report-header-actions">
          <button className="btn btn-outline" onClick={handleExportWord}>
            Word 내보내기 (.docx)
          </button>
          <button className="btn btn-text" onClick={onBack}>
            다시 검색
          </button>
        </div>
      </div>

      {/* 종합의견 */}
      <div className="report-summary">
        <h3 className="report-section-title-main">종합의견</h3>
        <div className="report-summary-body">
          {report.summary.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* 경기도 기존 조례 분석 */}
      <div className="report-section">
        <button className="report-section-header" onClick={() => toggleSection('local')}>
          <h3 className="report-section-title">경기도 기존 조례 분석</h3>
          <span className="report-section-toggle">{sections.local ? '접기' : '펼치기'}</span>
        </button>
        {sections.local && (
          <div className="report-section-body">
            <p className="report-section-comment">{report.localComment}</p>
            {report.localItems.length > 0 ? (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>조례명</th>
                    <th style={{width:80}}>관련성</th>
                    <th>비고</th>
                    <th style={{width:70}}>원문</th>
                  </tr>
                </thead>
                <tbody>
                  {report.localItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td className="td-center">{renderRelevance(item.relevance)}</td>
                      <td className="td-sub">{item.note}</td>
                      <td className="td-center">
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">보기</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="report-empty">해당 키워드와 관련된 경기도 조례가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 상위법령 분석 */}
      <div className="report-section">
        <button className="report-section-header" onClick={() => toggleSection('upper')}>
          <h3 className="report-section-title">상위법령 분석</h3>
          <span className="report-section-toggle">{sections.upper ? '접기' : '펼치기'}</span>
        </button>
        {sections.upper && (
          <div className="report-section-body">
            <p className="report-section-comment">{report.upperComment}</p>
            {report.upperItems.length > 0 ? (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>법령명</th>
                    <th>구분</th>
                    <th>관련 조문</th>
                    <th style={{width:70}}>원문</th>
                  </tr>
                </thead>
                <tbody>
                  {report.upperItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td className="td-sub">{item.type}</td>
                      <td className="td-sub">{item.relatedArticle || '-'}</td>
                      <td className="td-center">
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">보기</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="report-empty">해당 키워드와 관련된 상위법령이 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 타 시도 조례 현황 */}
      <div className="report-section">
        <button className="report-section-header" onClick={() => toggleSection('other')}>
          <h3 className="report-section-title">타 시도 조례 현황</h3>
          <span className="report-section-toggle">{sections.other ? '접기' : '펼치기'}</span>
        </button>
        {sections.other && (
          <div className="report-section-body">
            <p className="report-section-comment">{report.otherComment}</p>
            {report.otherItems.length > 0 ? (
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{width:110}}>자치단체</th>
                    <th>조례명</th>
                    <th style={{width:90}}>시행일</th>
                    <th style={{width:70}}>원문</th>
                  </tr>
                </thead>
                <tbody>
                  {report.otherItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item.org}</td>
                      <td>{item.name}</td>
                      <td className="td-sub">{formatDate(item.date)}</td>
                      <td className="td-center">
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">보기</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="report-empty">해당 키워드와 관련된 타 시도 조례가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 다음 단계 */}
      <div className="report-footer">
        <button className="btn btn-primary" onClick={onNext}>
          조례 작성으로 진행
        </button>
      </div>
    </div>
  )
}

/* ─── 보조 컴포넌트 ─── */

function LoadingStep({ done, label }) {
  return (
    <div className={`loading-step ${done ? 'done' : 'active'}`}>
      <span className="loading-step-icon">{done ? '✓' : '·'}</span>
      <span>{label}</span>
    </div>
  )
}

function renderRelevance(level) {
  if (!level) return '-'
  const filled = Math.min(level, 3)
  return '●'.repeat(filled) + '○'.repeat(3 - filled)
}

/* ─── 유틸 ─── */

function formatDate(d) {
  if (!d || d.length !== 8) return d || '-'
  return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`
}

function formatTimestamp(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`
}

/**
 * 검색 결과로부터 리포트 구조 생성
 * TODO: Claude API 연동 시 AI가 이 구조를 채움
 */
function buildReportFromSearchData(data) {
  const kws = data.keywords.join(' ')
  const localItems = (data.localOrdinances?.items || []).map(item => ({
    ...item,
    relevance: 2,
    note: '',
  }))
  const upperItems = (data.upperLaws?.items || []).map(item => ({
    ...item,
    relatedArticle: '',
  }))
  const otherItems = (data.otherRegions?.items || [])

  const localCount = localItems.length
  const upperCount = upperItems.length
  const otherCount = otherItems.length

  // 종합의견 (AI 연동 전 기본 텍스트)
  const summary = []
  if (localCount === 0) {
    summary.push(`경기도에 "${kws}" 관련 조례가 현재 존재하지 않습니다. 신규 제정을 검토할 수 있습니다.`)
  } else {
    summary.push(`경기도에 "${kws}" 관련 조례가 ${localCount}건 확인됩니다. 기존 조례와의 관계를 검토하여 제정 또는 개정 여부를 판단할 필요가 있습니다.`)
  }
  if (upperCount > 0) {
    summary.push(`관련 상위법령이 ${upperCount}건 확인됩니다. 조례 제정 시 근거 법령으로 활용할 수 있습니다.`)
  }
  if (otherCount > 0) {
    summary.push(`타 시도에서 유사 조례가 ${otherCount}건 확인됩니다. 조문 구성 시 참고할 수 있습니다.`)
  }
  summary.push('※ 이 리포트는 검색 결과를 기반으로 자동 생성된 것입니다. Claude AI 분석이 연동되면 보다 정밀한 분석이 제공됩니다.')

  return {
    keywords: data.keywords,
    timestamp: data.timestamp,
    summary,
    localComment: localCount > 0
      ? `총 ${localCount}건의 관련 조례가 확인되었습니다.`
      : `"${kws}" 관련 경기도 조례가 없습니다.`,
    localItems,
    upperComment: upperCount > 0
      ? `조례 제정의 근거가 될 수 있는 법령 ${upperCount}건이 확인되었습니다.`
      : `직접적인 관련 상위법령이 검색되지 않았습니다.`,
    upperItems,
    otherComment: otherCount > 0
      ? `전국 광역자치단체 중 ${otherCount}건의 유사 조례가 확인되었습니다.`
      : `타 시도에서 유사 조례가 검색되지 않았습니다.`,
    otherItems,
  }
}
