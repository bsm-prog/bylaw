import { useState } from 'react'
import { generateArticleDraft } from '../api/aiApi'

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳".split("").filter(c=>c)
const MOK = ["가","나","다","라","마","바","사","아","자","차","카","타","파","하"]
const uid = () => Math.random().toString(36).slice(2, 9)

const mkPara = (content = "") => ({ id: uid(), content, items: [] })
const mkItem = (content = "") => ({ id: uid(), content, subItems: [] })
const mkSubItem = (content = "") => ({ id: uid(), content })
const mkArticle = (number, title = "", content = "") => ({
  id: uid(), number, title,
  paragraphs: [mkPara(content)]
})

/* ─── 자주 쓰는 조문 템플릿 ─── */
const TEMPLATES = {
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
  const [articles, setArticles] = useState(data.articles || [])
  const [editingId, setEditingId] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  const handleAiGenerate = async () => {
    setAiGenerating(true)
    try {
      const result = await generateArticleDraft(
        data.keywords || [],
        data.title,
        data.type,
        data.reportSummary || ''
      )
      if (result && result.articles) {
        const newArticles = result.articles.map((a, i) => mkArticle(i + 1, a.title, a.paragraphs?.[0]?.content || ''))
        sync(newArticles)
      }
    } catch (err) {
      console.warn('AI 조문 생성 실패:', err.message)
      alert('AI 연결에 실패했습니다. 템플릿에서 수동으로 추가해 주세요.')
    } finally {
      setAiGenerating(false)
    }
  }

  const sync = (newArticles) => {
    setArticles(newArticles)
    onUpdate('articles', newArticles)
  }

  /* ─── 조 조작 ─── */
  const addArticle = (template) => {
    const num = articles.length > 0 ? Math.max(...articles.map(a => a.number)) + 1 : 1
    const art = template
      ? mkArticle(num, template.title, template.content)
      : mkArticle(num)
    sync([...articles, art])
    setEditingId(art.id)
    setShowTemplates(false)
  }

  const removeArticle = (id) => {
    const filtered = articles.filter(a => a.id !== id)
    sync(filtered.map((a, i) => ({ ...a, number: i + 1 })))
    if (editingId === id) setEditingId(null)
  }

  const moveArticle = (idx, dir) => {
    const next = [...articles]
    const ni = idx + dir
    if (ni < 0 || ni >= next.length) return
    ;[next[idx], next[ni]] = [next[ni], next[idx]]
    sync(next.map((a, i) => ({ ...a, number: i + 1 })))
  }

  const updateArticle = (id, updates) => {
    sync(articles.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  /* ─── 항 조작 ─── */
  const addParagraph = (artId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: [...a.paragraphs, mkPara()]
    }))
  }

  const removeParagraph = (artId, paraId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.filter(p => p.id !== paraId)
    }))
  }

  const updateParagraph = (artId, paraId, content) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.map(p => p.id !== paraId ? p : { ...p, content })
    }))
  }

  /* ─── 호 조작 ─── */
  const addItem = (artId, paraId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, items: [...p.items, mkItem()]
      })
    }))
  }

  const removeItem = (artId, paraId, itemId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, items: p.items.filter(i => i.id !== itemId)
      })
    }))
  }

  const updateItem = (artId, paraId, itemId, content) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, items: p.items.map(i => i.id !== itemId ? i : { ...i, content })
      })
    }))
  }

  /* ─── 목 조작 ─── */
  const addSubItem = (artId, paraId, itemId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, items: p.items.map(i => i.id !== itemId ? i : {
          ...i, subItems: [...i.subItems, mkSubItem()]
        })
      })
    }))
  }

  const removeSubItem = (artId, paraId, itemId, subId) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, items: p.items.map(i => i.id !== itemId ? i : {
          ...i, subItems: i.subItems.filter(s => s.id !== subId)
        })
      })
    }))
  }

  const updateSubItem = (artId, paraId, itemId, subId, content) => {
    sync(articles.map(a => a.id !== artId ? a : {
      ...a, paragraphs: a.paragraphs.map(p => p.id !== paraId ? p : {
        ...p, items: p.items.map(i => i.id !== itemId ? i : {
          ...i, subItems: i.subItems.map(s => s.id !== subId ? s : { ...s, content })
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
          키워드와 사전조사 리포트를 바탕으로 조문 초안을 자동 생성합니다. 생성 후 자유롭게 수정 가능합니다.
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
              article={art}
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
        </button>
        <button className="btn btn-outline" onClick={() => setShowTemplates(!showTemplates)}>
          {showTemplates ? '템플릿 닫기' : '+ 템플릿에서 추가'}
        </button>
      </div>

      {/* 템플릿 패널 */}
      {showTemplates && (
        <div className="template-panel">
          <h3 className="template-panel-title">자주 사용하는 조문</h3>
          {Object.entries(TEMPLATES).map(([category, items]) => (
            <div key={category} className="template-category">
              <h4 className="template-category-title">{category}</h4>
              <div className="template-items">
                {items.map((tmpl, i) => (
                  <button key={i} className="template-item" onClick={() => addArticle(tmpl)}>
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
function ArticleBlock({
  article: art, artIdx, totalCount,
  isEditing, onStartEdit, onStopEdit,
  onRemove, onMove, onUpdateTitle,
  onAddParagraph, onRemoveParagraph, onUpdateParagraph,
  onAddItem, onRemoveItem, onUpdateItem,
  onAddSubItem, onRemoveSubItem, onUpdateSubItem,
}) {
  if (!isEditing) {
    // ─── 보기 모드 ───
    return (
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

  // ─── 편집 모드 ───
  return (
    <div className="article-block editing">
      <div className="article-header">
        <div className="article-title-edit">
          <span className="article-number-label">제{art.number}조</span>
          <input
            type="text"
            className="article-title-input"
            value={art.title}
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
          <div key={para.id} className="para-edit">
            <div className="para-edit-row">
              {art.paragraphs.length > 1 && (
                <span className="para-edit-prefix">{CIRCLED[pi] || `(${pi + 1})`}</span>
              )}
              <textarea
                className="para-textarea"
                value={para.content}
                onChange={e => onUpdateParagraph(para.id, e.target.value)}
                placeholder="항 내용을 입력하세요"
                rows={2}
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
                  <input
                    type="text"
                    className="item-input"
                    value={item.content}
                    onChange={e => onUpdateItem(para.id, item.id, e.target.value)}
                    placeholder="호 내용"
                  />
                  <button className="inline-remove" onClick={() => onRemoveItem(para.id, item.id)}>삭제</button>
                </div>

                {/* 목 목록 */}
                {item.subItems.map((sub, si) => (
                  <div key={sub.id} className="subitem-edit">
                    <span className="subitem-edit-prefix">{MOK[si] || '?'}.</span>
                    <input
                      type="text"
                      className="subitem-input"
                      value={sub.content}
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
