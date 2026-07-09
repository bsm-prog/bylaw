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
 */
export async function getOrdinanceFullText(ordinanceName) {
  try {
    console.log('[lawApi] 조례 원문 조회:', ordinanceName)
    var apiUrl = buildUrl({
      target: 'ordin',
      query: ordinanceName,
      display: '1',
    })
    var text = await fetchViaProxy(apiUrl)
    var doc = parseXML(text)

    // 조례 일련번호 추출
    var serial = doc.querySelector('자치법규일련번호')
    if (!serial || !serial.textContent) {
      console.warn('[lawApi] 조례 일련번호를 찾을 수 없음')
      return null
    }

    // 자치단체명 추출
    var orgName = doc.querySelector('자치단체명')?.textContent || ''

    // 본문 조회 API
    var detailUrl = 'https://www.law.go.kr/DRF/lawService.do'
      + '?OC=' + OC
      + '&target=ordin'
      + '&type=XML'
      + '&ID=' + serial.textContent

    var detailText = await fetchViaProxy(detailUrl)
    var detailDoc = parseXML(detailText)

    // 조문 추출 (항·호·목 포함)
    var articles = []
    detailDoc.querySelectorAll('조문단위').forEach(function(jo) {
      var joNum = jo.querySelector('조문번호')?.textContent || ''
      var joTitle = jo.querySelector('조문제목')?.textContent || ''
      var joContent = jo.querySelector('조문내용')?.textContent || ''

      // 항 추출 (호·목 포함)
      var paragraphs = []
      var hangElements = jo.querySelectorAll('항')
      hangElements.forEach(function(hang) {
        var hangContent = hang.querySelector('항내용')?.textContent || ''

        // 호 추출
        var items = []
        hang.querySelectorAll('호').forEach(function(ho) {
          var hoContent = ho.querySelector('호내용')?.textContent || ''

          // 목 추출
          var subItems = []
          ho.querySelectorAll('목').forEach(function(mok) {
            var mokContent = mok.querySelector('목내용')?.textContent || ''
            if (mokContent) {
              subItems.push({ content: mokContent })
            }
          })

          if (hoContent) {
            items.push({ content: hoContent, subItems: subItems })
          }
        })

        paragraphs.push({
          content: hangContent,
          items: items,
        })
      })

      // 항이 XML에 없으면 조문내용에서 호를 텍스트 파싱
      if (paragraphs.length === 0 && joContent) {
        var parsed = parseItemsFromText(joContent)
        paragraphs.push(parsed)
      }

      articles.push({
        number: joNum,
        title: joTitle,
        content: joContent,
        paragraphs: paragraphs,
      })
    })

    // 조문단위가 없으면 fullText에서 조문 파싱 시도
    if (articles.length === 0) {
      var rawText = detailDoc.querySelector('조문')?.textContent
        || detailDoc.querySelector('본문')?.textContent
        || detailText.replace(/<[^>]+>/g, ' ').slice(0, 5000)
      if (rawText) {
        articles = parseArticlesFromText(rawText)
        console.log('[lawApi] 텍스트 파싱으로 조문 추출:', articles.length, '조')
      }
    }

    // 전체 텍스트 조합 (AI 전달용)
    var fullText
    if (articles.length === 0) {
      fullText = detailDoc.querySelector('조문')?.textContent
        || detailDoc.querySelector('본문')?.textContent
        || detailText.replace(/<[^>]+>/g, ' ').slice(0, 3000)
    } else {
      fullText = articles.map(function(a) {
        var line = a.number + (a.title ? '(' + a.title + ')' : '') + ' ' + a.content
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

    console.log('[lawApi] 조례 원문 추출 완료:', articles.length, '조')

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
 * 조문내용 텍스트에서 호·목 파싱 (XML에 호 태그가 없을 때 사용)
 */
function parseItemsFromText(text) {
  if (!text) return { content: '', items: [] }

  var lines = text.split(/\n/)
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
 * 조문단위 XML이 없을 때 fallback으로 사용
 */
function parseArticlesFromText(text) {
  if (!text) return []

  var articles = []
  // "제1조", "제2조" 등으로 분리
  var parts = text.split(/(?=제\d+조)/)

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim()
    if (!part) continue

    // 조문 번호와 제목 추출: "제1조(목적)" 또는 "제1조 목적"
    var headerMatch = part.match(/^제(\d+)조(?:\(([^)]+)\)|\s+)?/)
    if (!headerMatch) continue

    var joNum = '제' + headerMatch[1] + '조'
    var joTitle = headerMatch[2] || ''

    // 나머지 내용
    var bodyStart = part.indexOf(')') > -1 && part.indexOf(')') < 30
      ? part.indexOf(')') + 1
      : part.indexOf('조') + 1
    var body = part.slice(bodyStart).trim()

    // 항 분리: ① ② ③ 등
    var hangParts = body.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/)
    var paragraphs = []

    if (hangParts.length > 1 || (hangParts.length === 1 && hangParts[0].match(/^[①②③④⑤⑥⑦⑧⑨⑩]/))) {
      // 항이 있는 경우
      for (var h = 0; h < hangParts.length; h++) {
        var hangText = hangParts[h].trim()
        if (!hangText) continue
        // 원문자 제거
        hangText = hangText.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/, '')
        var parsed = parseItemsFromText(hangText)
        paragraphs.push(parsed)
      }
    } else {
      // 항 없이 조문 내용만 있는 경우
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
