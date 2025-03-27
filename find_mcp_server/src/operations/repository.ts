import { z } from "zod";
import { githubRequest } from "../common/utils.js";
import { GithubSearchResponseSchema } from "../common/types.js";

export const SearchRepositoriesSchema = z.object({
    query: z.string().describe("Search query (see Github search syntax)"),
    page: z.number().optional().describe("Page number for pagination (default: 1)"),
    perPage: z.number().optional().describe("Number of results per page (default: 30, max: 100)"),
})

export async function searchRepositories(
    query: string,
    page: number = 1,
    perPage: number = 30,
) {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", query);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("per_page", perPage.toString());

    const response = await githubRequest(url.toString());
    return GithubSearchResponseSchema.parse(response);
}