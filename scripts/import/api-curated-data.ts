// 손으로 고른 API 목록 (공식 쪽 주소만). 가져오기 스크립트(api-curated.ts, api-ai.ts)가 이 목록을 읽어
// 주소가 살아 있는지 보고, 공식 쪽의 한 줄 소개(meta description)와 요금 쪽의 무료 사용 문장을 그대로 가져온다.
// 여기에는 사실(무료 한도·요금)을 적지 않는다. 적는 것: 이름, 공식 주소, 인증 방식, 공식 SDK 꾸러미 이름,
// 코드잇소가 쓴 한국어 한 줄(ko: 무엇을 하는 API인지만).
import type { Kind } from './api-lib.ts';

export interface CuratedApi {
  slug: string;
  name: string;
  kind: Kind;
  url: string; // 공식 소개·콘솔 쪽 (상품 주소)
  docs: string; // 공식 문서
  pricing?: string; // 공식 요금 쪽
  auth: string; // apiKey · OAuth · cloud IAM · none …
  npm?: string; // 공식 JS SDK 꾸러미
  npmRepo?: string; // 그 꾸러미 저장소 주소에 들어 있어야 하는 글자 (공식인지 확인)
  ko: string; // 코드잇소가 쓴 한 줄 (written: 'codeshopper')
  tags?: string[];
  serverKey?: boolean; // 비밀 키라 서버에만 둔다 (AI·결제·문자 API 대부분)
  aliases?: string[]; // 다른 목록에 같은 상품이 다른 이름으로 있을 때 (그 줄은 건너뛴다)
}

// models.dev 제공자 위에 덧씌우는 정보 (같은 회사를 두 번 싣지 않으려고).
export interface ProviderOverlay {
  kind?: Kind;
  url?: string;
  docs?: string;
  pricing?: string;
  npm?: string;
  npmRepo?: string;
  ko?: string;
  tags?: string[];
  auth?: string;
}

const gh = (org: string) => `github.com/${org}`;

// 요금 쪽에서 자동으로 따 온 '무료' 문장 가운데 손으로 읽어 보고 뺀 것 (슬러그 또는 models.dev id → 이유).
export const QUOTE_REJECT: Record<string, string> = {
  alibaba: 'heading fragment, region-only note',
  'amazon-ses': 'another SES feature (queries), not sending',
  anthropic: 'a tool add-on, not model usage',
  azure: 'vector storage only',
  'azure-ai-language': 'feature table text',
  'azure-ai-vision': 'table cells run together',
  'azure-document-intelligence': 'only custom-model training',
  dataforseo: 'menu text',
  descope: 'heading fragment',
  diffbot: 'table cells run together',
  'firebase-auth': 'Google Cloud sign-up credit, not this product',
  'google-cloud-vision': 'Google Cloud sign-up credit, not this product',
  'google-text-to-speech': 'no amount stated',
  huggingface: 'paid team plans only',
  imagga: 'click instructions',
  kinde: 'footnote fragment',
  'lemon-squeezy': 'email-marketing add-on, not payments',
  llamaparse: 'comparison text',
  mailjet: 'plan add-on credits',
  maptiler: 'navigation text',
  mistral: 'Le Chat app plan, not the API',
  'mistral-ocr': 'Le Chat app plan, not the API',
  onesignal: 'markup fragment',
  paddle: 'analytics feature, not payments',
  photoroom: 'markup fragment',
  resend: 'automation add-on, not sending',
  roboflow: 'table cells run together',
  runway: 'per-input pricing detail',
  stripe: 'one verification method only',
  upstage: 'agent product, not the model API',
  zyte: 'button text run together',
};

// ---------- models.dev 제공자 덧씌우기 ----------

export const PROVIDER_OVERLAY: Record<string, ProviderOverlay> = {
  openai: { url: 'https://platform.openai.com', docs: 'https://platform.openai.com/docs', pricing: 'https://openai.com/api/pricing/', npm: 'openai', npmRepo: gh('openai'), ko: 'GPT 모델로 글·이미지·음성·임베딩을 만드는 OpenAI 공식 API' },
  anthropic: { url: 'https://www.anthropic.com/api', docs: 'https://docs.anthropic.com', pricing: 'https://www.anthropic.com/pricing', npm: '@anthropic-ai/sdk', npmRepo: gh('anthropics'), ko: 'Claude 모델을 부르는 Anthropic 공식 API' },
  google: { url: 'https://ai.google.dev', docs: 'https://ai.google.dev/gemini-api/docs', pricing: 'https://ai.google.dev/gemini-api/docs/pricing', npm: '@google/genai', npmRepo: gh('googleapis'), ko: 'Gemini 모델을 부르는 Google AI Studio의 Gemini API' },
  'google-vertex': { kind: 'ai-inference', url: 'https://cloud.google.com/vertex-ai', docs: 'https://cloud.google.com/vertex-ai/generative-ai/docs', pricing: 'https://cloud.google.com/vertex-ai/generative-ai/pricing', auth: 'cloud IAM', ko: '구글 클라우드에서 Gemini와 여러 회사 모델을 쓰는 Vertex AI' },
  'google-vertex-anthropic': { kind: 'ai-inference', auth: 'cloud IAM', ko: '구글 클라우드 Vertex AI에서 Claude 모델을 쓰는 길' },
  mistral: { url: 'https://mistral.ai', docs: 'https://docs.mistral.ai', pricing: 'https://mistral.ai/pricing', npm: '@mistralai/mistralai', npmRepo: gh('mistralai'), ko: '프랑스 Mistral AI의 언어 모델 API' },
  cohere: { url: 'https://cohere.com', docs: 'https://docs.cohere.com', pricing: 'https://cohere.com/pricing', npm: 'cohere-ai', npmRepo: gh('cohere-ai'), ko: '기업용 Command 언어 모델과 검색용 모델을 내는 Cohere API' },
  xai: { url: 'https://x.ai/api', docs: 'https://docs.x.ai', ko: 'Grok 모델을 부르는 xAI API' },
  deepseek: { url: 'https://platform.deepseek.com', docs: 'https://api-docs.deepseek.com', pricing: 'https://api-docs.deepseek.com/quick_start/pricing', ko: 'DeepSeek 언어 모델 API (OpenAI와 같은 호출 방식)' },
  llama: { url: 'https://llama.developer.meta.com', npm: 'llama-api-client', npmRepo: gh('meta-llama'), ko: 'Meta가 직접 여는 Llama 모델 API' },
  'amazon-bedrock': { kind: 'ai-inference', url: 'https://aws.amazon.com/bedrock/', docs: 'https://docs.aws.amazon.com/bedrock/', pricing: 'https://aws.amazon.com/bedrock/pricing/', npm: '@aws-sdk/client-bedrock-runtime', npmRepo: gh('aws'), auth: 'cloud IAM', ko: 'AWS에서 여러 회사 모델(Claude, Llama, Nova 등)을 쓰는 Amazon Bedrock' },
  azure: { kind: 'ai-inference', url: 'https://azure.microsoft.com/products/ai-foundry', pricing: 'https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/', auth: 'apiKey / Entra ID', ko: 'Microsoft Azure에서 OpenAI 등 여러 모델을 쓰는 Azure AI Foundry' },
  'azure-cognitive-services': { kind: 'ai-inference', auth: 'apiKey / Entra ID', ko: 'Azure AI 서비스 계정으로 여러 모델을 쓰는 길' },
  perplexity: { url: 'https://www.perplexity.ai/api-platform', docs: 'https://docs.perplexity.ai', pricing: 'https://docs.perplexity.ai/getting-started/pricing', ko: '웹 검색을 곁들여 답하는 Perplexity Sonar API' },
  ai21: { url: 'https://www.ai21.com', docs: 'https://docs.ai21.com', pricing: 'https://www.ai21.com/pricing/', ko: '긴 글에 강한 Jamba 모델을 내는 AI21 Labs API' },
  moonshotai: { url: 'https://platform.moonshot.ai', docs: 'https://platform.moonshot.ai/docs', ko: 'Kimi 모델을 부르는 Moonshot AI API' },
  zhipuai: { url: 'https://open.bigmodel.cn', ko: 'GLM 모델을 부르는 Zhipu AI(중국) API' },
  zai: { url: 'https://z.ai', docs: 'https://docs.z.ai', ko: 'GLM 모델을 부르는 Z.ai(Zhipu 해외판) API' },
  alibaba: { url: 'https://www.alibabacloud.com/product/modelstudio', docs: 'https://www.alibabacloud.com/help/en/model-studio/', pricing: 'https://www.alibabacloud.com/help/en/model-studio/model-pricing', ko: 'Qwen 모델을 부르는 Alibaba Cloud Model Studio API' },
  minimax: { url: 'https://www.minimax.io', docs: 'https://platform.minimax.io/docs', ko: 'MiniMax의 언어·음성·영상 모델 API' },
  upstage: { url: 'https://www.upstage.ai', docs: 'https://console.upstage.ai/docs', pricing: 'https://www.upstage.ai/pricing', tags: ['korea'], ko: '한국 업스테이지의 Solar 언어 모델 API' },
  groq: { kind: 'ai-inference', url: 'https://groq.com', docs: 'https://console.groq.com/docs', pricing: 'https://groq.com/pricing', npm: 'groq-sdk', npmRepo: gh('groq'), ko: '전용 칩으로 공개 모델을 아주 빠르게 돌려 주는 Groq API' },
  togetherai: { kind: 'ai-inference', url: 'https://www.together.ai', docs: 'https://docs.together.ai', pricing: 'https://www.together.ai/pricing', npm: 'together-ai', npmRepo: gh('togethercomputer'), ko: '공개 모델 수백 개를 API로 돌려 주는 Together AI' },
  'fireworks-ai': { kind: 'ai-inference', url: 'https://fireworks.ai', docs: 'https://docs.fireworks.ai', pricing: 'https://fireworks.ai/pricing', ko: '공개 모델을 빠르게 돌려 주는 Fireworks AI' },
  cerebras: { kind: 'ai-inference', url: 'https://www.cerebras.ai', docs: 'https://inference-docs.cerebras.ai', pricing: 'https://www.cerebras.ai/pricing', npm: '@cerebras/cerebras_cloud_sdk', npmRepo: gh('Cerebras'), ko: '웨이퍼 크기 칩으로 공개 모델을 빠르게 돌리는 Cerebras API' },
  sambanova: { kind: 'ai-inference', url: 'https://cloud.sambanova.ai', docs: 'https://docs.sambanova.ai', ko: '전용 칩으로 공개 모델을 돌려 주는 SambaNova Cloud' },
  deepinfra: { kind: 'ai-inference', url: 'https://deepinfra.com', docs: 'https://deepinfra.com/docs', pricing: 'https://deepinfra.com/pricing', ko: '공개 모델을 싸게 돌려 주는 DeepInfra' },
  huggingface: { kind: 'ai-inference', url: 'https://huggingface.co/inference/models', docs: 'https://huggingface.co/docs/inference-providers', pricing: 'https://huggingface.co/docs/inference-providers/pricing', npm: '@huggingface/inference', npmRepo: gh('huggingface'), ko: 'Hugging Face 계정 하나로 여러 추론 회사의 모델을 부르는 Inference Providers' },
  openrouter: { kind: 'ai-inference', url: 'https://openrouter.ai', docs: 'https://openrouter.ai/docs', pricing: 'https://openrouter.ai/pricing', ko: '키 하나로 여러 회사의 모델 수백 개를 부르는 모델 라우터' },
  'cloudflare-workers-ai': { kind: 'ai-inference', url: 'https://developers.cloudflare.com/workers-ai/', docs: 'https://developers.cloudflare.com/workers-ai/', pricing: 'https://developers.cloudflare.com/workers-ai/platform/pricing/', ko: 'Cloudflare 네트워크에서 공개 모델을 돌리는 Workers AI' },
  'cloudflare-ai-gateway': { kind: 'ai-inference', docs: 'https://developers.cloudflare.com/ai-gateway/', ko: '여러 AI API 호출을 한곳에서 기록·캐시하는 Cloudflare AI Gateway' },
  vercel: { kind: 'ai-inference', url: 'https://vercel.com/ai-gateway', docs: 'https://vercel.com/docs/ai-gateway', ko: '여러 회사 모델을 키 하나로 부르는 Vercel AI Gateway' },
  nvidia: { kind: 'ai-inference', url: 'https://build.nvidia.com', ko: 'NVIDIA가 여는 모델 API(NIM) 모음' },
  friendli: { kind: 'ai-inference', tags: ['korea'], ko: '한국 프렌들리AI의 서버리스 모델 API' },
  'novita-ai': { kind: 'ai-inference', ko: '공개 모델과 이미지 모델을 API로 돌려 주는 Novita AI' },
  nebius: { kind: 'ai-inference', ko: '공개 모델을 돌려 주는 Nebius AI Studio' },
  baseten: { kind: 'ai-inference', ko: '모델을 올려 API로 쓰는 Baseten' },
  modal: { kind: 'ai-inference', ko: '파이썬 코드로 GPU 서버를 띄워 모델을 돌리는 Modal' },
  'ollama-cloud': { kind: 'ai-inference', ko: 'Ollama 모델을 클라우드에서 돌리는 Ollama Cloud' },
  lmstudio: { kind: 'ai-inference', tags: ['local'], ko: '내 컴퓨터에서 모델을 돌리고 OpenAI 방식으로 부르는 LM Studio' },
  'github-copilot': { kind: 'ai-inference', ko: 'GitHub Copilot 구독으로 여러 모델을 쓰는 길' },
  poe: { kind: 'ai-inference', ko: 'Poe의 여러 봇·모델을 API로 부르는 길' },
  volcengine: { kind: 'ai-llm', ko: 'ByteDance Doubao 모델 등을 쓰는 Volcengine Ark (중국)' },
  watsonx: { kind: 'ai-inference', auth: 'cloud IAM', ko: 'IBM 클라우드의 watsonx.ai 모델 API' },
  oci: { kind: 'ai-inference', auth: 'cloud IAM', ko: 'Oracle 클라우드의 생성형 AI 서비스' },
};

// models.dev 제공자 가운데 '자기 모델을 직접 여는 회사'(ai-llm). 나머지는 모델 호스팅·라우터(ai-inference).
export const FIRST_PARTY_PREFIXES = [
  'openai', 'anthropic', 'google', 'mistral', 'cohere', 'xai', 'deepseek', 'llama', 'meta', 'ai21', 'moonshotai', 'kimi-',
  'zhipuai', 'zai', 'alibaba', 'minimax', 'upstage', 'perplexity', 'inception', 'arcee', 'poolside', 'sakana', 'sarvam',
  'stepfun', 'xiaomi', 'sensenova', 'tencent', 'volcengine', 'bailing', 'longcat', 'thinkingmachines', 'morph', 'nova',
];

// ---------- 손으로 고른 AI API (models.dev에 없는 회사·상품) ----------

const S = { serverKey: true } as const;

export const AI_APIS: CuratedApi[] = [
  // 언어 모델
  { slug: 'reka', name: 'Reka API', kind: 'ai-llm', url: 'https://www.reka.ai', docs: 'https://docs.reka.ai', auth: 'apiKey', ko: '글·이미지·영상·소리를 함께 이해하는 Reka 모델 API', ...S },
  { slug: 'writer', name: 'Writer API (Palmyra)', kind: 'ai-llm', url: 'https://writer.com', docs: 'https://dev.writer.com', pricing: 'https://writer.com/pricing/', auth: 'apiKey', npm: 'writer-sdk', npmRepo: gh('writer'), ko: '기업 글쓰기용 Palmyra 모델을 내는 Writer API', ...S },
  { slug: 'baidu-qianfan', name: 'Baidu Qianfan (ERNIE)', kind: 'ai-llm', url: 'https://cloud.baidu.com/product/wenxinworkshop', docs: 'https://cloud.baidu.com/doc/qianfan/index.html', auth: 'apiKey', tags: ['china'], ko: 'Baidu ERNIE 모델을 부르는 Qianfan 플랫폼 (중국)', ...S },
  { slug: 'tencent-hunyuan', name: 'Tencent Hunyuan API', kind: 'ai-llm', url: 'https://cloud.tencent.com/product/hunyuan', docs: 'https://cloud.tencent.com/document/product/1729', auth: 'apiKey', tags: ['china'], ko: 'Tencent Hunyuan 모델 API (중국)', ...S },
  { slug: 'iflytek-spark', name: 'iFlytek Spark API', kind: 'ai-llm', url: 'https://xinghuo.xfyun.cn/sparkapi', docs: 'https://www.xfyun.cn/doc/spark/Web.html', auth: 'apiKey', tags: ['china'], ko: 'iFlytek Spark(星火) 모델 API (중국)', ...S },
  { slug: 'baichuan', name: 'Baichuan API', kind: 'ai-llm', url: 'https://platform.baichuan-ai.com', docs: 'https://platform.baichuan-ai.com/docs/api', auth: 'apiKey', tags: ['china'], ko: 'Baichuan 모델 API (중국)', ...S },
  { slug: 'clova-studio', name: 'CLOVA Studio (HyperCLOVA X)', kind: 'ai-llm', url: 'https://www.ncloud.com/product/aiService/clovaStudio', docs: 'https://api.ncloud-docs.com/docs/clovastudio-chatcompletionsv3', pricing: 'https://www.ncloud.com/product/aiService/clovaStudio#pricing', auth: 'apiKey', tags: ['korea'], aliases: ['네이버 클라우드 CLOVA Studio'], ko: '네이버 HyperCLOVA X 모델을 부르는 네이버 클라우드 CLOVA Studio', ...S },

  // 모델 호스팅·라우터
  { slug: 'replicate', name: 'Replicate', kind: 'ai-inference', url: 'https://replicate.com', docs: 'https://replicate.com/docs', pricing: 'https://replicate.com/pricing', auth: 'apiKey', npm: 'replicate', npmRepo: gh('replicate'), ko: '공개 모델 수천 개를 API 한 줄로 돌리는 Replicate', ...S },
  { slug: 'hyperbolic', name: 'Hyperbolic', kind: 'ai-inference', url: 'https://hyperbolic.ai', docs: 'https://docs.hyperbolic.xyz', auth: 'apiKey', ko: '공개 모델과 GPU를 빌려 주는 Hyperbolic', ...S },
  { slug: 'featherless', name: 'Featherless AI', kind: 'ai-inference', url: 'https://featherless.ai', docs: 'https://featherless.ai/docs', auth: 'apiKey', ko: 'Hugging Face 공개 모델을 구독제로 돌려 주는 Featherless', ...S },
  { slug: 'runpod', name: 'Runpod Serverless', kind: 'ai-inference', url: 'https://www.runpod.io/product/serverless', docs: 'https://docs.runpod.io', pricing: 'https://www.runpod.io/pricing', auth: 'apiKey', ko: '내 모델을 GPU 서버리스 끝점으로 올리는 Runpod', ...S },
  { slug: 'portkey', name: 'Portkey AI Gateway', kind: 'ai-inference', url: 'https://portkey.ai', docs: 'https://portkey.ai/docs', pricing: 'https://portkey.ai/pricing', auth: 'apiKey', npm: 'portkey-ai', npmRepo: gh('Portkey-AI'), ko: '여러 AI API 호출을 한곳에서 묶고 기록하는 Portkey', ...S },
  { slug: 'nscale', name: 'Nscale', kind: 'ai-inference', url: 'https://www.nscale.com', docs: 'https://docs.nscale.com', auth: 'apiKey', ko: '공개 모델을 서버리스로 돌려 주는 Nscale (Hugging Face 추론 제공자)', ...S },
  { slug: 'wavespeed', name: 'WaveSpeedAI', kind: 'ai-image', url: 'https://wavespeed.ai', docs: 'https://wavespeed.ai/docs', auth: 'apiKey', ko: '이미지·영상 생성 모델을 빠르게 돌려 주는 WaveSpeedAI', ...S },
  { slug: 'publicai', name: 'Public AI Inference Utility', kind: 'ai-inference', url: 'https://publicai.co', docs: 'https://publicai.co', auth: 'apiKey', ko: '공공 기관이 만든 공개 모델을 돌려 주는 Public AI (Hugging Face 추론 제공자)', ...S },
  { slug: 'byteplus-modelark', name: 'BytePlus ModelArk', kind: 'ai-inference', url: 'https://www.byteplus.com/en/product/modelark', docs: 'https://docs.byteplus.com/en/docs/ModelArk', auth: 'apiKey', ko: 'ByteDance의 Seed 모델(글·이미지·영상)을 쓰는 BytePlus ModelArk', ...S },

  // 이미지·영상·3D
  { slug: 'openai-images', name: 'OpenAI Image API (GPT Image)', kind: 'ai-image', url: 'https://platform.openai.com/docs/guides/image-generation', docs: 'https://platform.openai.com/docs/guides/image-generation', pricing: 'https://openai.com/api/pricing/', auth: 'apiKey', npm: 'openai', npmRepo: gh('openai'), ko: 'OpenAI GPT Image 모델로 이미지를 만들고 고치는 API', ...S },
  { slug: 'openai-video', name: 'OpenAI Video API (Sora)', kind: 'ai-image', url: 'https://platform.openai.com/docs/guides/video-generation', docs: 'https://platform.openai.com/docs/guides/video-generation', pricing: 'https://openai.com/api/pricing/', auth: 'apiKey', npm: 'openai', npmRepo: gh('openai'), ko: 'OpenAI Sora 모델로 영상을 만드는 API', ...S },
  { slug: 'gemini-imagen', name: 'Imagen (Gemini API)', kind: 'ai-image', url: 'https://ai.google.dev/gemini-api/docs/imagen', docs: 'https://ai.google.dev/gemini-api/docs/imagen', pricing: 'https://ai.google.dev/gemini-api/docs/pricing', auth: 'apiKey', npm: '@google/genai', npmRepo: gh('googleapis'), ko: 'Google Imagen 모델로 이미지를 만드는 Gemini API 기능', ...S },
  { slug: 'gemini-veo', name: 'Veo (Gemini API)', kind: 'ai-image', url: 'https://ai.google.dev/gemini-api/docs/video', docs: 'https://ai.google.dev/gemini-api/docs/video', pricing: 'https://ai.google.dev/gemini-api/docs/pricing', auth: 'apiKey', npm: '@google/genai', npmRepo: gh('googleapis'), ko: 'Google Veo 모델로 영상을 만드는 Gemini API 기능', ...S },
  { slug: 'stability-ai', name: 'Stability AI Platform API', kind: 'ai-image', url: 'https://platform.stability.ai', docs: 'https://platform.stability.ai/docs/getting-started', pricing: 'https://platform.stability.ai/pricing', auth: 'apiKey', ko: 'Stable Diffusion 등으로 이미지·영상·3D·소리를 만드는 Stability AI API', ...S },
  { slug: 'black-forest-labs', name: 'Black Forest Labs API (FLUX)', kind: 'ai-image', url: 'https://bfl.ai', docs: 'https://docs.bfl.ai', pricing: 'https://bfl.ai/pricing', auth: 'apiKey', ko: 'FLUX 모델로 이미지를 만들고 고치는 Black Forest Labs API', ...S },
  { slug: 'ideogram', name: 'Ideogram API', kind: 'ai-image', url: 'https://developer.ideogram.ai', docs: 'https://developer.ideogram.ai/ideogram-api/api-overview', pricing: 'https://ideogram.ai/pricing/?pricing_tab=api', auth: 'apiKey', ko: '글자가 들어간 이미지를 잘 만드는 Ideogram API', ...S },
  { slug: 'recraft', name: 'Recraft API', kind: 'ai-image', url: 'https://www.recraft.ai/api', docs: 'https://www.recraft.ai/docs', auth: 'apiKey', ko: '벡터 그림·아이콘·이미지를 만드는 Recraft API', ...S },
  { slug: 'leonardo', name: 'Leonardo.Ai API', kind: 'ai-image', url: 'https://leonardo.ai/api/', docs: 'https://docs.leonardo.ai', auth: 'apiKey', ko: '이미지·영상을 만드는 Leonardo.Ai API', ...S },
  { slug: 'runway', name: 'Runway API', kind: 'ai-image', url: 'https://runwayml.com/api', docs: 'https://docs.dev.runwayml.com', pricing: 'https://docs.dev.runwayml.com/guides/pricing/', auth: 'apiKey', npm: '@runwayml/sdk', npmRepo: gh('runwayml'), ko: 'Gen 모델로 영상을 만드는 Runway API', ...S },
  { slug: 'luma', name: 'Luma AI API (Dream Machine)', kind: 'ai-image', url: 'https://lumalabs.ai/api', docs: 'https://docs.lumalabs.ai', pricing: 'https://lumalabs.ai/api/pricing', auth: 'apiKey', npm: 'lumaai', npmRepo: gh('lumalabs'), ko: 'Ray 모델로 영상·이미지를 만드는 Luma AI API', ...S },
  { slug: 'kling', name: 'Kling AI API', kind: 'ai-image', url: 'https://klingai.com/global/dev', docs: 'https://app.klingai.com/global/dev/document-api', auth: 'apiKey', ko: 'Kuaishou Kling 모델로 영상을 만드는 API', ...S },
  { slug: 'vidu', name: 'Vidu API', kind: 'ai-image', url: 'https://platform.vidu.com', docs: 'https://platform.vidu.com/docs', auth: 'apiKey', ko: 'Vidu 모델로 영상을 만드는 API', ...S },
  { slug: 'krea', name: 'Krea API', kind: 'ai-image', url: 'https://www.krea.ai/api', docs: 'https://docs.krea.ai', auth: 'apiKey', ko: '여러 이미지·영상 모델을 한곳에서 부르는 Krea API', ...S },
  { slug: 'fal', name: 'fal', kind: 'ai-image', url: 'https://fal.ai', docs: 'https://docs.fal.ai', pricing: 'https://fal.ai/pricing', auth: 'apiKey', npm: '@fal-ai/client', npmRepo: gh('fal-ai'), ko: '이미지·영상·소리 생성 모델 수백 개를 API로 부르는 fal', ...S },
  { slug: 'runware', name: 'Runware API', kind: 'ai-image', url: 'https://runware.ai', docs: 'https://runware.ai/docs', pricing: 'https://runware.ai/pricing', auth: 'apiKey', npm: '@runware/sdk', npmRepo: gh('Runware'), ko: '이미지·영상 모델을 빠르게 돌려 주는 Runware API', ...S },
  { slug: 'freepik', name: 'Freepik API', kind: 'ai-image', url: 'https://www.freepik.com/api', docs: 'https://docs.freepik.com', pricing: 'https://www.freepik.com/api/pricing', auth: 'apiKey', ko: '이미지 생성·업스케일과 스톡 자료를 함께 쓰는 Freepik API', ...S },
  { slug: 'getimg', name: 'getimg.ai API', kind: 'ai-image', url: 'https://getimg.ai/tools/api', docs: 'https://docs.getimg.ai', pricing: 'https://getimg.ai/pricing', auth: 'apiKey', ko: '이미지를 만들고 고치는 getimg.ai API', ...S },
  { slug: 'deepai', name: 'DeepAI API', kind: 'ai-image', url: 'https://deepai.org/apis', docs: 'https://deepai.org/docs', pricing: 'https://deepai.org/pricing', auth: 'apiKey', ko: '이미지 생성·편집 등 간단한 AI 기능을 내는 DeepAI API', ...S },
  { slug: 'clipdrop', name: 'Clipdrop API', kind: 'ai-image', url: 'https://clipdrop.co/apis', docs: 'https://clipdrop.co/apis/docs/text-to-image', pricing: 'https://clipdrop.co/apis/pricing', auth: 'apiKey', ko: '배경 지우기·이미지 생성 등을 하는 Clipdrop API', ...S },
  { slug: 'remove-bg', name: 'remove.bg API', kind: 'ai-image', url: 'https://www.remove.bg/api', docs: 'https://www.remove.bg/api', pricing: 'https://www.remove.bg/pricing', auth: 'apiKey', ko: '사진 배경을 지우는 remove.bg API', ...S },
  { slug: 'photoroom', name: 'Photoroom API', kind: 'ai-image', url: 'https://www.photoroom.com/api', docs: 'https://docs.photoroom.com', pricing: 'https://www.photoroom.com/api/pricing', auth: 'apiKey', ko: '상품 사진 배경 지우기·편집을 하는 Photoroom API', ...S },
  { slug: 'picsart', name: 'Picsart Creative APIs', kind: 'ai-image', url: 'https://picsart.io', docs: 'https://docs.picsart.io', auth: 'apiKey', ko: '사진 편집·배경 지우기·이미지 생성을 하는 Picsart API', ...S },
  { slug: 'bria', name: 'Bria AI API', kind: 'ai-image', url: 'https://bria.ai', docs: 'https://docs.bria.ai', auth: 'apiKey', ko: '허락받은 자료로만 학습한 이미지 모델을 내는 Bria API', ...S },
  { slug: 'adobe-firefly', name: 'Adobe Firefly Services API', kind: 'ai-image', url: 'https://developer.adobe.com/firefly-services/docs/guides/', docs: 'https://developer.adobe.com/firefly-services/docs/firefly-api/', auth: 'OAuth (server-to-server)', ko: 'Adobe Firefly로 이미지를 만들고 고치는 API', ...S },
  { slug: 'topaz', name: 'Topaz Labs API', kind: 'ai-image', url: 'https://www.topazlabs.com/api', docs: 'https://developer.topazlabs.com', auth: 'apiKey', ko: '사진·영상 화질을 높이는 Topaz Labs API', ...S },
  { slug: 'heygen', name: 'HeyGen API', kind: 'ai-image', url: 'https://www.heygen.com/api', docs: 'https://docs.heygen.com', auth: 'apiKey', ko: '말하는 아바타 영상을 만드는 HeyGen API', ...S },
  { slug: 'synthesia', name: 'Synthesia API', kind: 'ai-image', url: 'https://www.synthesia.io/api', docs: 'https://docs.synthesia.io', auth: 'apiKey', ko: 'AI 발표자 영상을 만드는 Synthesia API', ...S },
  { slug: 'd-id', name: 'D-ID API', kind: 'ai-image', url: 'https://www.d-id.com/api/', docs: 'https://docs.d-id.com', auth: 'apiKey', ko: '사진 속 얼굴을 말하는 영상으로 바꾸는 D-ID API', ...S },
  { slug: 'tavus', name: 'Tavus API', kind: 'ai-image', url: 'https://www.tavus.io', docs: 'https://docs.tavus.io', auth: 'apiKey', ko: '대화하는 영상 아바타를 만드는 Tavus API', ...S },
  { slug: 'meshy', name: 'Meshy API', kind: 'ai-image', url: 'https://www.meshy.ai/api', docs: 'https://docs.meshy.ai', auth: 'apiKey', tags: ['3d'], ko: '글·이미지로 3D 모델을 만드는 Meshy API', ...S },
  { slug: 'tripo', name: 'Tripo API', kind: 'ai-image', url: 'https://platform.tripo3d.ai', docs: 'https://platform.tripo3d.ai/docs', auth: 'apiKey', tags: ['3d'], ko: '글·이미지로 3D 모델을 만드는 Tripo API', ...S },
  { slug: 'rodin', name: 'Rodin API (Hyper3D)', kind: 'ai-image', url: 'https://hyper3d.ai', docs: 'https://developer.hyper3d.ai', auth: 'apiKey', tags: ['3d'], ko: '이미지로 3D 모델을 만드는 Hyper3D Rodin API', ...S },

  // 음성·음악
  { slug: 'elevenlabs', name: 'ElevenLabs API', kind: 'ai-audio', url: 'https://elevenlabs.io/api', docs: 'https://elevenlabs.io/docs', pricing: 'https://elevenlabs.io/pricing/api', auth: 'apiKey', npm: '@elevenlabs/elevenlabs-js', npmRepo: gh('elevenlabs'), ko: '자연스러운 목소리 합성·더빙·음악을 만드는 ElevenLabs API', ...S },
  { slug: 'openai-audio', name: 'OpenAI Audio API', kind: 'ai-audio', url: 'https://platform.openai.com/docs/guides/audio', docs: 'https://platform.openai.com/docs/guides/speech-to-text', pricing: 'https://openai.com/api/pricing/', auth: 'apiKey', npm: 'openai', npmRepo: gh('openai'), ko: '말을 글로 받아쓰고 글을 목소리로 읽는 OpenAI 음성 API', ...S },
  { slug: 'deepgram', name: 'Deepgram API', kind: 'ai-audio', url: 'https://deepgram.com', docs: 'https://developers.deepgram.com', pricing: 'https://deepgram.com/pricing', auth: 'apiKey', npm: '@deepgram/sdk', npmRepo: gh('deepgram'), ko: '실시간 받아쓰기와 음성 합성을 하는 Deepgram API', ...S },
  { slug: 'assemblyai', name: 'AssemblyAI API', kind: 'ai-audio', url: 'https://www.assemblyai.com', docs: 'https://www.assemblyai.com/docs', pricing: 'https://www.assemblyai.com/pricing', auth: 'apiKey', npm: 'assemblyai', npmRepo: gh('AssemblyAI'), ko: '녹음 받아쓰기와 요약을 하는 AssemblyAI API', ...S },
  { slug: 'google-speech-to-text', name: 'Google Cloud Speech-to-Text', kind: 'ai-audio', url: 'https://cloud.google.com/speech-to-text', docs: 'https://cloud.google.com/speech-to-text/docs', pricing: 'https://cloud.google.com/speech-to-text/pricing', auth: 'cloud IAM / apiKey', npm: '@google-cloud/speech', npmRepo: gh('googleapis'), ko: '구글 클라우드의 받아쓰기 API', ...S },
  { slug: 'google-text-to-speech', name: 'Google Cloud Text-to-Speech', kind: 'ai-audio', url: 'https://cloud.google.com/text-to-speech', docs: 'https://cloud.google.com/text-to-speech/docs', pricing: 'https://cloud.google.com/text-to-speech/pricing', auth: 'cloud IAM / apiKey', npm: '@google-cloud/text-to-speech', npmRepo: gh('googleapis'), ko: '구글 클라우드의 글 읽어 주기(음성 합성) API', ...S },
  { slug: 'azure-speech', name: 'Azure AI Speech', kind: 'ai-audio', url: 'https://azure.microsoft.com/products/ai-services/ai-speech', docs: 'https://learn.microsoft.com/azure/ai-services/speech-service/', pricing: 'https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/', auth: 'apiKey / Entra ID', npm: 'microsoft-cognitiveservices-speech-sdk', npmRepo: gh('microsoft'), ko: 'Microsoft Azure의 받아쓰기·음성 합성·번역 API', ...S },
  { slug: 'amazon-transcribe', name: 'Amazon Transcribe', kind: 'ai-audio', url: 'https://aws.amazon.com/transcribe/', docs: 'https://docs.aws.amazon.com/transcribe/', pricing: 'https://aws.amazon.com/transcribe/pricing/', auth: 'cloud IAM', npm: '@aws-sdk/client-transcribe', npmRepo: gh('aws'), ko: 'AWS의 받아쓰기 API', ...S },
  { slug: 'amazon-polly', name: 'Amazon Polly', kind: 'ai-audio', url: 'https://aws.amazon.com/polly/', docs: 'https://docs.aws.amazon.com/polly/', pricing: 'https://aws.amazon.com/polly/pricing/', auth: 'cloud IAM', npm: '@aws-sdk/client-polly', npmRepo: gh('aws'), ko: 'AWS의 글 읽어 주기(음성 합성) API', ...S },
  { slug: 'speechmatics', name: 'Speechmatics API', kind: 'ai-audio', url: 'https://www.speechmatics.com', docs: 'https://docs.speechmatics.com', pricing: 'https://www.speechmatics.com/pricing', auth: 'apiKey', ko: '여러 언어 받아쓰기를 하는 Speechmatics API', ...S },
  { slug: 'cartesia', name: 'Cartesia API', kind: 'ai-audio', url: 'https://cartesia.ai', docs: 'https://docs.cartesia.ai', pricing: 'https://cartesia.ai/pricing', auth: 'apiKey', npm: '@cartesia/cartesia-js', npmRepo: gh('cartesia-ai'), ko: '지연이 짧은 음성 합성 API (Cartesia Sonic)', ...S },
  { slug: 'rev-ai', name: 'Rev AI API', kind: 'ai-audio', url: 'https://www.rev.ai', docs: 'https://docs.rev.ai', pricing: 'https://www.rev.ai/pricing', auth: 'apiKey', npm: 'revai-node-sdk', npmRepo: gh('revdotcom'), ko: '받아쓰기 API (Rev AI)', ...S },
  { slug: 'gladia', name: 'Gladia API', kind: 'ai-audio', url: 'https://www.gladia.io', docs: 'https://docs.gladia.io', pricing: 'https://www.gladia.io/pricing', auth: 'apiKey', ko: '실시간·녹음 받아쓰기를 하는 Gladia API', ...S },
  { slug: 'resemble', name: 'Resemble AI API', kind: 'ai-audio', url: 'https://www.resemble.ai', docs: 'https://docs.app.resemble.ai', pricing: 'https://www.resemble.ai/pricing/', auth: 'apiKey', ko: '목소리 복제·합성과 딥페이크 음성 탐지를 하는 Resemble AI API', ...S },
  { slug: 'murf', name: 'Murf API', kind: 'ai-audio', url: 'https://murf.ai/api', docs: 'https://murf.ai/api/docs', pricing: 'https://murf.ai/api/pricing', auth: 'apiKey', ko: '성우 목소리로 글을 읽어 주는 Murf API', ...S },
  { slug: 'hume', name: 'Hume AI API', kind: 'ai-audio', url: 'https://www.hume.ai', docs: 'https://dev.hume.ai', pricing: 'https://www.hume.ai/pricing', auth: 'apiKey', npm: 'hume', npmRepo: gh('HumeAI'), ko: '감정을 담은 음성 합성과 음성 대화를 하는 Hume AI API', ...S },
  { slug: 'fish-audio', name: 'Fish Audio API', kind: 'ai-audio', url: 'https://fish.audio', docs: 'https://docs.fish.audio', auth: 'apiKey', ko: '음성 합성과 목소리 복제를 하는 Fish Audio API', ...S },
  { slug: 'inworld-tts', name: 'Inworld TTS API', kind: 'ai-audio', url: 'https://inworld.ai/tts', docs: 'https://docs.inworld.ai', auth: 'apiKey', ko: '게임·앱용 음성 합성을 하는 Inworld TTS API', ...S },
  { slug: 'rime', name: 'Rime API', kind: 'ai-audio', url: 'https://www.rime.ai', docs: 'https://docs.rime.ai', auth: 'apiKey', ko: '대화용 음성 합성을 하는 Rime API', ...S },
  { slug: 'soniox', name: 'Soniox API', kind: 'ai-audio', url: 'https://soniox.com', docs: 'https://soniox.com/docs', pricing: 'https://soniox.com/pricing', auth: 'apiKey', ko: '여러 언어 실시간 받아쓰기·번역을 하는 Soniox API', ...S },
  { slug: 'vapi', name: 'Vapi', kind: 'ai-audio', url: 'https://vapi.ai', docs: 'https://docs.vapi.ai', pricing: 'https://vapi.ai/pricing', auth: 'apiKey', npm: '@vapi-ai/server-sdk', npmRepo: gh('VapiAI'), ko: '전화·앱 음성 비서를 만드는 Vapi API', ...S },
  { slug: 'retell', name: 'Retell AI', kind: 'ai-audio', url: 'https://www.retellai.com', docs: 'https://docs.retellai.com', pricing: 'https://www.retellai.com/pricing', auth: 'apiKey', npm: 'retell-sdk', npmRepo: gh('RetellAI'), ko: '전화 음성 상담 봇을 만드는 Retell AI API', ...S },
  { slug: 'bland', name: 'Bland AI', kind: 'ai-audio', url: 'https://www.bland.ai', docs: 'https://docs.bland.ai', auth: 'apiKey', ko: '전화를 걸고 받는 음성 봇 API (Bland AI)', ...S },
  { slug: 'picovoice', name: 'Picovoice', kind: 'ai-audio', url: 'https://picovoice.ai', docs: 'https://picovoice.ai/docs/', pricing: 'https://picovoice.ai/pricing/', auth: 'AccessKey', tags: ['on-device'], ko: '기기 안에서 도는 음성 인식·호출어 SDK (Picovoice)', ...S },
  { slug: 'audioshake', name: 'AudioShake API', kind: 'ai-audio', url: 'https://www.audioshake.ai', docs: 'https://developer.audioshake.ai', auth: 'apiKey', ko: '노래에서 목소리·악기를 나누는 AudioShake API', ...S },
  { slug: 'mubert', name: 'Mubert API', kind: 'ai-audio', url: 'https://mubert.com/api', docs: 'https://mubert.com/api', auth: 'apiKey', tags: ['music'], ko: '배경 음악을 만들어 주는 Mubert API', ...S },
  { slug: 'speechify', name: 'Speechify Text to Speech API', kind: 'ai-audio', url: 'https://speechify.ai', docs: 'https://docs.speechify.ai', auth: 'apiKey', ko: '글을 자연스러운 목소리로 읽는 Speechify API', ...S },
  { slug: 'smallest-ai', name: 'Smallest.ai Waves', kind: 'ai-audio', url: 'https://smallest.ai', docs: 'https://waves-docs.smallest.ai', auth: 'apiKey', ko: '빠른 음성 합성·받아쓰기 API (Smallest.ai)', ...S },
  { slug: 'neuphonic', name: 'Neuphonic API', kind: 'ai-audio', url: 'https://www.neuphonic.com', docs: 'https://docs.neuphonic.com', auth: 'apiKey', ko: '지연이 짧은 음성 합성 API (Neuphonic)', ...S },
  { slug: 'typecast', name: 'Typecast API', kind: 'ai-audio', url: 'https://typecast.ai', docs: 'https://typecast.ai/docs/overview', auth: 'apiKey', tags: ['korea'], ko: '한국 네오사피엔스의 AI 성우 음성 합성 API (Typecast)', ...S },
  { slug: 'rtzr-stt', name: 'RTZR STT OpenAPI', kind: 'ai-audio', url: 'https://developers.rtzr.ai', docs: 'https://developers.rtzr.ai/docs/', auth: 'client id / secret', tags: ['korea'], ko: '한국 리턴제로의 한국어 받아쓰기 API', ...S },
  { slug: 'clova-speech', name: 'CLOVA Speech', kind: 'ai-audio', url: 'https://www.ncloud.com/product/aiService/clovaSpeech', docs: 'https://api.ncloud-docs.com/docs/ai-application-service-clovaspeech', auth: 'apiKey', tags: ['korea'], aliases: ['네이버 CLOVA Speech'], ko: '네이버 클라우드의 한국어 받아쓰기 API', ...S },
  { slug: 'clova-voice', name: 'CLOVA Voice', kind: 'ai-audio', url: 'https://www.ncloud.com/product/aiService/clovaVoice', docs: 'https://api.ncloud-docs.com/docs/ai-naver-clovavoice', auth: 'apiKey', tags: ['korea'], ko: '네이버 클라우드의 한국어 음성 합성 API', ...S },

  // 임베딩·리랭크
  { slug: 'voyage', name: 'Voyage AI API', kind: 'ai-embeddings', url: 'https://www.voyageai.com', docs: 'https://docs.voyageai.com', pricing: 'https://docs.voyageai.com/docs/pricing', auth: 'apiKey', npm: 'voyageai', npmRepo: gh('voyage-ai'), ko: '검색용 임베딩과 리랭크 모델을 내는 Voyage AI API', ...S },
  { slug: 'jina', name: 'Jina AI Search Foundation API', kind: 'ai-embeddings', url: 'https://jina.ai', docs: 'https://jina.ai/embeddings/', pricing: 'https://jina.ai/api-dashboard/', auth: 'apiKey', ko: '임베딩·리랭크·웹 읽기(Reader)를 내는 Jina AI API', ...S },
  { slug: 'cohere-embed-rerank', name: 'Cohere Embed & Rerank', kind: 'ai-embeddings', url: 'https://cohere.com/embed', docs: 'https://docs.cohere.com/docs/embeddings', pricing: 'https://cohere.com/pricing', auth: 'apiKey', npm: 'cohere-ai', npmRepo: gh('cohere-ai'), ko: 'Cohere의 임베딩·리랭크 모델 API', ...S },
  { slug: 'openai-embeddings', name: 'OpenAI Embeddings', kind: 'ai-embeddings', url: 'https://platform.openai.com/docs/guides/embeddings', docs: 'https://platform.openai.com/docs/guides/embeddings', pricing: 'https://openai.com/api/pricing/', auth: 'apiKey', npm: 'openai', npmRepo: gh('openai'), ko: '글을 숫자 벡터로 바꾸는 OpenAI 임베딩 API', ...S },
  { slug: 'gemini-embeddings', name: 'Gemini Embedding', kind: 'ai-embeddings', url: 'https://ai.google.dev/gemini-api/docs/embeddings', docs: 'https://ai.google.dev/gemini-api/docs/embeddings', pricing: 'https://ai.google.dev/gemini-api/docs/pricing', auth: 'apiKey', npm: '@google/genai', npmRepo: gh('googleapis'), ko: '글을 숫자 벡터로 바꾸는 Gemini 임베딩 API', ...S },
  { slug: 'mixedbread', name: 'Mixedbread API', kind: 'ai-embeddings', url: 'https://www.mixedbread.com', docs: 'https://www.mixedbread.com/docs', pricing: 'https://www.mixedbread.com/pricing', auth: 'apiKey', ko: '임베딩·리랭크·검색을 내는 Mixedbread API', ...S },
  { slug: 'contextual-ai', name: 'Contextual AI API', kind: 'ai-embeddings', url: 'https://contextual.ai', docs: 'https://docs.contextual.ai', auth: 'apiKey', ko: '리랭커와 문서 질의응답(RAG) 도구를 내는 Contextual AI API', ...S },

  { slug: 'zeroentropy', name: 'ZeroEntropy API', kind: 'ai-embeddings', url: 'https://www.zeroentropy.dev', docs: 'https://docs.zeroentropy.dev', auth: 'apiKey', ko: '리랭크 모델과 검색 API를 내는 ZeroEntropy', ...S },

  // 검색·웹 수집
  { slug: 'exa', name: 'Exa API', kind: 'ai-search', url: 'https://exa.ai', docs: 'https://docs.exa.ai', pricing: 'https://exa.ai/pricing', auth: 'apiKey', npm: 'exa-js', npmRepo: gh('exa-labs'), ko: 'AI가 쓰기 좋은 웹 검색·본문 가져오기 API (Exa)', ...S },
  { slug: 'tavily', name: 'Tavily API', kind: 'ai-search', url: 'https://www.tavily.com', docs: 'https://docs.tavily.com', pricing: 'https://www.tavily.com/pricing', auth: 'apiKey', npm: '@tavily/core', npmRepo: gh('tavily-ai'), ko: 'AI 에이전트용 웹 검색·추출 API (Tavily)', ...S },
  { slug: 'perplexity-search', name: 'Perplexity Search API', kind: 'ai-search', url: 'https://docs.perplexity.ai/guides/search-quickstart', docs: 'https://docs.perplexity.ai/guides/search-quickstart', pricing: 'https://docs.perplexity.ai/getting-started/pricing', auth: 'apiKey', ko: 'Perplexity의 웹 검색 결과만 받는 API', ...S },
  { slug: 'brave-search', name: 'Brave Search API', kind: 'ai-search', url: 'https://brave.com/search/api/', docs: 'https://api-dashboard.search.brave.com/app/documentation', pricing: 'https://brave.com/search/api/', auth: 'apiKey', ko: '자체 색인을 쓰는 Brave 웹 검색 API', ...S },
  { slug: 'serper', name: 'Serper', kind: 'ai-search', url: 'https://serper.dev', docs: 'https://serper.dev', pricing: 'https://serper.dev', auth: 'apiKey', ko: '구글 검색 결과를 JSON으로 주는 Serper API', ...S },
  { slug: 'serpapi', name: 'SerpApi', kind: 'ai-search', url: 'https://serpapi.com', docs: 'https://serpapi.com/search-api', pricing: 'https://serpapi.com/pricing', auth: 'apiKey', npm: 'serpapi', npmRepo: gh('serpapi'), ko: '여러 검색 엔진 결과를 JSON으로 주는 SerpApi', ...S },
  { slug: 'searchapi', name: 'SearchApi', kind: 'ai-search', url: 'https://www.searchapi.io', docs: 'https://www.searchapi.io/docs/google', pricing: 'https://www.searchapi.io/pricing', auth: 'apiKey', ko: '구글 등 검색 결과를 JSON으로 주는 SearchApi', ...S },
  { slug: 'google-custom-search', name: 'Google Custom Search JSON API', kind: 'ai-search', url: 'https://developers.google.com/custom-search/v1/overview', docs: 'https://developers.google.com/custom-search/v1/overview', pricing: 'https://developers.google.com/custom-search/v1/overview', auth: 'apiKey', ko: '구글 프로그래머블 검색 결과를 받는 API', ...S },
  { slug: 'linkup', name: 'Linkup API', kind: 'ai-search', url: 'https://www.linkup.so', docs: 'https://docs.linkup.so', pricing: 'https://www.linkup.so/pricing', auth: 'apiKey', ko: 'AI용 웹 검색 API (Linkup)', ...S },
  { slug: 'parallel', name: 'Parallel Web APIs', kind: 'ai-search', url: 'https://parallel.ai', docs: 'https://docs.parallel.ai', pricing: 'https://parallel.ai/pricing', auth: 'apiKey', ko: 'AI 에이전트용 웹 검색·조사 API (Parallel)', ...S },
  { slug: 'you-com', name: 'You.com API', kind: 'ai-search', url: 'https://you.com/api', docs: 'https://documentation.you.com', auth: 'apiKey', ko: '웹 검색·뉴스 검색 결과를 주는 You.com API', ...S },
  { slug: 'kagi', name: 'Kagi Search API', kind: 'ai-search', url: 'https://help.kagi.com/kagi/api/search.html', docs: 'https://help.kagi.com/kagi/api/search.html', auth: 'apiKey', ko: '광고 없는 Kagi 검색 결과를 주는 API', ...S },
  { slug: 'firecrawl', name: 'Firecrawl', kind: 'ai-search', url: 'https://www.firecrawl.dev', docs: 'https://docs.firecrawl.dev', pricing: 'https://www.firecrawl.dev/pricing', auth: 'apiKey', npm: '@mendable/firecrawl-js', npmRepo: gh('firecrawl'), ko: '웹 쪽을 긁어 AI가 읽기 좋은 마크다운으로 바꾸는 Firecrawl API', ...S },
  { slug: 'jina-reader', name: 'Jina Reader', kind: 'ai-search', url: 'https://jina.ai/reader/', docs: 'https://jina.ai/reader/', pricing: 'https://jina.ai/api-dashboard/', auth: 'apiKey (optional)', ko: '주소 하나로 웹 쪽을 AI가 읽기 좋은 글로 바꾸는 Jina Reader', ...S },
  { slug: 'browserbase', name: 'Browserbase', kind: 'ai-search', url: 'https://www.browserbase.com', docs: 'https://docs.browserbase.com', pricing: 'https://www.browserbase.com/pricing', auth: 'apiKey', npm: '@browserbasehq/sdk', npmRepo: gh('browserbase'), ko: 'AI 에이전트가 쓰는 클라우드 브라우저 API (Browserbase)', ...S },
  { slug: 'apify', name: 'Apify API', kind: 'ai-search', url: 'https://apify.com', docs: 'https://docs.apify.com/api/v2', pricing: 'https://apify.com/pricing', auth: 'apiKey', npm: 'apify-client', npmRepo: gh('apify'), ko: '웹 수집 로봇(Actor)을 돌리고 결과를 받는 Apify API', ...S },

  { slug: 'valyu', name: 'Valyu API', kind: 'ai-search', url: 'https://www.valyu.ai', docs: 'https://docs.valyu.ai', auth: 'apiKey', ko: '웹·논문·금융 자료를 함께 찾는 AI용 검색 API (Valyu)', ...S },
  { slug: 'dataforseo', name: 'DataForSEO API', kind: 'ai-search', url: 'https://dataforseo.com', docs: 'https://docs.dataforseo.com', pricing: 'https://dataforseo.com/pricing', auth: 'login / password (Basic)', ko: '검색 결과·키워드 자료를 주는 DataForSEO API', ...S },
  { slug: 'scrapingbee', name: 'ScrapingBee API', kind: 'ai-search', url: 'https://www.scrapingbee.com', docs: 'https://www.scrapingbee.com/documentation/', pricing: 'https://www.scrapingbee.com/pricing/', auth: 'apiKey', ko: '막힘 없이 웹 쪽을 받아 오는 ScrapingBee API', ...S },
  { slug: 'zyte', name: 'Zyte API', kind: 'ai-search', url: 'https://www.zyte.com/zyte-api/', docs: 'https://docs.zyte.com/zyte-api/get-started.html', pricing: 'https://www.zyte.com/pricing/', auth: 'apiKey', ko: '웹 쪽 수집과 자료 뽑기를 하는 Zyte API', ...S },
  { slug: 'bright-data', name: 'Bright Data APIs', kind: 'ai-search', url: 'https://brightdata.com', docs: 'https://docs.brightdata.com', pricing: 'https://brightdata.com/pricing', auth: 'apiKey', ko: '검색 결과·웹 수집 API (Bright Data)', ...S },
  { slug: 'diffbot', name: 'Diffbot API', kind: 'ai-search', url: 'https://www.diffbot.com', docs: 'https://docs.diffbot.com', pricing: 'https://www.diffbot.com/pricing/', auth: 'token', ko: '웹 쪽에서 글·상품·기사를 구조로 뽑고 지식 그래프를 주는 Diffbot', ...S },
  { slug: 'steel', name: 'Steel', kind: 'ai-search', url: 'https://steel.dev', docs: 'https://docs.steel.dev', auth: 'apiKey', ko: 'AI 에이전트용 클라우드 브라우저 API (Steel)', ...S },
  { slug: 'hyperbrowser', name: 'Hyperbrowser', kind: 'ai-search', url: 'https://www.hyperbrowser.ai', docs: 'https://docs.hyperbrowser.ai', auth: 'apiKey', ko: 'AI 에이전트용 클라우드 브라우저·수집 API (Hyperbrowser)', ...S },
  { slug: 'browser-use', name: 'Browser Use Cloud API', kind: 'ai-search', url: 'https://browser-use.com', docs: 'https://docs.browser-use.com', auth: 'apiKey', ko: '글로 시키면 브라우저를 움직이는 에이전트 API (Browser Use)', ...S },

  // 비전·문서·번역
  { slug: 'google-cloud-vision', name: 'Google Cloud Vision API', kind: 'ai-vision', url: 'https://cloud.google.com/vision', docs: 'https://cloud.google.com/vision/docs', pricing: 'https://cloud.google.com/vision/pricing', auth: 'cloud IAM / apiKey', npm: '@google-cloud/vision', npmRepo: gh('googleapis'), ko: '사진 속 물체·글자·얼굴을 찾는 구글 클라우드 비전 API', ...S },
  { slug: 'google-document-ai', name: 'Google Document AI', kind: 'ai-vision', url: 'https://cloud.google.com/document-ai', docs: 'https://cloud.google.com/document-ai/docs', pricing: 'https://cloud.google.com/document-ai/pricing', auth: 'cloud IAM', npm: '@google-cloud/documentai', npmRepo: gh('googleapis'), ko: '문서·영수증에서 글과 항목을 뽑는 구글 Document AI', ...S },
  { slug: 'google-cloud-translation', name: 'Google Cloud Translation', kind: 'ai-vision', url: 'https://cloud.google.com/translate', docs: 'https://cloud.google.com/translate/docs', pricing: 'https://cloud.google.com/translate/pricing', auth: 'cloud IAM / apiKey', npm: '@google-cloud/translate', npmRepo: gh('googleapis'), tags: ['translation'], ko: '구글 클라우드 번역 API', ...S },
  { slug: 'azure-ai-vision', name: 'Azure AI Vision', kind: 'ai-vision', url: 'https://azure.microsoft.com/products/ai-services/ai-vision', docs: 'https://learn.microsoft.com/azure/ai-services/computer-vision/', pricing: 'https://azure.microsoft.com/pricing/details/cognitive-services/computer-vision/', auth: 'apiKey / Entra ID', ko: '사진 분석·글자 읽기를 하는 Azure AI Vision', ...S },
  { slug: 'azure-document-intelligence', name: 'Azure AI Document Intelligence', kind: 'ai-vision', url: 'https://azure.microsoft.com/products/ai-services/ai-document-intelligence', docs: 'https://learn.microsoft.com/azure/ai-services/document-intelligence/', pricing: 'https://azure.microsoft.com/pricing/details/ai-document-intelligence/', auth: 'apiKey / Entra ID', ko: '문서·양식에서 글과 표를 뽑는 Azure AI Document Intelligence', ...S },
  { slug: 'azure-translator', name: 'Azure AI Translator', kind: 'ai-vision', url: 'https://azure.microsoft.com/products/ai-services/ai-translator', docs: 'https://learn.microsoft.com/azure/ai-services/translator/', pricing: 'https://azure.microsoft.com/pricing/details/cognitive-services/translator/', auth: 'apiKey / Entra ID', tags: ['translation'], ko: 'Microsoft Azure 번역 API', ...S },
  { slug: 'amazon-rekognition', name: 'Amazon Rekognition', kind: 'ai-vision', url: 'https://aws.amazon.com/rekognition/', docs: 'https://docs.aws.amazon.com/rekognition/', pricing: 'https://aws.amazon.com/rekognition/pricing/', auth: 'cloud IAM', npm: '@aws-sdk/client-rekognition', npmRepo: gh('aws'), ko: 'AWS의 사진·영상 분석 API', ...S },
  { slug: 'amazon-textract', name: 'Amazon Textract', kind: 'ai-vision', url: 'https://aws.amazon.com/textract/', docs: 'https://docs.aws.amazon.com/textract/', pricing: 'https://aws.amazon.com/textract/pricing/', auth: 'cloud IAM', npm: '@aws-sdk/client-textract', npmRepo: gh('aws'), ko: 'AWS의 문서 글자·표 뽑기 API', ...S },
  { slug: 'amazon-translate', name: 'Amazon Translate', kind: 'ai-vision', url: 'https://aws.amazon.com/translate/', docs: 'https://docs.aws.amazon.com/translate/', pricing: 'https://aws.amazon.com/translate/pricing/', auth: 'cloud IAM', npm: '@aws-sdk/client-translate', npmRepo: gh('aws'), tags: ['translation'], ko: 'AWS 번역 API', ...S },
  { slug: 'deepl', name: 'DeepL API', kind: 'ai-vision', url: 'https://www.deepl.com/pro-api', docs: 'https://developers.deepl.com/docs', pricing: 'https://www.deepl.com/pro-api', auth: 'apiKey', npm: 'deepl-node', npmRepo: gh('DeepLcom'), tags: ['translation'], ko: '자연스러운 번역으로 알려진 DeepL 번역 API', ...S },
  { slug: 'papago-translation', name: 'Papago Translation (NAVER Cloud)', kind: 'ai-vision', url: 'https://www.ncloud.com/product/aiService/papagoTranslation', docs: 'https://api.ncloud-docs.com/docs/ai-naver-papagonmt', auth: 'apiKey', tags: ['korea', 'translation'], aliases: ['파파고 번역'], ko: '네이버 클라우드의 파파고 번역 API', ...S },
  { slug: 'clova-ocr', name: 'CLOVA OCR', kind: 'ai-vision', url: 'https://www.ncloud.com/product/aiService/ocr', docs: 'https://api.ncloud-docs.com/docs/ai-application-service-ocr', auth: 'secret key', tags: ['korea', 'ocr'], ko: '네이버 클라우드의 글자 읽기(OCR) API', ...S },
  { slug: 'upstage-document-parse', name: 'Upstage Document Parse', kind: 'ai-vision', url: 'https://www.upstage.ai/products/document-parse', docs: 'https://console.upstage.ai/docs/capabilities/document-digitization/document-parsing', auth: 'apiKey', tags: ['korea', 'ocr'], aliases: ['Upstage Document AI'], ko: '한국 업스테이지의 문서 구조 읽기·OCR API', ...S },
  { slug: 'mistral-ocr', name: 'Mistral OCR', kind: 'ai-vision', url: 'https://mistral.ai/news/mistral-ocr', docs: 'https://docs.mistral.ai/capabilities/document_ai/basic_ocr/', pricing: 'https://mistral.ai/pricing', auth: 'apiKey', npm: '@mistralai/mistralai', npmRepo: gh('mistralai'), tags: ['ocr'], ko: 'PDF·이미지를 마크다운 글로 바꾸는 Mistral OCR API', ...S },
  { slug: 'mathpix', name: 'Mathpix API', kind: 'ai-vision', url: 'https://mathpix.com', docs: 'https://docs.mathpix.com', pricing: 'https://mathpix.com/pricing', auth: 'apiKey', tags: ['ocr'], ko: '수식·표가 든 문서를 글로 바꾸는 Mathpix OCR API', ...S },
  { slug: 'roboflow', name: 'Roboflow API', kind: 'ai-vision', url: 'https://roboflow.com', docs: 'https://docs.roboflow.com', pricing: 'https://roboflow.com/pricing', auth: 'apiKey', ko: '물체 찾기 모델을 학습·배포하는 Roboflow API', ...S },
  { slug: 'landing-ai-ade', name: 'LandingAI Agentic Document Extraction', kind: 'ai-vision', url: 'https://landing.ai/agentic-document-extraction', docs: 'https://docs.landing.ai', auth: 'apiKey', tags: ['ocr'], ko: '문서에서 글·표·그림을 구조로 뽑는 LandingAI API', ...S },
  { slug: 'reducto', name: 'Reducto API', kind: 'ai-vision', url: 'https://reducto.ai', docs: 'https://docs.reducto.ai', pricing: 'https://reducto.ai/pricing', auth: 'apiKey', tags: ['ocr'], ko: '복잡한 문서를 AI용 자료로 바꾸는 Reducto API', ...S },
  { slug: 'llamaparse', name: 'LlamaParse (LlamaCloud)', kind: 'ai-vision', url: 'https://www.llamaindex.ai/llamaparse', docs: 'https://docs.cloud.llamaindex.ai', pricing: 'https://www.llamaindex.ai/pricing', auth: 'apiKey', tags: ['ocr'], ko: 'PDF 등 문서를 AI가 읽기 좋게 바꾸는 LlamaParse', ...S },
  { slug: 'unstructured', name: 'Unstructured API', kind: 'ai-vision', url: 'https://unstructured.io', docs: 'https://docs.unstructured.io', pricing: 'https://unstructured.io/pricing', auth: 'apiKey', ko: '여러 형식 문서를 AI용 조각으로 나누는 Unstructured API', ...S },
  { slug: 'mindee', name: 'Mindee API', kind: 'ai-vision', url: 'https://www.mindee.com', docs: 'https://docs.mindee.com', pricing: 'https://www.mindee.com/pricing', auth: 'apiKey', npm: 'mindee', npmRepo: gh('mindee'), tags: ['ocr'], ko: '영수증·청구서 같은 문서에서 항목을 뽑는 Mindee API', ...S },
  { slug: 'nanonets', name: 'Nanonets API', kind: 'ai-vision', url: 'https://nanonets.com', docs: 'https://docs.nanonets.com', pricing: 'https://nanonets.com/pricing', auth: 'apiKey', tags: ['ocr'], ko: '문서 글자 읽기와 항목 뽑기를 하는 Nanonets API', ...S },
  { slug: 'veryfi', name: 'Veryfi API', kind: 'ai-vision', url: 'https://www.veryfi.com/api/', docs: 'https://docs.veryfi.com', auth: 'client id / apiKey', tags: ['ocr'], ko: '영수증·청구서를 읽어 자료로 바꾸는 Veryfi API', ...S },
  { slug: 'sightengine', name: 'Sightengine API', kind: 'ai-vision', url: 'https://sightengine.com', docs: 'https://sightengine.com/docs', pricing: 'https://sightengine.com/pricing', auth: 'apiKey', tags: ['moderation'], ko: '이미지·영상의 유해 내용을 걸러 내는 Sightengine API', ...S },
  { slug: 'hive', name: 'Hive AI APIs', kind: 'ai-vision', url: 'https://thehive.ai', docs: 'https://docs.thehive.ai', auth: 'apiKey', tags: ['moderation'], ko: '유해 내용 걸러 내기·AI 생성물 판별을 하는 Hive API', ...S },
  { slug: 'imagga', name: 'Imagga API', kind: 'ai-vision', url: 'https://imagga.com', docs: 'https://docs.imagga.com', pricing: 'https://imagga.com/pricing', auth: 'apiKey', ko: '사진에 태그를 달고 분류하는 Imagga API', ...S },
  { slug: 'face-plus-plus', name: 'Face++ API', kind: 'ai-vision', url: 'https://www.faceplusplus.com', docs: 'https://console.faceplusplus.com/documents/5679127', auth: 'apiKey', ko: '얼굴 찾기·비교를 하는 Face++ API', ...S },
  { slug: 'twelve-labs', name: 'Twelve Labs API', kind: 'ai-vision', url: 'https://www.twelvelabs.io', docs: 'https://docs.twelvelabs.io', pricing: 'https://www.twelvelabs.io/pricing', auth: 'apiKey', npm: 'twelvelabs-js', npmRepo: gh('twelvelabs-io'), tags: ['video'], ko: '영상 속 장면을 찾고 요약하는 Twelve Labs 영상 이해 API', ...S },
  { slug: 'modernmt', name: 'ModernMT API', kind: 'ai-vision', url: 'https://www.modernmt.com/api/', docs: 'https://www.modernmt.com/api/', pricing: 'https://www.modernmt.com/pricing/', auth: 'apiKey', tags: ['translation'], ko: '문맥에 맞춰 배우는 기계 번역 API (ModernMT)', ...S },
  // 그 밖의 AI (글 분석)
  { slug: 'google-natural-language', name: 'Google Cloud Natural Language API', kind: 'ai-other', url: 'https://cloud.google.com/natural-language', docs: 'https://cloud.google.com/natural-language/docs', pricing: 'https://cloud.google.com/natural-language/pricing', auth: 'cloud IAM / apiKey', npm: '@google-cloud/language', npmRepo: gh('googleapis'), ko: '글의 감정·개체·분류를 분석하는 구글 클라우드 API', ...S },
  { slug: 'azure-ai-language', name: 'Azure AI Language', kind: 'ai-other', url: 'https://azure.microsoft.com/products/ai-services/ai-language', docs: 'https://learn.microsoft.com/azure/ai-services/language-service/', pricing: 'https://azure.microsoft.com/pricing/details/cognitive-services/language-service/', auth: 'apiKey / Entra ID', ko: '글 요약·감정·개체 분석을 하는 Azure AI Language', ...S },
  { slug: 'amazon-comprehend', name: 'Amazon Comprehend', kind: 'ai-other', url: 'https://aws.amazon.com/comprehend/', docs: 'https://docs.aws.amazon.com/comprehend/', pricing: 'https://aws.amazon.com/comprehend/pricing/', auth: 'cloud IAM', npm: '@aws-sdk/client-comprehend', npmRepo: gh('aws'), ko: 'AWS의 글 분석(감정·개체·주제) API', ...S },
];

// ---------- 손으로 고른 한국 개발자·공공 API (한국 목록(public-apis-4Kr)에 없는 것) ----------

export const KR_APIS: CuratedApi[] = [
  { slug: 'portone', name: 'PortOne (포트원)', kind: 'kr-dev', url: 'https://portone.io', docs: 'https://developers.portone.io', auth: 'apiKey (V2 API Secret)', npm: '@portone/server-sdk', npmRepo: gh('portone-io'), tags: ['payments'], ko: '여러 PG사 결제를 한 번에 붙이는 포트원 결제 연동 API', ...S },
  { slug: 'nicepay', name: '나이스페이먼츠 개발자센터', kind: 'kr-dev', url: 'https://www.nicepay.co.kr', docs: 'https://developers.nicepay.co.kr', auth: 'client key / secret', tags: ['payments'], ko: '나이스페이먼츠 결제 연동 API', ...S },
  { slug: 'inicis', name: 'KG이니시스 연동 매뉴얼', kind: 'kr-dev', url: 'https://www.inicis.com', docs: 'https://manual.inicis.com', auth: 'MID / signKey', tags: ['payments'], ko: 'KG이니시스 결제 연동 안내', ...S },
  { slug: 'nhn-kcp', name: 'NHN KCP 개발자센터', kind: 'kr-dev', url: 'https://www.kcp.co.kr', docs: 'https://developer.kcp.co.kr', auth: 'site code / cert', tags: ['payments'], ko: 'NHN KCP 결제 연동 API', ...S },
  { slug: 'solapi', name: 'SOLAPI', kind: 'kr-dev', url: 'https://solapi.com', docs: 'https://solapi.com/developers', auth: 'apiKey / secret', npm: 'solapi', npmRepo: gh('solapi'), tags: ['messaging', 'sms'], ko: '문자·카카오 알림톡을 보내는 SOLAPI(쿨에스엠에스) API', ...S },
  { slug: 'aligo', name: '알리고 문자 API', kind: 'kr-dev', url: 'https://smartsms.aligo.in', docs: 'https://smartsms.aligo.in/admin/api/info.html', auth: 'apiKey', tags: ['messaging', 'sms'], ko: '문자 보내기 API (알리고)', ...S },
  { slug: 'ncp-sens', name: 'NAVER Cloud SENS', kind: 'kr-dev', url: 'https://www.ncloud.com/product/applicationService/sens', docs: 'https://api.ncloud-docs.com/docs/sens-overview', auth: 'access key / secret', tags: ['messaging', 'sms'], ko: '문자·알림톡·푸시를 보내는 네이버 클라우드 SENS', ...S },
  { slug: 'nhn-cloud-notification', name: 'NHN Cloud Notification', kind: 'kr-dev', url: 'https://www.nhncloud.com/kr/service/notification/sms', docs: 'https://docs.nhncloud.com/ko/Notification/SMS/ko/api-guide/', auth: 'app key / secret', tags: ['messaging', 'sms'], ko: '문자·알림톡·이메일을 보내는 NHN Cloud 알림 서비스', ...S },
  { slug: 'channel-talk', name: '채널톡 Open API', kind: 'kr-dev', url: 'https://channel.io', docs: 'https://developers.channel.io', auth: 'access key / secret', tags: ['messaging'], ko: '고객 상담 채팅(채널톡)을 연동하는 API', ...S },
  { slug: 'daum-postcode', name: 'Daum 우편번호 서비스', kind: 'kr-dev', url: 'https://postcode.map.daum.net/guide', docs: 'https://postcode.map.daum.net/guide', auth: 'none', tags: ['address', 'maps'], ko: '주소 검색 창을 무료로 붙이는 카카오 우편번호 서비스' },
  { slug: 'kakao-local', name: '카카오 로컬 API', kind: 'kr-dev', url: 'https://developers.kakao.com/docs/latest/ko/local/dev-guide', docs: 'https://developers.kakao.com/docs/latest/ko/local/dev-guide', auth: 'REST API key', tags: ['maps', 'kakao'], ko: '주소 검색·좌표 변환·장소 검색을 하는 카카오 로컬 API', ...S },
  { slug: 'tmap', name: 'TMAP API', kind: 'kr-dev', url: 'https://tmapapi.tmapmobility.com', docs: 'https://tmapapi.tmapmobility.com/main.html', auth: 'appKey', tags: ['maps'], ko: '길 찾기·지도·장소 검색을 하는 TMAP API (티맵모빌리티)', ...S },
  { slug: 'cafe24', name: 'Cafe24 개발자센터', kind: 'kr-dev', url: 'https://developers.cafe24.com', docs: 'https://developers.cafe24.com/docs/api/', auth: 'OAuth', tags: ['payments', 'shopping'], ko: '카페24 쇼핑몰의 상품·주문을 다루는 API', ...S },
  { slug: 'kiwoom', name: '키움 REST API', kind: 'kr-dev', url: 'https://openapi.kiwoom.com', docs: 'https://openapi.kiwoom.com', auth: 'app key / secret', tags: ['finance', 'stock'], ko: '키움증권 주식 시세·주문 REST API', ...S },
  { slug: 'ls-sec', name: 'LS증권 OPEN API', kind: 'kr-dev', url: 'https://openapi.ls-sec.co.kr', docs: 'https://openapi.ls-sec.co.kr', auth: 'app key / secret', tags: ['finance', 'stock'], ko: 'LS증권 주식 시세·주문 API', ...S },
  { slug: 'korbit', name: 'Korbit Open API', kind: 'kr-dev', url: 'https://www.korbit.co.kr', docs: 'https://docs.korbit.co.kr', auth: 'apiKey', tags: ['finance', 'crypto'], ko: '코빗 암호화폐 시세·주문 API', ...S },
  { slug: 'stdict', name: '표준국어대사전 오픈 API', kind: 'kr-public', url: 'https://stdict.korean.go.kr', docs: 'https://stdict.korean.go.kr/openapi/openApiInfo.do', auth: 'apiKey', tags: ['dictionary'], ko: '국립국어원 표준국어대사전 낱말 검색 API' },
  { slug: 'krdict', name: '한국어기초사전 오픈 API', kind: 'kr-public', url: 'https://krdict.korean.go.kr', docs: 'https://krdict.korean.go.kr/kor/openApi/openApiInfo', auth: 'apiKey', tags: ['dictionary'], ko: '국립국어원 한국어기초사전 낱말 검색 API' },
  { slug: 'neis', name: '나이스 교육정보 개방 포털', kind: 'kr-public', url: 'https://open.neis.go.kr', docs: 'https://open.neis.go.kr/portal/guide/actKeyPage.do', auth: 'apiKey', tags: ['education'], aliases: ['교육부 나이스 학교기본정보'], ko: '학교 기본 정보·급식·시간표·학사 일정을 주는 교육부 나이스 API' },
  { slug: 'work24', name: '고용24 Open API', kind: 'kr-public', url: 'https://www.work24.go.kr', docs: 'https://www.work24.go.kr/cm/e/a/0110/selectOpenApiIntro.do', auth: 'apiKey', tags: ['jobs'], ko: '채용·직업훈련 정보를 주는 고용노동부 고용24 API' },
];

// ---------- 손으로 고른 세계 개발자 API (결제·메시지·로그인·지도) ----------

export const DEV_APIS: CuratedApi[] = [
  // 결제
  { slug: 'stripe', name: 'Stripe API', kind: 'payments', url: 'https://stripe.com', docs: 'https://docs.stripe.com/api', pricing: 'https://stripe.com/pricing', auth: 'apiKey', npm: 'stripe', npmRepo: gh('stripe'), ko: '카드 결제·구독·정산을 하는 Stripe API', ...S },
  { slug: 'paypal', name: 'PayPal REST APIs', kind: 'payments', url: 'https://developer.paypal.com', docs: 'https://developer.paypal.com/api/rest/', auth: 'OAuth (client credentials)', npm: '@paypal/paypal-server-sdk', npmRepo: gh('paypal'), ko: 'PayPal 결제·환불 API', ...S },
  { slug: 'square', name: 'Square APIs', kind: 'payments', url: 'https://developer.squareup.com', docs: 'https://developer.squareup.com/docs', auth: 'access token / OAuth', npm: 'square', npmRepo: gh('square'), ko: '매장·온라인 결제를 하는 Square API', ...S },
  { slug: 'adyen', name: 'Adyen API', kind: 'payments', url: 'https://www.adyen.com', docs: 'https://docs.adyen.com', auth: 'apiKey', npm: '@adyen/api-library', npmRepo: gh('Adyen'), ko: '여러 나라 결제 수단을 받는 Adyen API', ...S },
  { slug: 'paddle', name: 'Paddle API', kind: 'payments', url: 'https://www.paddle.com', docs: 'https://developer.paddle.com', pricing: 'https://www.paddle.com/pricing', auth: 'apiKey', npm: '@paddle/paddle-node-sdk', npmRepo: gh('PaddleHQ'), ko: '소프트웨어 판매·구독과 세금 처리를 대신하는 Paddle API', ...S },
  { slug: 'lemon-squeezy', name: 'Lemon Squeezy API', kind: 'payments', url: 'https://www.lemonsqueezy.com', docs: 'https://docs.lemonsqueezy.com/api', pricing: 'https://www.lemonsqueezy.com/pricing', auth: 'apiKey', npm: '@lemonsqueezy/lemonsqueezy.js', npmRepo: gh('lmsqueezy'), ko: '디지털 상품·구독 판매를 하는 Lemon Squeezy API', ...S },
  { slug: 'polar', name: 'Polar API', kind: 'payments', url: 'https://polar.sh', docs: 'https://docs.polar.sh', pricing: 'https://polar.sh/resources/pricing', auth: 'access token', npm: '@polar-sh/sdk', npmRepo: gh('polarsource'), ko: '개발자용 판매·구독 결제를 하는 Polar API', ...S },
  { slug: 'braintree', name: 'Braintree', kind: 'payments', url: 'https://www.braintreepayments.com', docs: 'https://developer.paypal.com/braintree/docs', auth: 'apiKey', npm: 'braintree', npmRepo: gh('braintree'), ko: 'PayPal의 카드 결제 API (Braintree)', ...S },
  { slug: 'checkout-com', name: 'Checkout.com API', kind: 'payments', url: 'https://www.checkout.com', docs: 'https://www.checkout.com/docs', auth: 'apiKey', ko: '온라인 결제 API (Checkout.com)', ...S },
  { slug: 'mollie', name: 'Mollie API', kind: 'payments', url: 'https://www.mollie.com', docs: 'https://docs.mollie.com', pricing: 'https://www.mollie.com/pricing', auth: 'apiKey', npm: '@mollie/api-client', npmRepo: gh('mollie'), ko: '유럽 결제 수단을 받는 Mollie API', ...S },
  { slug: 'razorpay', name: 'Razorpay API', kind: 'payments', url: 'https://razorpay.com', docs: 'https://razorpay.com/docs/api/', auth: 'key id / secret', npm: 'razorpay', npmRepo: gh('razorpay'), ko: '인도 결제 API (Razorpay)', ...S },
  { slug: 'revenuecat', name: 'RevenueCat API', kind: 'payments', url: 'https://www.revenuecat.com', docs: 'https://www.revenuecat.com/docs', pricing: 'https://www.revenuecat.com/pricing/', auth: 'apiKey', ko: '앱 안 구독 결제를 한곳에서 관리하는 RevenueCat', ...S },
  // 메시지
  { slug: 'twilio', name: 'Twilio API', kind: 'messaging', url: 'https://www.twilio.com', docs: 'https://www.twilio.com/docs', pricing: 'https://www.twilio.com/en-us/pricing', auth: 'account SID / auth token', npm: 'twilio', npmRepo: gh('twilio'), ko: '문자·전화·인증번호를 보내는 Twilio API', ...S },
  { slug: 'vonage', name: 'Vonage APIs', kind: 'messaging', url: 'https://developer.vonage.com', docs: 'https://developer.vonage.com/en/documentation', auth: 'apiKey / JWT', npm: '@vonage/server-sdk', npmRepo: gh('Vonage'), ko: '문자·전화·영상 통화 API (Vonage)', ...S },
  { slug: 'plivo', name: 'Plivo API', kind: 'messaging', url: 'https://www.plivo.com', docs: 'https://www.plivo.com/docs/', auth: 'auth id / token', npm: 'plivo', npmRepo: gh('plivo'), ko: '문자·전화 API (Plivo)', ...S },
  { slug: 'sinch', name: 'Sinch APIs', kind: 'messaging', url: 'https://www.sinch.com', docs: 'https://developers.sinch.com', auth: 'apiKey / OAuth', ko: '문자·전화·인증 API (Sinch)', ...S },
  { slug: 'telnyx', name: 'Telnyx API', kind: 'messaging', url: 'https://telnyx.com', docs: 'https://developers.telnyx.com', auth: 'apiKey', npm: 'telnyx', npmRepo: gh('team-telnyx'), ko: '문자·전화 API (Telnyx)', ...S },
  { slug: 'sendgrid', name: 'Twilio SendGrid API', kind: 'messaging', url: 'https://sendgrid.com', docs: 'https://www.twilio.com/docs/sendgrid', auth: 'apiKey', npm: '@sendgrid/mail', npmRepo: gh('sendgrid'), tags: ['email'], ko: '이메일을 대량으로 보내는 SendGrid API', ...S },
  { slug: 'mailgun', name: 'Mailgun API', kind: 'messaging', url: 'https://www.mailgun.com', docs: 'https://documentation.mailgun.com', pricing: 'https://www.mailgun.com/pricing/', auth: 'apiKey', npm: 'mailgun.js', npmRepo: gh('mailgun'), tags: ['email'], ko: '이메일 보내기·받기 API (Mailgun)', ...S },
  { slug: 'postmark', name: 'Postmark API', kind: 'messaging', url: 'https://postmarkapp.com', docs: 'https://postmarkapp.com/developer', pricing: 'https://postmarkapp.com/pricing', auth: 'server token', npm: 'postmark', npmRepo: gh('ActiveCampaign'), tags: ['email'], ko: '가입 확인 같은 알림 메일을 보내는 Postmark API', ...S },
  { slug: 'resend', name: 'Resend API', kind: 'messaging', url: 'https://resend.com', docs: 'https://resend.com/docs', pricing: 'https://resend.com/pricing', auth: 'apiKey', npm: 'resend', npmRepo: gh('resend'), tags: ['email'], ko: '개발자용 이메일 보내기 API (Resend)', ...S },
  { slug: 'amazon-ses', name: 'Amazon SES', kind: 'messaging', url: 'https://aws.amazon.com/ses/', docs: 'https://docs.aws.amazon.com/ses/', pricing: 'https://aws.amazon.com/ses/pricing/', auth: 'cloud IAM', npm: '@aws-sdk/client-sesv2', npmRepo: gh('aws'), tags: ['email'], ko: 'AWS 이메일 보내기 서비스', ...S },
  { slug: 'brevo', name: 'Brevo API', kind: 'messaging', url: 'https://www.brevo.com', docs: 'https://developers.brevo.com', pricing: 'https://www.brevo.com/pricing/', auth: 'apiKey', npm: '@getbrevo/brevo', npmRepo: gh('getbrevo'), tags: ['email'], ko: '이메일·문자 마케팅과 알림 메일 API (Brevo)', ...S },
  { slug: 'mailjet', name: 'Mailjet API', kind: 'messaging', url: 'https://www.mailjet.com', docs: 'https://dev.mailjet.com', pricing: 'https://www.mailjet.com/pricing/', auth: 'apiKey / secret', npm: 'node-mailjet', npmRepo: gh('mailjet'), tags: ['email'], ko: '이메일 보내기 API (Mailjet)', ...S },
  { slug: 'loops', name: 'Loops API', kind: 'messaging', url: 'https://loops.so', docs: 'https://loops.so/docs/api-reference', pricing: 'https://loops.so/pricing', auth: 'apiKey', npm: 'loops', npmRepo: gh('Loops-so'), tags: ['email'], ko: '서비스 알림·뉴스레터 메일 API (Loops)', ...S },
  { slug: 'mailchimp-transactional', name: 'Mailchimp Transactional API', kind: 'messaging', url: 'https://mailchimp.com/developer/transactional/', docs: 'https://mailchimp.com/developer/transactional/docs/fundamentals/', auth: 'apiKey', npm: '@mailchimp/mailchimp_transactional', npmRepo: gh('mailchimp'), tags: ['email'], ko: '알림 메일 보내기 API (Mailchimp Transactional, 옛 Mandrill)', ...S },
  { slug: 'onesignal', name: 'OneSignal API', kind: 'messaging', url: 'https://onesignal.com', docs: 'https://documentation.onesignal.com', pricing: 'https://onesignal.com/pricing', auth: 'apiKey', npm: '@onesignal/node-onesignal', npmRepo: gh('OneSignal'), tags: ['push'], ko: '앱·웹 푸시 알림을 보내는 OneSignal API', ...S },
  { slug: 'firebase-cloud-messaging', name: 'Firebase Cloud Messaging', kind: 'messaging', url: 'https://firebase.google.com/products/cloud-messaging', docs: 'https://firebase.google.com/docs/cloud-messaging', auth: 'service account (OAuth)', npm: 'firebase-admin', npmRepo: gh('firebase'), tags: ['push'], ko: '구글 Firebase로 앱·웹 푸시 알림을 보내는 FCM', ...S },
  { slug: 'slack-api', name: 'Slack API', kind: 'messaging', url: 'https://api.slack.com', docs: 'https://docs.slack.dev', auth: 'OAuth / bot token', npm: '@slack/web-api', npmRepo: gh('slackapi'), tags: ['chat'], ko: 'Slack 앱·봇을 만드는 API', ...S },
  { slug: 'discord-api', name: 'Discord API', kind: 'messaging', url: 'https://discord.com/developers', docs: 'https://discord.com/developers/docs/intro', auth: 'bot token / OAuth', tags: ['chat'], ko: 'Discord 봇·앱을 만드는 API', ...S },
  { slug: 'telegram-bot-api', name: 'Telegram Bot API', kind: 'messaging', url: 'https://core.telegram.org/bots', docs: 'https://core.telegram.org/bots/api', auth: 'bot token', tags: ['chat'], ko: '텔레그램 봇을 만드는 API', ...S },
  { slug: 'line-messaging', name: 'LINE Messaging API', kind: 'messaging', url: 'https://developers.line.biz/en/services/messaging-api/', docs: 'https://developers.line.biz/en/docs/messaging-api/', auth: 'channel access token', npm: '@line/bot-sdk', npmRepo: gh('line'), tags: ['chat'], ko: 'LINE 공식 계정 봇을 만드는 API', ...S },
  { slug: 'whatsapp-cloud', name: 'WhatsApp Cloud API', kind: 'messaging', url: 'https://developers.facebook.com/docs/whatsapp/cloud-api', docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api', auth: 'access token', tags: ['chat'], ko: 'WhatsApp 비즈니스 메시지를 보내는 API', ...S },
  // 로그인·보안
  { slug: 'auth0', name: 'Auth0', kind: 'auth-security', url: 'https://auth0.com', docs: 'https://auth0.com/docs', pricing: 'https://auth0.com/pricing', auth: 'OAuth / OIDC', npm: 'auth0', npmRepo: gh('auth0'), ko: '로그인·회원 관리를 대신하는 Auth0', ...S },
  { slug: 'clerk', name: 'Clerk', kind: 'auth-security', url: 'https://clerk.com', docs: 'https://clerk.com/docs', pricing: 'https://clerk.com/pricing', auth: 'secret key', npm: '@clerk/backend', npmRepo: gh('clerk'), ko: '로그인 화면과 회원 관리를 붙이는 Clerk', ...S },
  { slug: 'firebase-auth', name: 'Firebase Authentication', kind: 'auth-security', url: 'https://firebase.google.com/products/auth', docs: 'https://firebase.google.com/docs/auth', pricing: 'https://firebase.google.com/pricing', auth: 'apiKey (public) / service account', npm: 'firebase', npmRepo: gh('firebase'), ko: '구글 Firebase의 로그인 기능', tags: ['firebase'] },
  { slug: 'supabase-auth', name: 'Supabase Auth', kind: 'auth-security', url: 'https://supabase.com/auth', docs: 'https://supabase.com/docs/guides/auth', pricing: 'https://supabase.com/pricing', auth: 'anon key (public) / service key', npm: '@supabase/supabase-js', npmRepo: gh('supabase'), ko: 'Supabase의 로그인 기능', tags: ['supabase'] },
  { slug: 'okta', name: 'Okta Developer', kind: 'auth-security', url: 'https://developer.okta.com', docs: 'https://developer.okta.com/docs/', auth: 'OAuth / OIDC', ko: '기업용 로그인·계정 관리 Okta', ...S },
  { slug: 'workos', name: 'WorkOS', kind: 'auth-security', url: 'https://workos.com', docs: 'https://workos.com/docs', pricing: 'https://workos.com/pricing', auth: 'apiKey', npm: '@workos-inc/node', npmRepo: gh('workos'), ko: '회사 계정 로그인(SSO)을 붙이는 WorkOS', ...S },
  { slug: 'stytch', name: 'Stytch', kind: 'auth-security', url: 'https://stytch.com', docs: 'https://stytch.com/docs', pricing: 'https://stytch.com/pricing', auth: 'project id / secret', npm: 'stytch', npmRepo: gh('stytchauth'), ko: '비밀번호 없는 로그인을 붙이는 Stytch', ...S },
  { slug: 'kinde', name: 'Kinde', kind: 'auth-security', url: 'https://kinde.com', docs: 'https://docs.kinde.com', pricing: 'https://kinde.com/pricing/', auth: 'OAuth / OIDC', ko: '로그인·권한 관리를 붙이는 Kinde', ...S },
  { slug: 'descope', name: 'Descope', kind: 'auth-security', url: 'https://www.descope.com', docs: 'https://docs.descope.com', pricing: 'https://www.descope.com/pricing', auth: 'project id / management key', ko: '끌어 놓기로 로그인 흐름을 만드는 Descope', ...S },
  { slug: 'google-identity', name: 'Google Identity (Sign in with Google)', kind: 'auth-security', url: 'https://developers.google.com/identity', docs: 'https://developers.google.com/identity/gsi/web/guides/overview', auth: 'OAuth 2.0 / OIDC', ko: '구글 계정으로 로그인 붙이기', ...S },
  { slug: 'sign-in-with-apple', name: 'Sign in with Apple', kind: 'auth-security', url: 'https://developer.apple.com/sign-in-with-apple/', docs: 'https://developer.apple.com/documentation/signinwithapple', auth: 'OAuth 2.0 / OIDC', ko: 'Apple 계정으로 로그인 붙이기', ...S },
  { slug: 'github-oauth', name: 'GitHub OAuth Apps', kind: 'auth-security', url: 'https://docs.github.com/en/apps/oauth-apps', docs: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps', auth: 'OAuth 2.0', ko: 'GitHub 계정으로 로그인 붙이기', ...S },
  { slug: 'microsoft-identity', name: 'Microsoft identity platform', kind: 'auth-security', url: 'https://learn.microsoft.com/entra/identity-platform/', docs: 'https://learn.microsoft.com/entra/identity-platform/', auth: 'OAuth 2.0 / OIDC', ko: 'Microsoft 계정으로 로그인 붙이기', ...S },
  { slug: 'cloudflare-turnstile', name: 'Cloudflare Turnstile', kind: 'auth-security', url: 'https://www.cloudflare.com/application-services/products/turnstile/', docs: 'https://developers.cloudflare.com/turnstile/', auth: 'site key / secret', tags: ['captcha'], ko: '사람인지 확인하는 무료 캡차 대체 (Cloudflare Turnstile)', ...S },
  { slug: 'recaptcha', name: 'Google reCAPTCHA', kind: 'auth-security', url: 'https://developers.google.com/recaptcha', docs: 'https://developers.google.com/recaptcha/docs/v3', auth: 'site key / secret', tags: ['captcha'], ko: '봇을 막는 구글 reCAPTCHA', ...S },
  { slug: 'hcaptcha', name: 'hCaptcha', kind: 'auth-security', url: 'https://www.hcaptcha.com', docs: 'https://docs.hcaptcha.com', auth: 'site key / secret', tags: ['captcha'], ko: '봇을 막는 캡차 (hCaptcha)', ...S },
  // 지도·위치
  { slug: 'google-maps-platform', name: 'Google Maps Platform', kind: 'maps', url: 'https://mapsplatform.google.com', docs: 'https://developers.google.com/maps/documentation', pricing: 'https://mapsplatform.google.com/pricing/', auth: 'apiKey', npm: '@googlemaps/js-api-loader', npmRepo: gh('googlemaps'), ko: '지도·장소 검색·길 찾기를 하는 구글 지도 API', ...S },
  { slug: 'mapbox', name: 'Mapbox APIs', kind: 'maps', url: 'https://www.mapbox.com', docs: 'https://docs.mapbox.com/api/overview/', pricing: 'https://www.mapbox.com/pricing', auth: 'access token', npm: '@mapbox/mapbox-sdk', npmRepo: gh('mapbox'), ko: '꾸밀 수 있는 지도·길 찾기·주소 검색 API (Mapbox)', ...S },
  { slug: 'here', name: 'HERE Location Services', kind: 'maps', url: 'https://www.here.com/platform', docs: 'https://www.here.com/docs', auth: 'apiKey / OAuth', ko: '지도·길 찾기·주소 검색 API (HERE)', ...S },
  { slug: 'tomtom', name: 'TomTom Maps APIs', kind: 'maps', url: 'https://developer.tomtom.com', docs: 'https://docs.tomtom.com', pricing: 'https://developer.tomtom.com/pricing', auth: 'apiKey', ko: '지도·교통·길 찾기 API (TomTom)', ...S },
  { slug: 'maptiler', name: 'MapTiler Cloud API', kind: 'maps', url: 'https://www.maptiler.com/cloud/', docs: 'https://docs.maptiler.com/cloud/api/', pricing: 'https://www.maptiler.com/cloud/pricing/', auth: 'apiKey', ko: '지도 타일·주소 검색 API (MapTiler)', ...S },
  { slug: 'stadia-maps', name: 'Stadia Maps', kind: 'maps', url: 'https://stadiamaps.com', docs: 'https://docs.stadiamaps.com', pricing: 'https://stadiamaps.com/pricing/', auth: 'apiKey / domain', ko: '지도 타일·길 찾기·주소 검색 API (Stadia Maps)', ...S },
  { slug: 'nominatim', name: 'Nominatim (OpenStreetMap)', kind: 'maps', url: 'https://nominatim.org', docs: 'https://nominatim.org/release-docs/latest/api/Overview/', auth: 'none', ko: 'OpenStreetMap 주소 검색 API (사용 규칙을 지켜야 한다)' },
  { slug: 'openrouteservice', name: 'openrouteservice', kind: 'maps', url: 'https://openrouteservice.org', docs: 'https://openrouteservice.org/dev/#/api-docs', auth: 'apiKey', ko: 'OpenStreetMap 기반 길 찾기 API', ...S },
  { slug: 'radar', name: 'Radar', kind: 'maps', url: 'https://radar.com', docs: 'https://radar.com/documentation/api', pricing: 'https://radar.com/pricing', auth: 'publishable / secret key', ko: '위치 추적·지오펜스·주소 검색 API (Radar)', ...S },
];

export const ALL_CURATED: CuratedApi[] = [...AI_APIS, ...KR_APIS, ...DEV_APIS];
