import { Composition } from 'remotion';
import { HelloWorld, myCompSchema } from './HelloWorld';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HelloWorld"
      component={HelloWorld}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      schema={myCompSchema}
      defaultProps={{
        koreanText: '태초에 하나님이 천지를 창조하시니라',
        hebrewText: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ',
        videoFileName: '',
        audioFileName: 'narration.mp3',
      }}
    />
  );
};
