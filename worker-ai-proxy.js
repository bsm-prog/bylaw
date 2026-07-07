/**
 * Cloudflare Worker — Claude API 프록시
 *
 * 배포 방법:
 * 1. Cloudflare Workers & Pages → Create → Worker 생성
 * 2. 이 코드를 붙여넣기 → 저장·배포
 * 3. Settings → Variables → 환경변수 추가:
 *    ANTHROPIC_API_KEY = sk-ant-api03-... (실제 API 키)
 * 4. Worker URL을 프로젝트의 aiApi.js에 있는 AI_PROXY_URL에 입력
 *
 * 사용 예:
 * POST https://your-worker.workers.dev
 * Body: { model, max_tokens, system, messages }
 */

export default {
  async fetch(req, env) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // POST만 허용
    if (req.method !== 'POST') {
      return new Response('POST only', {
        status: 405,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // API 키 확인
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      // 요청 본문 읽기
      const body = await req.json();

      // Anthropic API 호출
      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-6',
          max_tokens: body.max_tokens || 2000,
          system: body.system || '',
          messages: body.messages || [],
        }),
      });

      const data = await apiRes.text();

      return new Response(data, {
        status: apiRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
