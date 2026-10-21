'use strict';
// ProofBox Legal Chatbot Route
// Supports both Guest Mode (landing page inquiries) and Authenticated Case Mode
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'proofbox-secret-key-2024';

const GUEST_SYSTEM_INSTRUCTION = `You are ProofBox Quick Legal Assistant - a knowledgeable, strictly scoped legal information assistant for ProofBox (https://www.proofboxlaw.in/), a legal evidence organiser platform for ordinary people in India.

CURRENT MODE: Guest / Pre-login inquiry mode.
Your audience: Ordinary individuals (tenants, freelancers, consumers, employees) seeking guidance on legal documentation and evidence before creating a case.

STRICT SCOPE - only discuss:
- Evidence collection, timestamps, and preservation
- Dispute types: tenancy/landlord, freelance payment, consumer rights, employment issues
- Indian dispute bodies: Consumer Commission (NCDRC/DCDRC), RERA, MSME Samadhaan, Labour Commissioner
- Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam 2023 for digital evidence (WhatsApp, emails, SMS)
- How to structure a formal demand notice
- ProofBox features: automatic chronological timeline, SHA-256 integrity hash, Bates numbering (e.g. PB-0001), court-ready ZIP pack export

RULES:
1. Never claim to be a licensed advocate or establish attorney-client privilege.
2. Keep replies under 260 words. Use clear, plain English without legal jargon.
3. Use Indian Rupee (Rs.) for amounts.
4. Conclude with a brief reminder that they can sign in or create a free ProofBox account to organize their files into a court-ready timeline with Bates numbering.
5. End with the one-line disclaimer: "General information only, not legal advice."`;

const CASE_SYSTEM_INSTRUCTION = `You are ProofBox Case Assistant - an authoritative, practical evidence strategist for ProofBox (https://www.proofboxlaw.in/).

CURRENT MODE: Authenticated Case Workspace mode.
Your user is logged into their ProofBox workspace.

CAPABILITIES:
- Help organize chronological evidence timelines
- Explain admissibility of electronic records under Section 65B IEA / Section 63 BSA 2023
- Advise on structuring formal demand briefs with linked exhibits
- Check evidence gaps (missing contracts, missing payment receipts, unacknowledged notices)
- Guide on Bates numbering and court exhibit standards

RULES:
1. Be concise, structured, and action-oriented (use bullet points where suitable).
2. Keep responses under 300 words.
3. Suggest the relevant ProofBox workspace view (Evidence Timeline, Document Vault, Damages & Claims, Evidence Pack Generator, Audit Log).
4. Always maintain confidentiality and high evidentiary rigor.
5. End with the brief disclaimer: "General information only, not formal legal counsel."`;

// Smart built-in answers when GEMINI_API_KEY is not yet populated
function getOfflineFallbackAnswer(message, isGuest) {
  const m = message.toLowerCase();

  if (m.includes('whatsapp') || m.includes('chat') || m.includes('screenshot') || m.includes('65b')) {
    return `**WhatsApp & Digital Chat Evidence in India:**

1. **Admissibility:** WhatsApp messages and emails are electronic records admissible under Section 65B of the Indian Evidence Act (now Section 63 of the Bharatiya Sakshya Adhiniyam, 2023).
2. **Best Practice:** Do not rely solely on cropped screenshots. Export the complete unedited chat history (.txt with media attachments) to preserve continuous context and timestamps.
3. **Integrity:** ProofBox computes a cryptographic **SHA-256 hash** upon upload to prove the file has not been altered since ingest.
4. **Section 65B Certificate:** When presenting in court or consumer forums, an affidavit or certificate stating the device was functioning properly is typically required.

${isGuest ? 'To timestamp and Bates-number your chats into a formal court timeline, create a free ProofBox account.' : 'You can paste or upload chat exports directly via the **Add Evidence** tab.'}

*General information only, not legal advice.*`;
  }

  if (m.includes('deposit') || m.includes('landlord') || m.includes('tenant') || m.includes('rent')) {
    return `**Tenancy Security Deposit Recovery in India:**

1. **Establish the Timeline:** Document your lease agreement, move-in inspection notes, rent receipts, move-out notice, and handover photos/videos.
2. **Formal Demand Notice:** Send a written demand giving 7 to 15 days to refund the balance deposit, attaching proof of handover and clean property condition.
3. **Forum for Redressal:** If unreturned, tenants can file before the Rent Authority / Tribunal under the Model Tenancy Act / state rent control laws, or before the District Consumer Commission if services were deficient.
4. **Bates Indexing:** Organize all correspondence sequentially so the landlord cannot claim "unforeseen damages" without documentary proof.

${isGuest ? 'ProofBox helps you generate a structured Formal Demand Letter and Court Pack with one click.' : 'Check the **Damages & Claims** view to log the exact deposit amount owed.'}

*General information only, not legal advice.*`;
  }

  if (m.includes('invoice') || m.includes('freelance') || m.includes('unpaid') || m.includes('client payment')) {
    return `**Recovering Unpaid Freelance Invoices:**

1. **Proof of Agreement:** Gather the contract, proposal, SOW, or email/WhatsApp thread where terms and deliverables were agreed.
2. **Proof of Delivery:** Preserve submission emails, delivery links, and client approvals or lack of timely objections within the agreed review window.
3. **Formal Demand Notice:** Issue a structured Letter of Demand citing invoice numbers, due dates, and statutory interest.
4. **Legal Recourse:**
   - **MSME Samadhaan:** If registered under MSME, file a delayed payment claim carrying compounding monthly interest.
   - **Summary Suit (Order 37 CPC):** Fast-track recovery for liquidated written contracts in civil court.

${isGuest ? 'Sign up for ProofBox to build an audit-proof evidence timeline showing work completed and payment defaults.' : 'Use **Evidence Pack Generator** to create an instant Formal Demand Letter.'}

*General information only, not legal advice.*`;
  }

  if (m.includes('bates') || m.includes('numbering') || m.includes('exhibit')) {
    return `**What is Bates Numbering?**

Bates numbering assigns a sequential, unique alphanumeric identifier to each page or exhibit in a legal bundle (e.g., **PB-0001**, **PB-0002**).

**Why It Matters:**
- **Clarity in Pleadings:** When drafting legal notices or affidavits, you can refer to *"Exhibit PB-0004"* so judges and opposing advocates find exact records instantly.
- **Tamper Evidence:** Prevents insertion or omission of documents during proceedings.
- **Automated in ProofBox:** ProofBox automatically prefixes and numbers every uploaded file and WhatsApp export sequentially.

*General information only, not legal advice.*`;
  }

  // Generic fallback guidance
  return `**ProofBox Legal Evidence Guidance:**

ProofBox helps everyday litigants, tenants, freelancers, and consumers organize dispute records into court-ready evidence bundles:

1. **Chronological Timelines:** Establish an unbroken sequence of events with exact dates and timestamps.
2. **Cryptographic Integrity:** Automatic SHA-256 checksums verify files have not been edited.
3. **Financial Accounting:** Track primary claims, statutory interest, and disputed deductions.
4. **Court-Ready Exports:** Generate Bates-stamped ZIP archives and formal demand notices.

${isGuest ? '👉 **Next Step:** Sign in or create a free ProofBox account to create your dispute file.' : '👉 Open the **Add Evidence** tab to begin uploading files or logging phone notes.'}

*Note: For unrestricted custom AI analysis, add your Google Gemini API key to your environment variables.*
*General information only, not legal advice.*`;
}

// POST /api/chat - supports guest mode or authenticated mode
router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    // Optional authentication check
    let user = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id || decoded.userId;
        if (userId) {
          user = db.prepare('SELECT id, email, name, plan FROM users WHERE id = ?').get(userId);
        }
      } catch (_) {
        // Token invalid/expired - treat as guest rather than erroring out
      }
    }

    const isGuest = !user;
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    // If Gemini API Key is missing or default placeholder, use offline smart legal knowledge base
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      const fallbackReply = getOfflineFallbackAnswer(message, isGuest);
      return res.json({
        success: true,
        data: {
          reply: fallbackReply,
          mode: isGuest ? 'guest' : 'case',
          offline: true
        }
      });
    }

    // Prepare system instruction based on mode
    const systemPrompt = isGuest
      ? GUEST_SYSTEM_INSTRUCTION
      : `${CASE_SYSTEM_INSTRUCTION}\nUser Name: ${user.name}\nPlan: ${user.plan}`;

    // Build contents array (up to 8 turns of history)
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
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens: 550,
        temperature: 0.25,
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
      console.error('Gemini API returned error:', geminiRes.status, errText);
      // Fallback gracefully on rate limits or API key issues
      const fallbackReply = getOfflineFallbackAnswer(message, isGuest);
      return res.json({
        success: true,
        data: {
          reply: fallbackReply,
          mode: isGuest ? 'guest' : 'case',
          fallback: true
        }
      });
    }

    const geminiData = await geminiRes.json();
    const candidate  = geminiData.candidates && geminiData.candidates[0];

    if (!candidate || !candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      const fallbackReply = getOfflineFallbackAnswer(message, isGuest);
      return res.json({ success: true, data: { reply: fallbackReply, mode: isGuest ? 'guest' : 'case' } });
    }

    const reply = candidate.content.parts[0].text || '';
    return res.json({
      success: true,
      data: {
        reply,
        mode: isGuest ? 'guest' : 'case'
      }
    });

  } catch (err) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error while processing request.' });
  }
});

module.exports = router;
