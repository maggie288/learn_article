/**
 * GitHub 项目解析（Layer 1 最小实现）：
 * 从 GitHub 仓库 URL 获取 Repo 元数据 + README，产出可供后续提取的文档结构。
 * tree-sitter AST 分析留作后续扩展。
 */

import { slugify } from "@/lib/utils/slug";
import type { Section, SourceDocument } from "@/lib/engine/types";

export interface RepoMetadata {
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  defaultBranch: string;
  url: string;
}

const GITHUB_API = "https://api.github.com";

/**
 * 标准化 GitHub 仓库 URL，解析 owner/repo。
 */
export function normalizeGitHubUrl(repoUrl: string): {
  owner: string;
  repo: string;
  apiRepoUrl: string;
  rawBaseUrl: string;
  slug: string;
} {
  const url = new URL(repoUrl);
  if (!url.hostname.includes("github.com")) {
    throw new Error("Not a GitHub URL");
  }
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  const owner = parts[0] ?? "owner";
  const repo = (parts[1] ?? "repo").replace(/\.git$/, "");
  return {
    owner,
    repo,
    apiRepoUrl: `${GITHUB_API}/repos/${owner}/${repo}`,
    rawBaseUrl: `https://raw.githubusercontent.com/${owner}/${repo}`,
    slug: `${owner}-${repo}`,
  };
}

/**
 * 判断 URL 是否为 GitHub 仓库地址。
 */
export function isGitHubRepoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    return u.hostname.includes("github.com") && parts.length >= 2;
  } catch {
    return false;
  }
}

/**
 * 获取仓库元数据（GitHub API，公开仓库无需 token）。
 */
export async function fetchRepoMeta(repoUrl: string): Promise<RepoMetadata | null> {
  try {
    const { owner, repo, apiRepoUrl } = normalizeGitHubUrl(repoUrl);
    const res = await fetch(apiRepoUrl, {
      headers: { "User-Agent": "PaperFlow/0.1" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      description?: string | null;
      default_branch?: string;
    };
    return {
      owner,
      repo,
      name: data.name ?? repo,
      description: data.description ?? null,
      defaultBranch: data.default_branch ?? "main",
      url: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

/**
 * 获取默认分支的 README 内容（优先 README.md）。
 */
export async function fetchReadme(
  repoUrl: string,
  defaultBranch: string,
): Promise<string | null> {
  try {
    const { rawBaseUrl } = normalizeGitHubUrl(repoUrl);
    const candidates = ["README.md", "README.MD", "readme.md", "README"];
    for (const name of candidates) {
      const res = await fetch(`${rawBaseUrl}/${defaultBranch}/${name}`, {
        headers: { "User-Agent": "PaperFlow/0.1" },
      });
      if (res.ok) {
        const text = await res.text();
        return stripMarkdownToText(text);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** 简单去除 Markdown 符号，保留可读正文 */
function stripMarkdownToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readmeToSections(readme: string): Section[] {
  const blocks = readme.split(/\n\n+/).filter((b) => b.trim().length > 0);
  const sections: Section[] = [];
  let currentHeading = "Overview";
  let currentBuffer: string[] = [];

  for (const block of blocks) {
    const line = block.split("\n")[0] ?? "";
    const isHeading = /^#+\s+/.test(line);
    if (isHeading) {
      if (currentBuffer.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentBuffer.join(" ").trim(),
        });
      }
      currentHeading = line.replace(/^#+\s+/, "").trim();
      currentBuffer = [block];
    } else {
      currentBuffer.push(block);
    }
  }
  if (currentBuffer.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentBuffer.join(" ").trim(),
    });
  }
  return sections.length > 0 ? sections : [{ heading: "README", content: readme }];
}

/**
 * 从 GitHub 仓库 URL 拉取元数据 + README，产出与论文流水线兼容的 SourceDocument（type "paper"），
 * 以便复用现有提取与生成逻辑；后续可扩展为 type "github" 与 tree-sitter 分析。
 */
export async function ingestGitHubFromUrl(repoUrl: string): Promise<SourceDocument | null> {
  const meta = await fetchRepoMeta(repoUrl);
  if (!meta) return null;

  const readme = await fetchReadme(repoUrl, meta.defaultBranch);
  const rawText = readme ?? meta.description ?? `${meta.name} (no README)`;
  const sections = readme ? readmeToSections(readme) : [{ heading: "Overview", content: rawText }];
  const slug = slugify(meta.repo);

  return {
    type: "paper",
    url: meta.url,
    slug,
    metadata: {
      title: meta.name,
      authors: [],
      abstract: meta.description ?? rawText.slice(0, 1500),
      sourceUrl: meta.url,
    },
    sections,
    paragraphs: rawText.split(/\n\n+/).filter(Boolean),
    rawText,
    fallbackUsed: false,
  };
}
