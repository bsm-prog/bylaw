import { useState, useEffect } from 'react'
import { searchAll, testConnection } from '../api/lawApi'

const RECENT_SEARCHES_KEY = 'ord-drafter-recent'

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]') }
  catch { return [] }
}

function saveRecent(keywords) {
  const label = keywords.filter(Boolean).join(' + ')
  if (!label) return
  const list = [label, ...getRecent().filter(r => r !== label)].slice(0, 8)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list))
}

export default function Phase1Search({ searchData, onSearchComplete, onNext }) {
  const [kw1, setKw1] = useState('')
  const [kw2, setKw2] = useState('')
  const [kw3, setKw3] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState(searchData)
  const [recent, setRecent] = useState(getRecent)
  const [apiStatus, setApiStatus] = useState(null) // null | 'connected' | 'error'
  const [error, setError] = useState(null)

  // 초기 API 연결 테스트
  useEffect(() => {
    testConnection().then(r => setApiStatus(r.connected ? 'connected' : 'error'))
  }, [])

  const handleSearch = async () => {
    const keywords = [kw1, kw2, kw3].filter(Boolean)
    if (keywords.length === 0) return

    setSearching(true)
    setError(null)
    saveRecent(keywords)
    setRecent(getRecent())

    try {
      const data = await searchAll(keywords)
      setResults(data)
      onSearchComplete(data)

      // 결과 영역으로 스크롤
      setTimeout(() => {
        document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleRecentClick = (label) => {
    const parts = label.split(' + ')
    setKw1(parts[0] || '')
    setKw2(parts[1] || '')
    setKw3(parts[2] || '')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="phase1">
      {/* API 연결 상태 */}
      {apiStatus === 'connected' && (
        <div className="api-status connected">
          연결 성공 (Cloudflare Worker) — 검색 기능 사용 가능
        </div>
      )}
      {apiStatus === 'error' && (
        <div className="api-status disconnected" onClick={() => window.open('https://lawgill.papy98.workers.dev', '_blank')}>
          API 연결 오류 — 클릭하여 Cloudflare Worker 상태를 확인하세요
        </div>
      )}

      {/* 검색 영역 */}
      <div className="search-box">
        <h2 className="search-title">어떤 조례를 만드시나요?</h2>

        <div className="search-fields">
          <div className="search-field">
            <label className="search-label">
              키워드 1 <span className="search-required">필수</span>
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="예: 청년"
              value={kw1}
              onChange={e => setKw1(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="search-field">
            <label className="search-label">
              키워드 2 <span className="search-optional">선택</span>
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="예: 1인가구"
              value={kw2}
              onChange={e => setKw2(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="search-field">
            <label className="search-label">
              키워드 3 <span className="search-optional">선택</span>
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="예: 주거지원"
              value={kw3}
              onChange={e => setKw3(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className="search-actions">
          <button
            className="btn btn-primary search-btn"
            onClick={handleSearch}
            disabled={!kw1.trim() || searching}
          >
            {searching ? '검색 중...' : '검색'}
          </button>

          <p className="search-guide">
            키워드가 많을수록 검색이 구체적입니다.
            1개는 넓은 범위, 2개는 주제 특정, 3개는 정밀 검색입니다.
          </p>
        </div>

        {/* 최근 검색 */}
        {recent.length > 0 && (
          <div className="recent-searches">
            <span className="recent-label">최근 검색</span>
            <div className="recent-list">
              {recent.map((label, i) => (
                <button key={i} className="recent-item" onClick={() => handleRecentClick(label)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 오류 표시 */}
      {error && (
        <div className="api-status disconnected" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      {results && (
        <div className="search-results" id="search-results">
          <div className="results-header">
            <h3 className="results-title">
              "{results.keywords.join('" + "')}" 검색 결과
            </h3>
            <button
              className="btn btn-text"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              다시 검색
            </button>
          </div>

          {/* 경기도 기존 조례 */}
          <ResultSection
            title="경기도 기존 조례"
            data={results.localOrdinances}
            type="ordin"
          />

          {/* 상위법령 */}
          <ResultSection
            title="상위법령"
            data={results.upperLaws}
            type="law"
          />

          {/* 타 시도 조례 */}
          <ResultSection
            title="타 시도 조례"
            data={results.otherRegions}
            type="ordin"
          />

          {/* 다음 단계 */}
          <div className="results-footer">
            <button className="btn btn-primary" onClick={onNext}>
              AI 분석 리포트 생성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultSection({ title, data, type }) {
  const [collapsed, setCollapsed] = useState(false)
  const items = data?.items || []
  const count = items.length

  return (
    <div className="result-section">
      <button className="result-section-header" onClick={() => setCollapsed(!collapsed)}>
        <h4 className="result-section-title">
          {title}
          <span className="result-section-count">{count}건</span>
        </h4>
        <span className="result-section-toggle">{collapsed ? '펼치기' : '접기'}</span>
      </button>
      {!collapsed && (
        <div className="result-section-body">
          {count === 0 ? (
            <p className="result-empty">검색 결과가 없습니다.</p>
          ) : (
            items.map((item, i) => (
              <div key={i} className="result-item">
                <div className="result-item-info">
                  <span className="result-item-name">{item.name}</span>
                  {item.org && <span className="result-item-org">{item.org}</span>}
                  {item.type && <span className="result-item-date">{item.type}</span>}
                  {item.date && <span className="result-item-date">{formatDate(item.date)}</span>}
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="result-item-link">
                    원문 보기
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function formatDate(d) {
  if (!d || d.length !== 8) return d
  return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`
}
