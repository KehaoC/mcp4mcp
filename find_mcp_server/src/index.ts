import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import * as repository from "./operations/repository.js";
import * as utils from "./common/utils.js";

const server = new McpServer(
    {
        name: "find_mcp",
        version: "0.0.1",
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

// 注册工具
server.tool(
    "search_repositories",
    {
        query: z.string().describe("Search query (see Github search syntax)"),
        page: z.number().optional().describe("Page number for pagination (default: 1)"),
        perPage: z.number().optional().describe("Number of results per page (default: 30, max: 100)"),
    },
    async (args) => {
        const results = await repository.searchRepositories(
            args.query,
            args.page,
            args.perPage
        );
        return {
            content: [{ type: "text", text: JSON.stringify(results, null, 2)}]
        };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Server is running...");

    // TEST the github request
    const results = await utils.githubRequest("https://api.github.com/search/repositories?q=mcp_server&sort=stars&order=desc&per_page=1");
    console.log(results);
}

main().catch((error) => {
    console.error(error);
    // process.exit(1);
});