import fs from "fs";
import { globSync } from "glob";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Find all JS files in scripts-dist
const files = globSync(path.join(rootDir, "scripts-dist", "**", "*.js").replaceAll("\\", "/"));

for (const file of files) {
    let content = fs.readFileSync(file, "utf8");

    // Find and fix relative imports without extensions
    content = content.replace(
            /(from\s+['"])(\.[^'"]+)(['"])/g,
            (match, prefix, importPath, suffix) => {
                // Add .js extension if missing
                if (!importPath.endsWith(".js")) {
                    return `${ prefix }${ importPath }.js${ suffix }`;
                }
                return match;
            },
        )
        .replace(
            /(.+)(from\s+['"])astro:([^'"]+)(['"])/g,
            (match, imp_stmt, prefix, importPath, suffix) => {
                if (imp_stmt.includes("{ z }")) {
                    return `${ imp_stmt }${ prefix }astro/zod${ suffix }`;
                }

                if (importPath === "content") {
                    return `${ imp_stmt }${ prefix }astro/${ importPath }/runtime${ suffix }`;
                }
                return `${ imp_stmt }${ prefix }astro/${ importPath }${ suffix }`;
            },
        ).replace(
            /(from\s+['"])dayjs\/plugin\/([^'"]+)(['"])/g,
            (match, prefix, importPath, suffix) => {
                return `${ prefix }dayjs/plugin/${ importPath }.js${ suffix }`;
            },
        )
        // Replace import.meta.env with process.env
        .replace(
            "import.meta.env",
            "process.env",
        );

    fs.writeFileSync(file, content);
}

console.log("Build patched successfully");