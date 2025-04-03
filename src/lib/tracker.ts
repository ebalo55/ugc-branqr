import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { getFingerprintData } from "@thumbmarkjs/thumbmarkjs";
import { all } from "radash";

/**
 * Basic tracking data containing essential information about the visitor
 */
interface BasicTrackingData {
    /** Whether Apple Pay is supported on the device */
    apple_pay: boolean;
    /** Visitor's IP address */
    ip_address: string | undefined;
    /** Browser name and version */
    browser: string | undefined;
    /** Operating system platform */
    platform: string | undefined;
    /** Device screen resolution in format "<width>x<height>" */
    screen_resolution: string | undefined;
    /** Whether the device has touch screen capabilities */
    is_touch_screen: boolean;
    /** Device timezone */
    timezone: string | undefined;
}

/**
 * Full tracking data extending basic information with detailed location, hardware and network data
 */
interface FullTrackingData extends BasicTrackingData {
    /** Visitor's city location */
    city: string | undefined;
    /** Continent where visitor is located */
    continent: string | undefined;
    /** Country where visitor is located */
    country: string | undefined;
    /** Latitude coordinate of visitor's location */
    lat: number | undefined;
    /** Longitude coordinate of visitor's location */
    lon: number | undefined;
    /** Region/state name of visitor's location */
    region_name: string | undefined;
    /** X-Forwarded-For header value showing proxy chain */
    forwarded_for: string | undefined;
    /** Number of logical processors available to the browser */
    hardware_concurrency: number | undefined;
    /** Browser language preferences */
    locales: string | undefined;
    /** Internet Service Provider name */
    isp: string | undefined;
    /** Comma-separated list of browser plugins */
    plugins: string | undefined;
    /** Postal/ZIP code of visitor's location */
    zip: string | undefined;
    /** GPU/graphics card information */
    graphic_card: string | undefined;
}

/**
 * Combined type representing either basic or full tracking data
 */
export type TrackingData = BasicTrackingData | FullTrackingData;

export type TrackingLevel = "basic" | "full"

/**
 * Get tracking data from various sources.
 */
export async function getTrackingData(level: TrackingLevel): Promise<TrackingData> {
    const {
              ifconfig_me,
              thumb_data,
              ip_api,
              fpjs_data,
          } = await all({
        ifconfig_me: fetch("https://ifconfig.me/all.json").then(res => res.json()),
        thumb_data:  getFingerprintData(),
        ip_api:      level === "full"
                     ? fetch(
                "https://ip-api.com/json/?fields=continent,country,regionName,city,zip,lat,lon,timezone,org")
                         .then(res => res.json())
                     : fetch("https://ip-api.com/json/?fields=timezone").then(res => res.json()),
        fpjs_data:   FingerprintJS.load().then(fp => fp.get()),
    });

    return {
        apple_pay:            "value" in fpjs_data.components.applePay && fpjs_data.components.applePay.value === 1,
        city:                 level === "full" && "city" in ip_api && ip_api.city
                              ? ip_api.city
                              : undefined,
        continent:            level === "full" && "continent" in ip_api && ip_api.continent
                              ? ip_api.continent
                              : undefined,
        country:              level === "full" && "country" in ip_api && ip_api.country
                              ? ip_api.country
                              : undefined,
        lat:                  level === "full" && "lat" in ip_api && ip_api.lat
                              ? ip_api.lat
                              : undefined,
        lon:                  level === "full" && "lon" in ip_api && ip_api.lon
                              ? ip_api.lon
                              : undefined,
        region_name:          level === "full" && "regionName" in ip_api && ip_api.regionName
                              ? ip_api.regionName
                              : undefined,
        forwarded_for:        level === "full" && "forwarded" in ifconfig_me && ifconfig_me.forwarded
                              ? ifconfig_me.forwarded.split(",").map((v: string) => v.trim()).filter(Boolean).join(",")
                              : undefined,
        hardware_concurrency: level === "full" && "value" in fpjs_data.components.hardwareConcurrency &&
                              fpjs_data.components.hardwareConcurrency.value
                              ? fpjs_data.components.hardwareConcurrency.value
                              : undefined,
        ip_address:           "ip_addr" in ifconfig_me && ifconfig_me.ip_addr
                              ? ifconfig_me.ip_addr
                              : undefined,
        locales:              level === "full" && "locales" in thumb_data &&
                              "languages" in (
                                  thumb_data.locales as object
                              ) && (
                                  thumb_data.locales as any
                              ).languages
                              ? (
                                  thumb_data.locales as any
                              ).languages.join(",")
                              : undefined,
        isp:                  level === "full" && "org" in ip_api && ip_api.org
                              ? ip_api.org
                              : undefined,
        plugins:              level === "full" &&
                              "value" in fpjs_data.components.plugins &&
                              fpjs_data.components.plugins.value &&
                              fpjs_data.components.plugins.value.length > 0
                              ? fpjs_data.components.plugins.value.map(v => v.name).join(",")
                              : undefined,
        is_touch_screen:      (
                                  "screen" in thumb_data && "is_touchscreen" && thumb_data.screen &&
                                  (
                                      thumb_data.screen as any
                                  ).is_touchscreen
                              ) ?? false,
        screen_resolution:    "value" in fpjs_data.components.screenResolution &&
                              fpjs_data.components.screenResolution.value &&
                              fpjs_data.components.screenResolution.value.length === 2
                              ? fpjs_data.components.screenResolution.value.join("x")
                              : undefined,
        platform:             "value" in fpjs_data.components.platform &&
                              fpjs_data.components.platform.value
                              ? fpjs_data.components.platform.value
                              : undefined,
        timezone:             "timezone" in ip_api && ip_api.timezone
                              ? ip_api.timezone
                              : undefined,
        zip:                  level === "full" && "zip" in ip_api && ip_api.zip
                              ? ip_api.zip
                              : undefined,
        browser:              "system" in thumb_data &&
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
        graphic_card:         level === "full" && "value" in fpjs_data.components.webGlBasics &&
                              fpjs_data.components.webGlBasics.value !== -1 &&
                              fpjs_data.components.webGlBasics.value !== -2 &&
                              fpjs_data.components.webGlBasics.value.renderer
                              ? fpjs_data.components.webGlBasics.value.rendererUnmasked
                              : undefined,
    };
}