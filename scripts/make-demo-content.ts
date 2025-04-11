import { z } from "astro:content";
import { config } from "dotenv";
import { unlink, writeFile } from "fs/promises";
import { globSync } from "glob";
import { all } from "radash";
import type { ContentSchema } from "../src/content.config";
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

    const filename_name = `__DEMO__.json`;
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

const static_types = [
    "url",
    "text",
    "email",
    "phone",
    "wifi",
    "vcard",
    "sms",
];

await all([
    ...Array.from({length: static_types.length}, (v, i) => i).map((i) => {
        let content: Content["def"]["content"];
        switch (static_types[i]) {
            case "url":
                content = {
                    type:     "url",
                    url:      "https://example.com",
                    settings: {
                        track: true,
                        ads: false,
                    },
                };
                break;
            case "text":
                content = {
                    type:     "text",
                    text:     "Lorem ipsum dolor sit amet, consectetuer adipiscing elit.\n" +
                              "\n" +
                              "Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et",
                    settings: {
                        track: true,
                        ads: false,
                    },
                };
                break;
            case "email":
                content = {
                    type:     "email",
                    email:    "john@example.com",
                    settings: {
                        track: true,
                        ads: false,
                    },
                    subject:  "Lorem ipsum dolor sit amet",
                    body:     "Lorem ipsum dolor sit amet, consectetuer adipiscing elit.\n" +
                              "\n" +
                              "Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et",
                };
                break;
            case "phone":
                content = {
                    type:     "phone",
                    phone:    "+49123456789",
                    settings: {
                        track: true,
                        ads: false,
                    },
                };
                break;
            case "wifi":
                content = {
                    type:     "wifi",
                    ssid:     "MyWifi",
                    password: "MyPassword",
                    hidden:   false,
                    settings: {
                        track: true,
                        ads: false,
                    },
                };
                break;
            case "vcard":
                content = {
                    type:         "vcard",
                    first_name:   "John",
                    last_name:    "Doe",
                    organization: "Example Inc.",
                    title:        "Software Engineer",
                    website:      "https://example.com",
                    address:      "123 Main St, City, Country",
                    email:        "john@example.com",
                    phone:        "+49123456789",
                    settings:     {
                        track: true,
                        ads: false,
                    },
                };
                break;
            case "sms":
                content = {
                    type:     "sms",
                    phone:    "+49123456789",
                    text:     "Lorem ipsum dolor sit amet, consectetuer adipiscing elit.\n" +
                              "\n" +
                              "Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et",
                    settings: {
                        track: true,
                        ads: false,
                    },
                };
                break;
            default:
                throw new Error(`Unknown type "${ static_types[i] }"`);
        }

        return storeDemoContent({
            def:  {
                name:       `__DEMO__${ static_types[i] }`,
                content,
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
                with_advertising:       false,
                with_advanced_tracking: true,
            },
        });
    }),
]);

console.log("Demo content stored.");