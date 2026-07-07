import { useState } from 'react'

const uid = () => Math.random().toString(36).slice(2, 9)

const SUPPL_TEMPLATES = [
  { cat: "시행일", items: [
    { label: "공포일 시행", text: "이 조례는 공포한 날부터 시행한다.", needsDate: false },
    { label: "특정일 시행", text: "이 조례는 {date}부터 시행한다.", needsDate: true, datePlaceholder: "0000년 0월 0일" },
    { label: "공포 후 경과기간", text: "이 조례는 공포 후 {period}이 경과한 날부터 시행한다.", needsDate: true, datePlaceholder: "0개월" },
  ]},
  { cat: "경과조치", items: [
    { label: "일반적 경과조치", text: "이 조례 시행 당시 종전의 규정에 따라 행한 처분·절차 그 밖의 행위는 이 조례에 따라 행한 것으로 본다.", needsDate: false },
    { label: "종전 규정 적용", text: "이 조례 시행 전에 종전의 규정에 따라 행하여진 처분·절차 등은 이 조례에 따른 것으로 본다.", needsDate: false },
    { label: "기존 위원회 경과조치", text: "이 조례 시행 당시 종전의 규정에 따라 구성된 위원회는 이 조례에 따른 위원회로 본다.", needsDate: false },
  ]},
  { cat: "기타", items: [
    { label: "적용례", text: "제○조의 개정규정은 이 조례 시행 후 최초로 …하는 경우부터 적용한다.", needsDate: false },
    { label: "다른 조례의 개정", text: "○○ 조례 일부를 다음과 같이 개정한다.", needsDate: false },
    { label: "유효기간 (일몰)", text: "이 조례는 {date}까지 효력을 가진다.", needsDate: true, datePlaceholder: "0000년 0월 0일" },
  ]},
]

export default function Step3Supplement({ data, onUpdate, onNext, onPrev }) {
  const supplements = data.supplements || []

  const isMultiple = supplements.length > 1

  const addSupplement = (text) => {
    const newItem = { id: uid(), content: text || '' }
    onUpdate('supplements', [...supplements, newItem])
  }

  const removeSupplement = (id) => {
    onUpdate('supplements', supplements.filter(s => s.id !== id))
  }

  const updateSupplement = (id, content) => {
    onUpdate('supplements', supplements.map(s => s.id === id ? { ...s, content } : s))
  }

  const handleTemplateClick = (tmpl) => {
    let text = tmpl.text
    if (tmpl.needsDate) {
      text = text.replace('{date}', tmpl.datePlaceholder || '____').replace('{period}', tmpl.datePlaceholder || '____')
    }
    if (supplements.length === 0) {
      onUpdate('supplements', [{ id: uid(), content: text }])
    } else {
      addSupplement(text)
    }
  }

  return (
    <div className="step-content">
      <h2 className="step-title">STEP 3. 부칙</h2>

      {/* 부칙 조항 수 안내 */}
      <div className="form-section">
        <div className="suppl-info">
          {supplements.length <= 1
            ? '부칙이 1개이면 조번호 없이 바로 내용만 기재합니다.'
            : '부칙이 2개 이상이면 제1조, 제2조… 형태로 기재합니다.'
          }
        </div>
      </div>

      {/* 부칙 내용 */}
      <div className="form-section">
        <h3 className="form-section-title">부칙 내용</h3>

        {supplements.length === 0 && (
          <div className="suppl-empty">
            아래 템플릿에서 선택하거나 직접 추가하세요.
          </div>
        )}

        {supplements.map((s, i) => (
          <div key={s.id} className="suppl-item">
            {isMultiple && (
              <span className="suppl-item-number">제{i + 1}조</span>
            )}
            <textarea
              className="suppl-textarea"
              value={s.content}
              onChange={(e) => updateSupplement(s.id, e.target.value)}
              placeholder="부칙 내용을 입력하세요"
              rows={2}
            />
            <button
              className="suppl-remove"
              onClick={() => removeSupplement(s.id)}
            >
              삭제
            </button>
          </div>
        ))}

        <button
          className="btn btn-outline add-suppl-btn"
          onClick={() => addSupplement('')}
        >
          + 부칙 조항 추가
        </button>
      </div>

      {/* 템플릿 */}
      <div className="form-section">
        <h3 className="form-section-title">자주 사용하는 부칙 템플릿</h3>

        {SUPPL_TEMPLATES.map((group) => (
          <div key={group.cat} className="suppl-tmpl-group">
            <h4 className="suppl-tmpl-cat">{group.cat}</h4>
            <div className="suppl-tmpl-items">
              {group.items.map((tmpl, i) => (
                <button
                  key={i}
                  className="suppl-tmpl-btn"
                  onClick={() => handleTemplateClick(tmpl)}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 안내 */}
      <div className="form-section">
        <div className="suppl-guide">
          <h4 className="suppl-guide-title">부칙 작성 안내</h4>
          <p>부칙이 1개이면 조번호 없이 작성합니다.</p>
          <p>부칙이 2개 이상이면 제1조, 제2조… 형태로 작성합니다.</p>
          <p>시행일은 반드시 첫 번째 조항에 위치해야 합니다.</p>
        </div>
      </div>

      <div className="step-footer">
        <button className="btn btn-outline" onClick={onPrev}>이전</button>
        <button className="btn btn-primary" onClick={onNext}>STEP 4로</button>
      </div>
    </div>
  )
}
