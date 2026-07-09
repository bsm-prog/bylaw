import { useState } from 'react'
import {
  generateBillDocx, generateProposalDocx, generateNoticeDocx,
  downloadDocx, downloadAllDocx
} from '../export/docxExport'

const DOC_TABS = [
  { key: 'bill', label: '조례안 본문' },
  { key: 'proposal', label: '제안설명서' },
  { key: 'notice', label: '입법예고문' },
]

export default function Step6Export({ data, onPrev }) {
  const [exportMode, setExportMode] = useState(null) // null | 1 | 2
  const [previewTab, setPreviewTab] = useState('bill')
  const [savedMappings, setSavedMappings] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [showHelp, setShowHelp] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isAmendment = data.type === '일부개정' || data.type === '전부개정'

  const handleDownload = async (docType) => {
    setDownloading(true)
    try {
      let doc, filename
      if (docType === '조례안 본문') {
        doc = generateBillDocx(data)
        filename = (data.title || '조례안') + '_조례안본문.docx'
      } else if (docType === '제안설명서') {
        doc = generateProposalDocx(data)
        filename = (data.title || '조례안') + '_제안설명서.docx'
      } else {
        doc = generateNoticeDocx(data)
        filename = (data.title || '조례안') + '_입법예고문.docx'
      }
      await downloadDocx(doc, filename)
    } catch (err) {
      alert('다운로드 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadAll = async () => {
    setDownloading(true)
    try {
      await downloadAllDocx(data)
    } catch (err) {
      alert('다운로드 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleHwpxProcess = () => {
    alert('HWPX 양식 채우기 기능은 배포 시 구현됩니다.')
  }

  return (
    <div className="step-content">
      <h2 className="step-title">STEP 6. 미리보기·내보내기</h2>

      {/* 방식 선택 */}
      {exportMode === null && (
        <div className="export-select">
          <p className="export-question">내보내기 방식을 선택하세요.</p>

          <div className="export-card" onClick={() => setExportMode(1)}>
            <h3 className="export-card-title">방식 1. 내용 생성 (기본)</h3>
            <p className="export-card-desc">
              3종 문서의 내용을 생성합니다.
              DOCX 파일로 다운로드 후 한글에서 양식에 맞게 서식을 적용합니다.
            </p>
            <span className="export-card-action">이 방식으로 선택</span>
          </div>

          <div className="export-card" onClick={() => setExportMode(2)}>
            <h3 className="export-card-title">방식 2. 내 양식에 채우기</h3>
            <p className="export-card-desc">
              내가 사용하는 한글 양식 파일을 업로드하면
              해당 양식에 내용을 자동으로 채워 넣습니다.
            </p>
            <p className="export-card-sub">
              전문위원실별 양식이 다른 경우에도 내 양식을 기준으로 작업할 수 있습니다.
            </p>
            <span className="export-card-action">이 방식으로 선택</span>
          </div>
        </div>
      )}

      {/* 방식 1: DOCX 내보내기 */}
      {exportMode === 1 && (
        <div className="export-mode1">
          <div className="export-mode-header">
            <h3 className="export-mode-title">방식 1. 내용 생성</h3>
            <button className="btn-text-sm" onClick={() => setExportMode(null)}>방식 변경</button>
          </div>

          {/* 미리보기 */}
          <div className="preview-section">
            <h4 className="preview-section-title">미리보기</h4>
            <div className="preview-tabs">
              {DOC_TABS.map(tab => (
                <button key={tab.key}
                  className={'preview-tab' + (previewTab === tab.key ? ' active' : '')}
                  onClick={() => setPreviewTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="preview-body">
              {previewTab === 'bill' && <BillPreview data={data} isAmendment={isAmendment} />}
              {previewTab === 'proposal' && <ProposalPreview data={data} />}
              {previewTab === 'notice' && <NoticePreview data={data} />}
            </div>
          </div>

          {/* 다운로드 */}
          <div className="download-section">
            <h4 className="download-title">다운로드</h4>
            <div className="download-list">
              <button className="download-btn" onClick={() => handleDownload('조례안 본문')}>조례안 본문 .docx</button>
              <button className="download-btn" onClick={() => handleDownload('제안설명서')}>제안설명서 .docx</button>
              <button className="download-btn" onClick={() => handleDownload('입법예고문')}>입법예고문 .docx</button>
              <button className="download-btn primary" onClick={handleDownloadAll}>3종 일괄 다운로드 .zip</button>
            </div>
            <p className="download-note">
              DOCX 파일을 한글에서 열어 양식에 맞게 서식을 적용하시기 바랍니다.
            </p>
          </div>
        </div>
      )}

      {/* 방식 2: 양식 채우기 */}
      {exportMode === 2 && (
        <div className="export-mode2">
          <div className="export-mode-header">
            <h3 className="export-mode-title">방식 2. 내 양식에 채우기</h3>
            <button className="btn-text-sm" onClick={() => setExportMode(null)}>방식 변경</button>
          </div>

          {/* 안내 + 도움말 */}
          <div className="hwpx-notice">
            <p>
              누름틀이 설정된 HWPX 양식을 업로드하시면
              서식이 유지된 상태로 내용이 자동 채워집니다.
            </p>
            <button className="hwpx-help-btn" onClick={() => setShowHelp(!showHelp)}>
              {showHelp ? '도움말 닫기' : '도움말'}
            </button>
            <p className="hwpx-fallback">
              양식이 없으신가요? → 방식 1에서 DOCX로 다운로드 후 한글에서 서식을 적용하시기 바랍니다.
            </p>
          </div>

          {showHelp && (
            <div className="hwpx-help">
              <h4 className="hwpx-help-title">HWPX 양식 준비 방법</h4>
              <p>1. 한글에서 기존 양식 파일을 엽니다.</p>
              <p>2. 내용이 들어갈 위치에 누름틀을 설정합니다.</p>
              <p>3. 파일 → 다른 이름으로 저장 → 파일 형식 "HWPX" 선택하여 저장합니다.</p>
              <p className="hwpx-help-note">한글 2020 이상에서 HWPX 저장을 지원합니다.</p>
            </div>
          )}

          {/* 저장된 매핑 */}
          {savedMappings.length > 0 && (
            <div className="mapping-saved">
              <h4 className="mapping-saved-title">저장된 양식 설정</h4>
              {savedMappings.map((m, i) => (
                <div key={i} className="mapping-saved-item">
                  <span>{m.name}</span>
                  <div className="mapping-saved-actions">
                    <button className="btn-text-sm">사용</button>
                    <button className="btn-text-sm">수정</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 양식 업로드 */}
          <div className="hwpx-upload-section">
            <h4 className="hwpx-upload-title">양식 파일 업로드</h4>
            <p className="hwpx-upload-desc">
              각 문서에 사용할 양식 파일을 업로드하세요.
              .hwpx 파일을 지원합니다.
              3종 모두 올릴 필요는 없습니다. 업로드한 양식에만 내용이 채워지고,
              나머지는 방식 1(DOCX)로 생성됩니다.
            </p>

            {DOC_TABS.map(tab => (
              <div key={tab.key} className="hwpx-upload-row">
                <span className="hwpx-upload-label">{tab.label} 양식</span>
                <div className="hwpx-upload-area">
                  {uploadedFiles[tab.key]
                    ? <span className="hwpx-upload-filename">{uploadedFiles[tab.key]}</span>
                    : <span className="hwpx-upload-placeholder">파일을 드래그하거나 클릭하여 업로드</span>
                  }
                </div>
              </div>
            ))}

            <div className="hwpx-mapping-name">
              <label className="form-label">양식 이름 (저장용)</label>
              <input type="text" className="form-input" placeholder="예: 문화체육관광전문위원실" />
            </div>

            <div className="hwpx-actions">
              <button className="btn btn-outline">매핑 저장</button>
              <button className="btn btn-primary" onClick={handleHwpxProcess}>내용 채우기 실행</button>
            </div>
          </div>
        </div>
      )}

      <div className="step-footer">
        <button className="btn btn-outline" onClick={onPrev}>이전</button>
      </div>
    </div>
  )
}


/* ─── 미리보기 컴포넌트 (문서 양식 순서) ─── */

var CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
  .split('').filter(function(c){return c})
var MOK = [
  '가','나','다','라','마','바','사',
  '아','자','차','카','타','파','하'
]

/* 호·목 인라인 스타일 */
var stHang = {paddingLeft: 16, margin: '2px 0'}
var stHo = {paddingLeft: 36, margin: '2px 0'}
var stMok = {paddingLeft: 56, margin: '2px 0'}

function renderSubItems(subItems) {
  if (!subItems || subItems.length === 0) return null
  return subItems.map(function(sub, si) {
    var label = (MOK[si] || '?') + '. '
    return (
      <p key={sub.id || si} style={stMok}>
        {label}{sub.content || ''}
      </p>
    )
  })
}

function renderItems(items) {
  if (!items || items.length === 0) return null
  return items.map(function(item, ii) {
    return (
      <div key={item.id || ii}>
        <p style={stHo}>
          {(ii + 1) + '. '}{item.content || ''}
        </p>
        {renderSubItems(item.subItems)}
      </div>
    )
  })
}

function renderArticle(art) {
  var artTitle = art.title
    ? '(' + art.title + ')' : ''
  var paras = art.paragraphs || []
  var multi = paras.length > 1

  /* 항 1개, 호 없으면 한 줄 */
  if (paras.length <= 1) {
    var p0 = paras[0] || {}
    var noItems = !p0.items || p0.items.length === 0
    if (noItems) {
      return (
        <p key={art.id} className="preview-doc-body">
          <strong>
            {'제' + art.number + '조' + artTitle}
          </strong>{' '}
          {p0.content || ''}
        </p>
      )
    }
  }

  return (
    <div key={art.id}
      className="preview-doc-body"
      style={{marginBottom: 12}}>
      <p style={{marginBottom: 4}}>
        <strong>
          {'제' + art.number + '조' + artTitle}
        </strong>
      </p>
      {paras.map(function(p, pi) {
        var pfx = multi
          ? (CIRCLED[pi] || '(' + (pi+1) + ')') + ' '
          : ''
        return (
          <div key={p.id || pi} style={{marginBottom: 4}}>
            <p style={stHang}>
              {pfx}{p.content || ''}
            </p>
            {renderItems(p.items)}
          </div>
        )
      })}
    </div>
  )
}

function BillPreview({ data, isAmendment }) {
  var title = data.type === '제정'
    ? '경기도 ' + (data.title || '○○') + ' 조례안'
    : data.type === '일부개정'
      ? '경기도 ' + (data.originalTitle || data.title || '○○')
        + ' 조례 일부개정조례안'
      : '경기도 ' + (data.originalTitle || data.title || '○○')
        + ' 조례 전부개정조례안'

  return (
    <div className="preview-document">
      <p className="preview-doc-title">{title}</p>
      {data.submitterType === '의원' && data.leadMember && (
        <p className="preview-doc-sub">
          ({data.leadMember} 의원 대표발의)
        </p>
      )}
      <div className="preview-doc-divider" />
      <p className="preview-doc-heading">1. 제안이유</p>
      <p className="preview-doc-body">
        {data.reason || '(제안이유가 작성되지 않았습니다)'}
      </p>
      <p className="preview-doc-heading">2. 주요내용</p>
      <p className="preview-doc-body">
        {data.mainContent || '(주요내용이 작성되지 않았습니다)'}
      </p>

      {data.articles && data.articles.length > 0 && (
        <>
          <div className="preview-doc-divider" />
          <p className="preview-doc-heading">조례안</p>
          {data.articles.map(function(art) {
            return renderArticle(art)
          })}
        </>
      )}

      {data.supplements && data.supplements.length > 0 && (
        <>
          <div className="preview-doc-divider" />
          <p className="preview-doc-heading"
            style={{textAlign: 'center'}}>
            부 칙
          </p>
          {data.supplements.length === 1 ? (
            <p className="preview-doc-body">
              {data.supplements[0].content}
            </p>
          ) : (
            data.supplements.map(function(s, i) {
              return (
                <p key={s.id || i}
                  className="preview-doc-body">
                  {'제' + (i+1) + '조 '}{s.content}
                </p>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
