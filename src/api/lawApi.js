/**
 * 법제처 Open API 연동 모듈
 * Cloudflare Worker 프록시를 통해 CORS 우회
 */

var PROXY_BASE = 'https://lawgill.papy98.workers.dev'
var OC = 'bitsam24'
var API_BASE = 'https://www.law.go.kr/DRF/lawSearch.do'

var ORG_GYEONGGI = '6410000'

/**
 * 프록시를 통한 API 호출
 */
async function fetchViaProxy(apiUrl) {
  var proxyUrl = PROXY_BASE + '/?url=' + encodeURIComponent(apiUrl)
  console.log('[lawApi] 호출:', apiUrl)
  var res = await fetch(proxyUrl)
  if (!res.ok) throw new Error('API 요청 실패: ' + res.status)
  var text = await res.text()
  console.log('[lawApi] 응답 길이:', text.length)
  return text
}

/**
 * XML 파싱 (브라우저 DOMParser 활용)
 */
function parseXML(xmlText) {
  var parser = new DOMParser()
  var doc = parser.parseFromString(xmlText, 'text/xml')
  return doc
}

/**
 * 자치법규 검색 결과 추출
 */
function extractOrdinItems(xmlText) {
  var doc = parseXML(xmlText)
  var totalCnt = doc.querySelector('totalCnt')?.textContent || '0'
  var items = []

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
  return { totalCnt: parseInt(totalCnt), items: items }
}

/**
 * 법령 검색 결과 추출
 */
function extractLawItems(xmlText) {
  var doc = parseXML(xmlText)
  var totalCnt = doc.querySelector('totalCnt')?.textContent || '0'
  var items = []

  doc.querySelectorAll('law').forEach(function(law) {
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
  return { totalCnt: parseInt(totalCnt), items: items }
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

/**
 * 조례 원문(전문) 조회
 * 항·호·목까지 구조화하여 반환
 *
 * 전략: XML API를 우선 사용 (HTML은 클라이언트 렌더링이라 DOMParser로 파싱 불가)
 *
 * @param {string|object} nameOrObj - 조례명(문자열) 또는 검색결과 객체 {name, serial, id, org}
 *   객체를 전달하면 재검색 없이 serial/id로 직접 상세 조회 (더 빠르고 정확)
 */
export async function getOrdinanceFullText(nameOrObj) {
  try {
    var ordinanceName, serialNum, orgName

    if (typeof nameOrObj === 'object' && nameOrObj !== null) {
      // 객체 전달: 검색 결과에서 serial/id를 이미 알고 있음
      ordinanceName = nameOrObj.name || ''
      serialNum = nameOrObj.serial || nameOrObj.id || ''
      orgName = nameOrObj.org || ''
      console.log('[lawApi] 조례 원문 직접 조회:', ordinanceName, ', serial:', serialNum)
    } else {
      // 문자열 전달: 이름으로 검색해서 serial 확보 (기존 방식)
      ordinanceName = nameOrObj || ''
      console.log('[lawApi] 조례 원문 검색 조회:', ordinanceName)

      var apiUrl = buildUrl({
        target: 'ordin',
        query: ordinanceName,
        display: '1',
      })
      var text = await fetchViaProxy(apiUrl)
      var doc = parseXML(text)

      var serialEl = doc.querySelector('자치법규일련번호')
      if (!serialEl || !serialEl.textContent) {
        console.warn('[lawApi] 조례 일련번호를 찾을 수 없음')
        return null
      }
      serialNum = serialEl.textContent
      orgName = doc.querySelector('자치단체명')?.textContent || ''
    }

    if (!serialNum) {
      console.warn('[lawApi] serial 번호 없음')
      return null
    }
    console.log('[lawApi] 일련번호(MST):', serialNum, ', 자치단체:', orgName)

    // 2단계: XML 본문 조회 (우선)
    var articles = []

    var xmlUrl = 'https://www.law.go.kr/DRF/lawService.do'
      + '?OC=' + OC
      + '&target=ordin'
      + '&type=XML'
      + '&MST=' + serialNum
    console.log('[lawApi] XML 본문 요청')

    var xmlText = await fetchViaProxy(xmlUrl)
    console.log('[lawApi] XML 응답 길이:', xmlText.length,
      ', 조문단위 포함:', xmlText.indexOf('조문단위') >= 0,
      ', 조문번호 포함:', xmlText.indexOf('조문번호') >= 0)

    // 에러 응답 확인
    var isError = xmlText.indexOf('검증에 실패') >= 0
      || xmlText.indexOf('일치하는') >= 0
      || xmlText.length < 300
    if (!isError) {
      var xmlDoc = parseXML(xmlText)
      articles = parseXmlArticles(xmlDoc)
      console.log('[lawApi] XML 파싱 결과:', articles.length, '조')
    } else {
      console.warn('[lawApi] XML 응답 에러 또는 너무 짧음')
    }

    // 3단계: XML 실패 시 ID 파라미터로 재시도
    if (articles.length === 0) {
      console.log('[lawApi] MST 실패, ID로 재시도')
      var xmlUrl2 = 'https://www.law.go.kr/DRF/lawService.do'
        + '?OC=' + OC
        + '&target=ordin'
        + '&type=XML'
        + '&ID=' + serialNum
      try {
        var xmlText2 = await fetchViaProxy(xmlUrl2)
        if (xmlText2.length > 300
          && xmlText2.indexOf('검증에 실패') < 0) {
          var xmlDoc2 = parseXML(xmlText2)
          articles = parseXmlArticles(xmlDoc2)
          console.log('[lawApi] ID 재시도 XML 파싱:', articles.length, '조')
        }
      } catch (e) {
        console.warn('[lawApi] ID 재시도 실패:', e.message)
      }
    }

    // 4단계: XML 파싱 실패 시 HTML 시도 (일부 조례는 HTML만 제공)
    if (articles.length === 0) {
      console.log('[lawApi] XML 파싱 실패, HTML 시도')
      articles = await tryHtmlParsing(serialNum)
    }

    // 전체 텍스트 조합 (AI 전달용)
    var fullText
    if (articles.length === 0) {
      fullText = ''
    } else {
      fullText = articles.map(function(a) {
        var line = a.number
          + (a.title ? '(' + a.title + ')' : '')
          + ' ' + a.content
        a.paragraphs.forEach(function(p) {
          if (p.content) line += '\n' + p.content
          p.items.forEach(function(item, ii) {
            line += '\n  ' + (ii + 1) + '. ' + item.content
            item.subItems.forEach(function(sub, si) {
              var mokLabels = ['가','나','다','라','마','바','사','아','자','차']
              line += '\n    ' + (mokLabels[si] || '?') + '. ' + sub.content
            })
          })
        })
        return line
      }).join('\n\n')
    }

    console.log('[lawApi] 조례 원문 추출 완료:',
      articles.length, '조, fullText 길이:', fullText.length)

    return {
      name: ordinanceName,
      org: orgName,
      fullText: fullText,
      articles: articles,
    }
  } catch (err) {
    console.warn('[lawApi] 조례 원문 조회 실패:', err.message)
    return null
  }
}

/**
 * XML 문서에서 조문 파싱
 * 여러 가능한 태그 구조를 시도
 */
function parseXmlArticles(xmlDoc) {
  var articles = []

  // 방법1: 조문단위 태그 (표준 구조)
  var joUnits = xmlDoc.querySelectorAll('조문단위')
  if (joUnits.length === 0) {
    // 방법2: 조문 > 하위 요소
    joUnits = xmlDoc.querySelectorAll('조문')
  }

  console.log('[lawApi] XML 조문 요소 수:', joUnits.length)

  joUnits.forEach(function(jo) {
    var joNum = ''
    var joTitle = ''
    var joContent = ''

    // 조문번호 (여러 태그명 시도)
    var numEl = jo.querySelector('조문번호')
    if (numEl) joNum = numEl.textContent.trim()

    // 조문제목
    var titleEl = jo.querySelector('조문제목')
    if (titleEl) joTitle = titleEl.textContent.trim()

    // 조문내용
    var contentEl = jo.querySelector('조문내용')
    if (contentEl) joContent = contentEl.textContent.trim()

    // 조문번호가 없으면 건너뛰기
    if (!joNum && !joContent) return

    var paragraphs = []

    // 항 파싱
    jo.querySelectorAll('항').forEach(function(hang) {
      var hangContent = ''
      var hcEl = hang.querySelector('항내용')
      if (hcEl) hangContent = hcEl.textContent.trim()

      var items = []
      hang.querySelectorAll('호').forEach(function(ho) {
        var hoContent = ''
        var hoEl = ho.querySelector('호내용')
        if (hoEl) hoContent = hoEl.textContent.trim()

        var subItems = []
        ho.querySelectorAll('목').forEach(function(mok) {
          var mokContent = ''
          var mokEl = mok.querySelector('목내용')
          if (mokEl) mokContent = mokEl.textContent.trim()
          if (mokContent) subItems.push({ content: mokContent })
        })
        if (hoContent) {
          items.push({ content: hoContent, subItems: subItems })
        }
      })
      paragraphs.push({ content: hangContent, items: items })
    })

    // 항 태그가 없으면 조문내용에서 텍스트 파싱
    if (paragraphs.length === 0 && joContent) {
      paragraphs.push(parseItemsFromText(
        normalizeInlineItems(joContent)
      ))
    }

    articles.push({
      number: joNum,
      title: joTitle,
      content: joContent,
      paragraphs: paragraphs,
    })
  })

  return articles
}

/**
 * HTML 방식 조문 파싱 (XML 실패 시 fallback)
 * HTML은 클라이언트 렌더링이므로 성공률 낮음
 */
async function tryHtmlParsing(serialNum) {
  try {
    var htmlUrl = 'https://www.law.go.kr/DRF/lawService.do'
      + '?OC=' + OC
      + '&target=ordin'
      + '&type=HTML'
      + '&mobileYn=Y'
      + '&MST=' + serialNum

    var htmlText = await fetchViaProxy(htmlUrl)
    console.log('[lawApi] HTML 응답 길이:', htmlText.length)

    // "일치하는 자치법규가 없습니다" 응답인 경우 ID로 재시도
    if (htmlText.indexOf('일치하는') >= 0 && htmlText.length < 200) {
      var htmlUrl2 = 'https://www.law.go.kr/DRF/lawService.do'
        + '?OC=' + OC
        + '&target=ordin'
        + '&type=HTML'
        + '&mobileYn=Y'
        + '&ID=' + serialNum
      htmlText = await fetchViaProxy(htmlUrl2)
    }

    var htmlDoc = new DOMParser().parseFromString(htmlText, 'text/html')
    var bodyEl = htmlDoc.body || htmlDoc.documentElement

    // 모든 블록 요소 뒤에 줄바꿈 삽입
    var blockTags = ['p', 'div', 'br', 'tr', 'li', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    blockTags.forEach(function(tag) {
      bodyEl.querySelectorAll(tag).forEach(function(el) {
        if (tag === 'br') {
          el.replaceWith('\n')
        } else {
          el.insertAdjacentText('afterend', '\n')
        }
      })
    })

    var rawText = (bodyEl.textContent || '').trim()
    console.log('[lawApi] HTML 텍스트 길이:', rawText.length,
      ', 제X조 포함:', /제\d+조/.test(rawText))

    // script/style 내용이 대부분이면 클라이언트 렌더링 페이지
    if (rawText.indexOf('$(document).ready') >= 0
      || rawText.indexOf('mobileOrdinInfoR') >= 0) {
      console.log('[lawApi] 클라이언트 렌더링 감지, HTML 파싱 불가')
      return []
    }

    var normalized = normalizeInlineItems(rawText)
    return parseArticlesFromText(normalized)
  } catch (err) {
    console.warn('[lawApi] HTML 파싱 실패:', err.message)
    return []
  }
}

/**
 * 인라인 호·목을 줄바꿈으로 분리
 * API 응답에서 "같다.1. 항목2. 항목" 형태의 연속 텍스트를 정규화
 */
function normalizeInlineItems(text) {
  if (!text) return ''
  var result = text
  // 호 패턴: 한글/닫는괄호 뒤에 "숫자. " 이 붙어있으면 앞에 줄바꿈
  result = result.replace(/([가-힣)\]])(\d+\.\s)/g, '$1\n$2')
  // 항 패턴: ①②③ 등 앞에 줄바꿈
  result = result.replace(/([^\n])([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/g, '$1\n$2')
  // 목 패턴: "가. ", "나. " 등이 문장 중간에 있으면 분리
  result = result.replace(/([^\n])([가나다라마바사아자차카타파하]\.\s)/g, '$1\n$2')
  return result
}

/**
 * 조문내용 텍스트에서 호·목 파싱
 */
function parseItemsFromText(text) {
  if (!text) return { content: '', items: [] }

  // 먼저 인라인 항목을 줄바꿈으로 분리
  var normalized = normalizeInlineItems(text)
  var lines = normalized.split(/\n/)
  var mainContent = ''
  var items = []
  var currentItem = null

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (!line) continue

    // 호 패턴: "1. ...", "2. ..." 등
    var itemMatch = line.match(/^(\d+)\.\s*(.+)/)
    if (itemMatch) {
      if (currentItem) {
        items.push(currentItem)
      }
      currentItem = { content: itemMatch[2], subItems: [] }
      continue
    }

    // 목 패턴: "가. ...", "나. ..." 등
    var mokLabels = '가나다라마바사아자차카타파하'
    var subMatch = line.match(/^([가-하])\.\s*(.+)/)
    if (subMatch && mokLabels.indexOf(subMatch[1]) >= 0 && currentItem) {
      currentItem.subItems.push({ content: subMatch[2] })
      continue
    }

    // 그 외: 본문
    if (items.length === 0 && !currentItem) {
      mainContent += (mainContent ? ' ' : '') + line
    }
  }

  if (currentItem) {
    items.push(currentItem)
  }

  return { content: mainContent, items: items }
}

/**
 * 전체 텍스트에서 조문(제○조) 단위로 파싱
 */
function parseArticlesFromText(text) {
  if (!text) return []

  var articles = []
  // "제1조", "제2조", "제10조의2" 등으로 분리
  var parts = text.split(/(?=제\d+조)/)

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim()
    if (!part) continue

    // 조문 번호와 제목 추출
    var headerMatch = part.match(/^제(\d+조(?:의\d+)?)\s*(?:\(([^)]+)\))?\s*/)
    if (!headerMatch) continue

    var joNum = '제' + headerMatch[1]
    var joTitle = headerMatch[2] || ''

    // 나머지 내용
    var hdr = headerMatch[0]
    var body = part.slice(hdr.length).trim()

    // 항 분리: ① ② ③ 등
    var hangParts = body.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/)
    var paragraphs = []

    if (hangParts.length > 1
      || (hangParts.length === 1
        && hangParts[0].match(/^[①②③④⑤⑥⑦⑧⑨⑩]/))) {
      for (var h = 0; h < hangParts.length; h++) {
        var hangText = hangParts[h].trim()
        if (!hangText) continue
        hangText = hangText.replace(
          /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/, ''
        )
        var parsed = parseItemsFromText(hangText)
        paragraphs.push(parsed)
      }
    } else {
      var parsed2 = parseItemsFromText(body)
      paragraphs.push(parsed2)
    }

    articles.push({
      number: joNum,
      title: joTitle,
      content: body.split('\n')[0] || body.slice(0, 200),
      paragraphs: paragraphs,
    })
  }

  return articles
}
