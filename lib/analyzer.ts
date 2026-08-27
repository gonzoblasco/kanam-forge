import { z } from "zod";

const analysisSchema = z.object({
  projectType: z.enum(["web-app", "api", "cli", "library"]),
  stack: z.enum(["react-vite", "nextjs", "node-api"]),
  features: z.array(z.string()),
  tables: z.array(
    z.object({
      name: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
        }),
      ),
    }),
  ),
  authRequired: z.boolean(),
  billingRequired: z.boolean(),
  description: z.string(),
});

export type AIAnalysis = z.infer<typeof analysisSchema>;

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "deepseek-v4-flash:cloud";

const SYSTEM_PROMPT = `Sos un analizador de proyectos. Devolvé SOLO JSON válido, sin markdown, sin explicaciones.
El JSON debe seguir exactamente este esquema:
{
  "projectType": "web-app" | "api" | "cli" | "library",
  "stack": "react-vite" | "nextjs" | "node-api",
  "features": ["feature1", "feature2"],
  "tables": [{ "name": "table_name", "columns": [{ "name": "column_name", "type": "column_type" }] }],
  "authRequired": true | false,
  "billingRequired": true | false,
  "description": "descripción corta del proyecto"
}`;

const USER_PROMPT = (
  description: string,
) => `Analizá este proyecto: "${description}"

- Determiná el tipo de proyecto
- Elegí el stack más apropiado
- Listá las features principales
- Definí las tablas de base de datos necesarias
- Indicá si necesita autenticación y/o billing`;

export type AnalyzeOptions = {
  url?: string;
  model?: string;
};

export async function analyzeDescription(
  description: string,
  options: AnalyzeOptions = {},
): Promise<AIAnalysis> {
  const url =
    options.url ??
    process.env.OLLAMA_BASE_URL ??
    process.env.OLLAMA_URL ??
    DEFAULT_OLLAMA_URL;
  const model = options.model ?? DEFAULT_OLLAMA_MODEL;

  try {
    const res = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: USER_PROMPT(description) },
        ],
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama respondió ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const raw = data.message?.content ?? "";

    // Limpiar posibles wrappers de markdown
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return analysisSchema.parse(parsed);
  } catch {
    return getDefaultAnalysis(description);
  }
}

function getDefaultAnalysis(description: string): AIAnalysis {
  return {
    projectType: "web-app",
    stack: "nextjs",
    features: ["CRUD"],
    tables: [],
    authRequired: false,
    billingRequired: false,
    description,
  };
}
