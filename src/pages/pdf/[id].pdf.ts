import type { APIRoute } from "astro";
import { access, readdir, readFile } from "fs/promises";
import { tryit } from "radash";

/**
 * This API route serves PDF files from the content directory.
 * @param {Record<string, string>} params
 */
export const GET: APIRoute = async ({params}) => {
    const id = params.id;

    if (!id) {
        throw new Error("id is required");
    }

    const file_path = `./src/content/pdf/${ id }.pdf`;
    const [ err ] = await tryit(access)(file_path);
    if (err) {
        throw err;
    }

    const content = await readFile(file_path);

    return new Response(content, {
        headers: {
            "Content-Type":        "application/pdf",
            "Content-Disposition": `inline; filename="${ id }.pdf"`,
        },
    });
};

/**
 * This function generates static paths for the PDF files in the content directory.
 */
export async function getStaticPaths() {
    const files = await readdir("./src/content/pdf");

    return files.filter(f => f.endsWith(".pdf")).map(file => (
        {
            params: {
                id: file.replace(/\.pdf$/, ""),
            },
        }
    ));
}