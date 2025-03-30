import { createId } from "@paralleldrive/cuid2";
import { z } from "astro:content";
import { config } from "dotenv";
import { unlink, writeFile } from "fs/promises";
import { globSync } from "glob";
import { all } from "radash";
import type { ContentSchema } from "../src/content.config.ts";
import { Encryption } from "../src/lib/encryption";
import { QR_CODE_SCHEMA } from "../src/lib/schema";

config();
await Encryption.init();

type Content = z.infer<typeof QR_CODE_SCHEMA>

async function storeDemoContent(spec: Content) {
    const validated = QR_CODE_SCHEMA.safeParse(spec);
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
    switch (spec.def.content.type) {
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

    const file_path = `./src/content/${ folder_name }/${ spec.def.content.type }/${ filename_name }`;
    const file_content = JSON.stringify(content_data, null, 4);

    await writeFile(file_path, file_content);
    console.log(`Stored content of type "${ spec.def.content.type }" in "${ file_path }"`);
}

console.log("Cleaning up old demo content...");

const old_content = globSync("./src/content/**/__DEMO__*");

const pending = [];
for (const file of old_content) {
    console.log(`Deleting "${ file }"`);
    pending.push(unlink(file).then(() => console.log(`File "${ file }" deleted`)));
}

await all(pending);

console.log("Storing demo content...");

await all([
    storeDemoContent({
        def:  {
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
        },
        meta: {
            owner:                  process.env.DEMO_OWNER!,
            cooldown:               20,
            integrations:           {
                gtag:    process.env.DEMO_GTAG!,
                webhook: process.env.DEMO_WEBHOOK!,
            },
            with_advertising:       true,
            with_advanced_tracking: true,
        },
    }),
]);

console.log("Demo content stored.");