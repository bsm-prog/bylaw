/**
 * 법제처 Open API 연동 모듈
 * Cloudflare Worker 프록시를 통해 CORS 우회
 */

const PROXY_BASE = 'https://lawgill.papy98.workers.dev'
const OC = 'bitsam24'
const API_BASE = 'https://www.law.go.kr/DRF/lawSearch.do'

// 경기도 기관코드
const ORG_GYEONGGI = '6410000'

// 광역자치단체 기관코드
const METRO_ORGS = {
  '서울특별시': '6110000',
  '부산광역시': '6260000',
  '대구광역시': '6270000',
  '인천광역시': '6280000',
  '광주광역시': '6290000',
  '대전광역시': '6300000',
  '울산광역시': '6310000',
  '세종특별자치시': '6360000',
  '경기도': '6410000',
  '강원특별자치도': '6420000',
  '충청북도': '6430000',
  '충청남도': '6440000',
  '전북특별자치도': '6450000',
  '전라남도': '6460000',
  '경상북도': '6470000',
  '경상남도': '6480000',
  '제주특별자치도': '6500000',
}

/**
 * 프록시를 통한 API 호출
 */
async function fetchViaProxy(apiUrl) {
  const proxyUrl = `${PROXY_BASE}/?url=${encodeURIComponent(apiUrl)}`
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`)
  const text = await res.text()
  return parseXML(text)
}

/**
 * XML 파싱 (브라우저 DOMParser 활용)
 */
function parseXML(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')

  // 에러 체크
  const error = doc.querySelector('r')
  if (error && doc.querySelector('msg')) {
    throw new Error(error.textContent)
  }

  return doc
}

/**
 * XML에서 검색 결과 목록 추출
 */
function extractItems(doc, target) {
  const totalCnt = doc.querySelector('totalCnt')?.textContent || '0'
  const items = []

  if (target === 'ordin') {
    doc.querySelectorAll('law').forEach(law => {
      items.push({
        id: law.querySelector('자치법규ID')?.textContent || '',
        name: law.querySelector('자치법규명')?.textContent || '',
        org: law.querySelector('자치단체명')?.textContent || '',
        type: law.querySelector('자치법규분류')?.textContent || '',
        date: law.querySelector('공포일자')?.textContent || '',
        serial: law.querySelector('자치법규일련번호')?.textContent || '',
        url: '',
      })
    })
  } else if (target === 'law') {
    doc.querySelectorAll('law').forEach(law => {
      items.push({
        id: law.querySelector('법령ID')?.textContent || '',
        mst: law.querySelector('법령일련번호')?.textContent || '',
        name: law.querySelector('법령명한글')?.textContent || '',
        type: law.querySelector('법령구분명')?.textContent || '',
        date: law.querySelector('시행일자')?.textContent || '',
        url: '',
      })
    })
  }

  // 원문 링크 생성
  items.forEach(item => {
    if (target === 'ordin' && item.serial) {
      item.url = `https://www.law.go.kr/자치법규/자치법규내용조회/${item.serial}`
    } else if (target === 'law' && item.mst) {
      item.url = `https://www.law.go.kr/법령/${encodeURIComponent(item.name)}`
    }
  })

  return { totalCnt: parseInt(totalCnt), items }
}

/**
 * API URL 생성
 */
function buildApiUrl(params) {
  const url = new URL(API_BASE)
  url.searchParams.set('OC', OC)
  url.searchParams.set('type', 'XML')
  Object.entries(params).forEach(([key, val]) => {
    if (val) url.searchParams.set(key, val)
  })
  return url.toString()
}

/* ─── 공개 API 함수 ─── */

/**
 * 경기도 기존 조례 검색
 */
export async function searchGyeonggiOrdinances(query, display = 20) {
  const apiUrl = buildApiUrl({
    target: 'ordin',
    query,
    display: String(display),
    org: ORG_GYEONGGI,
  })
  const doc = await fetchViaProxy(apiUrl)
  return extractItems(doc, 'ordin')
}

/**
 * 상위법령 검색
 */
export async function searchUpperLaws(query, display = 20) {
  const apiUrl = buildApiUrl({
    target: 'law',
    query,
    display: String(display),
  })
  const doc = await fetchViaProxy(apiUrl)
  return extractItems(doc, 'law')
}

/**
 * 타 시도 조례 검색 (경기도 제외 전국)
 */
export async function searchOtherRegionOrdinances(query, display = 20) {
  // 전체 자치법규 검색 후 경기도 제외
  const apiUrl = buildApiUrl({
    target: 'ordin',
    query,
    display: String(display),
  })
  const doc = await fetchViaProxy(apiUrl)
  const result = extractItems(doc, 'ordin')

  // 경기도 제외 + 광역자치단체만 필터
  const metroNames = Object.keys(METRO_ORGS)
  result.items = result.items.filter(item =>
    item.org !== '경기도' && metroNames.some(name => item.org?.includes(name.replace(/특별|광역|자치/g, '').slice(0, 2)))
  )

  return result
}

/**
 * 키워드 3종 통합 검색
 */
export async function searchAll(keywords) {
  const query = keywords.filter(Boolean).join(' ')

  try {
    const [local, upper, others] = await Promise.allSettled([
      searchGyeonggiOrdinances(query),
      searchUpperLaws(query),
      searchOtherRegionOrdinances(query, 50),
    ])

    return {
      keywords,
      timestamp: new Date().toISOString(),
      localOrdinances: local.status === 'fulfilled' ? local.value : { totalCnt: 0, items: [] },
      upperLaws: upper.status === 'fulfilled' ? upper.value : { totalCnt: 0, items: [] },
      otherRegions: others.status === 'fulfilled' ? others.value : { totalCnt: 0, items: [] },
      errors: [local, upper, others]
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message || '알 수 없는 오류'),
    }
  } catch (err) {
    throw new Error(`검색 중 오류가 발생했습니다: ${err.message}`)
  }
}

/**
 * 조례 전문(본문) 조회
 */
export async function getOrdinanceDetail(serial) {
  const apiUrl = buildApiUrl({
    target: 'ordin',
    MST: serial,
    type: 'XML',
  })
  const doc = await fetchViaProxy(apiUrl)
  return doc
}

/**
 * API 연결 테스트
 */
export async function testConnection() {
  try {
    const apiUrl = buildApiUrl({
      target: 'ordin',
      query: '청년',
      display: '1',
    })
    await fetchViaProxy(apiUrl)
    return { connected: true }
  } catch (err) {
    return { connected: false, error: err.message }
  }
}
