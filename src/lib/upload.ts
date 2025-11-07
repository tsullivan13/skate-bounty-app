// src/lib/upload.ts
import { supabase } from "./supabase";

function uuidLike() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Upload an image to the 'bounties' bucket and return a public URL.
 * - Web: pass { file: File }
 * - Native: pass { base64: string, contentType?: string }
 */
export async function uploadBountyImage(input: {
    file?: File | Blob;
    base64?: string;
    contentType?: string;
    userId: string;
}): Promise<string> {
    const key = `user_${input.userId}/${uuidLike()}`;

    let uploadRes;
    if (input.file) {
        uploadRes = await supabase.storage
            .from("bounties")
            .upload(key, input.file, { upsert: false });
    } else if (input.base64) {
        const contentType = input.contentType ?? "image/jpeg";
        // Convert base64 to Blob
        const byteCharacters = atob(input.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const bytes = new Uint8Array(byteNumbers);
        const blob = new Blob([bytes], { type: contentType });

        uploadRes = await supabase.storage
            .from("bounties")
            .upload(key, blob, { contentType, upsert: false });
    } else {
        throw new Error("No image provided");
    }

    if (uploadRes.error) throw uploadRes.error;

    const { data } = supabase.storage.from("bounties").getPublicUrl(key);
    if (!data?.publicUrl) throw new Error("Could not get public URL");
    return data.publicUrl;
}
