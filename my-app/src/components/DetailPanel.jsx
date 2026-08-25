import { useEffect, useMemo, useState } from 'react';
import Icon, { toSvgString } from './Icon';
import BgPicker from './BgPicker';
import CategoryPicker from './CategoryPicker';
import CodeBlock from './CodeBlock';
import DeleteButton from './DeleteButton';
import DownloadBox from './DownloadBox';
import NameEditor from './NameEditor';
import TagEditor from './TagEditor';
import { lookupIcon } from '../data/customIcons';
import { PREVIEW_SIZES } from '../app/constants';
import { stageProps } from '../lib/stage';

/** 라인 아이콘 상세 패널 */
export default function DetailPanel({
  name,
  size,
  strokeWidth,
  color,
  category,
  categories,
  onMoveCategory,
  onResetCategory,
  customTags,
  onAddTags,
  onRemoveTag,
  onClose,
  onCopy,
  onToast,
  hidden,
  permanent,
  onDelete,
  onRestore,
  existingNames,
  onRename,
}) {
  const [rotate, setRotate] = useState(0);
  const [flip, setFlip] = useState(null);
  const [spin, setSpin] = useState(false);
  const [bg, setBg] = useState('checker');
  const [customBg, setCustomBg] = useState('#4f46e5');
  const icon = lookupIcon(name);

  useEffect(() => {
    setRotate(0);
    setFlip(null);
    setSpin(false);
  }, [name]);

  const jsx = useMemo(() => {
    const p = [`name="${name}"`];
    if (size !== 24) p.push(`size={${size}}`);
    if (strokeWidth !== 1.75) p.push(`strokeWidth={${strokeWidth}}`);
    if (color !== 'currentColor') p.push(`color="${color}"`);
    if (rotate) p.push(`rotate={${rotate}}`);
    if (flip) p.push(`flip="${flip}"`);
    if (spin) p.push('spin');
    return `<Icon ${p.join(' ')} />`;
  }, [name, size, strokeWidth, color, rotate, flip, spin]);

  const svg = useMemo(
    () => toSvgString(name, { size, strokeWidth, color }),
    [name, size, strokeWidth, color]
  );

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={`${name} 아이콘 상세`}>
        <div className="panel-head">
          <Icon name={name} size={20} strokeWidth={strokeWidth} />
          <NameEditor name={name} existingNames={existingNames} onRename={onRename} />
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="panel-body">
          <div {...stageProps(bg, customBg)}>
            <Icon
              name={name}
              size={Math.max(size, 72)}
              strokeWidth={strokeWidth}
              color={color}
              rotate={rotate}
              flip={flip}
              spin={spin}
            />
          </div>

          <BgPicker value={bg} custom={customBg} onChange={setBg} onCustom={setCustomBg} />

          {color === 'currentColor' && (
            <p className="hint bg-note">
              색상이 <code>currentColor</code> 라 아이콘이 배경의 글자색을 따라갑니다. 고정 색으로
              보려면 상단 툴바에서 색을 지정하세요.
            </p>
          )}

          <div className="demo-row" style={{ marginTop: 10 }}>
            <button className="demo-btn sm" onClick={() => setRotate((r) => (r + 90) % 360)}>
              <Icon name="refresh" size={14} /> 회전 {rotate}°
            </button>
            <button
              className="demo-btn sm"
              onClick={() => setFlip(flip === 'x' ? null : 'x')}
              aria-pressed={flip === 'x'}
            >
              <Icon name="arrow-right" size={14} flip="x" /> 좌우 반전
            </button>
            <button className="demo-btn sm" onClick={() => setSpin(!spin)} aria-pressed={spin}>
              <Icon name="loader" size={14} spin={spin} /> 회전 애니메이션
            </button>
            <DeleteButton
              hidden={hidden}
              permanent={permanent}
              onDelete={onDelete}
              onRestore={onRestore}
            />
          </div>

          {permanent && (
            <p className="hint bg-note">
              화면에서 추가한 아이콘입니다. 이 브라우저에만 저장되어 있어 삭제하면 되돌릴 수
              없습니다.
            </p>
          )}

          <dl className="meta">
            <dt>크기</dt>
            <dd>
              {size}px · 두께 {strokeWidth} · {color}
            </dd>
          </dl>

          <div className="section-label">분류</div>
          <CategoryPicker
            value={category}
            builtin={icon.category}
            categories={categories}
            onChange={onMoveCategory}
            onReset={onResetCategory}
            onCopy={() => onCopy(`category: '${category}',`, 'category 값')}
          />

          <div className="section-label">태그</div>
          <TagEditor
            builtin={icon.tags}
            custom={customTags}
            onAdd={onAddTags}
            onRemove={onRemoveTag}
            onCopy={() => {
              const all = [...icon.tags, ...customTags];
              const code = `tags: [${all.map((t) => `'${t}'`).join(', ')}],`;
              onCopy(code, 'tags 배열');
            }}
          />

          <div className="section-label">크기별 렌더링</div>
          <div className="sizes-strip">
            {PREVIEW_SIZES.map((s) => (
              <figure key={s}>
                <Icon name={name} size={s} strokeWidth={strokeWidth} color={color} />
                <figcaption>{s}</figcaption>
              </figure>
            ))}
          </div>

          <div className="section-label">React</div>
          <CodeBlock code={jsx} onCopy={() => onCopy(jsx, 'JSX')} />
          <CodeBlock
            code={`import Icon from './components/Icon';`}
            onCopy={() => onCopy(`import Icon from './components/Icon';`, 'import 문')}
          />

          <div className="section-label">SVG</div>
          <CodeBlock code={svg} onCopy={() => onCopy(svg, 'SVG')} />

          <div className="section-label">파일 내려받기</div>
          <DownloadBox name={name} svg={svg} size={size} color={color} onToast={onToast} />
        </div>
      </aside>
    </>
  );
}
