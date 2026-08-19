import { useState } from 'react';
import Icon from './Icon';
import BgPicker from './BgPicker';
import CategoryPicker from './CategoryPicker';
import CodeBlock from './CodeBlock';
import DeleteButton from './DeleteButton';
import ExportBox from './ExportBox';
import NameEditor from './NameEditor';
import TagEditor from './TagEditor';
import { CAFE } from '../app/constants';
import { SIZE_LADDER, formatBytes, useAsset } from '../lib/assetUtils';
import { stageProps } from '../lib/stage';

/** cafe On 이미지 아이콘 상세 패널 */
export default function AssetPanel({
  item,
  size,
  strokeWidth,
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
  onDelete,
  onRestore,
  existingNames,
  onRename,
}) {
  const [{ status, url, meta, bytes }, restart] = useAsset(item.url, item.blob);
  const [bg, setBg] = useState('checker');
  const [customBg, setCustomBg] = useState('#4f46e5');
  const [natural, setNatural] = useState(null);

  const path = `icon/${item.file}`;
  const varName =
    (item.name.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')) || 'my') +
    'Icon';

  const htmlSnippet = `<img src="${path}" alt="${item.name}" width="${size}" height="${size}" />`;
  const jsxSnippet =
    `import ${varName} from '../../${path}';\n\n` +
    `<img src={${varName}} alt="${item.name}" width={${size}} height={${size}} />`;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={`${item.file} 상세`}>
        <div className="panel-head">
          <img src={url} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
          <NameEditor name={item.name} existingNames={existingNames} onRename={onRename} freeform />
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="panel-body">
          <div {...stageProps(bg, customBg)}>
            <img
              src={url}
              alt={item.name}
              onLoad={(e) =>
                setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
              }
              style={{ width: Math.max(size, 72), height: Math.max(size, 72), objectFit: 'contain' }}
            />
          </div>

          <BgPicker value={bg} custom={customBg} onChange={setBg} onCustom={setCustomBg} />

          <div className="demo-row" style={{ marginTop: 10 }}>
            <button className="demo-btn sm" onClick={restart}>
              <Icon name="play" size={13} strokeWidth={strokeWidth} /> 처음부터
            </button>
            <DeleteButton
              hidden={hidden}
              permanent={item.dropped}
              onDelete={onDelete}
              onRestore={onRestore}
            />
          </div>

          <dl className="meta">
            <dt>파일</dt>
            <dd>
              <code>{item.file}</code>
            </dd>
            <dt>원본</dt>
            <dd>{natural ? `${natural.w} × ${natural.h}px` : '…'}</dd>
            <dt>용량</dt>
            <dd>{bytes != null ? formatBytes(bytes) : status === 'limited' ? '측정 불가' : '…'}</dd>
            {meta && (
              <>
                <dt>프레임</dt>
                <dd>
                  {meta.frames}장 · {(meta.durationMs / 1000).toFixed(1)}초
                </dd>
              </>
            )}
            <dt>경로</dt>
            <dd>
              <code>{item.dropped ? '(드래그해 추가한 파일)' : path}</code>
            </dd>
          </dl>

          <div className="section-label">분류</div>
          <CategoryPicker
            value={category}
            builtin={CAFE}
            categories={categories}
            onChange={onMoveCategory}
            onReset={onResetCategory}
            onCopy={() => onCopy(`category: '${category}',`, 'category 값')}
          />

          <div className="section-label">태그</div>
          <TagEditor
            custom={customTags}
            onAdd={onAddTags}
            onRemove={onRemoveTag}
            onCopy={() => {
              const code = `tags: [${customTags.map((t) => `'${t}'`).join(', ')}],`;
              onCopy(code, 'tags 배열');
            }}
          />

          <div className="section-label">크기별 렌더링</div>
          <div className="sizes-strip">
            {SIZE_LADDER.slice(0, 6).map((s) => (
              <figure key={s}>
                <img src={url} alt="" style={{ width: s, height: s, objectFit: 'contain' }} />
                <figcaption>{s}</figcaption>
              </figure>
            ))}
          </div>

          <div className="section-label">크기 변환 · 내보내기</div>
          <ExportBox item={item} url={url} size={size} onToast={onToast} />

          <div className="section-label">HTML</div>
          <CodeBlock code={htmlSnippet} onCopy={() => onCopy(htmlSnippet, 'HTML')} />

          <div className="section-label">React</div>
          <CodeBlock code={jsxSnippet} onCopy={() => onCopy(jsxSnippet, 'JSX')} />

          {item.dropped && (
            <p className="hint">
              드래그해 추가한 파일은 새로고침하면 사라집니다. 계속 쓰려면 <code>icon/</code> 폴더에
              넣어 두세요.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
