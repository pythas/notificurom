import { Ingestor, NormalizedItem, TaskSourceType } from '../types';
import { getAppConfig } from '../config';

interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
}

interface GitHubSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  state_reason?: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: GitHubUser;
  labels: GitHubLabel[];
  assignees?: GitHubUser[];
  pull_request?: {
    url: string;
    html_url: string;
    merged_at?: string | null;
  };
  repository_url: string;
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchItem[];
}

export class GitHubIngestor implements Ingestor {
  readonly name = 'github';

  async isEnabled(): Promise<boolean> {
    const config = await getAppConfig();
    return Boolean(config.githubPat && config.githubPat.trim().length > 0);
  }

  private extractRepoFromUrl(htmlUrl: string, repositoryUrl: string): string {
    try {
      const parsed = new URL(htmlUrl);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    } catch {
      // fallback to repository_url
    }

    const match = repositoryUrl.match(/repos\/([^/]+\/[^/]+)/);
    return match ? match[1] : 'unknown/repo';
  }

  private determineSourceType(item: GitHubSearchItem, query: string): TaskSourceType {
    if (item.pull_request) {
      if (query.includes('review-requested')) {
        return 'review_request';
      }
      return 'pr';
    }
    return 'issue';
  }

  async fetchItems(): Promise<NormalizedItem[]> {
    const config = await getAppConfig();
    if (!config.githubPat) {
      return [];
    }

    const itemsMap = new Map<string, NormalizedItem>();

    for (const query of config.githubQueries) {
      if (!query.trim()) continue;

      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${config.githubPat.trim()}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Notificurom-GTD-App',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `GitHub API error (${response.status} ${response.statusText}): ${errorText}`
        );
      }

      const data = (await response.json()) as GitHubSearchResponse;

      for (const item of data.items || []) {
        const repo = this.extractRepoFromUrl(item.html_url, item.repository_url);
        const sourceId = `github:${repo}#${item.number}`;
        const sourceType = this.determineSourceType(item, query);

        // If item is already seen in a previous query (e.g. both assigned & review-requested), preserve or merge
        if (!itemsMap.has(sourceId)) {
          itemsMap.set(sourceId, {
            source: this.name,
            sourceType,
            sourceId,
            title: item.title,
            url: item.html_url,
            repository: repo,
            author: item.user?.login || 'unknown',
            authorAvatarUrl: item.user?.avatar_url || '',
            isClosed: item.state === 'closed',
            sourceCreatedAt: item.created_at,
            sourceUpdatedAt: item.updated_at,
            metadata: {
              number: item.number,
              state: item.state,
              stateReason: item.state_reason,
              isPullRequest: Boolean(item.pull_request),
              labels: (item.labels || []).map((l) => ({
                name: l.name,
                color: l.color,
                description: l.description,
              })),
              assignees: (item.assignees || []).map((a) => a.login),
            },
          });
        }
      }
    }

    return Array.from(itemsMap.values());
  }

  // Helper method to check status of tracked GitHub items to detect closed/merged state
  async checkItemsStatus(sourceIds: string[]): Promise<Map<string, { isClosed: boolean; title?: string }>> {
    const config = await getAppConfig();
    const result = new Map<string, { isClosed: boolean; title?: string }>();
    if (!config.githubPat || sourceIds.length === 0) return result;

    // Filter github sourceIds: format `github:owner/repo#123`
    const githubItems = sourceIds
      .map((id) => {
        const match = id.match(/^github:([^/]+)\/([^#]+)#(\d+)$/);
        return match ? { sourceId: id, owner: match[1], repo: match[2], number: parseInt(match[3], 10) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Batch query issues or check individual endpoints if small batch
    // Using search query with issue numbers or repo is effective
    // For small batches, we can fetch repo issue endpoint or search
    for (const item of githubItems.slice(0, 50)) {
      try {
        const res = await fetch(`https://api.github.com/repos/${item.owner}/${item.repo}/issues/${item.number}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${config.githubPat.trim()}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Notificurom-GTD-App',
          },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          result.set(item.sourceId, {
            isClosed: data.state === 'closed',
            title: data.title,
          });
        }
      } catch {
        // ignore individual item check failure
      }
    }

    return result;
  }
}
