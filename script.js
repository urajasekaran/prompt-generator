/*
 * AI Prompt Generator – enhanced logic
 *
 * This script powers a need‑based prompt generator for product managers.
 * Users can describe their need, pick a tone/format/length, and receive
 * a structured prompt tailored to their situation. The library of prompts
 * loaded from prompts.json is still available as a reference for retrieval,
 * but need‑based generation takes priority.
 */

// Container for loaded prompts
let PROMPTS = [];

/**
 * Load prompt definitions from prompts.json. If the file cannot be
 * fetched, PROMPTS remains an empty array.
 */
async function loadPrompts() {
  try {
    const res = await fetch('prompts.json');
    const data = await res.json();
    PROMPTS = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to load prompts:', err);
    PROMPTS = [];
  }
}

/**
 * Normalise a string for comparison by trimming and lowercasing.
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
  return (s || '').toLowerCase().trim();
}

/**
 * Attempt to detect the high‑level intent from the user’s free‑form need.
 * Supported intents: "ooo" (out of office), "status_update", "product_req", "prd", "generic".
 * Extendable by adding new regex patterns.
 * @param {string} need
 * @returns {string}
 */
function detectIntent(need) {
  const n = normalize(need);
  // Out‑of‑office patterns
  if (/\b(ooo|out of office|out-of-office|vacation|leave|out of the office)\b/.test(n)) {
    return 'ooo';
  }
  // Status update / stakeholder update patterns
  if (/\b(stakeholder|update|status|weekly update|progress report)\b/.test(n)) {
    return 'status_update';
  }
  // User story / acceptance criteria patterns
  if (/\b(user story|acceptance criteria|ac|feature request)\b/.test(n)) {
    return 'product_req';
  }
  // Product requirement document patterns
  if (/\b(prd|requirements doc|product requirements)\b/.test(n)) {
    return 'prd';
  }
  return 'generic';
}

/**
 * Build a structured out‑of‑office (OOO) prompt. The generated prompt
 * guides the AI assistant to write an OOO message based on the user’s
 * input with tone/length/format settings. The returned object has a
 * title and text fields.
 * @param {string} need Original user need description
 * @param {string} tone e.g. 'professional', 'friendly', 'direct'
 * @param {string} length e.g. 'short', 'medium', 'detailed'
 * @param {string} format e.g. 'email', 'slack', 'doc'
 * @returns {{title: string, text: string}}
 */
function buildOOOPrompt(need, tone, length, format) {
  return {
    title: 'Generated: Out-of-office message',
    text: `You are an expert communications assistant.\n\n` +
      `Task:\nCreate an out-of-office (OOO) message based on the user’s input.\n\n` +
      `User input:\n"${need}"\n\n` +
      `Requirements:\n` +
      `- Tone: ${tone}\n` +
      `- Length: ${length}\n` +
      `- Channel/format: ${format}\n` +
      `- Include: dates (if mentioned), who to contact for urgent issues, and what the sender will do when back.\n` +
      `- If dates are missing, ask 2 quick questions at the end OR provide 2 variants (with placeholders).\n\n` +
      `Output:\n1) Final OOO message (ready to copy/paste)\n2) Optional: 1 shorter variant`
  };
}

/**
 * Build a generic structured prompt. When the intent is unknown or not
 * explicitly handled, this function creates a flexible prompt that asks
 * clarifying questions only when necessary and includes assumptions.
 * @param {string} need
 * @param {string} tone
 * @param {string} length
 * @param {string} format
 * @returns {{title: string, text: string}}
 */
function buildGenericPrompt(need, tone, length, format) {
  return {
    title: 'Generated: Structured prompt from your need',
    text: `You are a senior Product + Delivery assistant.\n\n` +
      `Goal:\nHelp me with this request:\n"${need}"\n\n` +
      `Instructions:\n` +
      `- Ask up to 3 clarifying questions ONLY if absolutely required. Otherwise proceed with reasonable assumptions (and list them).\n` +
      `- Keep the tone ${tone}.\n` +
      `- Keep the length ${length}.\n` +
      `- Output in ${format} format.\n\n` +
      `Output structure:\n` +
      `1) Assumptions (if any)\n` +
      `2) The main deliverable (fully written)\n` +
      `3) Next steps / checklist`
  };
}

/**
 * Build a placeholder prompt for a status update. You can extend this
 * function to include more detailed guidance tailored to your context.
 * @param {string} need
 * @param {string} tone
 * @param {string} length
 * @param {string} format
 */
function buildStatusUpdatePrompt(need, tone, length, format) {
  return {
    title: 'Generated: Stakeholder status update',
    text: `You are an executive communications assistant.\n\n` +
      `Task:\nCraft a status update based on the user’s input.\n\n` +
      `User input:\n"${need}"\n\n` +
      `Requirements:\n` +
      `- Tone: ${tone}\n` +
      `- Length: ${length}\n` +
      `- Channel/format: ${format}\n` +
      `- Summarise progress, blockers, and next steps clearly.\n` +
      `- Highlight any risks or escalations.\n\n` +
      `Output:\n1) Status update message (ready to send)\n2) Optional: bullet points summarising key takeaways`
  };
}

/**
 * Build a placeholder prompt for user stories / product requirements. Extend
 * as needed for more specialised guidance.
 * @param {string} need
 * @param {string} tone
 * @param {string} length
 * @param {string} format
 */
function buildProductReqPrompt(need, tone, length, format) {
  return {
    title: 'Generated: User story / requirement',
    text: `You are a product discovery assistant.\n\n` +
      `Task:\nCreate a user story or requirement based on the user’s input.\n\n` +
      `User input:\n"${need}"\n\n` +
      `Requirements:\n` +
      `- Tone: ${tone}\n` +
      `- Length: ${length}\n` +
      `- Channel/format: ${format}\n` +
      `- Use the template: “As a [persona], I want [need] so that [reason]”.\n` +
      `- Define acceptance criteria clearly.\n\n` +
      `Output:\n1) User story statement\n2) Acceptance criteria (bulleted)`
  };
}

function buildPrdPrompt(need, tone, length, format) {
  return {
    title: 'Generated: Product Requirements Document (PRD)',
    text: `You are a product strategy assistant.\n\n` +
      `Task:\nDraft a Product Requirements Document (PRD) based on the user’s input.\n\n` +
      `User input:\n"${need}"\n\n` +
      `Requirements:\n` +
      `- Tone: ${tone}\n` +
      `- Length: ${length}\n` +
      `- Channel/format: ${format}\n` +
      `- Include sections: Problem statement, Goals, Scope (in/out), User stories, Success metrics, Risks.\n` +
      `- Summarise stakeholders and timeline if applicable.\n\n` +
      `Output:\n1) PRD outline\n2) Checklist of next steps`
  };
}

function bestLibraryMatch(need) {
  const q = normalize(need);
  if (!q || !PROMPTS.length) return null;
  const tokens = q.split(/\s+/).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const p of PROMPTS) {
    const hay = normalize(`${p.title || ''} ${p.instruction || ''} ${p.output || ''}`);
    let score = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore > 0 ? best : null;
}

function formatLibraryPrompt(p) {
  return (
    `Instruction:\n${p.instruction || ''}\n\n` +
    `Inputs:\n${p.inputs || ''}\n\n` +
    `Output:\n${p.output || ''}\n\n` +
    `Success criteria:\n${p.success_criteria || ''}\n\n` +
    `Follow-up:\n${p.follow_up || ''}`
  );
}

function renderResult(title, text) {
  const result = document.getElementById('result');
  const titleEl = document.getElementById('promptTitle');
  const textEl = document.getElementById('promptText');
  const copyBtn = document.getElementById('copyBtn');
  titleEl.textContent = title;
  textEl.textContent = text;
  result.style.display = 'block';
  copyBtn.disabled = false;
}

async function main() {
  await loadPrompts();

  const generateFromNeedBtn = document.getElementById('generateFromNeedBtn');
  const generateFromLibraryBtn = document.getElementById('generateFromLibraryBtn');
  const copyBtn = document.getElementById('copyBtn');

  generateFromNeedBtn.addEventListener('click', () => {
    const need = document.getElementById('needInput').value.trim();
    const tone = document.getElementById('tone').value;
    const length = document.getElementById('length').value;
    const format = document.getElementById('format').value;
    if (!need) {
      renderResult('Tell me what you need', 'Type a short description above (e.g., “Generate an OOO message for next week...” ).');
      return;
    }
    const intent = detectIntent(need);
    let generated;
    switch (intent) {
      case 'ooo':
        generated = buildOOOPrompt(need, tone, length, format);
        break;
      case 'status_update':
        generated = buildStatusUpdatePrompt(need, tone, length, format);
        break;
      case 'product_req':
        generated = buildProductReqPrompt(need, tone, length, format);
        break;
      case 'prd':
        generated = buildPrdPrompt(need, tone, length, format);
        break;
      default:
        generated = buildGenericPrompt(need, tone, length, format);
        break;
    }
    renderResult(generated.title, generated.text);
  });

  generateFromLibraryBtn.addEventListener('click', () => {
    const need = document.getElementById('needInput').value.trim();
    const match = bestLibraryMatch(need);
    if (!match) {
      renderResult('No library match found', 'I couldn’t find a close match in the current prompt library. Use “Generate from my need” instead.');
      return;
    }
    renderResult(match.title || 'Library Prompt', formatLibraryPrompt(match));
  });

  copyBtn.addEventListener('click', async () => {
    const text = document.getElementById('promptText').textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 900);
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  });
}

// Run main once DOM is ready
document.addEventListener('DOMContentLoaded', main);
