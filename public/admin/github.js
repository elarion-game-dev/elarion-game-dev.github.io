// Minimal GitHub REST client for the admin page. The token is sent only to api.github.com.

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends Error {}

function decodeBase64Utf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export class GitHub {
  constructor({ token, owner, repo, branch }) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  get base() {
    return `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`;
  }

  async request(path, { method = 'GET', body } = {}) {
    const response = await fetch(API + path, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new GitHubError(response.status, data.message || response.statusText || 'Request failed');
    }
    return response.status === 204 ? null : response.json();
  }

  user() {
    return this.request('/user');
  }

  repository() {
    return this.request(this.base);
  }

  async readFile(path, ref = this.branch) {
    const data = await this.request(`${this.base}/contents/${path}?ref=${encodeURIComponent(ref)}`);
    return { sha: data.sha, text: decodeBase64Utf8(data.content) };
  }

  /**
   * Commit several files at once (one commit = one deploy).
   * files: [{ path, content, encoding: 'utf-8' | 'base64' }]
   * expect: { path, sha } aborts with ConflictError if that file changed since it was loaded.
   * Returns { commit, blobs } where blobs maps path -> blob sha.
   */
  async commit({ message, files, expect }) {
    const ref = await this.request(`${this.base}/git/ref/heads/${encodeURIComponent(this.branch)}`);
    const headSha = ref.object.sha;
    const head = await this.request(`${this.base}/git/commits/${headSha}`);

    if (expect) {
      const current = await this.request(`${this.base}/contents/${expect.path}?ref=${headSha}`).catch((error) => {
        if (error.status === 404) return { sha: null };
        throw error;
      });
      if (current.sha !== expect.sha) throw new ConflictError('The settings changed on GitHub since you loaded them.');
    }

    const blobs = {};
    const tree = [];
    for (const file of files) {
      const blob = await this.request(`${this.base}/git/blobs`, { method: 'POST', body: { content: file.content, encoding: file.encoding } });
      blobs[file.path] = blob.sha;
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await this.request(`${this.base}/git/trees`, { method: 'POST', body: { base_tree: head.tree.sha, tree } });
    const commit = await this.request(`${this.base}/git/commits`, { method: 'POST', body: { message, tree: newTree.sha, parents: [headSha] } });
    try {
      await this.request(`${this.base}/git/refs/heads/${encodeURIComponent(this.branch)}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
    } catch (error) {
      if (error.status === 422) throw new ConflictError('Someone else published at the same moment. Try again.');
      throw error;
    }
    return { commit, blobs };
  }

  history(path, perPage = 25) {
    return this.request(`${this.base}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(this.branch)}&per_page=${perPage}`);
  }

  async latestRun(sha) {
    const query = sha ? `head_sha=${sha}&per_page=1` : `branch=${encodeURIComponent(this.branch)}&per_page=1`;
    const data = await this.request(`${this.base}/actions/runs?${query}`);
    return data.workflow_runs?.[0] ?? null;
  }
}
