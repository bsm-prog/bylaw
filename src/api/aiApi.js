/**
 * Claude AI API 연동 모듈
 * Cloudflare Worker 프록시를 통해 API 키를 숨기고 호출
 *
 * 배포 시: PROXY_URL을 실제 Cloudflare Worker 주소로 교체
 * 개발 시: 직접 Anthropic API 호출 (테스트용)
 */

// Cloudflare Worker 프록시 URL (배포 시 설정)
const AI_PROXY_URL = 'https://bylaw.papy98.workers.dev'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096

/**
 * Claude API 호출 (프록시 경유)
 * maxTokens 파라미터로 함수별 토큰 제한 가능
 */
async function callClaude(systemPrompt, userPrompt, maxTokens) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens || MAX_TOKENS,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
  }

  const MAX_RETRIES = 2
  let lastErr = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log('[aiApi] 재시도 ' + attempt + '/' + MAX_RETRIES)
        await new Promise(function(r) { setTimeout(r, 1500 * attempt) })
      }

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text()
        lastErr = new Error('AI API 오류: ' + res.status + ' ' + errText)
        console.warn('[aiApi] 시도 ' + (attempt + 1) + ' 실패:', res.status)
        if (res.status === 400) throw lastErr
        continue
      }

      const data = await res.json()
      const text = data.content
        ?.filter(item => item.type === 'text')
        ?.map(item => item.text)
        ?.join('\n') || ''

      return text
    } catch (err) {
      lastErr = err
      console.warn('[aiApi] 시도 ' + (attempt + 1) + ' 오류:', err.message)
      if (err.message.indexOf('400') >= 0) break
    }
  }

  console.error('[aiApi] Claude API 최종 실패:', lastErr)
  throw lastErr
}

/* ─── 공개 AI 함수들 ─── */

/**
 * Phase 2: 사전조사 AI 분석 리포트 생성
 */
export async function generateAnalysisReport(keywords, searchResults) {
  const system = `당신은 경기도의회 입법 전문가입니다. 검색 결과를 분석하여 조례 제·개정을 위한 사전조사 리포트를 작성합니다.
반드시 한국어로 응답하세요. JSON 형식으로만 응답하세요.`

  const user = `다음 검색 결과를 분석하여 사전조사 리포트를 JSON으로 작성해주세요.

검색 키워드: ${keywords.join(', ')}

경기도 기존 조례: ${JSON.stringify(searchResults.localOrdinances?.items?.map(i => i.name) || [])}
상위법령: ${JSON.stringify(searchResults.upperLaws?.items?.map(i => i.name) || [])}
타 시도 조례: ${JSON.stringify(searchResults.otherRegions?.items?.map(i => i.name + '(' + i.org + ')') || [])}

다음 JSON 형식으로 응답해주세요:
{
  "summary": ["종합의견 문단1", "종합의견 문단2", ...],
  "localComment": "경기도 기존 조례 분석 코멘트",
  "upperComment": "상위법령 분석 코멘트",
  "otherComment": "타 시도 현황 코멘트",
  "recommendedType": "제정 또는 일부개정 또는 전부개정"
}`

  const text = await callClaude(system, user)
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

/**
 * STEP 2: 조문 초안 생성
 * 항(paragraphs)·호(items)·목(subItems) 전체 구조를 생성
 */
export async function generateArticleDraft(keywords, ordinanceTitle, type, reportSummary, refTexts) {
  const hasRefs = refTexts && refTexts.length > 0

  const system = `당신은 경기도의회 조례 입법 전문가입니다. 조례 조문을 작성합니다.
반드시 한국어로 응답하세요. JSON 형식으로만 응답하세요.
조문은 한국 지방자치단체 조례의 표준 형식을 따릅니다.

중요: 각 조문의 하위 구조를 반드시 포함하세요.
- "다음 각 호"라고 쓴 조문에는 반드시 items 배열에 호를 나열하세요.
- 항이 여러 개인 조문은 paragraphs 배열에 모두 포함하세요.
- 정의조(용어 정의)는 items에 각 용어 정의를 호로 나열하세요.
- 위원회 구성, 사업 목록 등 열거형 조문은 반드시 items를 채우세요.
- items가 없는 단순 조문은 items를 빈 배열 []로 두세요.
${hasRefs ? '\n참고 조례의 원문이 제공됩니다. 해당 조례의 조문 구성, 내용, 체계를 참고하여 경기도 조례로 재작성해주세요. 참고 조례에 호(1. 2. 3.)나 목(가. 나. 다.)이 있으면 반드시 items/subItems에 포함하세요. 단순히 지자체명만 바꾸지 말고, 경기도의 특성에 맞게 조정해주세요.' : ''}`

  let refSection = ''
  if (hasRefs) {
    refSection = '\n\n[참고 조례 원문]\n' + refTexts.map(function(r) {
      return '--- ' + r.name + ' ---\n' + r.fullText
    }).join('\n\n')
  }

  const user = `다음 조건으로 조례 조문 초안을 JSON으로 작성해주세요.

조례명: ${ordinanceTitle || keywords.join(' ') + '에 관한 조례'}
유형: ${type}
키워드: ${keywords.join(', ')}
배경: ${reportSummary || ''}
${refSection}

아래 JSON 형식을 정확히 따르세요. 특히 items와 subItems를 빠뜨리지 마세요:
{
  "articles": [
    {
      "title": "목적",
      "paragraphs": [
        {
          "content": "이 조례는 …에 관한 사항을 규정함을 목적으로 한다.",
          "items": []
        }
      ]
    },
    {
      "title": "정의",
      "paragraphs": [
        {
          "content": "이 조례에서 사용하는 용어의 뜻은 다음과 같다.",
          "items": [
            { "content": "\"반려동물\"이란 …을 말한다.", "subItems": [] },
            { "content": "\"동반여행\"이란 …을 말한다.", "subItems": [] }
          ]
        }
      ]
    },
    {
      "title": "세부 사업",
      "paragraphs": [
        {
          "content": "도지사는 다음 각 호의 사업을 추진할 수 있다.",
          "items": [
            { "content": "홍보 및 마케팅", "subItems": [] },
            { "content": "관광지도 제작 및 배포", "subItems": [] },
            { "content": "시설 지원", "subItems": [] }
          ]
        }
      ]
    }
  ]
}

${hasRefs ? '참고 조례의 조문 구성과 내용을 적극 참고하되, 경기도 조례에 맞게 재작성해주세요. 참고 조례의 호·목 구조를 반드시 반영하세요.' : '일반적인 조례 구성: 목적조, 정의조, 책무조, 위원회 설치·구성·운영, 지원사업, 사업위탁, 시행규칙 순서.'}
각 조문은 실무에서 바로 사용 가능한 수준으로 구체적으로 작성해주세요.
"다음 각 호"라고 쓸 때는 반드시 items 배열에 해당 호를 모두 나열해야 합니다.`

  const text = await callClaude(system, user, 8000)
  console.log('[aiApi] AI 조문 응답 길이:', text.length)
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

/**
 * STEP 4: 제안이유 초안 생성
 */
/* ─── 조문 내용을 텍스트로 직렬화 (프롬프트용) ─── */
function serializeArticles(articles) {
  if (!articles || articles.length === 0) return '(조문 미작성)'
  var CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
  var MOK = '가나다라마바사아자차카타파하'
  return articles.map(function(a) {
    var title = a.title ? '(' + a.title + ')' : ''
    var head = '제' + a.number + '조' + title
    var paras = a.paragraphs || []
    if (paras.length === 0) return head
    var multi = paras.length > 1
    var lines = [head]
    paras.forEach(function(p, pi) {
      var pfx = multi ? (CIRCLED[pi] || '') + ' ' : ''
      lines.push('  ' + pfx + (p.content || ''))
      if (p.items) {
        p.items.forEach(function(item, ii) {
          lines.push('    ' + (ii+1) + '. ' + (item.content || ''))
          if (item.subItems) {
            item.subItems.forEach(function(sub, si) {
              lines.push('      ' + (MOK[si] || '') + '. ' + (sub.content || ''))
            })
          }
        })
      }
    })
    return lines.join('\n')
  }).join('\n\n')
}

export async function generateReason(data) {
  const system = `당신은 경기도의회 조례 입법 전문가입니다. 조례안의 제안이유를 작성합니다.
반드시 한국어로 응답하세요. 일반 텍스트로만 응답하세요 (JSON 아님).
문체: 공문서체 (~함, ~임, ~임.), 간결하고 논리적.`

  const artText = serializeArticles(data.articles)

  const user = `다음 조례안의 제안이유를 작성해주세요.

조례명: ${data.title || '○○'}
유형: ${data.type}

조례안 전문:
${artText}

제안이유는 다음 구조로 작성:
1. 현황 및 문제점 (왜 이 조례가 필요한지)
2. 상위법령 근거 (법적 근거)
3. 조례 제정/개정의 목적 및 기대효과

약 200~400자 내외로 작성해주세요.
반드시 위 조문 내용을 반영하여 구체적으로 작성하세요.`

  return await callClaude(system, user)
}

/**
 * STEP 4: 주요내용 초안 생성
 */
export async function generateMainContent(data) {
  const system = `당신은 경기도의회 조례 입법 전문가입니다. 조례안의 주요내용을 작성합니다.
반드시 한국어로 응답하세요. 일반 텍스트로만 응답하세요 (JSON 아님).
형식: "가. …을 규정함(안 제○조 ~ 제○조)." 형태의 항목별 나열.`

  const artText = serializeArticles(data.articles)

  const user = `다음 조례안의 주요내용을 작성해주세요.

조례명: ${data.title || '○○'}
유형: ${data.type}

조례안 전문:
${artText}

"가.", "나.", "다.", "라." 형태로 조문 내용을 그룹별로 요약해주세요.
각 항목 끝에 "(안 제○조 ~ 제○조)." 형태로 조문 번호를 표기해주세요.
반드시 위 조문 내용을 반영하여 구체적으로 작성하세요.`

  return await callClaude(system, user)
}

/**
 * STEP 5: 신구조문대비표 생성
 */
export async function generateCompareTable(
  currentArticles, newArticles
) {
  var sysMsg = '당신은 경기도의회 조례 입법 전문가입니다. '
    + '신구조문대비표를 작성합니다.\n'
    + '반드시 한국어로 응답하세요. '
    + 'JSON 형식으로만 응답하세요.\n'
    + '변경된 조문만 포함하세요. '
    + '변경 없는 조문은 제외합니다.\n'
    + '신설은 type:"add", 삭제는 type:"delete", '
    + '수정은 type:"modify".'

  var currentText = serializeArticles(currentArticles)
  var newText = serializeArticles(newArticles)

  var userMsg = '다음 현행 조문과 개정안을 비교하여 '
    + '신구조문대비표를 JSON으로 작성해주세요.\n\n'
    + '[현행 조문]\n' + currentText + '\n\n'
    + '[개정안 조문]\n' + newText + '\n\n'
    + '변경된 부분만 추출하여 다음 JSON 형식으로 응답:\n'
    + '{\n  "amendments": [\n'
    + '    {\n'
    + '      "articleRef": "제○조" 또는 "제○조제○항",\n'
    + '      "type": "modify" 또는 "add" 또는 "delete",\n'
    + '      "current": "현행 조문 텍스트",\n'
    + '      "proposed": "개정안 텍스트"\n'
    + '    }\n  ]\n}\n\n'
    + '변경 없는 조문은 포함하지 마세요.\n'
    + '조·항·호 단위로 세밀하게 비교해주세요.'

  var raw = await callClaude(sysMsg, userMsg, 8000)
  return JSON.parse(
    raw.replace(/```json|```/g, '').trim()
  )
}

/**
 * AI 연결 테스트
 */
export async function testAIConnection() {
  try {
    await callClaude(
      'You are a test.',
      '응답으로 "연결 성공"만 말해주세요.'
    )
    return { connected: true }
  } catch (err) {
    return { connected: false, error: err.message }
  }
}
