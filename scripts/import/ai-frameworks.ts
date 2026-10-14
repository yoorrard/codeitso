// AI 확장 › 에이전트 프레임워크·AI SDK.
// 저장소 이름만 손으로 고르고(아래 SEEDS), 설명·별·라이선스·언어는 GitHub(또는 공개 미러 repos.ecosyste.ms)에서 받는다.
// 설치 명령은 npm·PyPI 등록소에서 그 패키지의 저장소 주소가 같은 저장소를 가리킬 때만 싣는다.
// 실행: node scripts/import/ai-frameworks.ts
import {
  type Item, ensureProxy, fetchJson, githubSlug, isMain, log, makeItem, mapLimit, repoMeta, writeCatalog,
} from './ai-lib.ts';

const KIND = 'framework';

// [저장소, 묶음, npm 패키지?, PyPI 패키지?]
type Seed = [string, string, string?, string?];

export const GROUPS: Record<string, string> = {
  agent: 'agent-framework',
  'agent-ui': 'agent-ui',
  protocol: 'protocol-sdk',
  provider: 'provider-sdk',
  router: 'llm-gateway',
  structured: 'structured-output',
  memory: 'memory',
  eval: 'eval-observability',
  runtime: 'local-runtime',
  rag: 'rag',
  voice: 'voice-agent',
  browser: 'browser-agent',
  sandbox: 'sandbox',
};

export const SEEDS: Seed[] = [
  // 에이전트·LLM 앱 프레임워크
  ['langchain-ai/langchain', 'agent', undefined, 'langchain'],
  ['langchain-ai/langchainjs', 'agent', 'langchain'],
  ['langchain-ai/langgraph', 'agent', undefined, 'langgraph'],
  ['langchain-ai/langgraphjs', 'agent', '@langchain/langgraph'],
  ['langchain-ai/deepagents', 'agent', undefined, 'deepagents'],
  ['run-llama/llama_index', 'agent', undefined, 'llama-index'],
  ['run-llama/LlamaIndexTS', 'agent', 'llamaindex'],
  ['crewAIInc/crewAI', 'agent', undefined, 'crewai'],
  ['microsoft/autogen', 'agent', undefined, 'autogen-agentchat'],
  ['ag2ai/ag2', 'agent', undefined, 'ag2'],
  ['microsoft/agent-framework', 'agent', undefined, 'agent-framework'],
  ['microsoft/semantic-kernel', 'agent', undefined, 'semantic-kernel'],
  ['openai/openai-agents-python', 'agent', undefined, 'openai-agents'],
  ['openai/openai-agents-js', 'agent', '@openai/agents'],
  ['anthropics/claude-agent-sdk-python', 'agent', undefined, 'claude-agent-sdk'],
  ['anthropics/claude-agent-sdk-typescript', 'agent', '@anthropic-ai/claude-agent-sdk'],
  ['google/adk-python', 'agent', undefined, 'google-adk'],
  ['google/adk-java', 'agent'],
  ['google/adk-go', 'agent'],
  ['google/adk-js', 'agent', '@google/adk'],
  ['mastra-ai/mastra', 'agent', '@mastra/core'],
  ['vercel/ai', 'agent', 'ai'],
  ['pydantic/pydantic-ai', 'agent', undefined, 'pydantic-ai'],
  ['huggingface/smolagents', 'agent', undefined, 'smolagents'],
  ['agno-agi/agno', 'agent', undefined, 'agno'],
  ['deepset-ai/haystack', 'agent', undefined, 'haystack-ai'],
  ['strands-agents/harness-sdk', 'agent'],
  ['camel-ai/camel', 'agent', undefined, 'camel-ai'],
  ['letta-ai/letta', 'agent', undefined, 'letta'],
  ['stanfordnlp/dspy', 'agent', undefined, 'dspy'],
  ['Significant-Gravitas/AutoGPT', 'agent'],
  ['VoltAgent/voltagent', 'agent', '@voltagent/core'],
  ['inngest/agent-kit', 'agent', '@inngest/agent-kit'],
  ['cloudflare/agents', 'agent', 'agents'],
  ['agentscope-ai/agentscope', 'agent', undefined, 'agentscope'],
  ['griptape-ai/griptape', 'agent', undefined, 'griptape'],
  ['i-am-bee/beeai-framework', 'agent'],
  ['TEN-framework/ten-framework', 'voice'],
  ['livekit/agents', 'voice', undefined, 'livekit-agents'],
  ['pipecat-ai/pipecat', 'voice', undefined, 'pipecat-ai'],
  ['langflow-ai/langflow', 'agent', undefined, 'langflow'],
  ['FlowiseAI/Flowise', 'agent', 'flowise'],
  ['langgenius/dify', 'agent'],
  ['n8n-io/n8n', 'agent', 'n8n'],
  ['activepieces/activepieces', 'agent'],
  ['kaiban-ai/KaibanJS', 'agent', 'kaibanjs'],
  ['ComposioHQ/composio', 'agent', '@composio/core', 'composio'],
  ['genkit-ai/genkit', 'agent', 'genkit'],
  ['spring-projects/spring-ai', 'agent'],
  ['langchain4j/langchain4j', 'agent'],
  ['tmc/langchaingo', 'agent'],
  ['crmne/ruby_llm', 'agent'],
  ['dotnet/extensions', 'agent'],
  ['openai/swarm', 'agent'],
  ['openai/codex', 'agent', '@openai/codex'],
  ['google-gemini/gemini-cli', 'agent', '@google/gemini-cli'],
  ['anthropics/claude-code', 'agent', '@anthropic-ai/claude-code'],
  ['anomalyco/opencode', 'agent', 'opencode-ai'],
  ['cline/cline', 'agent'],
  ['continuedev/continue', 'agent'],
  ['Aider-AI/aider', 'agent', undefined, 'aider-chat'],
  ['OpenHands/OpenHands', 'agent'],
  // 에이전트 화면(UI) 도구
  ['CopilotKit/CopilotKit', 'agent-ui', '@copilotkit/react-core'],
  ['assistant-ui/assistant-ui', 'agent-ui', '@assistant-ui/react'],
  ['vercel/chatbot', 'agent-ui'],
  ['ag-ui-protocol/ag-ui', 'agent-ui', '@ag-ui/core'],
  ['open-webui/open-webui', 'agent-ui', undefined, 'open-webui'],
  ['lobehub/lobehub', 'agent-ui'],
  ['LibreChat-AI/LibreChat', 'agent-ui'],
  ['chatchat-space/Langchain-Chatchat', 'agent-ui'],
  // 프로토콜 SDK (MCP·A2A)
  ['modelcontextprotocol/python-sdk', 'protocol', undefined, 'mcp'],
  ['modelcontextprotocol/typescript-sdk', 'protocol', '@modelcontextprotocol/sdk'],
  ['modelcontextprotocol/java-sdk', 'protocol'],
  ['modelcontextprotocol/kotlin-sdk', 'protocol'],
  ['modelcontextprotocol/csharp-sdk', 'protocol'],
  ['modelcontextprotocol/go-sdk', 'protocol'],
  ['modelcontextprotocol/rust-sdk', 'protocol'],
  ['modelcontextprotocol/swift-sdk', 'protocol'],
  ['modelcontextprotocol/ruby-sdk', 'protocol'],
  ['modelcontextprotocol/php-sdk', 'protocol'],
  ['modelcontextprotocol/inspector', 'protocol', '@modelcontextprotocol/inspector'],
  ['PrefectHQ/fastmcp', 'protocol', undefined, 'fastmcp'],
  ['punkpeye/fastmcp', 'protocol', 'fastmcp'],
  ['mark3labs/mcp-go', 'protocol'],
  ['a2aproject/A2A', 'protocol'],
  ['a2aproject/a2a-python', 'protocol', undefined, 'a2a-sdk'],
  ['a2aproject/a2a-js', 'protocol', '@a2a-js/sdk'],
  ['a2aproject/a2a-java', 'protocol'],
  ['agentclientprotocol/agent-client-protocol', 'protocol', '@agentclientprotocol/sdk'],
  // AI 회사 공식 SDK
  ['openai/openai-python', 'provider', undefined, 'openai'],
  ['openai/openai-node', 'provider', 'openai'],
  ['openai/openai-go', 'provider'],
  ['openai/openai-java', 'provider'],
  ['openai/openai-dotnet', 'provider'],
  ['openai/openai-ruby', 'provider'],
  ['anthropics/anthropic-sdk-python', 'provider', undefined, 'anthropic'],
  ['anthropics/anthropic-sdk-typescript', 'provider', '@anthropic-ai/sdk'],
  ['anthropics/anthropic-sdk-go', 'provider'],
  ['anthropics/anthropic-sdk-java', 'provider'],
  ['anthropics/anthropic-sdk-ruby', 'provider'],
  ['anthropics/anthropic-sdk-csharp', 'provider'],
  ['anthropics/anthropic-sdk-php', 'provider'],
  ['googleapis/python-genai', 'provider', undefined, 'google-genai'],
  ['googleapis/js-genai', 'provider', '@google/genai'],
  ['googleapis/go-genai', 'provider'],
  ['googleapis/java-genai', 'provider'],
  ['googleapis/dotnet-genai', 'provider'],
  ['mistralai/client-python', 'provider', undefined, 'mistralai'],
  ['mistralai/client-ts', 'provider', '@mistralai/mistralai'],
  ['cohere-ai/cohere-python', 'provider', undefined, 'cohere'],
  ['cohere-ai/cohere-typescript', 'provider', 'cohere-ai'],
  ['groq/groq-python', 'provider', undefined, 'groq'],
  ['groq/groq-typescript', 'provider', 'groq-sdk'],
  ['togethercomputer/together-python', 'provider', undefined, 'together'],
  ['togethercomputer/together-typescript', 'provider', 'together-ai'],
  ['replicate/replicate-python', 'provider', undefined, 'replicate'],
  ['replicate/replicate-javascript', 'provider', 'replicate'],
  ['huggingface/huggingface_hub', 'provider', undefined, 'huggingface_hub'],
  ['huggingface/huggingface.js', 'provider', '@huggingface/inference'],
  ['xai-org/xai-sdk-python', 'provider', undefined, 'xai-sdk'],
  ['perplexityai/perplexity-py', 'provider', undefined, 'perplexityai'],
  ['AI21Labs/ai21-python', 'provider', undefined, 'ai21'],
  ['voyage-ai/voyageai-python', 'provider', undefined, 'voyageai'],
  ['elevenlabs/elevenlabs-python', 'provider', undefined, 'elevenlabs'],
  ['elevenlabs/elevenlabs-js', 'provider', '@elevenlabs/elevenlabs-js'],
  ['deepgram/deepgram-python-sdk', 'provider', undefined, 'deepgram-sdk'],
  ['deepgram/deepgram-js-sdk', 'provider', '@deepgram/sdk'],
  ['AssemblyAI/assemblyai-python-sdk', 'provider', undefined, 'assemblyai'],
  ['AssemblyAI/assemblyai-node-sdk', 'provider', 'assemblyai'],
  ['fal-ai/fal', 'provider', undefined, 'fal-client'],
  ['fal-ai/fal-js', 'provider', '@fal-ai/client'],
  ['runwayml/sdk-python', 'provider', undefined, 'runwayml'],
  ['runwayml/sdk-node', 'provider', '@runwayml/sdk'],
  ['lumalabs/lumaai-python', 'provider', undefined, 'lumaai'],
  ['Stability-AI/stability-sdk', 'provider'],
  ['Cerebras/cerebras-cloud-sdk-python', 'provider', undefined, 'cerebras-cloud-sdk'],
  ['sambanova/sambanova-python', 'provider'],
  ['writer/writer-python', 'provider', undefined, 'writer-sdk'],
  ['IBM/watsonx-ai-python-sdk', 'provider', undefined, 'ibm-watsonx-ai'],
  ['aws/aws-sdk-js-v3', 'provider'],
  ['boto/boto3', 'provider', undefined, 'boto3'],
  ['Azure/azure-sdk-for-python', 'provider'],
  ['MetaGLM/zhipuai-sdk-python-v4', 'provider', undefined, 'zhipuai'],
  ['dashscope/dashscope-sdk-python', 'provider', undefined, 'dashscope'],
  ['baidubce/bce-qianfan-sdk', 'provider', undefined, 'qianfan'],
  ['langchain-ai/langchain-upstage', 'provider', undefined, 'langchain-upstage'],
  ['OpenRouterTeam/ai-sdk-provider', 'provider', '@openrouter/ai-sdk-provider'],
  ['OpenRouterTeam/typescript-sdk', 'provider', '@openrouter/sdk'],
  ['ollama/ollama-python', 'provider', undefined, 'ollama'],
  ['ollama/ollama-js', 'provider', 'ollama'],
  ['nomic-ai/nomic', 'provider', undefined, 'nomic'],
  ['mixedbread-ai/mixedbread-python', 'provider'],
  ['tavily-ai/tavily-python', 'provider', undefined, 'tavily-python'],
  ['exa-labs/exa-py', 'provider', undefined, 'exa-py'],
  ['exa-labs/exa-js', 'provider', 'exa-js'],
  ['firecrawl/firecrawl', 'provider', '@mendable/firecrawl-js', 'firecrawl-py'],
  // 모델 게이트웨이·라우터
  ['BerriAI/litellm', 'router', undefined, 'litellm'],
  ['Portkey-AI/gateway', 'router', '@portkey-ai/gateway'],
  ['songquanpeng/one-api', 'router'],
  ['QuantumNous/new-api', 'router'],
  ['vllm-project/semantic-router', 'router'],
  ['maximhq/bifrost', 'router'],
  ['Helicone/helicone', 'eval'],
  // 구조화 출력·프롬프트 프로그래밍
  ['567-labs/instructor', 'structured', undefined, 'instructor'],
  ['dottxt-ai/outlines', 'structured', undefined, 'outlines'],
  ['guidance-ai/guidance', 'structured', undefined, 'guidance'],
  ['BoundaryML/baml', 'structured', '@boundaryml/baml', 'baml-py'],
  ['microsoft/promptflow', 'structured', undefined, 'promptflow'],
  ['microsoft/prompty', 'structured'],
  // 기억(메모리)
  ['mem0ai/mem0', 'memory', 'mem0ai', 'mem0ai'],
  ['getzep/graphiti', 'memory', undefined, 'graphiti-core'],
  ['getzep/zep', 'memory'],
  ['topoteretes/cognee', 'memory', undefined, 'cognee'],
  ['letta-ai/letta-code', 'memory'],
  ['supermemoryai/supermemory', 'memory'],
  // 평가·관찰
  ['langfuse/langfuse', 'eval'],
  ['Arize-ai/phoenix', 'eval', undefined, 'arize-phoenix'],
  ['comet-ml/opik', 'eval', undefined, 'opik'],
  ['promptfoo/promptfoo', 'eval', 'promptfoo'],
  ['confident-ai/deepeval', 'eval', undefined, 'deepeval'],
  ['vibrantlabsai/ragas', 'eval', undefined, 'ragas'],
  ['traceloop/openllmetry', 'eval', undefined, 'traceloop-sdk'],
  ['openai/evals', 'eval'],
  ['UKGovernmentBEIS/inspect_ai', 'eval', undefined, 'inspect-ai'],
  ['wandb/weave', 'eval', undefined, 'weave'],
  ['mlflow/mlflow', 'eval', undefined, 'mlflow'],
  ['agentops-ai/agentops', 'eval', undefined, 'agentops'],
  ['NVIDIA-NeMo/Guardrails', 'eval', undefined, 'nemoguardrails'],
  ['guardrails-ai/guardrails', 'eval', undefined, 'guardrails-ai'],
  // RAG·문서 처리
  ['infiniflow/ragflow', 'rag'],
  ['microsoft/graphrag', 'rag', undefined, 'graphrag'],
  ['HKUDS/LightRAG', 'rag', undefined, 'lightrag-hku'],
  ['docling-project/docling', 'rag', undefined, 'docling'],
  ['microsoft/markitdown', 'rag', undefined, 'markitdown'],
  ['Unstructured-IO/unstructured', 'rag', undefined, 'unstructured'],
  ['chroma-core/chroma', 'rag', 'chromadb', 'chromadb'],
  ['qdrant/qdrant', 'rag'],
  ['milvus-io/milvus', 'rag'],
  ['weaviate/weaviate', 'rag'],
  ['lancedb/lancedb', 'rag', '@lancedb/lancedb', 'lancedb'],
  ['pgvector/pgvector', 'rag'],
  // 로컬 실행
  ['ollama/ollama', 'runtime'],
  ['ggml-org/llama.cpp', 'runtime'],
  ['vllm-project/vllm', 'runtime', undefined, 'vllm'],
  ['sgl-project/sglang', 'runtime', undefined, 'sglang'],
  ['mudler/LocalAI', 'runtime'],
  ['mlc-ai/web-llm', 'runtime', '@mlc-ai/web-llm'],
  ['huggingface/transformers', 'runtime', undefined, 'transformers'],
  ['huggingface/transformers.js', 'runtime', '@huggingface/transformers'],
  ['lmstudio-ai/lmstudio-js', 'runtime', '@lmstudio/sdk'],
  ['ml-explore/mlx-lm', 'runtime', undefined, 'mlx-lm'],
  // 브라우저·컴퓨터 사용 에이전트
  ['browser-use/browser-use', 'browser', undefined, 'browser-use'],
  ['browserbase/stagehand', 'browser', '@browserbasehq/stagehand'],
  ['microsoft/playwright-mcp', 'browser', '@playwright/mcp'],
  ['Skyvern-AI/skyvern', 'browser', undefined, 'skyvern'],
  ['trycua/cua', 'browser'],
  // 코드 실행 샌드박스
  ['e2b-dev/E2B', 'sandbox', 'e2b', 'e2b'],
  ['e2b-dev/code-interpreter', 'sandbox', '@e2b/code-interpreter', 'e2b-code-interpreter'],
  ['daytonaio/daytona', 'sandbox'],
  ['modal-labs/modal-client', 'sandbox', undefined, 'modal'],
  ['vercel/sandbox', 'sandbox', '@vercel/sandbox'],
];

// npm·PyPI가 이 패키지의 저장소로 같은 저장소를 적었는지 확인한다.
async function npmMatches(pkg: string, slug: string): Promise<boolean> {
  try {
    const j = await fetchJson<{ repository?: { url?: string } | string }>(`https://registry.npmjs.org/${pkg.replace('/', '%2F')}/latest`, { retries: 2 });
    const url = typeof j.repository === 'string' ? j.repository : j.repository?.url;
    const s = githubSlug(url?.replace(/^github:/, 'https://github.com/'));
    return !!s && s.toLowerCase() === slug.toLowerCase();
  } catch {
    return false;
  }
}

async function pypiMatches(pkg: string, slug: string): Promise<boolean> {
  try {
    const j = await fetchJson<{ info: { project_urls?: Record<string, string> | null; home_page?: string | null } }>(`https://pypi.org/pypi/${pkg}/json`, { retries: 2 });
    const urls = [...Object.values(j.info.project_urls ?? {}), j.info.home_page ?? ''];
    return urls.some((u) => githubSlug(u)?.toLowerCase() === slug.toLowerCase());
  } catch {
    return false;
  }
}

export async function main(): Promise<void> {
  log(`· 에이전트 프레임워크·AI SDK (손으로 고른 저장소 ${SEEDS.length}개, 정보는 GitHub/ecosyste.ms)`);
  const seen = new Set<string>();
  const missing: string[] = [];
  const rows = await mapLimit(SEEDS, 6, async ([slug, group, npm, pypi]) => {
    const meta = await repoMeta(slug);
    if (!meta) {
      missing.push(slug);
      return undefined;
    }
    const full = meta.fullName;
    // 이름이 바뀐 저장소를 옛 이름과 새 이름으로 두 번 적어 둔 경우 하나만 남긴다.
    if (seen.has(full.toLowerCase())) return undefined;
    seen.add(full.toLowerCase());
    if (meta.archived && meta.stars < 1000) return undefined;
    const installs: string[] = [];
    if (npm && (await npmMatches(npm, full))) installs.push(`npm install ${npm}`);
    if (pypi && (await pypiMatches(pypi, full))) installs.push(`pip install ${pypi}`);
    return makeItem({
      sourceId: 'fw-github', slug: full, name: full.split('/')[1] ?? full, kind: KIND, summary: meta.description,
      url: `https://github.com/${full}`,
      source: { name: 'GitHub', url: `https://github.com/${full}` },
      license: meta.license,
      metrics: { stars: meta.stars, updatedAt: meta.pushedAt },
      tags: [GROUPS[group] ?? group, meta.language, ...meta.topics.slice(0, 8), meta.archived ? 'archived' : undefined],
      preview: { type: 'repo', repo: full, language: meta.language, group: GROUPS[group] ?? group, homepage: meta.homepage, archived: meta.archived || undefined },
      use: { install: installs.join('\n') || undefined, docs: meta.homepage },
    });
  });
  const items = rows.filter((x): x is Item => !!x);
  if (missing.length) log(`  찾지 못한 저장소 ${missing.length}개: ${missing.join(', ')}`);
  writeCatalog({
    source: { id: 'fw-github', name: '에이전트 프레임워크·AI SDK (GitHub 저장소)', url: 'https://github.com', kind: KIND, license: '저장소 메타데이터(GitHub API 또는 repos.ecosyste.ms, CC BY-SA 4.0). 고른 목록은 코드쇼퍼', note: '저장소 목록은 손으로 고름, 사실은 출처에서 받음' },
    available: SEEDS.length, items,
  });
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}
