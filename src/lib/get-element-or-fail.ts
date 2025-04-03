/**
 * Get an element by its identifier and throw an error if it doesn't exist.
 * @param {string} identifier
 * @param {"query-selector" | "by-id"} variant
 */
export function getElementOrFail<T = HTMLElement>(
    identifier: string,
    variant: "query-selector" | "by-id" = "by-id",
): T {
    const element = variant === "by-id" ? document.getElementById(identifier) : document.querySelector(identifier);

    if (!element) {
        throw new Error(`Element with identifier "${ identifier }" not found.`);
    }

    return element as T;
}