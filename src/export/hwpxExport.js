/**
 * HWPX 누름틀 채우기 모듈
 *
 * HWPX 파일 구조:
 * - ZIP 압축 파일
 * - Contents/section0.xml 에 본문 내용
 * - 누름틀은 XML 태그로 표현됨
 *
 * 처리 흐름:
 * 1. HWPX 업로드 → JSZip으로 해제
 * 2. section XML에서 누름틀(FieldBegin/FieldEnd) 태그 탐색
 * 3. 누름틀 목록 추출 → 사용자가 매핑 설정
 * 4. 매핑에 따라 내용 삽입
 * 5. 다시 ZIP으로 묶어서 다운로드
 */
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const MAPPING_STORAGE_KEY = 'ord-drafter-hwpx-mappings'

/**
 * HWPX 파일에서 누름틀 목록 추출
 */
export async function extractFields(file) {
  const zip = await JSZip.loadAsync(file)

  // section XML 파일들 찾기
  const sectionFiles = []
  zip.forEach((path, entry) => {
    if (path.match(/Contents\/section\d+\.xml$/i)) {
      sectionFiles.push({ path, entry })
    }
  })

  if (sectionFiles.length === 0) {
    throw new Error('HWPX 파일에서 섹션 파일을 찾을 수 없습니다.')
  }

  const fields = []

  for (const { path, entry } of sectionFiles) {
    const xml = await entry.async('text')
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    // 누름틀 탐색 (hp:fieldBegin 태그)
    // HWPX 누름틀 형식: <hp:fieldBegin type="CLICKHERE" name="필드명" />
    const fieldBegins = doc.querySelectorAll('fieldBegin, [type="CLICKHERE"]')

    fieldBegins.forEach((field, idx) => {
      const name = field.getAttribute('name') ||
                   field.getAttribute('instid') ||
                   'field_' + idx
      fields.push({
        id: 'f_' + idx,
        name: name,
        sectionPath: path,
        index: idx,
      })
    })

    // 대체 탐색: hp:ctrl-id가 있는 누름틀
    if (fields.length === 0) {
      const allText = xml
      const fieldPattern = /name="([^"]*)"[^>]*type="CLICKHERE"/g
      let match
      while ((match = fieldPattern.exec(allText)) !== null) {
        fields.push({
          id: 'f_' + fields.length,
          name: match[1],
          sectionPath: path,
          index: fields.length,
        })
      }
    }
  }

  return { zip, fields, sectionFiles }
}

/**
 * 누름틀에 내용 채우기
 */
export async function fillFields(hwpxData, mapping, ordinanceData) {
  const { zip, sectionFiles } = hwpxData

  for (const { path } of sectionFiles) {
    let xml = await zip.file(path).async('text')

    // 매핑에 따라 누름틀 내용 교체
    Object.entries(mapping).forEach(([fieldName, dataKey]) => {
      const content = getDataByKey(ordinanceData, dataKey)
      if (content) {
        // 누름틀의 텍스트 내용을 교체하는 정규식
        // HWPX에서 누름틀 텍스트는 fieldBegin과 fieldEnd 사이에 위치
        const pattern = new RegExp(
          `(name="${escapeRegex(fieldName)}"[^]*?)(<hp:t>)[^<]*(</hp:t>)`,
          'g'
        )
        xml = xml.replace(pattern, `$1$2${escapeXml(content)}$3`)
      }
    })

    zip.file(path, xml)
  }

  // 수정된 HWPX를 Blob으로 생성
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' })
  return blob
}

/**
 * 채워진 HWPX 다운로드
 */
export async function downloadFilledHwpx(blob, filename) {
  saveAs(blob, filename)
}

/**
 * 매핑 저장/불러오기 (localStorage)
 */
export function saveMappingConfig(name, mapping) {
  const configs = getMappingConfigs()
  const existing = configs.findIndex(c => c.name === name)
  const entry = { name, mapping, savedAt: new Date().toISOString() }

  if (existing >= 0) {
    configs[existing] = entry
  } else {
    configs.push(entry)
  }

  localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(configs))
}

export function getMappingConfigs() {
  try {
    return JSON.parse(localStorage.getItem(MAPPING_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function deleteMappingConfig(name) {
  const configs = getMappingConfigs().filter(c => c.name !== name)
  localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(configs))
}

/* ─── 유틸 ─── */

function getDataByKey(data, key) {
  switch (key) {
    case 'title': return data.title || ''
    case 'originalTitle': return data.originalTitle || ''
    case 'billNumber': return data.billNumber || ''
    case 'submitDate': return data.submitDate || ''
    case 'leadMember': return data.leadMember || ''
    case 'reason': return data.reason || ''
    case 'mainContent': return data.mainContent || ''
    case 'articles': return formatArticlesText(data.articles)
    case 'supplements': return formatSupplementsText(data.supplements)
    case 'coMembers': return (data.coMembers || []).filter(Boolean).join(' · ')
    default: return ''
  }
}

function formatArticlesText(articles) {
  if (!articles) return ''
  const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩".split("")
  const MOK = ["가","나","다","라","마","바","사","아","자","차"]
  return articles.map(art => {
    const t = art.title ? `(${art.title})` : ''
    const paras = art.paragraphs.map((p, pi) => {
      const prefix = art.paragraphs.length > 1 ? `${CIRCLED[pi] || ''} ` : ''
      let text = `  ${prefix}${p.content}`
      p.items.forEach((item, ii) => {
        text += `\n    ${ii + 1}. ${item.content}`
        item.subItems.forEach((sub, si) => {
          text += `\n      ${MOK[si] || ''}. ${sub.content}`
        })
      })
      return text
    }).join('\n')
    return `제${art.number}조${t}\n${paras}`
  }).join('\n\n')
}

function formatSupplementsText(supplements) {
  if (!supplements) return ''
  if (supplements.length === 1) return supplements[0].content
  return supplements.map((s, i) => `제${i + 1}조 ${s.content}`).join('\n')
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
