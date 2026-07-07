import { useState } from 'react'
import { generateArticleDraft } from '../api/aiApi'

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳".split("").filter(c=>c)
const MOK = ["가","나","다","라","마","바","사","아","자","차","카","타","파","하"]
const uid = () => Math.random().toString(36).slice(2, 9)

const mkPara = (content = "") => ({ id: uid(), content, items: [] })
const mkItem = (content = "") => ({ id: uid(), content, subItems: [] })
const mkSubItem = (content = "") => ({ id: uid(), content })
const mkArticle = (number, title = "", content = "") => ({
  id: uid(), 숫자, 제목,
  단락: [mkPara(content)]
})

/* ─── 자주 사용하는 조문 요약 ─── */
const TEMPLATES = {
  "총칙": [
    { 제목: "목적", 내용: "이 조이례는 …에 관한 사항을 규제함으로써 …에 이바지함을 목적으로 합니다." },
    { title: "정의", content: "이 조례에서 사용하는 뜻의 뜻은 다음과 같습니다." },
    { title: "적용 범위", content: "이 조례는 …에 대해 적용한다." },
    { title: "다른 조례 관계", content: "… },
  ],
  "책무·계획": [
    { title: "도지사의 책무", 내용: "도지사는… },
    { title: "기본 계획 수립", 내용: "도지 사는 …을 위해 기본 계획을 수립하고 시행합니다." },
    { title: "실태조사", content: "도지사는 …의 실태를 파악하기 위해 실태조사를 할 수 있습니다." },
  ],
  "위원회": [
    { title: "위원회 설치 및 기능", content: "… },
    { title: "위원회 구성", 내용: "위원회는 위원장과 부위원장 각 1명을 포함하여 00명 이내로 구성하고, 위원장과 부위원장은 회원을 호선한다." },
    { title: "위원장의 직무", 내용: "위원장은 커뮤니티를 대표하고, 커뮤니티의 역할을 역할한다." },
    { 제목: "회의 운영", 내용: "위원회의 위원회는 위원장이 필요하다고 인정하는 소집한다." },
    { title: "위원의 해촉", content: "도지사는 위원이 다음 각 호의 어느 하나에 해당하는 경우에는 해당 위원을 해촉할 수 있습니다." },
  ],
  "지원·사업": [
    { title: "지원 사업", content: "도지사는 …의 애정을 위해 다음 각 호의 사업을 추진할 수 있습니다." },
    { title: "재정 지원", 내용: "도지 사는 …에 필요한 비용의 전체 또는 일부를 랏의 범위에서 선택할 수 있습니다." },
    { title: "사업의 활동", 내용: "도지 사는 … },
  ],
  "말미": [
    { title: "시행 규칙", 내용: "이 조례의 조사에 필요한 사항은 규칙으로 정한다." },
  ],
}

export default function Step2ArticleEditor({ data, onUpdate, onNext }) {
  const [articles, setArticles] = useState(data.articles || [])
  const [editingId, setEditingId] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState([])

  const toggleTemplate = (tmpl) => {
    setSelectedTemplates(prev => {
      const exists = prev.find(t => t.title === tmpl.title)
      만약 (존재한다면) 이전 필터(t => t.title !== tmpl.title)를 반환합니다.
      [...이전, tmpl]을 반환합니다.
    })
  }

  const addSelectedTemplates = () => {
    선택된 템플릿의 길이가 0이면 반환합니다.
    const startNum = articles.length > 0 ? Math.max(...articles.map(a => a.number)) + 1 : 1
    const newArticles = selectedTemplates.map((tmpl, i) =>
      mkArticle(startNum + i, tmpl.title, tmpl.content)
    )
    sync([...articles, ...newArticles])
    setSelectedTemplates([])
    setShowTemplates(false)
  }

  const handleAiGenerate = async () => {
    setAiGenerating(true)
    노력하다 {
      const result = await generateArticleDraft(
        데이터.키워드 || [],
        데이터.title,
        데이터 유형,
        데이터.reportSummary || ''
      )
      결과가 기사와 일치하는 경우 {
        const newArticles = result.articles.map((a, i) => mkArticle(i + 1, a.title, a.paragraphs?.[0]?.content || ''))
        동기화(새로운 기사)
      }
    } catch (err) {
      console.warn('AI 조문 생성 실패, 기본 폴더 사용:', err.message)
      // AI 실패 시 기반 기본 조문 자동 생성
      const topic = data.title || (data.keywords || []).join(' ') || '○○'
      const fallbackArticles = [
        mkArticle(1, '목적', '이 조례는' + topic + '에 필요한 사항을 규제함으로써 도민의 삶의 질을 다듬는 데 이바지함을 목적으로 합니다.'),
        mkArticle(2, '정의', '이 조례에서 사용하는 뜻의 뜻은 다음과 같다.'),
        mkArticle(3, '도지사의 책무', '경기도지사(이하 "도지사"라 한다)는 ' + topic + '을 대상으로 필요한 시책을 보고시행하고, 이에 대한 적·재정적 지원 아이디어를 얻으려고 노력해야 합니다.'),
        mkArticle(4, '위원회 설치 및 기능', '도지사는 다음 각 호의 사항을 심의 또는 하기 위한 경기도 ○○위원회(이하 "위원회"라 한다)를 둘 수 있다.'),
        mkArticle(5, '위원회 구성', '위원회는 의장과 부위원장 각 1명을 포함하여 15명 이내의 의원으로 구성하고, 위원장과 부위원장은 위원회를 호선한다.'),
        mkArticle(6, '위원장의 직무', '위원장은 커뮤니티를 대표하고, 커뮤니티의 역할을 한다.'),
        mkArticle(7, '위원회 운영', '위원회의 의사는 위원장이 필요하다고 인정하는 소집한다.'),
        mkArticle(8, '지원 사업', '도지사는' + topic + '을 위해 다음 각호의 사업을 추진할 수 있습니다.'),
        mkArticle(9, '사업의 후속', '도지사는 제8조에 따른 사업의 효율적인 추진을 대상으로 하는 경우 또는 빌어먹을 「경기도 사무탁 조위례」에 따라서는 할 수 있습니다.'),
        mkArticle(10, '시행 규칙', '이 조례의 강도에 필요한 사항은 규칙으로 정한다.'),
      ]
      동기화(fallbackArticles)
    } 마지막으로 {
      setAiGenerating(false)
    }
  }

  const sync = (newArticles) => {
    setArticles(newArticles)
    onUpdate('articles', newArticles)
  }

  /* ─── 조 교차 ─── */
  const addArticle = (template) => {
    const num = articles.length > 0 ? Math.max(...articles.map(a => a.number)) + 1 : 1
    const art = 템플릿
      ? mkArticle(num, template.title, template.content)
      : mkArticle(num)
    sync([...articles, art])
    setEditingId(art.id)
    setShowTemplates(false)
  }

  const removeArticle = (id) => {
    const filtered = articles.filter(a => a.id !== id)
    sync(filtered.map((a, i) => ({ ...a, number: i + 1 })))
    편집 ID가 id와 같으면 편집 ID를 null로 설정합니다.
  }

  const moveArticle = (idx, dir) => {
    const next = [...기사]
    const ni = idx + dir
    if (ni < 0 || ni >= next.length) 반환
    ;[next[idx], next[ni]] = [next[ni], next[idx]]
    sync(next.map((a, i) => ({ ...a, number: i + 1 })))
  }

  const updateArticle = (id, updates) => {
    sync(articles.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  /* ─── 손잡이 ─── */
  const addParagraph = (artId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: [...a.paragraphs, mkPara()]
    }))
  }

  const removeParagraph = (artId, paraId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.filter(p => p.id !== paraId)
    }))
  }

  const updateParagraph = (artId, paraId, content) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.map(p => p.id !== paraId ? p : { ...p, 내용 })
    }))
  }

  /* ─── 호 거래 ─── */
  const addItem = (artId, paraId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, 항목: [...p.items, mkItem()]
      })
    }))
  }

  const removeItem = (artId, paraId, itemId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, 항목: p.items.filter(i => i.id !== itemId)
      })
    }))
  }

  const updateItem = (artId, paraId, itemId, content) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, 항목: p.items.map(i => i.id !== itemId ? i : { ...i, 콘텐츠 })
      })
    }))
  }

  /* ─── 목 조작 ─── */
  const addSubItem = (artId, paraId, itemId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, 항목: p.items.map(i => i.id !== itemId ? i : {
          ...i, 하위 항목: [...i.subItems, mkSubItem()]
        })
      })
    }))
  }

  const removeSubItem = (artId, paraId, itemId, subId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, 항목: p.items.map(i => i.id !== itemId ? i : {
          ...i, 하위 항목: i.subItems.filter(s => s.id !== subId)
        })
      })
    }))
  }

  const updateSubItem = (artId, paraId, itemId, subId, content) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, 단락: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, 항목: p.items.map(i => i.id !== itemId ? i : {
          ...i, subItems: i.subItems.map(s => s.id !== subId ? s : { ...s, content })
        })
      })
    }))
  }

  반품 (
    <div className="step-content">
      <h2 className="step-title">2단계. 조문편집</h2>

      {/* AI 초안 생성 */}
      <div className="ai-generate-area">
        <버튼
          className="btn btn-primary"
          onClick={handleAiGenerate}
          비활성화됨={aiGenerated}
        >
          {ai생성 중 ? 'AI 생성 중...' : 'AI 조문 초안 생성'}
        </버튼>
        <p className="form-note">
          키워드와 사전조사 보고서를 바탕으로 조문 초안을 자동으로 생성합니다. 생성 후 수정 가능합니다.
        </p>
      </div>

      {/* 조문 목록 */}
      {articles.length === 0 ? (
        <div className="empty-articles">
          아직 조문이 없습니다. 아래에서 조를 추가하거나 AI 초안을 생성하세요.
        </div>
      ) : (
        <div className="articles-list">
          {articles.map((art, artIdx) => (
            <ArticleBlock
              key={art.id}
              기사={예술}
              artIdx={artIdx}
              totalCount={articles.length}
              isEditing={editingId === art.id}
              onStartEdit={() => setEditingId(art.id)}
              onStopEdit={() => setEditingId(null)}
              onRemove={() => removeArticle(art.id)}
              onMove={(dir) => moveArticle(artIdx, dir)}
              onUpdateTitle={(title) => updateArticle(art.id, { title })}
              onAddParagraph={() => addParagraph(art.id)}
              onRemoveParagraph={(pId) => removeParagraph(art.id, pId)}
              onUpdateParagraph={(pId, c) => updateParagraph(art.id, pId, c)}
              onAddItem={(pId) => addItem(art.id, pId)}
              onRemoveItem={(pId, iId) => removeItem(art.id, pId, iId)}
              onUpdateItem={(pId, iId, c) => updateItem(art.id, pId, iId, c)}
              onAddSubItem={(pId, iId) => addSubItem(art.id, pId, iId)}
              onRemoveSubItem={(pId, iId, sId) => removeSubItem(art.id, pId, iId, sId)}
              onUpdateSubItem={(pId, iId, sId, c) => updateSubItem(art.id, pId, iId, sId, c)}
            />
          ))}
        </div>
      )}

      {/* 조 추가 */}
      <div className="add-article-area">
        <button className="btn btn-outline" onClick={() => addArticle()}>
          + 빈 조 추가
        </버튼>
        <button className="btn btn-outline" onClick={() => setShowTemplates(!showTemplates)}>
          {쇼템플릿 ? '템플릿 닫기' : '+폴릿에서 추가'}
        </버튼>
      </div>

      {/* 패널 패널 */}
      {showTemplates && (
        <div className="template-panel">
          <h3 className="template-panel-title">자주 사용하는 조문</h3>
          <p className="template-panel-desc">여러 개를 선택하면 한 번 더 추가할 수 있습니다.</p>
          {Object.entries(TEMPLATES).map(([category, items]) => (
            <div key={category} className="template-category">
              <h4 className="template-category-title">{카테고리}</h4>
              <div className="template-items">
                {items.map((tmpl, i) => {
                  const isSelected = selectedTemplates.find(t => t.title === tmpl.title)
                  반품 (
                    <버튼
                      키={i}
                      className={'template-item' + (isSelected ? ' selected' : '')}
                      onClick={() => toggleTemplate(tmpl)}
                    >
                      {isSelected ? '✓ ' : ''}{tmpl.title}
                    </버튼>
                  )
                })}
              </div>
            </div>
          ))}
          {selectedTemplates.length > 0 && (
            <div className="template-action">
              <span className="template-count">{selectedTemplates.length}개 선택됨</span>
              <button className="btn btn-primary" onClick={addSelectedTemplates}>
                선택 문 추가
              </버튼>
            </div>
          )}
        </div>
      )}

      {/* 다음 단계 */}
      <div className="step-footer">
        <button className="btn btn-primary" onClick={onNext}>3단계로</button>
      </div>
    </div>
  )
}

/* ─── 조문 블록 ─── */
함수 ArticleBlock({
  기사: 예술, artIdx, 총 개수,
  isEditing, onStartEdit, onStopEdit,
  onRemove, onMove, onUpdateTitle,
  단락 추가, 단락 제거, 단락 업데이트
  onAddItem, onRemoveItem, onUpdateItem,
  onAddSubItem, onRemoveSubItem, onUpdateSubItem,
}) {
  편집 중이 아니면 {
    // ─── 보기 모드 ───
    반품 (
      <div className="article-block">
        <div className="article-header">
          <span className="article-number">제{art.number}조({art.title || '제목 없음'})</span>
          <div className="article-actions">
            <button className="article-action-btn" onClick={() => onMove(-1)} disabled={artIdx === 0}>▲</button>
            <button className="article-action-btn" onClick={() => onMove(1)} disabled={artIdx === totalCount - 1}>▼</button>
            <button className="article-action-btn" onClick={onStartEdit}>편집</button>
            <button className="article-action-btn danger" onClick={onRemove}>삭제</button>
          </div>
        </div>
        <div className="article-body-view">
          {art.paragraphs.map((para, pi) => (
            <div key={para.id} className="para-view">
              <span className="para-prefix">
                {art.paragraphs.length > 1 ? (CIRCLED[pi] || `(${pi + 1})`) + ' ' : ''}
              </span>
              <span>{para.content}</span>
              {para.items.map((item, ii) => (
                <div key={item.id} className="item-view">
                  <span className="item-prefix">{ii + 1}. </span>
                  <span>{item.content}</span>
                  {item.subItems.map((sub, si) => (
                    <div key={sub.id} className="subitem-view">
                      <span className="subitem-prefix">{MOK[si] || '?'}. </span>
                      <span>{sub.content}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── 수정 편집 ───
  반품 (
    <div className="article-block editing">
      <div className="article-header">
        <div className="article-title-edit">
          <span className="article-number-label">제{art.number}조</span>
          입력
            type="text"
            className="article-title-input"
            값={art.title}
            onChange={e => onUpdateTitle(e.target.value)}
            placeholder="조문 제목"
          />
        </div>
        <div className="article-actions">
          <button className="article-action-btn primary" onClick={onStopEdit}>저장</button>
          <button className="article-action-btn danger" onClick={onRemove}>삭제</button>
        </div>
      </div>

      <div className="article-body-edit">
        {art.paragraphs.map((para, pi) => (
          <div 키={para.id} className="para-edit">
            <div className="para-edit-row">
              {art.paragraphs.length > 1 && (
                <span className="para-edit-prefix">{CIRCLED[pi] || `(${pi + 1})`}</span>
              )}
              <텍스트 영역
                className="para-textarea"
                값={para.content}
                onChange={e => onUpdateParagraph(para.id, e.target.value)}
                placeholder="항 내용을 입력하세요"
                행={2}
              />
              {art.paragraphs.length > 1 && (
                <button className="inline-remove" onClick={() => onRemoveParagraph(para.id)}>삭제</button>
              )}
            </div>

            {/* 호 목록 */}
            {para.items.map((item, ii) => (
              <div key={item.id} className="item-edit">
                <div className="item-edit-row">
                  <span className="item-edit-prefix">{ii + 1}.</span>
                  입력
                    type="text"
                    className="item-input"
                    값={item.content}
                    onChange={e => onUpdateItem(para.id, item.id, e.target.value)}
                    placeholder="호 내용"
                  />
                  <button className="inline-remove" onClick={() => onRemoveItem(para.id, item.id)}>삭제</button>
                </div>

                {/* 목 목록 */}
                {item.subItems.map((sub, si) => (
                  <div key={sub.id} className="subitem-edit">
                    <span className="subitem-edit-prefix">{MOK[si] || '?'}.</span>
                    입력
                      type="text"
                      className="하위 항목 입력"
                      값={하위 내용}
                      onChange={e => onUpdateSubItem(para.id, item.id, sub.id, e.target.value)}
                      placeholder="목 내용"
                    />
                    <button className="inline-remove" onClick={() => onRemoveSubItem(para.id, item.id, sub.id)}>삭제</button>
                  </div>
                ))}
                <button className="add-inline-btn" onClick={() => onAddSubItem(para.id, item.id)}>+ 목</button>
              </div>
            ))}
            <button className="add-inline-btn" onClick={() => onAddItem(para.id)}>+ 호 추가</button>
          </div>
        ))}
        <button className="add-inline-btn para-add" onClick={onAddParagraph}>+ 항 추가</button>
      </div>
    </div>
  )
}
