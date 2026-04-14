import React, { useState } from 'react';
import {
  AbsoluteFill,
  Video,
  Audio,
  Img,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
} from 'remotion';
import { z } from 'zod';

export const myCompSchema = z.object({
  koreanText: z.string(),
  hebrewText: z.string(),
  videoFileName: z.string().optional().default(''),
  audioFileName: z.string().optional().default('narration.mp3'),
  subtitlesJson: z.string().optional().default(''),
});

interface SubEntry {
  text: string;       // 한국어 자막
  heText?: string;    // 히브리어 자막 (구절 기반일 때 포함)
  startSec: number;
  endSec: number;
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(name);
}

function isVideoFile(name: string): boolean {
  return /\.(mp4|webm|mov|avi)$/i.test(name);
}

export const HelloWorld: React.FC<z.infer<typeof myCompSchema>> = ({
  koreanText,
  hebrewText,
  videoFileName = '',
  audioFileName = 'narration.mp3',
  subtitlesJson = '',
}) => {
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

  // 타이밍 없으면 전체 텍스트 표시 (fallback)
  const displayKo = currentSub ? currentSub.text : (subs.length === 0 ? koreanText : '');
  // 자막 있을 때: 현재 구간 heText → 갭이면 직전 heText → 없으면 빈 문자열
  // 자막 없을 때: static hebrewText
  const displayHe = subs.length === 0
    ? hebrewText
    : currentSub !== undefined
      ? (currentSub.heText ?? '')
      : (prevSub?.heText ?? '');

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', width, height }}>
      {/* 나레이션 오디오 */}
      {hasAudio && (
        <Audio
          src={staticFile(audioFileName)}
          onError={() => setAudioError(true)}
        />
      )}

      {/* 배경 — 전체 화면 */}
      {showVideo ? (
        <Video
          src={staticFile(fileName)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
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

      {/* ── 자막 영역 (하단 고정) ─────────────────────────── */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          flexDirection: 'column',
        }}
      >
        {/* 히브리어 — 구절 기반 타이밍으로 전환 */}
        {displayHe ? (
          <div
            style={{
              width: '100%',
              padding: '16px 80px',
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            <span
              style={{
                color: '#F5C842',
                fontSize: 66,
                fontWeight: 900,
                textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.7)',
                lineHeight: 1.45,
                letterSpacing: '0.03em',
              }}
            >
              {displayHe}
            </span>
          </div>
        ) : null}

        {/* 한국어 — 히브리어 번역 또는 나레이션 동기화 */}
        {displayKo ? (
          <div
            style={{
              width: '100%',
              padding: '16px 80px 32px',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: 40,
                fontWeight: 700,
                textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.7)',
                lineHeight: 1.5,
              }}
            >
              {displayKo}
            </span>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
