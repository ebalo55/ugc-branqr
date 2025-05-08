import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { getFingerprintData } from "@thumbmarkjs/thumbmarkjs";
import { all, pick } from "radash";
import { cachedFunction } from "./cache";
import { dayjs } from "./dayjs";

/**
 * Basic tracking data containing essential information about the visitor
 */
interface BasicTrackingData {
    /** Whether Apple Pay is supported on the device */
    apple_pay: boolean;
    /** Device timezone */
    timezone: string | undefined;
    /** Browser language preferences */
    locales: string | undefined;
}

/**
 * Full tracking data extending basic information with detailed location, hardware and network data
 */
interface FullTrackingData extends BasicTrackingData {
    /** Visitor's city location */
    city: string | undefined;
    /** Country where visitor is located */
    country: string | undefined;
    /** Internet Service Provider name */
    isp: string | undefined;
    /** Visitor's IP address */
    ip_address: string | undefined;
    /** Browser name and version */
    browser: string | undefined;
    /** Operating system platform */
    platform: string | undefined;
    /** Device screen resolution in format "<width>x<height>" */
    screen_resolution: string | undefined;
}

/**
 * Combined type representing either basic or full tracking data
 */
export type TrackingData = BasicTrackingData | FullTrackingData;

export type TrackingLevel = "basic" | "full"

export function mapPlatform(platform: string): string {
    platform = platform.toLowerCase();

    if (platform.includes("android")) {
        return "android";
    }
    if (/(iphone|ipad|ipod)/.test(platform)) {
        return "ios";
    }
    if (platform.startsWith("win")) {
        return "windows";
    }
    if (platform.startsWith("mac")) {
        return "macos";
    }
    if (platform.startsWith("lin")) {
        return "linux";
    }
    return "other";
}

interface IfconfigMeResponse {
    ip_addr: string;
    user_agent: string;
    port: string;
    method: string;
    encoding: string;
    mime: string;
    via?: string;
    forwarded?: string;
    language: string;
}

/**
 * Fetches the user's IP address and other information from ifconfig.me.
 * @returns {Promise<IfconfigMeResponse>}
 */
function internal_ifconfigMe(): Promise<IfconfigMeResponse> {
    return fetch("https://ifconfig.me/all.json").then(res => res.json());
}

/**
 * Fetches the user's IP address and other information from ifconfig.me and caches the result.
 * @returns {Promise<IfconfigMeResponse>}
 */
export const ifconfigMe = cachedFunction(
    internal_ifconfigMe,
    dayjs.utc().add(dayjs.duration({days: 1})).unix(),
    {key: "ifconfig_me"},
);

interface IpApiResponse {
    country: string;
    city: string;
    timezone: string;
    isp: string;
}

/**
 * Fetches the user's IP address and other information from ip-api.com.
 * @returns {Promise<IpApiResponse>}
 */
export function internal_ipApi(): Promise<IpApiResponse> {
    return fetch(`${ document.body.dataset.api }/proxy/json?domain=ip-api.com&parameters=${ encodeURI(
        "fields=country,city,timezone,isp",
    ) }`).then(res => res.json());
}

/**
 * Fetches the user's IP address and other information from ip-api.com and caches the result.
 * @type {() => Promise<IpApiResponse>}
 */
export const ipApi = cachedFunction(
    internal_ipApi,
    dayjs.utc().add(dayjs.duration({days: 1})).unix(),
    {key: "ip_api"},
);

/**
 * Get tracking data from various sources.
 */
export async function getTrackingData(level: TrackingLevel): Promise<TrackingData> {
    let {
            ifconfig_me,
            thumb_data,
            ip_api,
            fpjs_data,
        } = await all({
        ifconfig_me: ifconfigMe(),
        thumb_data:  getFingerprintData(),
        ip_api:      ipApi(),
        fpjs_data:   FingerprintJS.load().then(fp => fp.get()),
    });

    // Filter out unnecessary data based on the tracking level
    if (level !== "full") {
        ip_api = pick(ip_api, [ "timezone" ]) as any;
    }

    return {
        apple_pay:         "value" in fpjs_data.components.applePay && fpjs_data.components.applePay.value === 1,
        city:              level === "full" && "city" in ip_api && ip_api.city
                           ? ip_api.city
                           : undefined,
        country:           level === "full" && "country" in ip_api && ip_api.country
                           ? ip_api.country
                           : undefined,
        ip_address:        level === "full" && "ip_addr" in ifconfig_me && ifconfig_me.ip_addr
                           ? ifconfig_me.ip_addr
                           : undefined,
        locales:           "locales" in thumb_data &&
                           "languages" in (
                               thumb_data.locales as object
                           ) && (
                               thumb_data.locales as any
                           ).languages
                           ? (
                               Array.isArray((
                                   thumb_data.locales as any
                               ).languages)
                               ? (
                                   thumb_data.locales as any
                               ).languages.map((v: string) => v.split("-")[0]).filter(Boolean)
                               : [
                                       (
                                           thumb_data.locales as any
                                       ).languages.split("-")[0],
                                   ]
                           )
                           : undefined,
        isp:               level === "full" && "isp" in ip_api && ip_api.isp
                           ? ip_api.isp
                           : undefined,
        screen_resolution: level === "full" && "value" in fpjs_data.components.screenResolution &&
                           fpjs_data.components.screenResolution.value &&
                           fpjs_data.components.screenResolution.value.length === 2
                           ? fpjs_data.components.screenResolution.value.join("x")
                           : undefined,
        platform:          level === "full" && "value" in fpjs_data.components.platform &&
                           fpjs_data.components.platform.value
                           ? mapPlatform(fpjs_data.components.platform.value)
                           : undefined,
        timezone:          "timezone" in ip_api && ip_api.timezone
                           ? ip_api.timezone
                           : undefined,
        browser:           level === "full" && "system" in thumb_data &&
                           "browser" in (
                               thumb_data.system as any
                           ) && (
                               thumb_data.system as any
                           ).browser
                           ? (
                                 thumb_data.system as any
                             ).browser.name + " " + (
                                 thumb_data.system as any
                             ).browser.version
                           : undefined,
    };
}