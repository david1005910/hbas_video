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

/** 니쿠드·칸틸레이션 제거 후 자음 수 기준으로 한 줄 최대 30자에서 단어 경계로 자름 */
const HE_DISPLAY_MAX = 30;
function trimHebrewToLine(text: string): string {
  if (!text) return text;
  const stripNiqqud = (t: string) => t.replace(/[\u0591-\u05C7]/g, '');
  if (stripNiqqud(text).replace(/\s/g, '').length <= HE_DISPLAY_MAX) return text;
  const words = text.split(/\s+/);
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
  // 타이밍 없으면 전체 텍스트 표시 (fallback)
  const displayNarration = currentSub
    ? (isEn ? (currentSub.enText ?? currentSub.text) : currentSub.text)
    : (subs.length === 0 ? (isEn ? englishText : koreanText) : '');
  const displayKo = displayNarration;
  // 자막 있을 때: 현재 구간 heText → 갭이면 직전 heText → 없으면 빈 문자열
  // 자막 없을 때: static hebrewText
  const rawHe = subs.length === 0
    ? hebrewText
    : currentSub !== undefined
      ? (currentSub.heText ?? '')
      : (prevSub?.heText ?? '');
  // 30자 초과 시 단어 경계에서 잘라냄 (구 데이터 호환)
  const displayHe = trimHebrewToLine(rawHe);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', width, height }}>
      {/* 나레이션 오디오 */}
      {hasAudio && (
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

        {/* 히브리어 — bottom 150px 고정 (한국어 유무와 무관하게 항상 같은 위치) */}
        {displayHe ? (
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

        {/* 한국어 / 영어 자막 — 하단에서 60px 위로, 30자 기준 자동 줄 분할 */}
        {displayKo ? (() => {
          const lines = splitToLines(displayKo, LINE_MAX);
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
