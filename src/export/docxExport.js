/**
 * DOCX 문서 생성 모듈
 * 3종 문서(조례안, 제안설명서, 입법예고문)를 DOCX로 생성
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳".split("").filter(c=>c)
const MOK = ["가","나","다","라","마","바","사","아","자","차","카","타","파","하"]

/* ─── 공통 스타일 ─── */
const FONT = '바탕'
const SIZE_BODY = 20 // 10pt = 20 half-points
const SIZE_TITLE = 32
const SIZE_HEADING = 24
const SPACING = { after: 120, line: 360 }

function textRun(text, options = {}) {
  return new TextRun({ text, font: FONT, size: options.size || SIZE_BODY, bold: options.bold, ...options })
}

function para(text, options = {}) {
  return new Paragraph({
    spacing: SPACING,
    alignment: options.alignment || AlignmentType.LEFT,
    indent: options.indent ? { left: options.indent } : undefined,
    children: [textRun(text, options)],
  })
}

function titlePara(text) {
  return new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.CENTER,
    children: [textRun(text, { size: SIZE_TITLE, bold: true })],
  })
}

function headingPara(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [textRun(text, { size: SIZE_HEADING, bold: true })],
  })
}

/* ─── 조문 텍스트 생성 ─── */
function buildArticleParagraphs(articles) {
  const paras = []
  if (!articles) return paras

  articles.forEach(art => {
    const artTitle = art.title ? `(${art.title})` : ''
    if (art.paragraphs.length === 1 && art.paragraphs[0].items.length === 0) {
      paras.push(para(`제${art.number}조${artTitle} ${art.paragraphs[0].content}`, { bold: false }))
      paras.push(new Paragraph({
        children: [textRun(`제${art.number}조${artTitle} `, { bold: true, size: SIZE_BODY }),
                   textRun(art.paragraphs[0].content, { size: SIZE_BODY })]  ,
        spacing: SPACING,
      }))
    } else {
      paras.push(para(`제${art.number}조${artTitle}`, { bold: true }))
      art.paragraphs.forEach((p, pi) => {
        const prefix = art.paragraphs.length > 1 ? `${CIRCLED[pi] || `(${pi+1})`} ` : ''
        paras.push(para(`  ${prefix}${p.content}`, { indent: 200 }))
        p.items.forEach((item, ii) => {
          paras.push(para(`    ${ii + 1}. ${item.content}`, { indent: 400 }))
          item.subItems.forEach((sub, si) => {
            paras.push(para(`      ${MOK[si] || '?'}. ${sub.content}`, { indent: 600 }))
          })
        })
      })
    }
  })
  return paras
}

/* ─── 1. 조례안 본문 생성 ─── */
export function generateBillDocx(data) {
  const isAmendment = data.type === '일부개정' || data.type === '전부개정'
  const docTitle = data.type === '제정'
    ? `경기도 ${data.title || '○○'} 조례안`
    : data.type === '일부개정'
      ? `경기도 ${data.originalTitle || data.title || '○○'} 조례 일부개정조례안`
      : `경기도 ${data.originalTitle || data.title || '○○'} 조례 전부개정조례안`

  const children = [
    titlePara(docTitle),
  ]

  if (data.submitterType === '의원' && data.leadMember) {
    children.push(para(`(${data.leadMember} 의원 대표발의)`, { alignment: AlignmentType.CENTER }))
  }

  children.push(headingPara('1. 제안이유'))
  children.push(para(data.reason || '(작성 필요)'))
  children.push(headingPara('2. 주요내용'))
  children.push(para(data.mainContent || '(작성 필요)'))

  // 조문
  if (data.articles && data.articles.length > 0) {
    children.push(headingPara('조례안'))
    children.push(...buildArticleParagraphs(data.articles))
  }

  // 부칙
  if (data.supplements && data.supplements.length > 0) {
    children.push(para(''))
    children.push(para('부    칙', { alignment: AlignmentType.CENTER, bold: true }))
    if (data.supplements.length === 1) {
      children.push(para(data.supplements[0].content))
    } else {
      data.supplements.forEach((s, i) => {
        children.push(para(`제${i + 1}조 ${s.content}`))
      })
    }
  }

  return new Document({
    sections: [{ children }],
  })
}

/* ─── 2. 제안설명서 생성 ─── */
export function generateProposalDocx(data) {
  const children = [
    titlePara(`${data.title || '○○'} 조례안`),
    titlePara('제 안 설 명 서'),
  ]

  if (data.leadMember) {
    children.push(para(`${data.leadMember} 의원`, { alignment: AlignmentType.CENTER }))
  }

  children.push(headingPara('제안이유'))
  children.push(para(data.reason || '(작성 필요)'))
  children.push(headingPara('주요내용'))
  children.push(para(data.mainContent || '(작성 필요)'))

  return new Document({
    sections: [{ children }],
  })
}

/* ─── 3. 입법예고문 생성 ─── */
export function generateNoticeDocx(data) {
  const children = [
    para('경기도의회 공고 제0000-000호', { alignment: AlignmentType.LEFT }),
    titlePara('경기도 자치법규안 입법예고'),
    headingPara('1. 제정이유'),
    para(data.reason || '(작성 필요)'),
    headingPara('2. 주요내용'),
    para(data.mainContent || '(작성 필요)'),
    headingPara('3. 조례안 : 붙임'),
    headingPara('4. 의견제출'),
    para('제출기한 : 0000년 0월 0일까지'),
    para('제출방법 : 서면·우편·인터넷·경기도의회 홈페이지'),
    para('제출기관 : 경기도의회사무처(입법정책담당관실)'),
  ]

  return new Document({
    sections: [{ children }],
  })
}

/* ─── 다운로드 함수 ─── */
export async function downloadDocx(doc, filename) {
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

export async function downloadAllDocx(data) {
  const bill = generateBillDocx(data)
  const proposal = generateProposalDocx(data)
  const notice = generateNoticeDocx(data)

  // 개별 다운로드 (ZIP은 추후 구현)
  await downloadDocx(bill, `${data.title || '조례안'}_조례안본문.docx`)
  await downloadDocx(proposal, `${data.title || '조례안'}_제안설명서.docx`)
  await downloadDocx(notice, `${data.title || '조례안'}_입법예고문.docx`)
}
