import { useState } from 'react'

const MAX_CO_MEMBERS = 40

export default function Step1BasicInfo({ data, onUpdate, onNext }) {
  const isAmendment = data.type === '일부개정' || data.type === '전부개정'

  const addCoMember = () => {
    if (data.coMembers.length >= MAX_CO_MEMBERS) return
    onUpdate('coMembers', [...data.coMembers, ''])
  }

  const updateCoMember = (index, value) => {
    const updated = [...data.coMembers]
    updated[index] = value
    onUpdate('coMembers', updated)
  }

  const removeCoMember = (index) => {
    onUpdate('coMembers', data.coMembers.filter((_, i) => i !== index))
  }

  return (
    <div className="step-content">
      <h2 className="step-title">STEP 1. 기본정보</h2>

      {/* 조례 유형 */}
      <div className="form-section">
        <h3 className="form-section-title">조례 유형</h3>
        <div className="type-toggle">
          {['제정', '일부개정', '전부개정'].map(t => (
            <button key={t}
              className={`type-toggle-btn ${data.type === t ? 'active' : ''}`}
              onClick={() => onUpdate('type', t)}>
              {t}
            </button>
          ))}
        </div>
        <p className="form-note">Phase 3에서 선택한 유형이 기본 세팅됩니다. 변경 가능합니다.</p>
      </div>

      {/* 원 조례명 (개정 시) */}
      {isAmendment && (
        <div className="form-section">
          <h3 className="form-section-title">원 조례명</h3>
          <input type="text" className="form-input full"
            value={data.originalTitle}
            onChange={e => onUpdate('originalTitle', e.target.value)}
            placeholder="예: 경기도 청년 기본 조례" />
        </div>
      )}

      {/* 조례명 */}
      <div className="form-section">
        <h3 className="form-section-title">{isAmendment ? '개정 후 조례명' : '조례명'}</h3>
        <input type="text" className="form-input full"
          value={data.title}
          onChange={e => onUpdate('title', e.target.value)}
          placeholder="예: 경기도 ○○ 지원에 관한 조례" />
        <p className="form-note">AI가 키워드 기반으로 조례명을 제안합니다. 자유롭게 수정 가능합니다.</p>
      </div>

      {/* 의안번호·제출일 */}
      <div className="form-section">
        <h3 className="form-section-title">의안번호·제출일</h3>
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">의안번호 (선택)</label>
            <input type="text" className="form-input"
              value={data.billNumber}
              onChange={e => onUpdate('billNumber', e.target.value)}
              placeholder="예: 제964호" />
          </div>
          <div className="form-field">
            <label className="form-label">제출연월일</label>
            <input type="text" className="form-input"
              value={data.submitDate}
              onChange={e => onUpdate('submitDate', e.target.value)}
              placeholder="예: 2026. 7. 2." />
          </div>
        </div>
      </div>

      {/* 제출자 */}
      <div className="form-section">
        <h3 className="form-section-title">제출자</h3>
        <div className="type-toggle" style={{ marginBottom: 16 }}>
          <button className={`type-toggle-btn ${data.submitterType === '의원' ? 'active' : ''}`}
            onClick={() => onUpdate('submitterType', '의원')}>
            의원 대표발의
          </button>
          <button className={`type-toggle-btn ${data.submitterType === '도지사' ? 'active' : ''}`}
            onClick={() => onUpdate('submitterType', '도지사')}>
            도지사 제출
          </button>
        </div>

        {data.submitterType === '의원' && (
          <>
            {/* 대표발의 의원 */}
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label className="form-label">대표발의 의원명</label>
              <input type="text" className="form-input"
                value={data.leadMember}
                onChange={e => onUpdate('leadMember', e.target.value)}
                placeholder="예: 김○○" />
            </div>

            {/* 공동발의 의원 */}
            <div className="form-field">
              <label className="form-label">
                공동발의 의원 (최대 {MAX_CO_MEMBERS}명)
              </label>
              <div className="co-members-list">
                {data.coMembers.map((name, i) => (
                  <div key={i} className="co-member-row">
                    <input type="text" className="form-input co-member-input"
                      value={name}
                      onChange={e => updateCoMember(i, e.target.value)}
                      placeholder={`공동발의 ${i + 1}`} />
                    <button className="co-member-remove" onClick={() => removeCoMember(i)}>삭제</button>
                  </div>
                ))}
              </div>
              {data.coMembers.length < MAX_CO_MEMBERS && (
                <button className="btn btn-outline add-member-btn" onClick={addCoMember}>
                  + 의원 추가
                </button>
              )}
              <p className="form-note">현재 {data.coMembers.length}명 / 최대 {MAX_CO_MEMBERS}명</p>
            </div>
          </>
        )}
      </div>

      {/* 다음 단계 */}
      <div className="step-footer">
        <button className="btn btn-primary" onClick={onNext}>STEP 2로</button>
      </div>
    </div>
  )
}
