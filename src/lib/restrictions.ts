import { z } from "zod";
import { Encryption } from "./encryption";
import type { QR_FORM_VALIDATION_SCHEMA } from "./schema";
import { ifconfigMe, ipApi } from "./tracker";

export async function shouldRestrictAccess() {
    const definition = document.body.dataset.restrictions;
    const serialized_key = document.body.dataset.key;

    // Check if the definition and serialized_key are present
    if (!definition || !serialized_key) {
        return false;
    }

    // decrypt the serialized key and parse the definition
    const key = await Encryption.importKey(serialized_key);
    const parsed_definition = JSON.parse(await Encryption.instance.decrypt(
        definition,
        key,
    )) as z.infer<typeof QR_FORM_VALIDATION_SCHEMA>["advanced"]["restrictions"];

    // Check if the parsed definition is valid
    if (!parsed_definition) {
        return false;
    }

    const is_blacklisted = await isBlacklisted(parsed_definition);
    if (is_blacklisted) {
        return true;
    }

    return await isGeoFenced(parsed_definition);
}

/**
 * Checks if the current user is geo-fenced.
 * @param {NonNullable<TypeOf<typeof QR_FORM_VALIDATION_SCHEMA>["advanced"]["restrictions"]>} definition
 */
async function isGeoFenced(definition: NonNullable<z.infer<typeof QR_FORM_VALIDATION_SCHEMA>["advanced"]["restrictions"]>) {
    const {country, city} = await ipApi();

    // Check if the country is fenced, if so, check if the city is also fenced
    if (definition.geo_fencing && definition.geo_fencing.length > 0) {
        return definition.geo_fencing.some(v => {
            const country_matches = v.country.toLowerCase() === country.toLowerCase();

            // If the country matches, check if the city matches as well, city is checked only if the country matches
            // If the city is not provided, only the country is checked
            return country_matches || (
                country_matches && v.city && v.city.toLowerCase() === city.toLowerCase()
            );
        });
    }

    return false;
}

/**
 * Checks if the current user's IP address is blacklisted.
 */
async function isBlacklisted(definition: NonNullable<z.infer<typeof QR_FORM_VALIDATION_SCHEMA>["advanced"]["restrictions"]>) {
    const {ip_addr} = await ifconfigMe();

    if (definition.blacklisted_ips && definition.blacklisted_ips.length > 0) {
        return definition.blacklisted_ips.includes(ip_addr);
    }
    return false;
}