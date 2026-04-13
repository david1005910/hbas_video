# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Remotion Studio (live preview at localhost:3000)
npm run build        # Bundle the project
npm run lint         # Run ESLint + TypeScript type check (eslint src && tsc)
npx remotion render  # Render the video to file
```

Render a specific composition with props:
```bash
npx remotion render HelloWorld out.mp4 --props=./public/data.json --audio-codec=mp3
```

Run the automation script (writes data.json + renders):
```bash
npx ts-node make-video.ts
```

## Architecture

This is a [Remotion](https://www.remotion.dev) project for generating Bible verse videos with Korean and Hebrew subtitles over background video with narration audio.

**Entry point:** `src/index.ts` calls `registerRoot(RemotionRoot)`

**Composition registration:** `src/Root.tsx` — defines the `HelloWorld` composition (1920×1080, 30fps, 150 frames). Default props include `koreanText`, `hebrewText`, and `zoomSpeed`.

**Main component:** `src/HelloWorld.tsx` — the `HelloWorld` React component renders:
1. An `<Audio>` track from `public/<audioFileName>` (default: `narration.mp3`)
2. A full-screen muted `<Video>` from `public/<videoFileName>` (default: `background_video.mp4`)
3. Hebrew text overlay (gold, 60px) and Korean subtitle (white, 40px) anchored to the bottom

Props are validated with a Zod schema (`myCompSchema`) enabling live editing in Remotion Studio.

**Static assets** go in `public/` — Remotion serves this via `staticFile()`. Currently: `narration.mp3`, `Png.png`, `data.json`.

**`make-video.ts`** — standalone automation script that writes scene data to `public/data.json` then invokes `npx remotion render` via `execSync`.

**`src/HelloWorld/`** — unused sub-components from the original template (Arc, Atom, Logo, Subtitle, Title). Can be deleted or repurposed.

## Configuration

- `remotion.config.ts`: sets JPEG image format and overwrites output by default
- Prettier: 2-space indent, spaces (not tabs)
- TypeScript: strict mode, `noUnusedLocals: true`
