import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { getFingerprintData } from "@thumbmarkjs/thumbmarkjs";
import dayjs from "dayjs";
import { z } from "zod";
import { Encryption } from "./encryption";
import type { QR_FORM_VALIDATION_SCHEMA } from "./schema";
import { mapPlatform } from "./tracker";

const _info = FingerprintJS.load().then(fp => fp.get());
const _thumb_info = getFingerprintData();

async function getPropertyDefinition() {
    const info = await _info;
    const thumb_info = await _thumb_info;
    const locales: string[] = [];

    // Check if the locales is a string
    if (typeof thumb_info.locales === "string") {
        locales.push(thumb_info.locales.split("-")[0].toLowerCase());
    }
    // Check if the locales is an array
    else if (Array.isArray(thumb_info.locales)) {
        locales.push(...thumb_info.locales.map(v => v.split("-")[0].toLowerCase()));
    }

    return {
        locales,
        device: "value" in info.components.platform && info.components.platform.value
                ? mapPlatform(info.components.platform.value)
                : "other",
        now:    dayjs().utc(),
    };
}

/**
 * Defines the redirect url based on the given set of redirection rules
 * @returns {Promise<string | undefined>}
 */
export async function smartRedirect() {
    const definition = document.body.dataset.smart_redirection;
    const serialized_key = document.body.dataset.key;

    // Check if the definition and serialized_key are present
    if (!definition || !serialized_key) {
        return;
    }

    // decrypt the serialized key and parse the definition
    const key = await Encryption.importKey(serialized_key);
    const parsed_definition = JSON.parse(await Encryption.instance.decrypt(
        definition,
        key,
    )) as z.infer<typeof QR_FORM_VALIDATION_SCHEMA>["advanced"]["smart_redirection"];

    // Check if the parsed definition is valid
    if (!parsed_definition || parsed_definition.length === 0) {
        return;
    }

    let match: NonNullable<z.infer<typeof QR_FORM_VALIDATION_SCHEMA>["advanced"]["smart_redirection"]>[number] | undefined = undefined;

    const properties = await getPropertyDefinition();

    for (const def of parsed_definition) {
        // check if locales are defined, if they are but none matches, we skip the definition
        if (def.locales && def.locales.length > 0 &&
            !def.locales.some(v => properties.locales.includes(v.toString().toLowerCase()))) {
            continue;
        }

        // check if the device matches, if it is defined but it doesn't match, we skip the definition
        if (def.devices && def.devices.length > 0 && !def.devices.includes(properties.device as any)) {
            continue;
        }

        // check if the hour ranges is defined, if it is but it doesn't match, we skip the definition
        if (def.hour_ranges && def.hour_ranges.length > 0) {
            const now = properties.now;
            const is_valid = def.hour_ranges.some((v) => {
                const start = dayjs(v.from, "HH:mm");
                const end = dayjs(v.to, "HH:mm");
                return now.isAfter(start) && now.isBefore(end);
            });
            if (!is_valid) {
                continue;
            }
        }

        // if we reach this point, it means that the definition matches the properties, so we can return the
        // redirect_to value
        match = def;
        break;
    }

    return match?.redirect_to;
}