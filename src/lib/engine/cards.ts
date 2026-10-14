import type { Catalog } from './catalog.ts';
import { tagsWithPrefix } from './conditions.ts';
import type { EngineResult } from './evaluate.ts';
import { fill, pickTemplate } from './text.ts';

/** 대화 카드(화면: AI에게 할 말): 고른 AI에 맞게 설계도를 가리키는 말을 채운다.
 *  설계도(pack.ts)와 따로 둔다: 4단계는 카드 수를 처음부터 보이고, 설계도 글은 칸을 열거나 내려받을 때 불러온다 (D82, 설계서 L-08) */
export function conversationCards(cat: Catalog, r: EngineResult): { id: string; title: string; when: string; text: string }[] {
  const T = cat.data.templates;
  const aiTpl = pickTemplate(T.aiTools, tagsWithPrefix(r.interview.tags, 'ai.')[0], 'ai.chat-free');
  return T.conversationCards.map((c) => ({ ...c, text: fill(c.text, { packRef: aiTpl.packRef }) }));
}
