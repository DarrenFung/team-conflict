import { VertexAIClient } from "./vertex-ai-client.js";

async function main() {
  const client = new VertexAIClient();

  // --- Basic text prompt ---
  console.log("=== Basic text prompt ===\n");
  const response = await client.generateContent({
    prompt: "Explain what Vertex AI is in two sentences.",
  });
  console.log(response);

  // --- Prompt with a GCS file ---
  // Uncomment and update the URI/mimeType to test with a real file:
  //
  // console.log("\n=== Prompt with GCS file ===\n");
  // const fileResponse = await client.generateContent({
  //   prompt: "Summarize the contents of this document.",
  //   files: [
  //     {
  //       gcsUri: "gs://your-bucket/path/to/document.pdf",
  //       mimeType: "application/pdf",
  //     },
  //   ],
  // });
  // console.log(fileResponse);

  // --- List files in a bucket ---
  // Uncomment to test listing:
  //
  // console.log("\n=== Files in bucket ===\n");
  // const files = await client.listFiles("your-bucket", "some/prefix/");
  // console.log(files);
}

main().catch(console.error);
