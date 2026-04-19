import { execSync } from 'child_process';
import fs from 'fs';

const SCRIPT_DATA = {
  koreanText: '태초에 하나님이 천지를 창조하시니라',
  hebrewText: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ',
  videoFileName: '',        // 배경 영상 파일명 (없으면 그라데이션 배경)
  audioFileName: 'narration.mp3',  // 나레이션 파일명
};

async function startAutomation() {
  console.log('🚀 성경 영상 자동화 프로세스 시작...');

  try {
    fs.writeFileSync('./public/data.json', JSON.stringify(SCRIPT_DATA, null, 2));
    console.log('📝 자막 데이터 준비 완료.');

    console.log('🎬 Remotion 렌더링 시작...');
    execSync(
      `npx remotion render HebrewBibleAnimationStudio out.mp4 --props=./public/data.json --audio-codec=mp3`,
      { stdio: 'inherit' }
    );

    console.log('\n✅ 모든 작업이 완료되었습니다! out.mp4를 확인하세요.');
  } catch (error) {
    console.error('❌ 작업 중 에러 발생:', error);
  }
}

startAutomation();
