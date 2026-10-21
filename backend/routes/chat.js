'use strict';
// Note: requires Node.js 18+ for native fetch (used for Gemini API call).
const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/auth');

const SYSTEM_INSTRUCTION = `You are ProofBox Legal Assistant - a knowledgeable but strictly scoped legal information assistant for ProofBox, a legal evidence organiser platform used by ordinary people in India.

STRICT SCOPE - you ONLY discuss:
- Evidence collection, preservation and documentation best practices
- Dispute types: tenant/landlord, freelancer payment, consumer rights, employment disputes
- Legal procedures in India: consumer forums, RERA, labour courts, civil courts
- How to write demand notices and formal letters
- What makes evidence admissible or credible
- How to use ProofBox features (case creation, exhibit upload, timeline, export, gap analysis)
- General Indian legal rights for consumers, tenants and workers

OUT OF SCOPE - politely decline and redirect:
- Criminal law, family law, immigration, tax, company law
- Specific legal strategy or representation
- Anything unrelated to evidence / dispute resolution

RULES:
1. Never claim to be a lawyer or establish an attorney-client relationship.
2. Keep responses under 280 words unless user explicitly asks for more.
3. Be warm, plain-language, and practical - users are ordinary people, not lawyers.
4. Use Indian Rupee (Rs.) for financial amounts.
5. When relevant, suggest the specific ProofBox feature that helps.
6. Always end legal-process answers with a one-line disclaimer.

ProofBox features available:
- Case Manager: create and track multiple dispute cases
- Evidence Timeline: chronological exhibit log with Bates numbers
- Add Evidence: upload files, paste WhatsApp chats, log verbal notes
- Document Vault: all uploaded files with SHA-256 integrity hashes
- Damages and Claims: financial claim tracker
- Evidence Pack Export: ZIP archive with manifest for court / lawyers
- Formal Demand Letter: auto-generated demand notice
- Audit Log: tamper-evident chain of custody record
- Gap Analysis: checklist of missing evidence`;

// POST /api/chat
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return res.status(503).json({
        success: false,
        error: 'AI assistant is not configured. Please add your GEMINI_API_KEY to environment variables on Vercel (Settings > Environment Variables).'
      });
    }

    // Build contents array: prior history + new message
    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-8)) {
        if ((turn.role === 'user' || turn.role === 'model') && turn.text) {
          contents.push({ role: turn.role, parts: [{ text: String(turn.text) }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: message.trim() }] });

    const requestBody = {
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.3,
        topP: 0.85
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    const model = 'gemini-2.0-flash-lite';
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(requestBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.status(502).json({ success: false, error: 'AI service temporarily unavailable. Please try again shortly.' });
    }

    const geminiData = await geminiRes.json();
    const candidate  = geminiData.candidates && geminiData.candidates[0];

    if (!candidate || !candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      return res.status(502).json({ success: false, error: 'No response from AI assistant. Please try again.' });
    }

    const reply = candidate.content.parts[0].text || '';
    return res.json({ success: true, data: { reply } });

  } catch (err) {
    console.error('Chat route error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

module.exports = router;
