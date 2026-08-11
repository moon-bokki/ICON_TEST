/**
 * icon/ 폴더의 컬러·애니메이션 아이콘 목록
 *
 * Vite 가 파일을 번들에 포함시키고 URL 을 만들어 줍니다.
 * (standalone.html 에서는 build-standalone.js 가 폴더를 훑어
 *  동일한 형태의 ANIMATED_ICONS 배열을 직접 주입합니다)
 */
const modules = import.meta.glob('/icon/*.{gif,png,apng,webp,svg,avif,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const ANIMATED_ICONS = Object.entries(modules)
  .map(([path, url]) => ({
    name: path.split('/').pop().replace(/\.[^.]+$/, ''),
    file: path.split('/').pop(),
    url,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
