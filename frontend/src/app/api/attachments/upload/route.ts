import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getOrCreateActiveUser } from "@/lib/auth";

// Client-direct upload handshake. The browser calls `upload()` from
// `@vercel/blob/client`, which POSTs here to trade a server-issued token for
// a direct-to-blob upload. The DB row is written by a separate server action
// (`recordAttachment`) after the client-side `upload()` resolves — we don't
// rely on the `onUploadCompleted` webhook because it can't reach localhost
// without a tunnel.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getOrCreateActiveUser();
        return {
          // Random suffix prevents collisions when two users upload the same
          // filename; pairs with `access: 'private'` so URLs aren't guessable.
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // No-op: DB write happens in the `recordAttachment` server action
        // the client calls after `upload()` resolves. Kept because
        // `handleUpload` requires the callback.
        console.log("blob upload completed", blob.pathname);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
