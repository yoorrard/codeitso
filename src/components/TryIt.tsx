// 해 보기 모형 다섯 가지 (T12, docs/UX.md 3.7): 진짜 키나 서버를 쓰지 않는 연습 화면. 결과는 화면 낭독기에도 알린다.
// 모양은 try-it.css(brief 6.10, D67 W3b. 해 보기가 있는 카드에만 실린다): 코드 칸은 --fill 면의 본문 글꼴(고정폭은 영수증 안에서만), 입력은 .field 48.
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import type { Concept } from '../lib/engine/types.ts';
import '../styles/try-it.css';

type Kind = NonNullable<Concept['tryIt']>['kind'];
const K = ko.tryIt;

function EnvVarForm() {
  const [name, setName] = useState('API_KEY');
  const [value, setValue] = useState<string>(K.envFake);
  const clean = name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase() || 'API_KEY';
  return (
    <div class="sim">
      <div class="sim-fields">
        <label>
          <span>{K.envName}</span>
          <input class="field" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label>
          <span>{K.envValue}</span>
          <input class="field" value={value} onInput={(e) => setValue((e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
      <p class="sim-cap">{K.envFileTitle}</p>
      <pre class="sim-code">{`${clean}=${value}`}</pre>
      <p class="sim-cap">{K.envCodeTitle}</p>
      <pre class="sim-code">{`const key = env.${clean};`}</pre>
      <p class="sim-note">{K.envNote}</p>
    </div>
  );
}

function ApiKeyForm() {
  const [where, setWhere] = useState<'code' | 'vault' | null>(null);
  const choose = (w: 'code' | 'vault'): void => {
    setWhere(w);
    announce(w === 'code' ? K.keyShown : K.keyHidden);
  };
  return (
    <div class="sim">
      <p class="sim-cap">{K.keyInput}</p>
      <pre class="sim-code">{K.keyFake}</pre>
      <p class="sim-cap">{K.keyWhere}</p>
      <div class="sim-row">
        <button type="button" class="btn" aria-pressed={where === 'code'} onClick={() => choose('code')}>
          {K.keyInCode}
        </button>
        <button type="button" class="btn" aria-pressed={where === 'vault'} onClick={() => choose('vault')}>
          {K.keyInVault}
        </button>
      </div>
      {where && (
        <div class={`devtools ${where === 'code' ? 'leak' : 'safe'}`}>
          <p class="sim-cap">{K.devtools}</p>
          <pre class="sim-code">{where === 'code' ? `fetch('…?key=${K.keyFake}')` : "fetch('/api/meal')"}</pre>{/* floor-guard-ignore: 화면에 보여 주는 예시 코드 글이고 이 사이트가 부르는 주소가 아니다 */}
          <p class="devtools-note">{where === 'code' ? K.keyShown : K.keyHidden}</p>
        </div>
      )}
    </div>
  );
}

function JsonReader() {
  const [picked, setPicked] = useState<string | null>(null);
  const item = K.jsonSample.find((x) => x.key === picked);
  return (
    <div class="sim">
      <p class="sim-cap">{K.jsonTitle}</p>
      <p class="sim-note">{K.jsonHint}</p>
      <div class="sim-code json">
        <span>{'{'}</span>
        {K.jsonSample.map((x) => (
          <button
            type="button"
            class="json-row"
            aria-pressed={picked === x.key}
            onClick={() => {
              setPicked(x.key);
              announce(fill(K.jsonPick, { key: x.key, meaning: x.meaning }));
            }}
          >
            <span class="json-key">"{x.key}"</span>: <span class="json-val">"{x.value}"</span>
          </button>
        ))}
        <span>{'}'}</span>
      </div>
      {item && <p class="sim-note">{fill(K.jsonPick, { key: item.key, meaning: item.meaning })}</p>}
    </div>
  );
}

function TerminalSim() {
  const [cmd, setCmd] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const run = (e: Event): void => {
    e.preventDefault();
    const c = cmd.trim();
    if (!c) return;
    const answers = K.terminalAnswers as Record<string, string>;
    const out = answers[c] ?? fill(K.terminalUnknown, { cmd: c });
    setLines([...lines, `$ ${c}`, out].slice(-12));
    announce(out);
    setCmd('');
  };
  return (
    <div class="sim">
      <p class="sim-cap" id="term-label">
        {K.terminalLabel}
      </p>
      <pre class="sim-code terminal" aria-labelledby="term-label">
        {lines.join('\n') || '$'}
      </pre>
      <form class="sim-row" onSubmit={run}>
        <label class="visually-hidden" for="term-input">
          {K.terminalInput}
        </label>
        <input
          id="term-input"
          class="field"
          value={cmd}
          autocomplete="off"
          spellcheck={false}
          onInput={(e) => setCmd((e.currentTarget as HTMLInputElement).value)}
        />
        <button type="submit" class="btn">
          {K.terminalRun}
        </button>
      </form>
    </div>
  );
}

function DeploySim() {
  const [step, setStep] = useState(0);
  const next = (): void => {
    const n = step >= K.deploySteps.length - 1 ? 0 : step + 1;
    setStep(n);
    announce(`${K.deploySteps[n] ?? ''}: ${K.deployNotes[n] ?? ''}`);
  };
  return (
    <div class="sim">
      <ol class="deploy-steps">
        {K.deploySteps.map((t, i) => (
          <li class={i <= step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}>
            <span class="deploy-no">{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <p class="sim-note">{K.deployNotes[step]}</p>
      <button type="button" class="btn" onClick={next}>
        {step >= K.deploySteps.length - 1 ? K.deployAgain : K.deployNext}
      </button>
    </div>
  );
}

export default function TryIt({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'env-var-form':
      return <EnvVarForm />;
    case 'api-key-form':
      return <ApiKeyForm />;
    case 'json-reader':
      return <JsonReader />;
    case 'terminal-sim':
      return <TerminalSim />;
    case 'deploy-sim':
      return <DeploySim />;
  }
}
