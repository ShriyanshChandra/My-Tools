/**
 * OSINT Intelligence & Reconnaissance Engine
 * Provides structured dork generation, alias permutations, email matrices,
 * Gravatar verification, and Gemini AI reconnaissance synthesis.
 */

// Simple SHA-256 helper for client-side hashing (WebCrypto)
export async function sha256Hash(text) {
  const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate alias and username permutations from a full name
export function generateUsernamePermutations(fullName, company = '') {
  if (!fullName || typeof fullName !== 'string') return [];
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];

  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const initial = first[0] || '';
  const lastInitial = last ? last[0] : '';
  const comp = company ? company.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  const list = new Set();
  list.add(first);
  if (last) {
    list.add(`${first}${last}`);
    list.add(`${first}.${last}`);
    list.add(`${first}_${last}`);
    list.add(`${first}-${last}`);
    list.add(`${initial}${last}`);
    list.add(`${initial}.${last}`);
    list.add(`${initial}_${last}`);
    list.add(`${last}${first}`);
    list.add(`${last}.${first}`);
    list.add(`${last}${initial}`);
    list.add(`${first}${lastInitial}`);
  }

  if (comp) {
    list.add(`${first}_${comp}`);
    if (last) {
      list.add(`${first}.${last}_${comp}`);
      list.add(`${initial}${last}_${comp}`);
    }
  }

  return Array.from(list);
}

// Generate corporate/domain email permutations
export function generateEmailPermutations(fullName, domain = '') {
  if (!fullName || !domain) return [];
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const initial = first[0] || '';

  const emails = [];
  if (last) {
    emails.push(`${first}.${last}@${cleanDomain}`);
    emails.push(`${first}@${cleanDomain}`);
    emails.push(`${initial}${last}@${cleanDomain}`);
    emails.push(`${first}${last}@${cleanDomain}`);
    emails.push(`${last}.${first}@${cleanDomain}`);
    emails.push(`${first}_${last}@${cleanDomain}`);
    emails.push(`${initial}.${last}@${cleanDomain}`);
  } else {
    emails.push(`${first}@${cleanDomain}`);
    emails.push(`contact@${cleanDomain}`);
    emails.push(`info@${cleanDomain}`);
  }

  return emails;
}

// Check Gravatar profile availability
export async function checkGravatar(email) {
  if (!email || !email.includes('@')) return { exists: false, avatarUrl: null, hash: null };
  try {
    const hash = await sha256Hash(email);
    const avatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
    
    // We test image availability using Image loading in browser
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ exists: true, avatarUrl, hash });
      img.onerror = () => resolve({ exists: false, avatarUrl: null, hash });
      img.src = avatarUrl;
    });
  } catch {
    return { exists: false, avatarUrl: null, hash: null };
  }
}

// Platforms directory for Username Scanner
export const OSINT_PLATFORMS = [
  { name: 'GitHub', category: 'Dev', url: 'https://github.com/{u}', checkUrl: 'https://github.com/{u}' },
  { name: 'Twitter / X', category: 'Social', url: 'https://x.com/{u}' },
  { name: 'LinkedIn', category: 'Professional', url: 'https://www.linkedin.com/in/{u}' },
  { name: 'Reddit', category: 'Social', url: 'https://www.reddit.com/user/{u}' },
  { name: 'Instagram', category: 'Social', url: 'https://www.instagram.com/{u}' },
  { name: 'YouTube', category: 'Media', url: 'https://www.youtube.com/@{u}' },
  { name: 'TikTok', category: 'Social', url: 'https://www.tiktok.com/@{u}' },
  { name: 'Medium', category: 'Blogs', url: 'https://medium.com/@{u}' },
  { name: 'Dev.to', category: 'Dev', url: 'https://dev.to/{u}' },
  { name: 'ProductHunt', category: 'Tech', url: 'https://www.producthunt.com/@{u}' },
  { name: 'Pinterest', category: 'Media', url: 'https://www.pinterest.com/{u}' },
  { name: 'GitLab', category: 'Dev', url: 'https://gitlab.com/{u}' },
  { name: 'StackOverflow', category: 'Dev', url: 'https://stackoverflow.com/users/{u}' },
  { name: 'Twitch', category: 'Media', url: 'https://twitch.tv/{u}' },
  { name: 'Steam', category: 'Gaming', url: 'https://steamcommunity.com/id/{u}' },
  { name: 'SoundCloud', category: 'Audio', url: 'https://soundcloud.com/{u}' },
  { name: 'Spotify', category: 'Audio', url: 'https://open.spotify.com/user/{u}' },
  { name: 'Telegram', category: 'Chat', url: 'https://t.me/{u}' },
  { name: 'Mastodon', category: 'Social', url: 'https://mastodon.social/@{u}' },
  { name: 'Threads', category: 'Social', url: 'https://www.threads.net/@{u}' },
  { name: 'Substack', category: 'Blogs', url: 'https://{u}.substack.com' },
  { name: 'Kaggle', category: 'Data', url: 'https://www.kaggle.com/{u}' },
  { name: 'LeetCode', category: 'Dev', url: 'https://leetcode.com/{u}' },
  { name: 'Keybase', category: 'Security', url: 'https://keybase.io/{u}' },
  { name: 'HackerOne', category: 'Security', url: 'https://hackerone.com/{u}' },
  { name: 'Bugcrowd', category: 'Security', url: 'https://bugcrowd.com/{u}' },
  { name: 'Behance', category: 'Design', url: 'https://www.behance.net/{u}' },
  { name: 'Dribbble', category: 'Design', url: 'https://dribbble.com/{u}' }
];

// Generate Google Dork & Targeted Pivot Matrix
export function generateDorkMatrix(target) {
  const {
    fullName = '',
    username = '',
    email = '',
    phone = '',
    location = '',
    company = '',
    domain = '',
    tags = ''
  } = target;

  const cleanName = fullName.trim();
  const nameQuery = `"${cleanName}"`;
  const userQuery = username ? `"${username.trim()}"` : '';
  const emailQuery = email ? `"${email.trim()}"` : '';
  const phoneQuery = phone ? `"${phone.trim()}"` : '';
  const locQuery = location ? `"${location.trim()}"` : '';
  const compQuery = company ? `"${company.trim()}"` : '';
  const domQuery = domain ? domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : '';

  const buildGoogleUrl = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const buildBingUrl = (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
  const buildDDGUrl = (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
  const buildYandexUrl = (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`;

  const matrix = [];

  // --- 1. Social & Professional Networks ---
  matrix.push({
    category: 'social',
    title: 'LinkedIn Profiles',
    query: `site:linkedin.com/in/ ${nameQuery}${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}`,
    description: 'Finds matching LinkedIn professional profiles and career history.',
    url: buildGoogleUrl(`site:linkedin.com/in/ ${nameQuery}${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}`)
  });

  matrix.push({
    category: 'social',
    title: 'Twitter / X Presence',
    query: `site:twitter.com OR site:x.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`,
    description: 'Searches for official or personal Twitter/X handles and public tweets.',
    url: buildGoogleUrl(`site:twitter.com OR site:x.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`)
  });

  matrix.push({
    category: 'social',
    title: 'GitHub User & Organization',
    query: `site:github.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`,
    description: 'Discovers open-source repositories, developer activity, and pull requests.',
    url: buildGoogleUrl(`site:github.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`)
  });

  matrix.push({
    category: 'social',
    title: 'Reddit User & Comment Mentions',
    query: `site:reddit.com ${nameQuery}${userQuery ? ` OR "user/${username.trim()}"` : ''}`,
    description: 'Identifies Reddit user profiles, community discussions, and threads.',
    url: buildGoogleUrl(`site:reddit.com ${nameQuery}${userQuery ? ` OR "user/${username.trim()}"` : ''}`)
  });

  matrix.push({
    category: 'social',
    title: 'Instagram & Facebook Personas',
    query: `site:instagram.com OR site:facebook.com ${nameQuery}${locQuery ? ` ${locQuery}` : ''}`,
    description: 'Scans for public consumer social media profiles and tagged media.',
    url: buildGoogleUrl(`site:instagram.com OR site:facebook.com ${nameQuery}${locQuery ? ` ${locQuery}` : ''}`)
  });

  matrix.push({
    category: 'social',
    title: 'Medium & Substack Publications',
    query: `site:medium.com OR site:substack.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`,
    description: 'Finds personal articles, newsletters, and authored thought pieces.',
    url: buildGoogleUrl(`site:medium.com OR site:substack.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`)
  });

  matrix.push({
    category: 'social',
    title: 'Telegram & Messaging Channels',
    query: `site:t.me ${nameQuery}${userQuery ? ` OR "${username.trim()}"` : ''}`,
    description: 'Finds public Telegram channels, group links, and username bios.',
    url: buildGoogleUrl(`site:t.me ${nameQuery}${userQuery ? ` OR "${username.trim()}"` : ''}`)
  });

  // --- 2. Developer & Technical Footprint ---
  matrix.push({
    category: 'developer',
    title: 'Commit Author & Git Emails',
    query: `site:github.com ${nameQuery} ${emailQuery || '"@"'}${compQuery ? ` ${compQuery}` : ''}`,
    description: 'Locates commit author signatures, commit logs, and repository contributions.',
    url: buildGoogleUrl(`site:github.com ${nameQuery} ${emailQuery || '"@"'}${compQuery ? ` ${compQuery}` : ''}`)
  });

  matrix.push({
    category: 'developer',
    title: 'StackOverflow & StackExchange',
    query: `site:stackoverflow.com/users OR site:stackexchange.com/users ${nameQuery}`,
    description: 'Finds Q&A accounts, technical domain expertise, and reputation.',
    url: buildGoogleUrl(`site:stackoverflow.com/users OR site:stackexchange.com/users ${nameQuery}`)
  });

  matrix.push({
    category: 'developer',
    title: 'Package Registries (npm, PyPI, Crates, Docker)',
    query: `(site:npmjs.com/~ OR site:pypi.org/user/ OR site:hub.docker.com/u/) ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`,
    description: 'Finds published software packages, npm modules, and Docker containers.',
    url: buildGoogleUrl(`(site:npmjs.com/~ OR site:pypi.org/user/ OR site:hub.docker.com/u/) ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`)
  });

  matrix.push({
    category: 'developer',
    title: 'Hacker News Mentions',
    query: `site:news.ycombinator.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`,
    description: 'Searches Hacker News submissions, comments, and project launches.',
    url: buildGoogleUrl(`site:news.ycombinator.com ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}`)
  });

  // --- 3. Documents, Resumes & Public Files ---
  matrix.push({
    category: 'documents',
    title: 'Public PDF Files (Resumes, CVs, Papers)',
    query: `${nameQuery} filetype:pdf${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}`,
    description: 'Locates published PDFs, conference speaker slides, resumes, and whitepapers.',
    url: buildGoogleUrl(`${nameQuery} filetype:pdf${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}`)
  });

  matrix.push({
    category: 'documents',
    title: 'Office Documents & Spreadsheets (DOC, XLS, PPT)',
    query: `${nameQuery} (filetype:docx OR filetype:xlsx OR filetype:pptx OR filetype:csv)`,
    description: 'Searches public spreadsheets, attendance sheets, project logs, and slide decks.',
    url: buildGoogleUrl(`${nameQuery} (filetype:docx OR filetype:xlsx OR filetype:pptx OR filetype:csv)`)
  });

  matrix.push({
    category: 'documents',
    title: 'Conference Presentations & SlideShare',
    query: `site:slideshare.net OR site:speakerdeck.com ${nameQuery}`,
    description: 'Finds public talks, slide decks, tech presentations, and keynote records.',
    url: buildGoogleUrl(`site:slideshare.net OR site:speakerdeck.com ${nameQuery}`)
  });

  // --- 4. Breach, Paste & Archive Checks ---
  if (phoneQuery) {
    matrix.push({
      category: 'breach_pastes',
      title: 'Phone Number Public Footprint & Lookups',
      query: `${phoneQuery} OR "${phone.trim().replace(/[^0-9]/g, '')}"${nameQuery ? ` ${nameQuery}` : ''}`,
      description: 'Scans for public documents, forum posts, and directories citing this phone number.',
      url: buildGoogleUrl(`${phoneQuery} OR "${phone.trim().replace(/[^0-9]/g, '')}"${nameQuery ? ` ${nameQuery}` : ''}`)
    });
  }

  matrix.push({
    category: 'breach_pastes',
    title: 'Pastebin & Code Dumps',
    query: `(site:pastebin.com OR site:ghostbin.com OR site:justpaste.it OR site:controlc.com) ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}${emailQuery ? ` OR ${emailQuery}` : ''}${tags ? ` ${tags}` : ''}`,
    description: 'Scans text paste dumps, configuration snippets, and shared code.',
    url: buildGoogleUrl(`(site:pastebin.com OR site:ghostbin.com OR site:justpaste.it OR site:controlc.com) ${nameQuery}${userQuery ? ` OR ${userQuery}` : ''}${emailQuery ? ` OR ${emailQuery}` : ''}${tags ? ` ${tags}` : ''}`)
  });

  if (email) {
    matrix.push({
      category: 'breach_pastes',
      title: 'HaveIBeenPwned Exposure Lookup',
      query: `Direct Breach & Paste database cross-reference for ${email}`,
      description: 'Checks if this email address appears in known publicly exposed data breaches.',
      url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`
    });
  }

  // --- 5. Corporate, Legal & Academic Registries ---
  matrix.push({
    category: 'business',
    title: 'OpenCorporates & Company Filings',
    query: `site:opencorporates.com ${nameQuery}${compQuery ? ` ${compQuery}` : ''}`,
    description: 'Checks incorporation records, officer listings, and directorships.',
    url: buildGoogleUrl(`site:opencorporates.com ${nameQuery}${compQuery ? ` ${compQuery}` : ''}`)
  });

  matrix.push({
    category: 'business',
    title: 'Crunchbase Executive Profile',
    query: `site:crunchbase.com/person ${nameQuery}`,
    description: 'Finds startup investments, executive board memberships, and venture roles.',
    url: buildGoogleUrl(`site:crunchbase.com/person ${nameQuery}`)
  });

  matrix.push({
    category: 'business',
    title: 'Google Patents & Inventions',
    query: `site:patents.google.com ${nameQuery}`,
    description: 'Discovers patents, inventors, assignee companies, and technical claims.',
    url: `https://patents.google.com/?inventor=${encodeURIComponent(cleanName)}`
  });

  matrix.push({
    category: 'business',
    title: 'Google Scholar Academic Citations',
    query: `site:scholar.google.com/citations ${nameQuery}`,
    description: 'Finds academic citations, peer-reviewed publications, and university labs.',
    url: `https://scholar.google.com/scholar?q=${encodeURIComponent(cleanName)}`
  });

  matrix.push({
    category: 'business',
    title: 'SEC EDGAR Executive Filings',
    query: `site:sec.gov ${nameQuery}`,
    description: 'Searches public company SEC filings (Form 4, 10-K, 8-K insider records).',
    url: buildGoogleUrl(`site:sec.gov ${nameQuery}`)
  });

  // --- 6. Domain & Infrastructure (if domain or email provided) ---
  if (domQuery) {
    matrix.push({
      category: 'infrastructure',
      title: 'Wayback Machine Domain Archive',
      query: `Historical web snapshots of ${domQuery}`,
      description: 'Navigates historical versions and deleted pages on the target domain.',
      url: `https://web.archive.org/web/*/${encodeURIComponent(domQuery)}`
    });

    matrix.push({
      category: 'infrastructure',
      title: 'WHOIS & Registrar Lookup',
      query: `WHOIS ownership data for ${domQuery}`,
      description: 'Checks domain creation date, registrant name, name servers, and DNS.',
      url: `https://www.whois.com/whois/${encodeURIComponent(domQuery)}`
    });

    matrix.push({
      category: 'infrastructure',
      title: 'DNSDumpster Subdomain Enumeration',
      query: `Subdomains & DNS topology for ${domQuery}`,
      description: 'Discovers exposed hostnames, mail servers, and server IP blocks.',
      url: `https://dnsdumpster.com`
    });

    matrix.push({
      category: 'infrastructure',
      title: 'SecurityTrails DNS History',
      query: `Historical DNS and IP changes for ${domQuery}`,
      description: 'Tracks historical A, MX, and NS record changes over time.',
      url: `https://securitytrails.com/domain/${encodeURIComponent(domQuery)}/dns`
    });
  }

  // --- 7. Search Engines Pivots ---
  matrix.push({
    category: 'search_engines',
    title: 'DuckDuckGo Privacy Pivot',
    query: `${nameQuery}${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}${userQuery ? ` ${userQuery}` : ''}`,
    description: 'Non-personalized search engine results without tracking bubbles.',
    url: buildDDGUrl(`${nameQuery}${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}${userQuery ? ` ${userQuery}` : ''}`)
  });

  matrix.push({
    category: 'search_engines',
    title: 'Bing Cross-Engine Index',
    query: `${nameQuery}${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}`,
    description: 'Cross-verifies indexed pages from Microsoft Bing algorithm.',
    url: buildBingUrl(`${nameQuery}${compQuery ? ` ${compQuery}` : ''}${locQuery ? ` ${locQuery}` : ''}`)
  });

  matrix.push({
    category: 'search_engines',
    title: 'Yandex International Index',
    query: `${nameQuery}${compQuery ? ` ${compQuery}` : ''}`,
    description: 'Alternative index powerful for non-US records and domain references.',
    url: buildYandexUrl(`${nameQuery}${compQuery ? ` ${compQuery}` : ''}`)
  });

  return matrix;
}

// Gemini AI Reconnaissance Synthesis Function
export async function analyzeWithGemini(targetData, customApiKey = '', modelChoice = (import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.7-flash')) {
  const {
    fullName,
    username = '',
    email = '',
    phone = '',
    location = '',
    company = '',
    domain = '',
    tags = ''
  } = targetData;

  if (!fullName || !fullName.trim()) {
    throw new Error('Target Full Name is required.');
  }

  // 1. First attempt via Backend API endpoint (/api/osint/analyze)
  try {
    const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
    const endpoint = remoteBackend ? `${remoteBackend}/api/osint/analyze` : '/api/osint/analyze';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customApiKey ? { 'x-gemini-key': customApiKey } : {})
      },
      body: JSON.stringify({
        fullName,
        username,
        email,
        phone,
        location,
        company,
        domain,
        tags,
        customApiKey,
        model: modelChoice
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.result) {
        return data.result;
      }
      if (data.message) {
        throw new Error(data.message);
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (errJson.message && !errJson.message.includes('404')) {
        throw new Error(errJson.message);
      }
    }
  } catch (backendErr) {
    // If backend isn't available or errored, proceed to direct client fallback
    if (!customApiKey && !import.meta.env.VITE_GOOGLE_API_KEY) {
      throw new Error(backendErr.message || 'Gemini API key is required. Enter your API key in the tool settings.');
    }
  }

  // 2. Client-side fallback using direct Google Gemini REST API
  const activeKey = customApiKey || import.meta.env.VITE_GOOGLE_API_KEY;
  if (!activeKey) {
    throw new Error('Please enter a Google Gemini API Key in the OSINT settings to enable AI Reconnaissance.');
  }

  const prompt = `You are a cybersecurity expert and seasoned OSINT Intelligence Analyst. Conduct a structured open-source intelligence analysis and footprint hypothesis for the following individual based on public indicators.

TARGET INDICATORS:
- Full Name: ${fullName}
- Known Username / Alias: ${username || 'Not provided'}
- Known Email: ${email || 'Not provided'}
- Known Phone: ${phone || 'Not provided'}
- Location: ${location || 'Not provided'}
- Organization / Company: ${company || 'Not provided'}
- Associated Domain / Website: ${domain || 'Not provided'}
- Known Context / Tags: ${tags || 'None'}

Please provide your analysis in valid JSON format matching this exact structure:
{
  "summary": "Concise 2-3 sentence executive intelligence summary of this persona profile",
  "potentialAliases": ["alias1", "alias2", "alias3"],
  "emailPermutations": ["email1@domain.com", "email2@domain.com"],
  "highProbabilityFootprints": [
    {
      "platform": "Platform Name (e.g. LinkedIn, GitHub, Crunchbase)",
      "category": "Professional | Developer | Social | Registry",
      "rationale": "Why this entity is likely present here",
      "targetedDork": "exact google search query"
    }
  ],
  "investigativePivots": [
    "Step 1: Check professional affiliations...",
    "Step 2: Cross-reference code commits...",
    "Step 3: Verify domain registration..."
  ],
  "corroborationChecklist": [
    "Verify avatar matching across accounts",
    "Cross-reference location timestamps",
    "Confirm mutual connections on professional networks"
  ],
  "graphNodes": [
    {"id": "person_root", "label": "${fullName}", "type": "person", "details": "Target individual"},
    {"id": "node_company", "label": "${company || 'Org'}", "type": "company", "details": "Affiliated Organization"}
  ],
  "graphLinks": [
    {"source": "person_root", "target": "node_company", "relationship": "Affiliated"}
  ],
  "rawAnalysisMarkdown": "# Detailed OSINT Persona Dossier\\n\\n### Executive Assessment\\n..."
}

Ensure all JSON strings are properly escaped. Do not output markdown code blocks around the JSON if possible, or use standard \`\`\`json block.`;

  const selectedModel = modelChoice || import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.7-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${encodeURIComponent(activeKey)}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Gemini API request failed with status ${response.status}`;
    throw new Error(message);
  }

  const responseData = await response.json();
  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!rawText) {
    throw new Error('Empty response received from Gemini API.');
  }

  try {
    const cleaned = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // If strict JSON parsing fails, construct fallback structure
    return {
      summary: `OSINT Intelligence reconnaissance profile generated for ${fullName}.`,
      potentialAliases: generateUsernamePermutations(fullName, company),
      emailPermutations: domain ? generateEmailPermutations(fullName, domain) : [],
      highProbabilityFootprints: [],
      investigativePivots: [
        'Inspect verified LinkedIn and GitHub footprints',
        'Verify document metadata and PDF speaker lists',
        'Cross-reference domain WHOIS history'
      ],
      corroborationChecklist: [
        'Verify profile pictures via reverse image lookup',
        'Corroborate geographic location consistency'
      ],
      graphNodes: [
        { id: 'person_root', label: fullName, type: 'person', details: 'Target Individual' }
      ],
      graphLinks: [],
      rawAnalysisMarkdown: rawText
    };
  }
}

// Markdown Dossier Exporter
export function exportDossierMarkdown(targetData, dorks = [], aiResult = null) {
  const date = new Date().toISOString().split('T')[0];
  let md = `# OSINT INVESTIGATION DOSSIER
**Generated on:** ${date}
**Tool:** My Tools OSINT Investigator
**Classification:** Open Source Intelligence (Defensive Reconnaissance)

---

## 1. Target Identity Indicators
- **Full Name:** ${targetData.fullName}
- **Username / Alias:** ${targetData.username || 'N/A'}
- **Email Address:** ${targetData.email || 'N/A'}
- **Phone Number:** ${targetData.phone || 'N/A'}
- **Location:** ${targetData.location || 'N/A'}
- **Company / Organization:** ${targetData.company || 'N/A'}
- **Domain / Website:** ${targetData.domain || 'N/A'}
- **Keywords / Focus:** ${targetData.tags || 'N/A'}

---
`;

  if (aiResult) {
    md += `## 2. AI Reconnaissance Assessment & Hypotheses
### Executive Summary
${aiResult.summary || 'N/A'}

### Probable Username & Handle Permutations
${(aiResult.potentialAliases || []).map(a => `- \`${a}\``).join('\n') || '- None recorded'}

### Probable Corporate / Personal Email Variations
${(aiResult.emailPermutations || []).map(e => `- \`${e}\``).join('\n') || '- None recorded'}

### High-Probability Public Footprint Points
${(aiResult.highProbabilityFootprints || []).map(f => `#### ${f.platform} (${f.category})
- **Rationale:** ${f.rationale}
- **Targeted Dork:** \`${f.targetedDork}\`
`).join('\n') || 'None recorded'}

### Investigative Pivots
${(aiResult.investigativePivots || []).map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None recorded'}

### Corroboration & Attribution Checklist
${(aiResult.corroborationChecklist || []).map(c => `- [ ] ${c}`).join('\n') || 'None recorded'}

---
`;
  }

  md += `## 3. Targeted Google Dorks & Investigation Query Matrix
| Platform / Target | Category | Search Query String |
| :--- | :--- | :--- |
${dorks.map(d => `| **${d.title}** | ${d.category} | \`${d.query.replace(/\|/g, '\\|')}\` |`).join('\n')}

---

## 4. OPSEC & Ethical Guidelines
- All searches in this dossier are performed using publicly accessible search engine indexes and open-source registries.
- Verify identities across multiple independent data points before making definitive attributions.
`;

  return md;
}

// JSON Exporter
export function exportDossierJSON(targetData, dorks = [], aiResult = null, customNotes = '') {
  return JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      tool: 'My Tools - OSINT Investigator',
      version: '1.0'
    },
    target: targetData,
    aiReconnaissance: aiResult,
    dorkMatrix: dorks,
    customNotes
  }, null, 2);
}

// Open Single URL with Incognito / Private Window Priority
export async function openUrlIncognito(url, isIncognito = true) {
  if (!url) return;

  if (isIncognito) {
    try {
      const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      const endpoint = remoteBackend ? `${remoteBackend}/api/osint/open-incognito` : '/api/osint/open-incognito';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) return true;
      }
    } catch {
      // Backend unavailable; proceed to client popup
    }
  }

  // Client-side fallback
  window.open(url, '_blank', 'noreferrer,noopener');
  return false;
}

// Open Multiple URLs in Incognito
export async function openMultipleUrlsIncognito(urls = [], isIncognito = true) {
  if (!urls || !urls.length) return;

  if (isIncognito) {
    try {
      const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      const endpoint = remoteBackend ? `${remoteBackend}/api/osint/open-incognito` : '/api/osint/open-incognito';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) return true;
      }
    } catch {
      // Backend unavailable; fallback
    }
  }

  // Fallback
  urls.forEach(u => window.open(u, '_blank', 'noreferrer,noopener'));
  return false;
}
