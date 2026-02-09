#!/usr/bin/env node

/**
 * Bulk-load custom dictionary terms into the OpenWhispr SQLite database.
 *
 * Usage:
 *   node scripts/load-dictionary.js            # replace all terms
 *   node scripts/load-dictionary.js --append    # add to existing terms
 *
 * Uses the sqlite3 CLI (not the better-sqlite3 Node module) to avoid
 * Electron/Node version mismatches.
 */

const { execSync } = require("child_process");
const path = require("path");
const os = require("os");

const DB_PATH = path.join(
  os.homedir(),
  "Library/Application Support/OpenWhispr-development/transcriptions-dev.db"
);

const appendMode = process.argv.includes("--append");

const DICTIONARY_TERMS = [
  // ── Web Dev ──
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind",
  "Tailwind CSS", "shadcn", "shadcn/ui", "Vite", "Webpack", "Babel", "ESLint",
  "Prettier", "Node.js", "Express", "Fastify", "Deno", "Bun", "NPM", "Yarn",
  "PNPM", "JSX", "TSX", "DOM", "Virtual DOM", "SSR", "SSG", "ISR", "CSR",
  "SPA", "PWA", "Service Worker", "Web Components", "Shadow DOM",
  "REST", "RESTful", "GraphQL", "WebSocket", "WebRTC", "OAuth", "JWT",
  "CORS", "CSRF", "XSS", "HTTPS", "SSL", "TLS",

  // ── Data Formats ──
  "JSON", "XML", "YAML", "CSV", "Markdown", "TOML", "Protocol Buffers",
  "Protobuf", "Base64", "UUID",

  // ── Programming Concepts ──
  "algorithm", "API", "array", "asynchronous", "async/await", "boolean",
  "callback", "class", "closure", "compiler", "constant", "constructor",
  "data structure", "debugging", "dependency injection", "design pattern",
  "encapsulation", "enum", "event loop", "function", "generator",
  "hashmap", "heap", "higher-order function", "immutable", "inheritance",
  "interface", "iterator", "lambda", "linked list", "loop", "method",
  "middleware", "module", "mutex", "namespace", "null", "object",
  "polymorphism", "promise", "prototype", "queue", "recursion", "regex",
  "scope", "semaphore", "singleton", "stack", "string", "struct",
  "thread", "tree", "tuple", "type inference", "variable", "void",

  // ── DevOps & Cloud ──
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "K8s", "Terraform",
  "Ansible", "Jenkins", "GitHub Actions", "CI/CD", "Vercel", "Netlify",
  "Cloudflare", "S3", "EC2", "Lambda", "ECS", "EKS", "RDS", "DynamoDB",
  "CloudFront", "Route 53", "IAM", "VPC", "Load Balancer", "Nginx",
  "Apache", "Redis", "Kafka", "RabbitMQ", "Elasticsearch",

  // ── Databases ──
  "SQL", "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Firebase",
  "Firestore", "Supabase", "Prisma", "Drizzle", "Knex", "Sequelize",
  "NoSQL", "ORM", "migration", "schema", "index", "query",
  "transaction", "ACID", "sharding", "replication",

  // ── Git & Version Control ──
  "Git", "GitHub", "GitLab", "Bitbucket", "commit", "branch", "merge",
  "rebase", "pull request", "PR", "fork", "clone", "stash", "cherry-pick",
  "git flow", "monorepo",

  // ── AI Platforms ──
  "OpenAI", "GPT", "GPT-4", "GPT-4o", "ChatGPT", "Claude", "Anthropic",
  "Gemini", "Google AI", "Groq", "DeepSeek", "Mistral", "Llama", "Meta AI",
  "Hugging Face", "Replicate", "Together AI", "Perplexity", "Cohere",
  "OpenRouter", "Ollama",

  // ── AI Concepts ──
  "LLM", "large language model", "RAG", "retrieval augmented generation",
  "embeddings", "fine-tuning", "fine tuning", "prompt engineering",
  "chain of thought", "CoT", "few-shot", "zero-shot", "in-context learning",
  "tokenization", "tokens", "context window", "temperature", "top-p",
  "inference", "model weights", "RLHF", "DPO", "LoRA", "QLoRA",
  "quantization", "GGUF", "ONNX", "transformer", "attention mechanism",
  "self-attention", "multi-head attention", "encoder", "decoder",
  "beam search", "greedy decoding", "hallucination", "grounding",
  "vector database", "Pinecone", "Weaviate", "Chroma", "FAISS",
  "semantic search", "cosine similarity", "neural network", "CNN", "RNN",
  "LSTM", "GAN", "diffusion model", "Stable Diffusion", "DALL-E",
  "Midjourney", "computer vision", "NLP", "natural language processing",
  "sentiment analysis", "named entity recognition", "NER",

  // ── AI Automation ──
  "Zapier", "Make", "n8n", "LangChain", "LangGraph", "LlamaIndex",
  "CrewAI", "AutoGen", "Semantic Kernel", "function calling",
  "tool use", "agent", "multi-agent", "workflow", "orchestration",
  "AI agent", "agentic", "MCP", "model context protocol",

  // ── Speech & Audio ──
  "whisper", "whisper.cpp", "speech-to-text", "STT", "text-to-speech",
  "TTS", "ASR", "automatic speech recognition", "transcription",
  "diarization", "speaker diarization", "voice activity detection", "VAD",
  "noise reduction", "mel spectrogram", "sampling rate", "WER",
  "word error rate", "CER", "character error rate", "Parakeet",
  "AssemblyAI", "Deepgram", "ElevenLabs",

  // ── Marketing ──
  "SEO", "SEM", "PPC", "CPC", "CPM", "CTR", "CPA", "ROAS", "ROI",
  "KPI", "OKR", "CRM", "CLV", "LTV", "CAC", "MRR", "ARR", "churn",
  "conversion rate", "bounce rate", "impression", "engagement",
  "A/B testing", "attribution", "funnel", "lead gen", "lead generation",
  "demand gen", "content marketing", "inbound marketing",
  "outbound marketing", "brand awareness", "brand equity",

  // ── Marketing Tools ──
  "Google Analytics", "GA4", "Google Ads", "Meta Ads", "Facebook Ads",
  "HubSpot", "Salesforce", "Mailchimp", "Klaviyo", "Ahrefs", "SEMrush",
  "Moz", "Hotjar", "Mixpanel", "Amplitude", "Segment",

  // ── Social Media ──
  "Instagram", "TikTok", "YouTube", "LinkedIn", "Twitter", "X",
  "Pinterest", "Threads", "Reddit", "Discord", "Twitch",
  "reels", "shorts", "stories", "UGC", "user generated content",
  "influencer", "creator economy", "algorithm", "reach", "impressions",
  "engagement rate", "follower", "subscriber", "viral",

  // ── Design Tools ──
  "Figma", "Canva", "Sketch", "Adobe XD", "Photoshop", "Illustrator",
  "InDesign", "After Effects", "Premiere Pro", "Framer", "Webflow",
  "Notion", "Miro", "FigJam", "Whimsical", "Excalidraw",

  // ── Design Concepts ──
  "UI", "UX", "UI/UX", "wireframe", "prototype", "mockup",
  "design system", "component library", "responsive design",
  "mobile first", "accessibility", "a11y", "WCAG", "color theory",
  "typography", "grid system", "flexbox", "CSS Grid", "animation",
  "micro-interaction", "dark mode", "light mode",

  // ── Business & Finance ──
  "SaaS", "B2B", "B2C", "D2C", "MVP", "PMF", "product-market fit",
  "go-to-market", "GTM", "TAM", "SAM", "SOM", "runway", "burn rate",
  "bootstrapped", "venture capital", "VC", "angel investor", "seed round",
  "Series A", "Series B", "IPO", "valuation", "cap table", "equity",
  "vesting", "dilution", "term sheet", "due diligence",

  // ── Project Management ──
  "Agile", "Scrum", "Kanban", "sprint", "standup", "retrospective",
  "backlog", "epic", "user story", "story points", "velocity",
  "Jira", "Linear", "Asana", "Monday.com", "Trello", "ClickUp",
  "roadmap", "milestone", "OKR", "stakeholder",

  // ── OpenWhispr Specific ──
  "OpenWhispr", "whisper-server", "llama-server", "Electron",
  "better-sqlite3", "FFmpeg", "Globe key", "push-to-talk",
  "dictation", "transcription", "custom dictionary", "control panel",
  "turbo model", "large-v3",

  // ── Misc Tech ──
  "localhost", "API key", "environment variable", "env", "dotenv",
  "npm run dev", "npm install", "package.json", "tsconfig",
  "linter", "formatter", "hot reload", "HMR", "tree shaking",
  "code splitting", "lazy loading", "memoization", "debounce", "throttle",
  "pagination", "infinite scroll", "virtual scroll", "skeleton loader",
  "toast", "modal", "dropdown", "popover", "tooltip", "breadcrumb",
  "sidebar", "navbar", "footer", "hero section", "CTA",
  "call to action", "above the fold", "viewport",
];

// ── Run ──
function run() {
  const escaped = (str) => str.replace(/'/g, "''");

  let sql = "";
  if (!appendMode) {
    sql += "DELETE FROM custom_dictionary;\n";
  }

  for (const term of DICTIONARY_TERMS) {
    sql += `INSERT OR IGNORE INTO custom_dictionary (word) VALUES ('${escaped(term)}');\n`;
  }

  try {
    execSync(`sqlite3 "${DB_PATH}" <<'ENDSQL'\n${sql}\nENDSQL`, {
      shell: "/bin/bash",
      stdio: "pipe",
    });

    const countResult = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM custom_dictionary;"`, {
      encoding: "utf-8",
    }).trim();

    console.log(`✅ Dictionary loaded: ${DICTIONARY_TERMS.length} terms added (${countResult} total in database)`);
    console.log(`📂 Database: ${DB_PATH}`);
    console.log(`\n⚠️  Restart OpenWhispr to sync the dictionary to the UI.`);
  } catch (err) {
    console.error("❌ Failed to load dictionary:", err.message);
    process.exit(1);
  }
}

run();
