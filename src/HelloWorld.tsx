import React, { useState } from 'react';
import {
  AbsoluteFill,
  Video,
  Audio,
  staticFile,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

export const myCompSchema = z.object({
  koreanText: z.string(),
  hebrewText: z.string(),
  videoFileName: z.string().optional().default(''),
  audioFileName: z.string().optional().default('narration.mp3'),
});

export const HelloWorld: React.FC<z.infer<typeof myCompSchema>> = ({
  koreanText,
  hebrewText,
  videoFileName = '',
  audioFileName = 'narration.mp3',
}) => {
  const { width, height } = useVideoConfig();

  // 비디오/오디오 로드 실패 시 무시하고 fallback으로 전환
  const [videoError, setVideoError] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const hasVideo = !videoError && typeof videoFileName === 'string' && videoFileName.trim() !== '';
  const hasAudio = !audioError && typeof audioFileName === 'string' && audioFileName.trim() !== '';

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', width, height }}>
      {/* 나레이션 오디오 */}
      {hasAudio && (
        <Audio
          src={staticFile(audioFileName)}
          onError={() => setAudioError(true)}
        />
      )}

      {/* 배경 레이어 */}
      {hasVideo ? (
        <Video
          src={staticFile(videoFileName)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
          onError={() => setVideoError(true)}
        />
      ) : (
        /* 그라데이션 배경 (파일 없거나 오류 시) */
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 40%, #0d1a10 100%)',
          }}
        />
      )}

      {/* 자막 레이어 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* 히브리어 */}
        <div
          style={{
            color: '#FFD700',
            fontSize: 60,
            fontWeight: 900,
            textShadow: '0 4px 16px rgba(0,0,0,0.9)',
            direction: 'rtl',
            textAlign: 'center',
            padding: '0 60px',
            lineHeight: 1.4,
          }}
        >
          {hebrewText}
        </div>

        {/* 한국어 */}
        <div
          style={{
            color: 'white',
            fontSize: 40,
            fontWeight: 'bold',
            background: 'rgba(0,0,0,0.6)',
            padding: '10px 44px',
            borderRadius: 50,
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            textAlign: 'center',
            maxWidth: '85%',
            lineHeight: 1.5,
          }}
        >
          {koreanText}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
