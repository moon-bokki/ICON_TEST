import { useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import CodeBlock from './CodeBlock';
import { parseSvgSource, toIconName, toIconsJsSnippet } from '../lib/svgImport';
import { ICON_NAME_RULE, SWATCHES } from '../app/constants';

const IMPORT_PREVIEW_SIZES = [16, 24, 32, 48];

/**
 * SVG 아이콘 추가 대화상자
 * 붙여넣은 코드나 .svg 파일을 라인 아이콘으로 변환해 목록에 넣는다.
 */
export default function AddIconDialog({
  categories,
  strokeWidth,
  color,
  existingNames,
  onAdd,
  onClose,
  onCopy,
}) {
  const [source, setSource] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || '기타');
  const [tagText, setTagText] = useState('');
  const fileRef = useRef(null);

  /* 미리보기 전용 두께·색 — 툴바 값에서 시작하되 여기서 따로 바꿔볼 수 있다 */
  const [previewStroke, setPreviewStroke] = useState(strokeWidth);
  const [previewColor, setPreviewColor] = useState(color);

  /* 붙여넣은 코드가 바뀔 때마다 변환을 다시 시도한다 */
  const parsed = useMemo(() => {
    if (!source.trim()) return null;
    try {
      return { ok: true, ...parseSvgSource(source) };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }, [source]);

  const tags = tagText
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const duplicate = !!name && existingNames.includes(name);
  const badName = !!name && !ICON_NAME_RULE.test(name);
  const ready = parsed?.ok && name && !duplicate && !badName;

  const readFile = async (file) => {
    if (!file) return;
    setSource(await file.text());
    if (!name) setName(toIconName(file.name));
  };

  const snippet = ready
    ? toIconsJsSnippet(name, { category, tags, body: parsed.body, scale: parsed.scale })
    : '';

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    onAdd(name, { category, tags, body: parsed.body, scale: parsed.scale, custom: true });
    onClose();
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="SVG 아이콘 추가"
        onDragEnter={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.stopPropagation();
          e.preventDefault();
          readFile(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="panel-head">
          <Icon name="plus" size={18} />
          <span className="title">SVG 아이콘 추가</span>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" size={17} />
          </button>
        </div>

        <form className="dialog-body" onSubmit={submit}>
          <div className="section-label">SVG 코드</div>
          <textarea
            className="svg-input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={'<svg viewBox="0 0 24 24" ...> 전체를 붙여넣거나\n<path d="..."/> 만 넣어도 됩니다'}
            aria-label="SVG 코드"
            spellCheck="false"
          />
          <div className="dialog-row">
            <button type="button" className="demo-btn sm" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={13} />
              .svg 파일 선택
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              hidden
              onChange={(e) => {
                readFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {source && (
              <button type="button" className="demo-btn sm ghost" onClick={() => setSource('')}>
                지우기
              </button>
            )}
            <span className="hint dialog-hint">파일을 이 창에 끌어다 놓아도 됩니다</span>
          </div>

          {parsed && !parsed.ok && (
            <p className="hint import-error">
              <Icon name="alert-triangle" size={13} /> {parsed.message}
            </p>
          )}

          {parsed?.ok && (
            <>
              <div className="section-label">미리보기</div>
              <div className="import-preview">
                {IMPORT_PREVIEW_SIZES.map((s) => (
                  <figure key={s}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width={s}
                      height={s}
                      fill="none"
                      stroke={previewColor}
                      strokeWidth={previewStroke / (parsed.scale || 1)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={previewColor === 'currentColor' ? undefined : { color: previewColor }}
                      dangerouslySetInnerHTML={{ __html: parsed.body }}
                    />
                    <figcaption>{s}</figcaption>
                  </figure>
                ))}
                <div className="import-meta">
                  원본 {parsed.size} · {parsed.mode === 'line' ? '선(line)' : '채움(fill)'} 아이콘
                </div>
              </div>

              {/* 추가하기 전에 두께·색을 바꿔가며 확인 */}
              <div className="preview-controls">
                <div className="control">
                  <label htmlFor="preview-stroke">두께</label>
                  <input
                    id="preview-stroke"
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.25"
                    value={previewStroke}
                    onChange={(e) => setPreviewStroke(Number(e.target.value))}
                    disabled={parsed.mode === 'fill'}
                  />
                  <span className="val">{parsed.mode === 'fill' ? '—' : previewStroke}</span>
                </div>

                <div className="swatches">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="swatch"
                      aria-pressed={previewColor === c}
                      onClick={() => setPreviewColor(c)}
                      title={c === 'currentColor' ? 'currentColor (글자색 상속)' : c}
                      style={c === 'currentColor' ? { background: 'var(--text)' } : { background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={previewColor === 'currentColor' ? '#4f46e5' : previewColor}
                    onChange={(e) => setPreviewColor(e.target.value)}
                    title="직접 선택"
                    aria-label="미리보기 색상"
                  />
                </div>
              </div>

              {parsed.mode === 'fill' && (
                <p className="hint import-warn">
                  <Icon name="info" size={13} /> 채움 아이콘은 선이 없어 <b>두께 조절이 적용되지
                  않습니다</b>. 색상만 바뀝니다.
                </p>
              )}

              {parsed.warnings.map((w) => (
                <p className="hint import-warn" key={w}>
                  <Icon name="info" size={13} /> {w}
                </p>
              ))}
            </>
          )}

          <div className="section-label">이름 · 분류 · 태그</div>
          <div className="dialog-row">
            <input
              className="dialog-input"
              value={name}
              onChange={(e) => setName(e.target.value.trim().toLowerCase())}
              placeholder="아이콘 이름 (예: heart)"
              aria-label="아이콘 이름"
            />
            <select
              className="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="분류"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {duplicate && (
            <p className="hint import-error">
              <Icon name="alert-triangle" size={13} /> 이미 있는 이름입니다. 다른 이름을 쓰세요.
            </p>
          )}
          {badName && (
            <p className="hint import-error">
              <Icon name="alert-triangle" size={13} /> 영문 소문자·숫자·하이픈(-)만 쓸 수 있습니다.
            </p>
          )}

          <input
            className="dialog-input"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="검색용 태그 — 쉼표로 구분 (예: 하트, 좋아요, like)"
            aria-label="태그"
          />

          {ready && (
            <>
              <div className="section-label">icons.js 에 넣을 코드</div>
              <CodeBlock code={snippet} onCopy={() => onCopy(snippet, 'icons.js 코드')} />
              <p className="hint">
                추가한 아이콘은 이 브라우저에 저장됩니다. 영구히 남기려면 위 코드를{' '}
                <code>src/data/icons.js</code> 에 붙여넣으세요.
              </p>
            </>
          )}

          <div className="dialog-foot">
            <button type="button" className="demo-btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="demo-btn primary" disabled={!ready}>
              <Icon name="plus" size={14} />
              아이콘 추가
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
