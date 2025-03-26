import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";

dotenv.config({
    path: ".env"
});

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const SILICONFLOW_BASE_URL = process.env.SILICONFLOW_BASE_URL;
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL;

if (!SILICONFLOW_API_KEY || !SILICONFLOW_BASE_URL || !SILICONFLOW_MODEL) {
  console.log("SILICONFLOW_API_KEY or SILICONFLOW_BASE_URL or SILICONFLOW_MODEL is not set");
  throw new Error("SILICONFLOW_API_KEY or SILICONFLOW_BASE_URL or SILICONFLOW_MODEL is not set");
} else {
  console.log("SILICONFLOW_API_KEY and SILICONFLOW_BASE_URL and SILICONFLOW_MODEL are set");
  console.log("SILICONFLOW_API_KEY: ", SILICONFLOW_API_KEY);
  console.log("SILICONFLOW_BASE_URL: ", SILICONFLOW_BASE_URL);
  console.log("SILICONFLOW_MODEL: ", SILICONFLOW_MODEL);
}

class MCPClient {
  private mcp: Client;
  private openai: OpenAI;
  private transport: StdioClientTransport | null = null;
  private tools: ChatCompletionTool[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: SILICONFLOW_API_KEY,
      baseURL: SILICONFLOW_BASE_URL,
    });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;
      
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);
      
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        }
      }));
      console.log(
        "Connected to server with tools:",
        this.tools.map((tool) => tool.function.name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: SILICONFLOW_MODEL!,
        messages,
        tools: this.tools,
        tool_choice: "auto",
      });

      const finalText: string[] = [];
      const choice = response.choices[0];
      
      if (!choice || !choice.message) {
        throw new Error("Invalid response from OpenAI");
      }

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        for (const toolCall of choice.message.tool_calls) {
          if (!toolCall.function || !toolCall.function.name || !toolCall.function.arguments) {
            console.warn("Invalid tool call format", toolCall);
            continue;
          }

          try {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            finalText.push(
              `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
            );

            const result = await this.mcp.callTool({
              name: toolName,
              arguments: toolArgs,
            });

            // 确保工具调用结果是字符串
            const resultContent = typeof result.content === 'string' 
              ? result.content 
              : JSON.stringify(result.content);

            messages.push({
              role: "assistant",
              content: null,
              tool_calls: [toolCall],
            });
            messages.push({
              role: "tool",
              content: resultContent,
              tool_call_id: toolCall.id,
            });

            const followUpResponse = await this.openai.chat.completions.create({
              model: SILICONFLOW_MODEL!,
              messages,
            });

            if (followUpResponse.choices[0]?.message?.content) {
              finalText.push(followUpResponse.choices[0].message.content);
            }
          } catch (error) {
            console.error(`Error processing tool call: ${error}`);
            finalText.push(`[Error processing tool call: ${error instanceof Error ? error.message : String(error)}]`);
          }
        }
      } else if (choice.message.content) {
        finalText.push(choice.message.content);
      }

      return finalText.join("\n");
    } catch (e) {
      console.error("Error in processQuery:", e);
      throw e;
    }
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");
  
      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }
        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }
  
  async cleanup() {
    await this.mcp.close();
  }
}

async function main() {
    if (process.argv.length < 3) {
      console.log("Usage: node index.ts <path_to_server_script>");
      return;
    }
    const mcpClient = new MCPClient();
    try {
      await mcpClient.connectToServer(process.argv[2]);
      await mcpClient.chatLoop();
    } finally {
      await mcpClient.cleanup();
      process.exit(0);
    }
  }
  

  main();