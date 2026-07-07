import { useState, useEffect } from 'react'

내보내기 기본 함수 Phase2Report({ searchData, onNext, onBack, selectedRefs, onSelectRefs }) {
  const [로딩, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [sections, setSections] = useState({ local: true, upper: true, other: true })

  useEffect(() => {
    검색 데이터가 있고 보고서가 아닌 경우 {
      generateReport()
    }
  }, [searchData])

  const generateReport = async () => {
    setLoading(true)

    // TODO: 실제 Claude API 캐스팅 (Cloudflare Worker 경유)
    // 현재는 검색 결과 기반으로 구조화된 보고서 작성을 생성했습니다.
    setTimeout(() => {
      const r = buildReportFromSearchData(searchData)
      setReport(r)
      setLoading(false)
    }, 1500)
  }

  const toggleSection = (key) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  로딩 중이면 {
    반품 (
      <div className="report-loading">
        <h3 className="report-loading-title">AI 보고서 생성 중</h3>
        <div className="보고서 로딩 단계">
          <LoadingStep done label="경기도 기존 조례 분석" />
          <LoadingStep done label="상위법령 조 관련문 분석" />
          <LoadingStep label="타시험 조례 분석 중..." />
        </div>
      </div>
    )
  }

  만약 (!report)이면 null을 반환합니다.

  반품 (
    <div className="phase2">
      {/* 보고서 헤더 */}
      <div className="보고서 헤더">
        <div className="report-header-left">
          <h2 className="report-title">AI 분석 보고서</h2>
          <p className="report-meta">
            검색 키워드: {report.keywords.join(' + ')} | 분석 기간: {formatTimestamp(report.timestamp)}
          </p>
        </div>
        <div className="report-header-actions">
          <button className="btn btn-text" onClick={onBack}>
            다시 검색
          </버튼>
        </div>
      </div>

      {/* 비교의견 */}
      <div className="보고서 요약">
        <h3 className="report-section-title-main">종합의견</h3>
        <div className="보고서 요약 본문">
          {report.summary.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* 경기도 기존 조례 분석 */}
      <div className="보고서 섹션">
        <button className="report-section-header" onClick={() => toggleSection('local')}>
          <h3 className="report-section-title">경기도 기존 조례 분석</h3>
          <span className="report-section-toggle">{sections.local ? '접기' : '건너뛰기'}</span>
        </버튼>
        {sections.local && (
          <div className="보고서 섹션 본문">
            <p className="report-section-comment">{report.localComment}</p>
            {report.localItems.length > 0 ? (
              <테이블 className="보고서 테이블">
                <제목>
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
              </테이블>
            ) : (
              <p className="report-empty">해당 키워드와 관련 경기도 조례가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 상위법령 분석 */}
      <div className="보고서 섹션">
        <button className="보고서 섹션 헤더" onClick={() => toggleSection('upper')}>
          <h3 className="report-section-title">상위법령 분석</h3>
          <span className="report-section-toggle">{sections.upper ? '접기' : '건너뛰기'}</span>
        </버튼>
        {섹션 상단 && (
          <div className="보고서 섹션 본문">
            <p className="보고서 섹션 댓글">{보고서.상단 댓글}</p>
            {report.upperItems.length > 0 ? (
              <테이블 className="보고서 테이블">
                <제목>
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
              </테이블>
            ) : (
              <p className="report-empty">해당 캠프와 상위법령이 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 타공격 조례 현황 */}
      <div className="보고서 섹션">
        <button className="보고서 섹션 헤더" onClick={() => toggleSection('기타')}>
          <h3 className="report-section-title">타공격 조례 현황</h3>
          <span className="report-section-toggle">{sections.other ? '접기' : '건너뛰기'}</span>
        </버튼>
        {sections.other && (
          <div className="보고서 섹션 본문">
            <p className="보고서 섹션 댓글">{보고서.기타 댓글}</p>
            {report.otherItems.length > 0 ? (
              <테이블 className="보고서 테이블">
                <제목>
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
              </테이블>
            ) : (
              <p className="report-empty">해당 캠프와 관련 타행위 조례가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 참고할 조례 선택 */}
      {report && report.otherItems.length > 0 && (
        <div className="ref-select-section">
          <h3 className="ref-select-title">참고할 조례 선택</h3>
          <p className="ref-select-desc">
            조례 작성 시 노트할 타 시도 조례를 선택하세요.
            선택 조례를 AI가 참고하여 조문을 생성합니다.
            선택하지 않으면 기본 방식으로 생성됩니다.
          </p>
          <div className="ref-select-list">
            {report.otherItems.map((item, i) => {
              const isSelected = (selectedRefs || []).find(r => r.name === item.name)
              반품 (
                <label key={i} className={'ref-select-item' + (isSelected ? ' selected' : '')}>
                  입력
                    type="checkbox"
                    checked={!!isSelected}
                    onChange={() => {
                      const current = selectedRefs || []
                      선택되었다면 {
                        onSelectRefs(current.filter(r => r.name !== item.name))
                      } 또 다른 {
                        onSelectRefs([...current, item])
                      }
                    }}
                  />
                  <span className="ref-select-name">{item.name}</span>
                  <span className="ref-select-org">{item.org}</span>
                </label>
              )
            })}
          </div>
          {(selectedRefs || []).length > 0 && (
            <p className="ref-select-count">{(selectedRefs || []).length}건 선택됨</p>
          )}
        </div>
      )}

      {/* 다음 단계 */}
      <div className="report-footer">
        <button className="btn btn-primary" onClick={onNext}>
          조례 작성으로 진행
        </버튼>
      </div>
    </div>
  )
}

/* ─── 구성요소 ─── */

function LoadingStep({ done, label }) {
  반품 (
    <div className={`loading-step ${done ? 'done' : 'active'}`}>
      <span className="loading-step-icon">{완료 ? '✓' : '·'}</span>
      <span>{label}</span>
    </div>
  )
}

function renderRelevance(level) {
  레벨이 아니면 '-'를 반환합니다.
  const filled = Math.min(level, 3)
  '●'.repeat(filled) + '○'.repeat(3 - filled)를 반환합니다.
}

/* ─── 유틸 ─── */

함수 formatDate(d) {
  d의 길이가 8이 아니면 d에 '-'를 반환합니다.
  `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`을 반환합니다.
}

함수 formatTimestamp(ts) {
  const d = new Date(ts)
  `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`를 반환합니다.
}

/**
 * 검색 결과 보고서 생성
 * TODO: Claude API 캐스팅 시 AI가 이 구조를 채움
 */
function buildReportFromSearchData(data) {
  const kws = data.keywords.join(' ')
  const localItems = (data.localOrdinances?.items || []).map(item => ({
    ...목,
    관련성: 2,
    메모: '',
  }))
  const upperItems = (data.upperLaws?.items || []).map(item => ({
    ...목,
    관련 기사: '',
  }))
  const otherItems = (data.otherRegions?.items || [])

  const localCount = localItems.length
  const upperCount = upperItems.length
  const otherCount = otherItems.length

  // 종합의견 (AI 캐스팅 전 기본설명)
  const summary = []
  localCount가 0이면 {
    summary.push(`경기도에 "${kws}" 관련 조례가 현재 존재하지 않습니다. 새로운 연결을 검토할 수 있습니다.`)
  } 또 다른 {
    summary.push(`경기도에 "${kws}" 관련 조례가 ${localCount}건 확인이 됩니다. 기존 조례 관계를 검토하여 수신기 또는 관계 여부에 관계할 필요가 있습니다.`)
  }
  상한 개수가 0보다 크면 {
    summary.push(`관련법령이 ${upperCount}건이 연결되어 있습니다.
  }
  (otherCount > 0인 경우) {
    summary.push(`타 시도에서 동일한 조례가 ${otherCount}건 확인이 이루어졌습니다. 문 구성 시 참고할 수 있습니다.`)
  }
  summary.push('※ 이 보고서는 검색 결과를 기반으로 자동 생성된 것입니다. Claude AI 분석이 사건에 관한 것보다 정밀한 분석이 제공됩니다.')

  반품 {
    키워드: 데이터.키워드,
    타임스탬프: data.timestamp,
    요약,
    localComment: localCount > 0
      ? `총 ${localCount}건의 관련 조례가 확인되었습니다.`
      : `"${kws}" 관련 경기도 조례가 없습니다.`,
    로컬 아이템,
    상단 댓글: 상단 개수 > 0
      ? `조례의 장거리 이동이 가능하도록 ${upperCount}건이 확인되었습니다.`
      : `직접적인 관련 상위법령이 검색되었습니다.`,
    상위 항목,
    기타 의견: 기타 개수 > 0
      ? `전국 광역자치단체 중 ${otherCount}건과 유사한 조례가 확인되었습니다.`
      : `같은 조례가 검색되었습니다.`,
    기타 항목,
  }
}
