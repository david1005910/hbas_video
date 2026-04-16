import React, { useState, useEffect } from 'react';
import {
  AbsoluteFill,
  Video,
  Audio,
  Img,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  delayRender,
  continueRender,
} from 'remotion';
import logoSrc from './assets/logo.jpg';

// ── Frank Rühl Libre 폰트 로드 (FontFace API 직접 사용 — 확실한 로드 보장) ──
function useFrankRuhlLibre() {
  const [handle] = useState(() => delayRender('Loading Frank Rühl Libre font'));
  useEffect(() => {
    const url700 = staticFile('FrankRuhlLibre-700.ttf');
    const url900 = staticFile('FrankRuhlLibre-900.ttf');
    const face700 = new FontFace('Frank Ruhl Libre', `url(${url700})`, { weight: '700', style: 'normal' });
    const face900 = new FontFace('Frank Ruhl Libre', `url(${url900})`, { weight: '900', style: 'normal' });
    Promise.all([
      face700.load().then((f) => { document.fonts.add(f); }),
      face900.load().then((f) => { document.fonts.add(f); }),
    ]).then(() => continueRender(handle))
      .catch((err) => { console.error('[Font] Frank Ruhl Libre 로드 실패:', err); continueRender(handle); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
import { z } from 'zod';

export const myCompSchema = z.object({
  koreanText: z.string(),
  hebrewText: z.string(),
  englishText: z.string().optional().default(''),
  language: z.enum(['ko', 'en']).optional().default('ko'),
  videoFileName: z.string().optional().default(''),
  audioFileName: z.string().optional().default('narration.mp3'),
  subtitlesJson: z.string().optional().default(''),
  showSubtitle: z.boolean().optional().default(true),
  showNarration: z.boolean().optional().default(true),
});

interface SubEntry {
  text: string;       // 한국어 자막
  heText?: string;    // 히브리어 자막 (구절 기반일 때 포함)
  enText?: string;    // 영어 자막
  startSec: number;
  endSec: number;
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(name);
}

function isVideoFile(name: string): boolean {
  return /\.(mp4|webm|mov|avi)$/i.test(name);
}

/** Sefaria 편집 주석·단락 기호·HTML 엔티티·유니코드 제어문자 제거 */
function cleanHebrew(text: string): string {
  return text
    // 히브리어 칸틸레이션 마크 (트로프/악센트, U+0591-U+05AF) — 폰트 미지원 → □ 원인
    .replace(/[\u0591-\u05AF]/g, '')
    // 유니코드 양방향·방향 제어 문자 (□로 보이는 원인)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    // 비표준 유니코드 공백 문자 → 일반 공백으로 정규화 (□로 렌더링되는 원인)
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Sefaria 편집 주석 *(...)
    .replace(/\*([\(（][^)）]*[\)）])/g, '')
    // 괄호 안 히브리어 주석
    .replace(/\([\u0591-\u05FF\s,]+\)/g, '')
    // {ס}, {פ} 단락 기호
    .replace(/\{[^\}]*\}/g, '')
    // HTML 엔티티
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    // HTML 태그
    .replace(/<[^>]*>/g, '')
    // 연속 공백
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** 니쿠드·칸틸레이션 제거 후 자음 수 기준으로 한 줄 최대 30자에서 단어 경계로 자름 */
const HE_DISPLAY_MAX = 30;
function trimHebrewToLine(text: string): string {
  const cleaned = cleanHebrew(text);
  if (!cleaned) return cleaned;
  const stripNiqqud = (t: string) => t.replace(/[\u0591-\u05C7]/g, '');
  if (stripNiqqud(cleaned).replace(/\s/g, '').length <= HE_DISPLAY_MAX) return cleaned;
  const words = cleaned.split(/\s+/);
  let result = '';
  let count = 0;
  for (const word of words) {
    const wLen = stripNiqqud(word).length;
    if (count > 0 && count + wLen > HE_DISPLAY_MAX) break;
    result = result ? `${result} ${word}` : word;
    count += wLen;
  }
  return result || words[0];
}

/** 텍스트를 maxChars 이내 단어 경계로 줄 분할 (영어·한국어 공통) */
const LINE_MAX = 30;
function splitToLines(text: string, maxChars = LINE_MAX): string[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

export const HelloWorld: React.FC<z.infer<typeof myCompSchema>> = ({
  koreanText,
  hebrewText,
  englishText = '',
  language = 'ko',
  videoFileName = '',
  audioFileName = 'narration.mp3',
  subtitlesJson = '',
  showSubtitle = true,
  showNarration = true,
}) => {
  useFrankRuhlLibre();
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentSec = frame / fps;

  const [mediaError, setMediaError] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const fileName = typeof videoFileName === 'string' ? videoFileName.trim() : '';
  const hasAudio = !audioError && typeof audioFileName === 'string' && audioFileName.trim() !== '';
  const hasMedia = !mediaError && fileName !== '';
  const showImage = hasMedia && isImageFile(fileName);
  const showVideo = hasMedia && isVideoFile(fileName);

  // 자막 타이밍 파싱
  let subs: SubEntry[] = [];
  if (subtitlesJson) {
    try { subs = JSON.parse(subtitlesJson); } catch {}
  }

  // 현재 시간에 해당하는 자막 찾기
  const currentSub = subs.find(
    (s) => currentSec >= s.startSec && currentSec < s.endSec
  );

  // 갭 기간 동안 sticky 표시: 현재 시간보다 이전에 시작된 마지막 자막
  const passedSubs = subs.filter((s) => currentSec >= s.startSec);
  const prevSub = passedSubs.length > 0 ? passedSubs[passedSubs.length - 1] : undefined;

  // 언어별 자막 텍스트 결정
  const isEn = language === 'en';

  // 한국어 자막이 실제로 있는지 확인 (영어 TTS로 생성된 경우 text가 비어 있을 수 있음)
  const hasKoSubs = subs.some((s) => s.text && s.text.trim() !== '');

  const displayKo = (() => {
    if (subs.length === 0) {
      // 자막 없음 → static 텍스트 표시 (최대 한 줄 분량만)
      const src = isEn ? englishText : koreanText;
      if (!src) return '';
      // 첫 LINE_MAX 자 이내 첫 줄만 표시 (긴 패시지 전체 표시 방지)
      const firstLine = splitToLines(src, LINE_MAX)[0] ?? '';
      return firstLine;
    }
    if (isEn) {
      // 영어 모드: enText 우선, fallback text, 갭이면 직전 enText
      if (currentSub !== undefined) return currentSub.enText ?? currentSub.text;
      return prevSub ? (prevSub.enText ?? prevSub.text ?? '') : '';
    } else {
      // 한국어 모드: text 사용
      // text가 모두 비어있어도 static koreanText 대신 '' 반환 (긴 패시지 오버플로우 방지)
      if (!hasKoSubs) return '';
      if (currentSub !== undefined) return currentSub.text || '';
      // 갭 구간: 직전 자막 sticky 표시
      return prevSub?.text ?? '';
    }
  })();

  // 히브리어: 현재 구간 heText → 갭이면 직전 heText → 없으면 static
  const rawHe = subs.length === 0
    ? hebrewText
    : currentSub !== undefined
      ? (currentSub.heText ?? '')
      : (prevSub?.heText ?? '');
  const displayHe = trimHebrewToLine(rawHe);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', width, height }}>
      {/* 나레이션 오디오 — showNarration=false 이면 무음 */}
      {hasAudio && showNarration && (
        <Audio
          src={staticFile(audioFileName)}
          loop={false}
          onError={() => setAudioError(true)}
        />
      )}

      {/* 배경 — 전체 화면 */}
      {showVideo ? (
        <Video
          src={staticFile(fileName)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
          loop={false}
          onError={() => setMediaError(true)}
        />
      ) : showImage ? (
        <Img
          src={staticFile(fileName)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setMediaError(true)}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 40%, #0d1a10 100%)',
          }}
        />
      )}

      {/* 왼쪽 하단 로고 아이콘 — 항상 표시 (번들 포함) */}
      <Img
        src={logoSrc}
        style={{
          position: 'absolute',
          top: 28,
          left: 28,
          width: 220,
          height: 124,
          objectFit: 'cover',
          borderRadius: 12,
          opacity: 0.90,
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.70)',
        }}
      />

      {/* ── 자막 영역 — 절대 위치로 고정 (한국어 유무와 무관) ── */}
      <AbsoluteFill style={{ position: 'relative' }}>

        {/* 히브리어 — bottom 150px 고정. showSubtitle=false 이면 숨김 */}
        {showSubtitle && displayHe ? (
          <div
            style={{
              position: 'absolute',
              bottom: 165,
              left: 0,
              right: 0,
              padding: '0 80px',
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            <span
              style={{
                fontFamily: '"Frank Ruhl Libre", serif',
                color: '#00E676',
                fontSize: 96,
                fontWeight: 900,
                textShadow: '0 2px 8px rgba(0,0,0,0.90)',
                lineHeight: 1.45,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {displayHe}
            </span>
          </div>
        ) : null}

        {/* 한국어 / 영어 자막 — 하단에서 60px 위로, 30자 기준 자동 줄 분할. showSubtitle=false 이면 숨김 */}
        {showSubtitle && displayKo ? (() => {
          const lines = splitToLines(displayKo, LINE_MAX).slice(0, 2);
          const fontSize = isEn ? 56 : 52;
          // 줄 수에 따라 bottom 위치 조정 (줄이 많을수록 위로)
          const lineHeight = fontSize * 1.5;
          const blockHeight = lines.length * lineHeight;
          const bottomPos = 60;
          return (
            <div
              style={{
                position: 'absolute',
                bottom: bottomPos,
                left: 0,
                right: 0,
                padding: '0 80px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
              }}
            >
              {lines.map((line, idx) => (
                <span
                  key={idx}
                  style={{
                    color: '#ffffff',
                    fontSize,
                    fontWeight: 700,
                    fontFamily: isEn ? '"Arial", "Helvetica Neue", sans-serif' : undefined,
                    textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.7)',
                    lineHeight: 1.5,
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          );
        })() : null}

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
