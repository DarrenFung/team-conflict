import { GoogleGenAI, type Part, type ToolUnion } from "@google/genai";
import { Storage } from "@google-cloud/storage";
import { readFileSync } from "node:fs";

export interface GCSFile {
  /** Full GCS URI, e.g. gs://my-bucket/path/to/file.pdf */
  gcsUri: string;
  /** MIME type, e.g. application/pdf, image/png, text/plain */
  mimeType: string;
}

export interface LocalFile {
  /** Absolute path to a local file */
  path: string;
  /** MIME type, e.g. application/pdf, image/png, text/plain */
  mimeType: string;
}

export interface PromptOptions {
  /** The text prompt to send */
  prompt: string;
  /** Optional GCS files to include as context */
  files?: GCSFile[];
  /** Optional local files to include as inline base64 data */
  localFiles?: LocalFile[];
  /** Model to use (defaults to gemini-2.0-flash) */
  model?: string;
  /** Optional system instruction */
  systemInstruction?: string;
  /** Optional tools for function calling */
  tools?: ToolUnion[];
}

export class VertexAIClient {
  private client: GoogleGenAI;
  private storage: Storage;
  private project: string;
  private location: string;

  constructor(options?: { project?: string; location?: string }) {
    this.project =
      options?.project ?? process.env.GCP_PROJECT_ID ?? "";
    this.location =
      options?.location ?? process.env.GCP_LOCATION ?? "us-central1";

    if (!this.project) {
      throw new Error(
        "GCP project ID is required. Set GCP_PROJECT_ID env var or pass it in the constructor."
      );
    }

    this.client = new GoogleGenAI({
      vertexai: true,
      project: this.project,
      location: this.location,
    });

    this.storage = new Storage({ projectId: this.project });
  }

  /**
   * Send a prompt to Vertex AI, optionally including GCS files as context.
   * Files are referenced by their GCS URI — Vertex AI reads them directly,
   * so no downloading is needed.
   */
  async generateContent(options: PromptOptions): Promise<string> {
    const model =
      options.model ?? process.env.VERTEX_MODEL ?? "gemini-2.0-flash";

    const parts: Part[] = [];

    // Attach GCS files as fileData parts — Vertex AI reads these natively
    if (options.files?.length) {
      for (const file of options.files) {
        parts.push({
          fileData: {
            fileUri: file.gcsUri,
            mimeType: file.mimeType,
          },
        });
      }
    }

    // Attach local files as inline base64 data
    if (options.localFiles?.length) {
      for (const file of options.localFiles) {
        const data = readFileSync(file.path).toString("base64");
        parts.push({
          inlineData: {
            data,
            mimeType: file.mimeType,
          },
        });
      }
    }

    // Add the text prompt
    parts.push({ text: options.prompt });

    const contents = [{ role: "user" as const, parts }];
    const config: Record<string, any> = {};
    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }
    if (options.tools?.length) {
      config.tools = options.tools;
      config.automaticFunctionCalling = { disable: false };
    }

    const tokenCount = await this.client.models.countTokens({
      model,
      contents,
      config,
    });
    console.log(
      `Tokens: ${tokenCount.totalTokens?.toLocaleString()} total`
    );

    const response = await this.client.models.generateContent({
      model,
      contents,
      config,
    });

    return response.text ?? "";
  }

  /**
   * List files in a GCS bucket/prefix. Useful for discovering what files
   * are available to pass to generateContent.
   */
  async listFiles(
    bucket: string,
    prefix?: string
  ): Promise<GCSFile[]> {
    const [files] = await this.storage
      .bucket(bucket)
      .getFiles({ prefix });

    return files.map((f) => ({
      gcsUri: `gs://${bucket}/${f.name}`,
      mimeType: f.metadata.contentType ?? "application/octet-stream",
    }));
  }
}
