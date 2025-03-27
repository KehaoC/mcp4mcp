import { z } from "zod";

export const GithubOwnerSchema = z.object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string(),
    url: z.string(),
    html_url: z.string(),
    type: z.string(),
});

export const GithubRepositorySchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    owner: GithubOwnerSchema,
    html_url: z.string(),
    description: z.string().nullable(),
    fork: z.boolean(),
    url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string(),
    git_url: z.string(),
    ssh_url: z.string(),
    clone_url: z.string(),
    default_branch: z.string(),
})

export const GithubSearchResponseSchema = z.object({
    total_count: z.number(),
    incomplete_results: z.boolean(),
    items: z.array(GithubRepositorySchema),
})