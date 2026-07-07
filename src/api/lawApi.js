/**
 * 법제처 Open API 연동 모듈
 * Cloudflare Worker 프록시를 통해 CORS 우회
 */

const PROXY_BASE = 'https://lawgill.papy98.workers.dev'
const OC = 'bitsam24'
const API_BASE = 'https://www.law.go.kr/DRF/lawSearch.do'

const ORG_GYEONGGI = '6410000'

/**
 * 프록시를 통한 API 호출
 */
async function fetchViaProxy(apiUrl) {
  const proxyUrl = PROXY_BASE + '/?url=' + encodeURIComponent(apiUrl)
  console.log('[lawApi] 호출:', apiUrl)
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error('API 요청 실패: ' + res.status)
  const text = await res.text()
  console.log('[lawApi] 응답 길이:', text.length)
  return text
}

/**
 * XML 파싱 (브라우저 DOMParser 활용)
 */
function parseXML(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  return doc
}

/**
 * 자치법규 검색 결과 추출
 */
function extractOrdinItems(xmlText) {
  const doc = parseXML(xmlText)
  const totalCnt = doc.querySelector('totalCnt')?.textContent || '0'
  const items = []

  doc.querySelectorAll('law').forEach(function(law) {
    var name = law.querySelector('자치법규명')
    var org = law.querySelector('자치단체명')
    var type = law.querySelector('자치법규분류')
    var date = law.querySelector('공포일자')
    var serial = law.querySelector('자치법규일련번호')

    items.push({
      id: serial?.textContent || '',
      name: name?.textContent || '',
      org: org?.textContent || '',
      type: type?.textContent || '',
      date: date?.textContent || '',
      serial: serial?.textContent || '',
      url: serial?.textContent
        ? 'https://www.law.go.kr/자치법규/' + encodeURIComponent(name?.textContent || '')
        : '',
    })
  })

  console.log('[lawApi] 자치법규 추출:', items.length, '건')
  return { totalCnt: parseInt(totalCnt), items }
}

/**
 * 법령 검색 결과 추출
 */
function extractLawItems(xmlText) {
  const doc = parseXML(xmlText)
  const totalCnt = doc.querySelector('totalCnt')?.textContent || '0'
  const items = []

  doc.querySelectorAll('law').forEach(function(law) {
    // 여러 가능한 태그명 시도
    var name = law.querySelector('법령명한글') || law.querySelector('법령명')
    var id = law.querySelector('법령ID') || law.querySelector('법령아이디')
    var mst = law.querySelector('법령일련번호') || law.querySelector('법령MST')
    var type = law.querySelector('법령구분명') || law.querySelector('법령종류')
    var date = law.querySelector('시행일자') || law.querySelector('공포일자')

    if (name?.textContent) {
      items.push({
        id: id?.textContent || '',
        mst: mst?.textContent || '',
        name: name?.textContent || '',
        type: type?.textContent || '',
        date: date?.textContent || '',
        url: 'https://www.law.go.kr/법령/' + encodeURIComponent(name?.textContent || ''),
      })
    }
  })

  console.log('[lawApi] 법령 추출:', items.length, '건')
  return { totalCnt: parseInt(totalCnt), items }
}

/**
 * API URL 생성
 */
function buildUrl(params) {
  var parts = [
    API_BASE,
    '?OC=' + OC,
    '&type=XML',
  ]
  Object.keys(params).forEach(function(key) {
    if (params[key]) {
      parts.push('&' + key + '=' + encodeURIComponent(params[key]))
    }
  })
  return parts.join('')
}

/* ─── 공개 API 함수 ─── */

/**
 * 경기도 기존 조례 검색
 */
export async function searchGyeonggiOrdinances(query, display) {
  var apiUrl = buildUrl({
    target: 'ordin',
    query: query,
    display: String(display || 20),
    org: ORG_GYEONGGI,
  })
  var text = await fetchViaProxy(apiUrl)
  return extractOrdinItems(text)
}

/**
 * 상위법령 검색
 */
export async function searchUpperLaws(query, display) {
  var apiUrl = buildUrl({
    target: 'law',
    query: query,
    display: String(display || 20),
  })
  var text = await fetchViaProxy(apiUrl)
  return extractLawItems(text)
}

/**
 * 타 시도 조례 검색 (경기도 제외)
 */
export async function searchOtherRegionOrdinances(query, display) {
  var apiUrl = buildUrl({
    target: 'ordin',
    query: query,
    display: String(display || 100),
  })
  var text = await fetchViaProxy(apiUrl)
  var result = extractOrdinItems(text)

  // 경기도 제외만 적용 (광역/기초 모두 포함)
  result.items = result.items.filter(function(item) {
    return item.org.indexOf('경기도') === -1
  })

  console.log('[lawApi] 타 시도 필터 후:', result.items.length, '건')
  return result
}

/**
 * 키워드 3종 통합 검색
 */
export async function searchAll(keywords) {
  var query = keywords.filter(Boolean).join(' ')

  try {
    var results = await Promise.allSettled([
      searchGyeonggiOrdinances(query),
      searchUpperLaws(query),
      searchOtherRegionOrdinances(query, 100),
    ])

    var local = results[0]
    var upper = results[1]
    var others = results[2]

    if (local.status === 'rejected') console.warn('[lawApi] 경기도 조례 검색 실패:', local.reason)
    if (upper.status === 'rejected') console.warn('[lawApi] 상위법령 검색 실패:', upper.reason)
    if (others.status === 'rejected') console.warn('[lawApi] 타 시도 검색 실패:', others.reason)

    return {
      keywords: keywords,
      timestamp: new Date().toISOString(),
      localOrdinances: local.status === 'fulfilled' ? local.value : { totalCnt: 0, items: [] },
      upperLaws: upper.status === 'fulfilled' ? upper.value : { totalCnt: 0, items: [] },
      otherRegions: others.status === 'fulfilled' ? others.value : { totalCnt: 0, items: [] },
      errors: results
        .filter(function(r) { return r.status === 'rejected' })
        .map(function(r) { return r.reason?.message || '알 수 없는 오류' }),
    }
  } catch (err) {
    throw new Error('검색 중 오류: ' + err.message)
  }
}

/**
 * API 연결 테스트
 */
export async function testConnection() {
  try {
    var apiUrl = buildUrl({
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
