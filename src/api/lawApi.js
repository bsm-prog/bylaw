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
const MAX_TOKENS = 2000

/**
 * Claude API 호출 (프록시 경유)
 */
async function callClaude(systemPrompt, userPrompt) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
  }

  try {
    const res = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error('AI API 오류: ' + res.status + ' ' + errText)
    }

    const data = await res.json()
    const text = data.content
      ?.filter(item => item.type === 'text')
      ?.map(item => item.text)
      ?.join('\n') || ''

    return text
  } catch (err) {
    console.error('Claude API 호출 실패:', err)
    throw err
  }
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
 */
export async function generateArticleDraft(keywords, ordinanceTitle, type, reportSummary, refTexts) {
  const hasRefs = refTexts && refTexts.length > 0

  const system = `당신은 경기도의회 조례 입법 전문가입니다. 조례 조문을 작성합니다.
반드시 한국어로 응답하세요. JSON 형식으로만 응답하세요.
조문은 한국 지방자치단체 조례의 표준 형식을 따릅니다.
${hasRefs ? '참고 조례의 원문이 제공됩니다. 해당 조례의 조문 구성, 내용, 체계를 참고하여 경기도 조례로 재작성해주세요. 단순히 지자체명만 바꾸지 말고, 경기도의 특성에 맞게 조정해주세요.' : ''}`

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

다음 JSON 형식으로 응답해주세요:
{
  "articles": [
    {
      "title": "목적",
      "paragraphs": [
        {
          "content": "항 내용",
          "items": [
            { "content": "호 내용", "subItems": [{ "content": "목 내용" }] }
          ]
        }
      ]
    }
  ]
}

${hasRefs ? '참고 조례의 조문 구성과 내용을 적극 참고하되, 경기도 조례에 맞게 재작성해주세요.' : '일반적인 조례 구성: 목적조, 정의조, 책무조, 위원회 설치·구성·운영, 지원사업, 사업위탁, 시행규칙 순서.'}
각 조문은 실무에서 바로 사용 가능한 수준으로 구체적으로 작성해주세요.`

  const text = await callClaude(system, user)
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

/**
 * STEP 4: 제안이유 초안 생성
 */
export async function generateReason(data) {
  const system = `당신은 경기도의회 조례 입법 전문가입니다. 조례안의 제안이유를 작성합니다.
반드시 한국어로 응답하세요. 일반 텍스트로만 응답하세요 (JSON 아님).
문체: 공문서체 (~함, ~임, ~임.), 간결하고 논리적.`

  const articleTitles = (data.articles || []).map(a => '제' + a.number + '조(' + (a.title || '') + ')').join(', ')

  const user = `다음 조례안의 제안이유를 작성해주세요.

조례명: ${data.title || '○○'}
유형: ${data.type}
조문 구성: ${articleTitles || '(미작성)'}

제안이유는 다음 구조로 작성:
1. 현황 및 문제점 (왜 이 조례가 필요한지)
2. 상위법령 근거 (법적 근거)
3. 조례 제정/개정의 목적 및 기대효과

약 200~400자 내외로 작성해주세요.`

  return await callClaude(system, user)
}

/**
 * STEP 4: 주요내용 초안 생성
 */
export async function generateMainContent(data) {
  const system = `당신은 경기도의회 조례 입법 전문가입니다. 조례안의 주요내용을 작성합니다.
반드시 한국어로 응답하세요. 일반 텍스트로만 응답하세요 (JSON 아님).
형식: "가. …을 규정함(안 제○조 ~ 제○조)." 형태의 항목별 나열.`

  const articles = (data.articles || []).map(a => ({
    number: a.number,
    title: a.title || '',
    content: a.paragraphs?.[0]?.content?.slice(0, 50) || '',
  }))

  const user = `다음 조례안의 주요내용을 작성해주세요.

조례명: ${data.title || '○○'}
유형: ${data.type}
조문 목록:
${articles.map(a => '제' + a.number + '조(' + a.title + ') ' + a.content + '...').join('\n')}

"가.", "나.", "다.", "라." 형태로 조문 내용을 그룹별로 요약해주세요.
각 항목 끝에 "(안 제○조 ~ 제○조)." 형태로 조문 번호를 표기해주세요.`

  return await callClaude(system, user)
}

/**
 * STEP 5: 신구조문대비표 생성
 */
export async function generateCompareTable(currentArticles, newArticles) {
  const system = `당신은 경기도의회 조례 입법 전문가입니다. 신구조문대비표를 작성합니다.
반드시 한국어로 응답하세요. JSON 형식으로만 응답하세요.
축약표기: 변경 없는 항은 "(생 략)" / "(현행과 같음)", 신설은 "<신 설>", 삭제는 "<삭 제>"`

  const user = `다음 현행 조문과 개정안을 비교하여 신구조문대비표를 JSON으로 작성해주세요.

현행 조문:
${JSON.stringify(currentArticles)}

개정안 조문:
${JSON.stringify(newArticles)}

다음 JSON 형식으로 응답:
{
  "amendments": [
    {
      "articleRef": "제○조제○항",
      "type": "modify 또는 add 또는 delete",
      "current": "현행 조문 텍스트",
      "proposed": "개정안 텍스트"
    }
  ]
}`

  return JSON.parse((await callClaude(system, user)).replace(/```json|```/g, '').trim())
}

/**
 * AI 연결 테스트
 */
export async function testAIConnection() {
  try {
    await callClaude('You are a test.', '응답으로 "연결 성공"만 말해주세요.')
    return { connected: true }
  } catch (err) {
    return { connected: false, error: err.message }
  }
}
