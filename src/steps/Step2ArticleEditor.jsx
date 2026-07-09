import { useState } from 'react'
import { generateArticleDraft } from '../api/aiApi'
import { getOrdinanceFullText } from '../api/lawApi'

var CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳".split("").filter(function(c){return c})
var MOK = ["가","나","다","라","마","바","사","아","자","차","카","타","파","하"]
var uid = function() { return Math.random().toString(36).slice(2, 9) }

var mkPara = function(content) {
  return { id: uid(), content: content || "", items: [] }
}
var mkItem = function(content) {
  return { id: uid(), content: content || "", subItems: [] }
}
var mkSubItem = function(content) {
  return { id: uid(), content: content || "" }
}
var mkArticle = function(number, title, content) {
  return {
    id: uid(), number: number, title: title || "",
    paragraphs: [mkPara(content || "")]
  }
}

/* ─── AI 응답을 항·호·목 구조 그대로 변환 ─── */
function convertAiArticle(a, idx) {
  var paragraphs = (a.paragraphs || []).map(function(p) {
    var items = (p.items || []).map(function(item) {
      var subItems = (item.subItems || []).map(function(sub) {
        return mkSubItem(sub.content || '')
      })
      var it = mkItem(item.content || '')
      it.subItems = subItems
      return it
    })
    var para = mkPara(p.content || '')
    para.items = items
    return para
  })
  if (paragraphs.length === 0) {
    paragraphs = [mkPara('')]
  }
  return {
    id: uid(),
    number: idx + 1,
    title: a.title || '',
    paragraphs: paragraphs,
  }
}

/* ─── 호·목 포함 조문 생성 헬퍼 ─── */
function mkArticleWithItems(number, title, content, itemTexts) {
  var items = (itemTexts || []).map(function(t) { return mkItem(t) })
  var para = mkPara(content || '')
  para.items = items
  return {
    id: uid(), number: number, title: title || '',
    paragraphs: [para]
  }
}

/* ─── 자주 쓰는 조문 템플릿 ─── */
var TEMPLATES = {
  "총칙": [
    { title: "목적", content: "이 조례는 …에 관한 사항을 규정함으로써 …에 이바지함을 목적으로 한다." },
    { title: "정의", content: "이 조례에서 사용하는 용어의 뜻은 다음과 같다." },
    { title: "적용 범위", content: "이 조례는 …에 대하여 적용한다." },
    { title: "다른 조례와의 관계", content: "…에 관하여 다른 조례에 특별한 규정이 있는 경우를 제외하고는 이 조례에서 정하는 바에 따른다." },
  ],
  "책무·계획": [
    { title: "도지사의 책무", content: "도지사는 …을 위하여 필요한 시책을 수립·시행하고, 이에 대한 행정적·재정적 지원방안을 마련하도록 노력하여야 한다." },
    { title: "기본계획 수립", content: "도지사는 …을 위하여 기본계획을 수립·시행하여야 한다." },
    { title: "실태조사", content: "도지사는 …의 실태를 파악하기 위하여 실태조사를 실시할 수 있다." },
  ],
  "위원회": [
    { title: "위원회 설치 및 기능", content: "…에 관한 사항을 심의 또는 자문하기 위하여 경기도 ○○위원회를 둘 수 있다." },
    { title: "위원회 구성", content: "위원회는 위원장과 부위원장 각 1명을 포함하여 00명 이내로 구성하고, 위원장과 부위원장은 위원 중에서 호선한다." },
    { title: "위원장의 직무", content: "위원장은 위원회를 대표하고, 위원회의 업무를 총괄한다." },
    { title: "회의 운영", content: "위원회의 회의는 위원장이 필요하다고 인정하는 때에 소집한다." },
    { title: "위원의 해촉", content: "도지사는 위원이 다음 각 호의 어느 하나에 해당하는 경우에는 해당 위원을 해촉할 수 있다." },
  ],
  "지원·사업": [
    { title: "지원 사업", content: "도지사는 …의 육성을 위하여 다음 각 호의 사업을 추진할 수 있다." },
    { title: "재정 지원", content: "도지사는 …에 필요한 비용의 전부 또는 일부를 예산의 범위에서 지원할 수 있다." },
    { title: "사업의 위탁", content: "도지사는 …에 따른 사업의 효율적인 추진을 위하여 관련 법인 또는 단체 등에 위탁할 수 있다." },
  ],
  "말미": [
    { title: "시행규칙", content: "이 조례의 시행에 관하여 필요한 사항은 규칙으로 정한다." },
  ],
}

export default function Step2ArticleEditor({ data, onUpdate, onNext }) {
  var _articles = useState(data.articles || [])
  var articles = _articles[0]
  var setArticles = _articles[1]

  var _editingId = useState(null)
  var editingId = _editingId[0]
  var setEditingId = _editingId[1]

  var _showTemplates = useState(false)
  var showTemplates = _showTemplates[0]
  var setShowTemplates = _showTemplates[1]

  var _aiGenerating = useState(false)
  var aiGenerating = _aiGenerating[0]
  var setAiGenerating = _aiGenerating[1]

  var _selectedTemplates = useState([])
  var selectedTemplates = _selectedTemplates[0]
  var setSelectedTemplates = _selectedTemplates[1]

  var _aiStatus = useState(null)
  var aiStatus = _aiStatus[0]
  var setAiStatus = _aiStatus[1]

  var toggleTemplate = function(tmpl) {
    setSelectedTemplates(function(prev) {
      var exists = prev.find(function(t) { return t.title === tmpl.title })
      if (exists) return prev.filter(function(t) { return t.title !== tmpl.title })
      return prev.concat([tmpl])
    })
  }

  var addSelectedTemplates = function() {
    if (selectedTemplates.length === 0) return
    var startNum = articles.length > 0 ? Math.max.apply(null, articles.map(function(a) { return a.number })) + 1 : 1
    var newArticles = selectedTemplates.map(function(tmpl, i) {
      return mkArticle(startNum + i, tmpl.title, tmpl.content)
    })
    sync(articles.concat(newArticles))
    setSelectedTemplates([])
    setShowTemplates(false)
  }

  var hasRefs = data.selectedRefs && data.selectedRefs.length > 0

  /* ─── fullText에서 조문(제○조) 파싱 (자체 내장) ─── */
  function parseFullTextToArticles(text) {
    if (!text) return []
    var result = []
    var parts = text.split(/(?=제\d+조)/)
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim()
      if (!part) continue
      var hm = part.match(/^제(\d+)조(?:\(([^)]+)\))?\s*/)
      if (!hm) continue
      var body = part.slice(part.indexOf(hm[0]) + hm[0].length).trim()
      // 항 분리 (①②③)
      var hangParts = body.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/)
      var paragraphs = []
      for (var h = 0; h < hangParts.length; h++) {
        var ht = hangParts[h].trim()
        if (!ht) continue
        ht = ht.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/, '')
        // 호·목 파싱
        var lines = ht.split(/\n/)
        var mainContent = ''
        var items = []
        var curItem = null
        for (var li = 0; li < lines.length; li++) {
          var ln = lines[li].trim()
          if (!ln) continue
          var im = ln.match(/^(\d+)\.\s*(.+)/)
          if (im) {
            if (curItem) items.push(curItem)
            curItem = { content: im[2], subItems: [] }
            continue
          }
          var sm = ln.match(/^([가-하])\.\s*(.+)/)
          if (sm && curItem) {
            curItem.subItems.push({ content: sm[2] })
            continue
          }
          if (items.length === 0 && !curItem) {
            mainContent += (mainContent ? ' ' : '') + ln
          }
        }
        if (curItem) items.push(curItem)
        paragraphs.push({ content: mainContent, items: items })
      }
      if (paragraphs.length === 0) paragraphs.push({ content: body, items: [] })
      result.push({ number: '제' + hm[1] + '조', title: hm[2] || '', content: body.split('\n')[0], paragraphs: paragraphs })
    }
    return result
  }

  /* ─── 참고 조례 원문 기반 조문 생성 (지자체명 → 경기도 치환) ─── */
  function buildFromReference(refData) {
    var orgName = refData.org || ''
    console.log('[Step2] buildFromReference 시작. org:', orgName, ', articles:', (refData.articles || []).length, ', fullText길이:', (refData.fullText || '').length)

    // 지자체장 직함 치환 패턴
    var headPatterns = []
    if (orgName) {
      if (orgName.match(/시$/)) headPatterns.push([orgName + '장', '도지사'])
      else if (orgName.match(/군$/)) headPatterns.push([orgName + '수', '도지사'])
      else if (orgName.match(/구$/)) headPatterns.push([orgName + '청장', '도지사'])
      else if (orgName.match(/도$/)) headPatterns.push([orgName + '지사', '도지사'])
      else headPatterns.push([orgName + '장', '도지사'])
    }

    function replaceOrg(text) {
      if (!text || !orgName) return text || ''
      var result = text
      for (var i = 0; i < headPatterns.length; i++) {
        result = result.split(headPatterns[i][0]).join(headPatterns[i][1])
      }
      result = result.split(orgName).join('경기도')
      return result
    }

    // 소스 조문: API articles → 없으면 fullText 파싱
    var srcArticles = refData.articles || []
    if (srcArticles.length === 0 && refData.fullText) {
      console.log('[Step2] articles 비어있음 → fullText에서 조문 파싱 시도')
      srcArticles = parseFullTextToArticles(refData.fullText)
      console.log('[Step2] fullText 파싱 결과:', srcArticles.length, '조')
    }

    if (srcArticles.length === 0) {
      console.warn('[Step2] 참고 조례에서 조문을 추출하지 못함')
      return []
    }

    var refArticles = srcArticles.map(function(a, idx) {
      var paragraphs = (a.paragraphs || []).map(function(p) {
        var items = (p.items || []).map(function(item) {
          var subItems = (item.subItems || []).map(function(sub) {
            return mkSubItem(replaceOrg(sub.content))
          })
          var it = mkItem(replaceOrg(item.content))
          it.subItems = subItems
          return it
        })
        var para = mkPara(replaceOrg(p.content))
        para.items = items
        return para
      })

      if (paragraphs.length === 0 && a.content) {
        paragraphs = [mkPara(replaceOrg(a.content))]
      }
      if (paragraphs.length === 0) {
        paragraphs = [mkPara('')]
      }

      return {
        id: uid(),
        number: idx + 1,
        title: replaceOrg(a.title || ''),
        paragraphs: paragraphs,
      }
    })

    console.log('[Step2] 참고 조례 기반 생성 완료:', refArticles.length, '조, 원본:', orgName, '→ 경기도')
    return refArticles
  }

  var handleAiGenerate = async function() {
    setAiGenerating(true)
    setAiStatus(null)
    try {
      // 참고 조례 원문 가져오기
      var refTexts = []
      if (hasRefs) {
        console.log('[Step2] 참고 조례 원문 조회 중...', data.selectedRefs.length, '건')
        for (var i = 0; i < data.selectedRefs.length; i++) {
          var ref = data.selectedRefs[i]
          var fullText = await getOrdinanceFullText(ref.name)
          if (fullText) {
            refTexts.push(fullText)
            console.log('[Step2] 원문 조회 완료:', ref.name, ', articles:', (fullText.articles || []).length, ', fullText길이:', (fullText.fullText || '').length, ', org:', fullText.org)
          } else {
            console.warn('[Step2] 원문 조회 실패 (null 반환):', ref.name)
          }
        }
      }

      var result = await generateArticleDraft(
        data.keywords || [],
        data.title,
        data.type,
        data.reportSummary || '',
        refTexts
      )
      if (result && result.articles) {
        var newArticles = result.articles.map(function(a, i) {
          return convertAiArticle(a, i)
        })
        sync(newArticles)
        setAiStatus('success')
        console.log('[Step2] AI 조문 생성 성공:', newArticles.length, '조')
      }
    } catch (err) {
      console.warn('[Step2] AI 조문 생성 실패:', err.message)
      console.log('[Step2] refTexts 개수:', refTexts.length)

      // 참고 조례 원문이 있으면 원문 기반으로 생성
      var refArticles = []
      if (refTexts.length > 0) {
        console.log('[Step2] 참고 조례 원문 기반으로 조문 생성 시도, refTexts[0].articles:', (refTexts[0].articles || []).length)
        refArticles = buildFromReference(refTexts[0])
        console.log('[Step2] buildFromReference 결과:', refArticles.length, '조')
      }
      if (refArticles.length > 0) {
        setAiStatus('ref-fallback')
        sync(refArticles)
      } else {
        setAiStatus('fallback')
        var topic = data.title || (data.keywords || []).join(' ') || '○○'
        var fallbackArticles = [
          mkArticle(1, '목적', '이 조례는 ' + topic + '에 필요한 사항을 규정함으로써 도민의 삶의 질 향상에 이바지함을 목적으로 한다.'),
          mkArticleWithItems(2, '정의', '이 조례에서 사용하는 용어의 뜻은 다음과 같다.', [
            '"○○"이란 …을 말한다.',
            '"○○"이란 …을 말한다.',
            '"○○"이란 …을 말한다.',
          ]),
          mkArticle(3, '도지사의 책무', '경기도지사(이하 "도지사"라 한다)는 ' + topic + '을 위하여 필요한 시책을 수립·시행하고, 이에 대한 행정적·재정적 지원방안을 마련하도록 노력하여야 한다.'),
          mkArticleWithItems(4, '기본계획 수립', '도지사는 다음 각 호의 사항을 포함하는 기본계획을 5년마다 수립·시행하여야 한다.', [
            '기본정책 및 추진방향',
            '민·관 협력체계 구축에 관한 사항',
            '기반시설 구축 및 유관 산업 촉진에 관한 사항',
            '그 밖에 도지사가 필요하다고 인정하는 사항',
          ]),
          mkArticleWithItems(5, '위원회 설치 및 기능', '도지사는 다음 각 호의 사항을 심의 또는 자문하기 위하여 경기도 ○○위원회(이하 "위원회"라 한다)를 둘 수 있다.', [
            '기본계획의 수립 및 변경에 관한 사항',
            '관련 사업의 추진에 관한 사항',
            '관련 제도 개선에 관한 사항',
            '그 밖에 위원장이 필요하다고 인정하는 사항',
          ]),
          mkArticle(6, '위원회 구성', '위원회는 위원장과 부위원장 각 1명을 포함하여 15명 이내의 위원으로 구성하고, 위원장과 부위원장은 위원 중에서 호선한다.'),
          mkArticle(7, '위원장의 직무', '위원장은 위원회를 대표하고, 위원회의 업무를 총괄한다.'),
          mkArticleWithItems(8, '위원의 해촉', '도지사는 위원이 다음 각 호의 어느 하나에 해당하는 경우에는 해당 위원을 해촉할 수 있다.', [
            '심신장애로 인하여 직무를 수행할 수 없게 된 경우',
            '직무와 관련된 비위사실이 있는 경우',
            '직무태만, 품위손상이나 그 밖의 사유로 인하여 위원으로 적합하지 아니하다고 인정되는 경우',
            '위원 스스로 직무를 수행하기 어렵다는 의사를 밝히는 경우',
          ]),
          mkArticleWithItems(9, '지원 사업', '도지사는 ' + topic + '을 위하여 다음 각 호의 사업을 추진할 수 있다.', [
            '홍보 및 마케팅',
            '관광지도 제작 및 배포',
            '관련 시설 조성·정비·확충',
            '교육프로그램 운영',
            '관련 축제 및 행사 개최',
            '그 밖에 도지사가 필요하다고 인정하는 사업',
          ]),
          mkArticle(10, '재정 지원', '도지사는 제9조에 따른 사업에 필요한 비용의 전부 또는 일부를 예산의 범위에서 지원할 수 있다.'),
          mkArticle(11, '사업의 위탁', '도지사는 제9조에 따른 사업의 효율적인 추진을 위하여 관련 법인 또는 단체 등에 「경기도 사무위탁 조례」에 따라 위탁할 수 있다.'),
          mkArticle(12, '시행규칙', '이 조례의 시행에 관하여 필요한 사항은 규칙으로 정한다.'),
        ]
        sync(fallbackArticles)
      }
    } finally {
      setAiGenerating(false)
    }
  }

  var sync = function(newArticles) {
    setArticles(newArticles)
    onUpdate('articles', newArticles)
  }

  /* ─── 조 조작 ─── */
  var addArticle = function(template) {
    var num = articles.length > 0 ? Math.max.apply(null, articles.map(function(a) { return a.number })) + 1 : 1
    var art = template
      ? mkArticle(num, template.title, template.content)
      : mkArticle(num)
    sync(articles.concat([art]))
    setEditingId(art.id)
    setShowTemplates(false)
  }

  var removeArticle = function(id) {
    var filtered = articles.filter(function(a) { return a.id !== id })
    sync(filtered.map(function(a, i) { return Object.assign({}, a, { number: i + 1 }) }))
    if (editingId === id) setEditingId(null)
  }

  var moveArticle = function(idx, dir) {
    var next = articles.slice()
    var ni = idx + dir
    if (ni < 0 || ni >= next.length) return
    var temp = next[idx]
    next[idx] = next[ni]
    next[ni] = temp
    sync(next.map(function(a, i) { return Object.assign({}, a, { number: i + 1 }) }))
  }

  var updateArticle = function(id, updates) {
    sync(articles.map(function(a) { return a.id === id ? Object.assign({}, a, updates) : a }))
  }

  /* ─── 항 조작 ─── */
  var addParagraph = function(artId) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, { paragraphs: a.paragraphs.concat([mkPara()]) })
    }))
  }

  var removeParagraph = function(artId, paraId) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, { paragraphs: a.paragraphs.filter(function(p) { return p.id !== paraId }) })
    }))
  }

  var updateParagraph = function(artId, paraId, content) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, {
        paragraphs: a.paragraphs.map(function(p) {
          return p.id !== paraId ? p : Object.assign({}, p, { content: content })
        })
      })
    }))
  }

  /* ─── 호 조작 ─── */
  var addItem = function(artId, paraId) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, {
        paragraphs: a.paragraphs.map(function(p) {
          if (p.id !== paraId) return p
          return Object.assign({}, p, { items: p.items.concat([mkItem()]) })
        })
      })
    }))
  }

  var removeItem = function(artId, paraId, itemId) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, {
        paragraphs: a.paragraphs.map(function(p) {
          if (p.id !== paraId) return p
          return Object.assign({}, p, { items: p.items.filter(function(i) { return i.id !== itemId }) })
        })
      })
    }))
  }

  var updateItem = function(artId, paraId, itemId, content) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, {
        paragraphs: a.paragraphs.map(function(p) {
          if (p.id !== paraId) return p
          return Object.assign({}, p, {
            items: p.items.map(function(i) {
              return i.id !== itemId ? i : Object.assign({}, i, { content: content })
            })
          })
        })
      })
    }))
  }

  /* ─── 목 조작 ─── */
  var addSubItem = function(artId, paraId, itemId) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, {
        paragraphs: a.paragraphs.map(function(p) {
          if (p.id !== paraId) return p
          return Object.assign({}, p, {
            items: p.items.map(function(i) {
              if (i.id !== itemId) return i
              return Object.assign({}, i, { subItems: i.subItems.concat([mkSubItem()]) })
            })
          })
        })
      })
    }))
  }

  var removeSubItem = function(artId, paraId, itemId, subId) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, {
        paragraphs: a.paragraphs.map(function(p) {
          if (p.id !== paraId) return p
          return Object.assign({}, p, {
            items: p.items.map(function(i) {
              if (i.id !== itemId) return i
              return Object.assign({}, i, { subItems: i.subItems.filter(function(s) { return s.id !== subId }) })
            })
          })
        })
      })
    }))
  }

  var updateSubItem = function(artId, paraId, itemId, subId, content) {
    sync(articles.map(function(a) {
      if (a.id !== artId) return a
      return Object.assign({}, a, {
        paragraphs: a.paragraphs.map(function(p) {
          if (p.id !== paraId) return p
          return Object.assign({}, p, {
            items: p.items.map(function(i) {
              if (i.id !== itemId) return i
              return Object.assign({}, i, {
                subItems: i.subItems.map(function(s) {
                  return s.id !== subId ? s : Object.assign({}, s, { content: content })
                })
              })
            })
          })
        })
      })
    }))
  }

  return (
    <div className="step-content">
      <h2 className="step-title">STEP 2. 조문편집</h2>

      {/* AI 초안 생성 */}
      <div className="ai-generate-area">
        <button
          className="btn btn-primary"
          onClick={handleAiGenerate}
          disabled={aiGenerating}
        >
          {aiGenerating ? 'AI 생성 중...' : 'AI 조문 초안 생성'}
        </button>
        <p className="form-note">
          {hasRefs
            ? '참고 조례 ' + data.selectedRefs.length + '건이 선택되었습니다. AI가 참고하여 조문을 생성합니다.'
            : '키워드와 사전조사 리포트를 바탕으로 조문 초안을 자동 생성합니다.'
          }
        </p>
        {aiStatus === 'fallback' && (
          <p style={{color: '#c0392b', fontSize: '13px', marginTop: '8px'}}>
            AI 연결에 실패하여 기본 템플릿이 적용되었습니다. 내용을 편집하여 사용하세요.
            (F12 콘솔에서 오류 내용을 확인할 수 있습니다)
          </p>
        )}
        {aiStatus === 'ref-fallback' && (
          <p style={{color: '#e67e22', fontSize: '13px', marginTop: '8px'}}>
            AI 연결에 실패하여 참고 조례 원문을 기반으로 조문을 생성했습니다. 지자체명이 경기도로 변환되었습니다.
          </p>
        )}
        {aiStatus === 'success' && (
          <p style={{color: '#27ae60', fontSize: '13px', marginTop: '8px'}}>
            AI 조문이 성공적으로 생성되었습니다.
          </p>
        )}
      </div>

      {/* 조문 목록 */}
      {articles.length === 0 ? (
        <div className="empty-articles">
          아직 조문이 없습니다. 아래에서 조를 추가하거나 AI 초안을 생성하세요.
        </div>
      ) : (
        <div className="articles-list">
          {articles.map(function(art, artIdx) {
            return (
              <ArticleBlock
                key={art.id}
                article={art}
                artIdx={artIdx}
                totalCount={articles.length}
                isEditing={editingId === art.id}
                onStartEdit={function() { setEditingId(art.id) }}
                onStopEdit={function() { setEditingId(null) }}
                onRemove={function() { removeArticle(art.id) }}
                onMove={function(dir) { moveArticle(artIdx, dir) }}
                onUpdateTitle={function(title) { updateArticle(art.id, { title: title }) }}
                onAddParagraph={function() { addParagraph(art.id) }}
                onRemoveParagraph={function(pId) { removeParagraph(art.id, pId) }}
                onUpdateParagraph={function(pId, c) { updateParagraph(art.id, pId, c) }}
                onAddItem={function(pId) { addItem(art.id, pId) }}
                onRemoveItem={function(pId, iId) { removeItem(art.id, pId, iId) }}
                onUpdateItem={function(pId, iId, c) { updateItem(art.id, pId, iId, c) }}
                onAddSubItem={function(pId, iId) { addSubItem(art.id, pId, iId) }}
                onRemoveSubItem={function(pId, iId, sId) { removeSubItem(art.id, pId, iId, sId) }}
                onUpdateSubItem={function(pId, iId, sId, c) { updateSubItem(art.id, pId, iId, sId, c) }}
              />
            )
          })}
        </div>
      )}

      {/* 조 추가 */}
      <div className="add-article-area">
        <button className="btn btn-outline" onClick={function() { addArticle() }}>
          + 빈 조 추가
        </button>
        <button className="btn btn-outline" onClick={function() { setShowTemplates(!showTemplates) }}>
          {showTemplates ? '템플릿 닫기' : '+ 템플릿에서 추가'}
        </button>
      </div>

      {/* 템플릿 패널 */}
      {showTemplates && (
        <div className="template-panel">
          <h3 className="template-panel-title">자주 사용하는 조문</h3>
          <p className="template-panel-desc">여러 개를 선택한 후 한번에 추가할 수 있습니다.</p>
          {Object.entries(TEMPLATES).map(function(entry) {
            var category = entry[0]
            var items = entry[1]
            return (
              <div key={category} className="template-category">
                <h4 className="template-category-title">{category}</h4>
                <div className="template-items">
                  {items.map(function(tmpl, i) {
                    var isSelected = selectedTemplates.find(function(t) { return t.title === tmpl.title })
                    return (
                      <button
                        key={i}
                        className={'template-item' + (isSelected ? ' selected' : '')}
                        onClick={function() { toggleTemplate(tmpl) }}
                      >
                        {isSelected ? '✓ ' : ''}{tmpl.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {selectedTemplates.length > 0 && (
            <div className="template-action">
              <span className="template-count">{selectedTemplates.length}개 선택됨</span>
              <button className="btn btn-primary" onClick={addSelectedTemplates}>
                선택한 조문 추가
              </button>
            </div>
          )}
        </div>
      )}

      {/* 다음 단계 */}
      <div className="step-footer">
        <button className="btn btn-primary" onClick={onNext}>STEP 3로</button>
      </div>
    </div>
  )
}

/* ─── 조문 블록 ─── */
function ArticleBlock(props) {
  var art = props.article
  var artIdx = props.artIdx
  var totalCount = props.totalCount
  var isEditing = props.isEditing

  if (!isEditing) {
    // ─── 보기 모드 ───
    return (
      <div className="article-block">
        <div className="article-header">
          <span className="article-number">{'제' + art.number + '조(' + (art.title || '제목 없음') + ')'}</span>
          <div className="article-actions">
            <button className="article-action-btn" onClick={function() { props.onMove(-1) }} disabled={artIdx === 0}>▲</button>
            <button className="article-action-btn" onClick={function() { props.onMove(1) }} disabled={artIdx === totalCount - 1}>▼</button>
            <button className="article-action-btn" onClick={props.onStartEdit}>편집</button>
            <button className="article-action-btn danger" onClick={props.onRemove}>삭제</button>
          </div>
        </div>
        <div className="article-body-view">
          {art.paragraphs.map(function(para, pi) {
            return (
              <div key={para.id} className="para-view">
                <span className="para-prefix">
                  {art.paragraphs.length > 1 ? (CIRCLED[pi] || ('(' + (pi + 1) + ')')) + ' ' : ''}
                </span>
                <span>{para.content}</span>
                {para.items.map(function(item, ii) {
                  return (
                    <div key={item.id} className="item-view">
                      <span className="item-prefix">{(ii + 1) + '. '}</span>
                      <span>{item.content}</span>
                      {item.subItems.map(function(sub, si) {
                        return (
                          <div key={sub.id} className="subitem-view">
                            <span className="subitem-prefix">{(MOK[si] || '?') + '. '}</span>
                            <span>{sub.content}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── 편집 모드 ───
  return (
    <div className="article-block editing">
      <div className="article-header">
        <div className="article-title-edit">
          <span className="article-number-label">{'제' + art.number + '조'}</span>
          <input
            type="text"
            className="article-title-input"
            value={art.title}
            onChange={function(e) { props.onUpdateTitle(e.target.value) }}
            placeholder="조문 제목"
          />
        </div>
        <div className="article-actions">
          <button className="article-action-btn primary" onClick={props.onStopEdit}>저장</button>
          <button className="article-action-btn danger" onClick={props.onRemove}>삭제</button>
        </div>
      </div>

      <div className="article-body-edit">
        {art.paragraphs.map(function(para, pi) {
          return (
            <div key={para.id} className="para-edit">
              <div className="para-edit-row">
                {art.paragraphs.length > 1 && (
                           <span className="para-edit-prefix">{CIRCLED[pi] || ('(' + (pi + 1) + ')')}</span>
                )}
                <textarea
                  className="para-textarea"
                  value={para.content}
                  onChange={function(e) { props.onUpdateParagraph(para.id, e.target.value) }}
                  placeholder="항 내용을 입력하세요"
                  rows={2}
                />
                {art.paragraphs.length > 1 && (
                  <button className="inline-remove" onClick={function() { props.onRemoveParagraph(para.id) }}>삭제</button>
                )}
              </div>

              {/* 호 목록 */}
              {para.items.map(function(item, ii) {
                return (
                  <div key={item.id} className="item-edit">
                    <div className="item-edit-row">
                      <span className="item-edit-prefix">{(ii + 1) + '.'}</span>
                      <input
                        type="text"
                        className="item-input"
                        value={item.content}
                        onChange={function(e) { props.onUpdateItem(para.id, item.id, e.target.value) }}
                        placeholder="호 내용"
                      />
                      <button className="inline-remove" onClick={function() { props.onRemoveItem(para.id, item.id) }}>삭제</button>
                    </div>

                    {/* 목 목록 */}
                    {item.subItems.map(function(sub, si) {
                      return (
                        <div key={sub.id} className="subitem-edit">
                          <span className="subitem-edit-prefix">{(MOK[si] || '?') + '.'}</span>
                          <input
                            type="text"
                            className="subitem-input"
                            value={sub.content}
                            onChange={function(e) { props.onUpdateSubItem(para.id, item.id, sub.id, e.target.value) }}
                            placeholder="목 내용"
                          />
                          <button className="inline-remove" onClick={function() { props.onRemoveSubItem(para.id, item.id, sub.id) }}>삭제</button>
                        </div>
                      )
                    })}
                    <button className="add-inline-btn" onClick={function() { props.onAddSubItem(para.id, item.id) }}>+ 목</button>
                  </div>
                )
              })}
              <button className="add-inline-btn" onClick={function() { props.onAddItem(para.id) }}>+ 호 추가</button>
            </div>
          )
        })}
        <button className="add-inline-btn para-add" onClick={props.onAddParagraph}>+ 항 추가</button>
      </div>
    </div>
  )
}
