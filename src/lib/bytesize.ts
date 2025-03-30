/**
 * The size of a kilobyte
 */
const KILOBYTE: number = 1024;
/**
 * The size of a megabyte
 */
const MEGABYTE: number = 1024 * KILOBYTE;
/**
 * The size of a gigabyte
 */
const GIGABYTE: number = 1024 * MEGABYTE;

/**
 * Format a byte size into a human-readable string
 *
 * @param size - The size in bytes
 * @returns A human-readable string representing the size
 */
export function formatByteSize(size: number): string {
    if (size < KILOBYTE) {
        return `${ size } B`;
    }
    else if (size < MEGABYTE) {
        return `${ (
            size / KILOBYTE
        ).toFixed(2) } KB`;
    }
    else if (size < GIGABYTE) {
        return `${ (
            size / MEGABYTE
        ).toFixed(2) } MB`;
    }

    return `${ (
        size / GIGABYTE
    ).toFixed(2) } GB`;
}

/**
 * Template literal tag function for kilobytes
 * @example kb`1` => 1024
 */
export function kb(strings: TemplateStringsArray, ...values: any[]): number {
    const value = Number(strings.raw[0]);
    return value * KILOBYTE;
}

/**
 * Template literal tag function for megabytes
 * @example mb`1` => 1048576
 */
export function mb(strings: TemplateStringsArray, ...values: any[]): number {
    const value = Number(strings.raw[0]);
    return value * MEGABYTE;
}

/**
 * Template literal tag function for gigabytes
 * @example gb`1` => 1073741824
 */
export function gb(strings: TemplateStringsArray, ...values: any[]): number {
    const value = Number(strings.raw[0]);
    return value * GIGABYTE;
}