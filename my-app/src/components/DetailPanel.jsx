import { useEffect, useMemo, useState } from 'react';
import Icon, { toSvgString } from './Icon';
import BgPicker from './BgPicker';
import CodeBlock from './CodeBlock';
import TagEditor from './TagEditor';
import { ICONS } from '../data/icons';
import { PREVIEW_SIZES } from '../app/constants';
import { stageProps } from '../lib/stage';

/** 라인 아이콘 상세 패널 */
export default function DetailPanel({
  name,
  size,
  strokeWidth,
  color,
  customTags,
  onAddTags,
  onRemoveTag,
  onClose,
  onCopy,
}) {
  const [rotate, setRotate] = useState(0);
  const [flip, setFlip] = useState(null);
  const [spin, setSpin] = useState(false);
  const [bg, setBg] = useState('checker');
  const [customBg, setCustomBg] = useState('#4f46e5');
  const icon = ICONS[name];

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
          <span className="title">{name}</span>
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
          </div>

          <dl className="meta">
            <dt>분류</dt>
            <dd>{icon.category}</dd>
            <dt>크기</dt>
            <dd>
              {size}px · 두께 {strokeWidth} · {color}
            </dd>
          </dl>

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
        </div>
      </aside>
    </>
  );
}
