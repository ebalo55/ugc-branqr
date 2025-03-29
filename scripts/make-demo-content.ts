import { createId } from "@paralleldrive/cuid2";
import { z } from "astro:content";
import { config } from "dotenv";
import { writeFile } from "fs/promises";
import { all } from "radash";
import type { ContentSchema } from "../src/content.config.ts";
import { Encryption } from "../src/lib/encryption";
import { QR_FORM_VALIDATION_SCHEMA } from "../src/lib/schema";

config();
await Encryption.init();

type Content = z.infer<typeof QR_FORM_VALIDATION_SCHEMA>

async function storeDemoContent(content: Content) {
    const validated = QR_FORM_VALIDATION_SCHEMA.safeParse(content);
    if (!validated.success) {
        console.error("Validation failed:", validated.error.format());
        return;
    }
    const {data} = validated;

    const key_material = await Encryption.instance.deriveKey();
    const encrypted_content = await Encryption.instance.encrypt(JSON.stringify(data), key_material.derived_key);

    const content_data: ContentSchema = {
        crypt_data: encrypted_content,
        salt:       key_material.salt,
    };

    const filename_name = `__DEMO__${ createId() }.json`;
    let folder_name: string;
    switch (content.content.type) {
        case "url":
        case "text":
        case "email":
        case "phone":
        case "wifi":
        case "vcard":
        case "sms":
            folder_name = "static";
            break;
        default:
            folder_name = "dynamic";
            break;
    }

    const file_path = `./src/content/${ folder_name }/${ content.content.type }/${ filename_name }`;
    const file_content = JSON.stringify(content_data, null, 4);

    await writeFile(file_path, file_content);
    console.log(`Stored content of type "${ content.content.type }" in "${ file_path }"`);
}

console.log("Storing demo content...");

await all([
    storeDemoContent({
        name:       "__DEMO__url",
        content:    {
            type:     "url",
            url:      "https://branqr.com",
            settings: {
                track: true,
            },
        },
        style:      {
            logo:       {},
            foreground: {},
            background: {},
        },
        automation: {},
        advanced:   {},
    }),
]);

console.log("Demo content stored.");