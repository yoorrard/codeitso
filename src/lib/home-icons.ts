// 스타터 키트 카드 아이콘 (Phosphor Icons, MIT, v5.1 D124 → K1 D131). 정적 홈·/kits HTML에만 쓰고 섬은 부르지 않는다:
// src/lib/icons.ts에 더하면 섬 JS(첫 화면 100KB 예산)에 함께 실리기 때문이다. 키트 id는 src/lib/kits.ts KIT_IDS (빠지면 타입 검사가 막는다).
import articleSvg from '@phosphor-icons/core/assets/regular/article.svg?raw';
import bookOpenTextSvg from '@phosphor-icons/core/assets/regular/book-open-text.svg?raw';
import browserSvg from '@phosphor-icons/core/assets/regular/browser.svg?raw';
import buildingsSvg from '@phosphor-icons/core/assets/regular/buildings.svg?raw';
import busSvg from '@phosphor-icons/core/assets/regular/bus.svg?raw';
import calendarCheckSvg from '@phosphor-icons/core/assets/regular/calendar-check.svg?raw';
import chartBarSvg from '@phosphor-icons/core/assets/regular/chart-bar.svg?raw';
import chatCircleDotsSvg from '@phosphor-icons/core/assets/regular/chat-circle-dots.svg?raw';
import chatsCircleSvg from '@phosphor-icons/core/assets/regular/chats-circle.svg?raw';
import clipboardTextSvg from '@phosphor-icons/core/assets/regular/clipboard-text.svg?raw';
import cloudSunSvg from '@phosphor-icons/core/assets/regular/cloud-sun.svg?raw';
import codeSvg from '@phosphor-icons/core/assets/regular/code.svg?raw';
import compassSvg from '@phosphor-icons/core/assets/regular/compass.svg?raw';
import cpuSvg from '@phosphor-icons/core/assets/regular/cpu.svg?raw';
import creditCardSvg from '@phosphor-icons/core/assets/regular/credit-card.svg?raw';
import cubeSvg from '@phosphor-icons/core/assets/regular/cube.svg?raw';
import cubeTransparentSvg from '@phosphor-icons/core/assets/regular/cube-transparent.svg?raw';
import fileXlsSvg from '@phosphor-icons/core/assets/regular/file-xls.svg?raw';
import flaskSvg from '@phosphor-icons/core/assets/regular/flask.svg?raw';
import flowArrowSvg from '@phosphor-icons/core/assets/regular/flow-arrow.svg?raw';
import gameControllerSvg from '@phosphor-icons/core/assets/regular/game-controller.svg?raw';
import graduationCapSvg from '@phosphor-icons/core/assets/regular/graduation-cap.svg?raw';
import heartbeatSvg from '@phosphor-icons/core/assets/regular/heartbeat.svg?raw';
import magicWandSvg from '@phosphor-icons/core/assets/regular/magic-wand.svg?raw';
import mapPinSvg from '@phosphor-icons/core/assets/regular/map-pin.svg?raw';
import mapTrifoldSvg from '@phosphor-icons/core/assets/regular/map-trifold.svg?raw';
import microphoneSvg from '@phosphor-icons/core/assets/regular/microphone.svg?raw';
import musicNotesSvg from '@phosphor-icons/core/assets/regular/music-notes.svg?raw';
import notePencilSvg from '@phosphor-icons/core/assets/regular/note-pencil.svg?raw';
import pencilLineSvg from '@phosphor-icons/core/assets/regular/pencil-line.svg?raw';
import plugsConnectedSvg from '@phosphor-icons/core/assets/regular/plugs-connected.svg?raw';
import puzzlePieceSvg from '@phosphor-icons/core/assets/regular/puzzle-piece.svg?raw';
import questionSvg from '@phosphor-icons/core/assets/regular/question.svg?raw';
import rocketLaunchSvg from '@phosphor-icons/core/assets/regular/rocket-launch.svg?raw';
import storefrontSvg from '@phosphor-icons/core/assets/regular/storefront.svg?raw';
import studentSvg from '@phosphor-icons/core/assets/regular/student.svg?raw';
import timerSvg from '@phosphor-icons/core/assets/regular/timer.svg?raw';
import translateSvg from '@phosphor-icons/core/assets/regular/translate.svg?raw';
import usersSvg from '@phosphor-icons/core/assets/regular/users.svg?raw';
import usersThreeSvg from '@phosphor-icons/core/assets/regular/users-three.svg?raw';
import virtualRealitySvg from '@phosphor-icons/core/assets/regular/virtual-reality.svg?raw';
import waveformSvg from '@phosphor-icons/core/assets/regular/waveform.svg?raw';
import type { KitId } from './kits.ts';

const KIT_ICON: Record<KitId, string> = {
  school: graduationCapSvg,
  'class-quiz': questionSvg,
  'class-tools': timerSvg,
  'class-manage': usersThreeSvg,
  'reading-log': bookOpenTextSvg,
  'word-study': pencilLineSvg,
  'sim-lab': flaskSvg,
  'coding-class': codeSvg,
  career: compassSvg,
  'study-bot': studentSvg,
  feedback: notePencilSvg,
  'notice-translate': translateSvg,
  game: gameControllerSvg,
  'game-3d': cubeSvg,
  'asset-3d': cubeTransparentSvg,
  'edu-game': puzzlePieceSvg,
  multiplayer: usersSvg,
  'rhythm-puzzle': musicNotesSvg,
  webxr: virtualRealitySvg,
  'office-docs': fileXlsSvg,
  'meeting-notes': microphoneSvg,
  booking: calendarCheckSvg,
  dashboard: chartBarSvg,
  'public-data': mapTrifoldSvg,
  'faq-bot': chatsCircleSvg,
  forms: clipboardTextSvg,
  automation: flowArrowSvg,
  landing: storefrontSvg,
  'shop-order': creditCardSvg,
  'store-map': mapPinSvg,
  weather: cloudSunSvg,
  transit: busSvg,
  'real-estate': buildingsSvg,
  health: heartbeatSvg,
  'ai-chatbot': chatCircleDotsSvg,
  'mcp-agent': plugsConnectedSvg,
  'voice-assistant': waveformSvg,
  'browser-ext': browserSvg,
  'local-llm': cpuSvg,
  'saas-starter': rocketLaunchSvg,
  'ai-image': magicWandSvg,
  'portfolio-blog': articleSvg,
};

/** 키트 아이콘 SVG 글자 (장식이라 aria-hidden). 모르는 id면 빈 글자 */
export function kitIconSvg(id: string, size = '24px'): string {
  const svg = (KIT_ICON as Record<string, string | undefined>)[id];
  return svg ? svg.replace('<svg ', `<svg width="${size}" height="${size}" class="icon" aria-hidden="true" focusable="false" `) : '';
}
