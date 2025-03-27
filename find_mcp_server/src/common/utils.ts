// 工具函数
import dotenv from "dotenv";

dotenv.config();

export async function githubRequest(url: string, options: RequestInit = {}) {
    console.log("Starting github request...");
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error("GITHUB_TOKEN is not set");
        throw new Error("GITHUB_TOKEN is not set");
    }

    console.log(`Fetching from Github.../n url: ${url} options: ${JSON.stringify(options)}`);
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github.v3+json",
        },
    });

    if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    console.log(`Response: ${response.status} ${response.statusText}`);
    return response.json();
}