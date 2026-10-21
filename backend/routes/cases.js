const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper to format exhibit row for API
function formatExhibit(row) {
  let exif = {};
  if (row.exif_json) {
    try {
      exif = JSON.parse(row.exif_json);
    } catch {
      exif = {};
    }
  }

  return {
    id: row.id,
    caseId: row.case_id,
    case_id: row.case_id,
    batesNumber: row.bates_number,
    bates_number: row.bates_number,
    title: row.title,
    category: row.category || 'Document',
    timestamp: row.timestamp,
    sourceType: row.source_type,
    source_type: row.source_type,
    fileName: row.file_name,
    file_name: row.file_name,
    filePath: row.file_path,
    file_path: row.file_path,
    fileSize: row.file_size,
    file_size: row.file_size,
    sha256: row.sha256,
    sender: row.sender || '',
    recipient: row.recipient || '',
    summary: row.summary || '',
    relevance: row.relevance || '',
    exif: exif,
    exif_json: row.exif_json,
    verified: Boolean(row.verified),
    previewType: row.preview_type || 'text',
    preview_type: row.preview_type || 'text',
    createdAt: row.created_at,
    created_at: row.created_at
  };
}

// Helper to format claim row for API
function formatClaim(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    case_id: row.case_id,
    title: row.title,
    category: row.category || 'Disputed Deduction',
    amount: Number(row.amount) || 0,
    date: row.date || '',
    linkedExhibitId: row.linked_exhibit_id || '',
    linked_exhibit_id: row.linked_exhibit_id || '',
    notes: row.notes || '',
    isDeduction: Boolean(row.is_deduction),
    is_deduction: Boolean(row.is_deduction),
    createdAt: row.created_at,
    created_at: row.created_at
  };
}

// Helper to format case row for API
function formatCase(row, exhibits = [], claims = []) {
  const exhibitCount = row.exhibit_count !== undefined ? Number(row.exhibit_count) : exhibits.length;
  const claimsTotal = row.claims_total !== undefined ? Number(row.claims_total) : claims.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return {
    id: row.id,
    userId: row.user_id,
    user_id: row.user_id,
    title: row.title,
    disputeType: row.dispute_type || 'General Dispute',
    dispute_type: row.dispute_type || 'General Dispute',
    opposingParty: row.opposing_party || '',
    opposing_party: row.opposing_party || '',
    claimAmount: row.claim_amount || '₹0.00',
    claim_amount: row.claim_amount || '₹0.00',
    status: row.status || 'Active File',
    batesPrefix: row.bates_prefix || 'PB-',
    bates_prefix: row.bates_prefix || 'PB-',
    jurisdiction: row.jurisdiction || '',
    description: row.description || '',
    notes: row.notes || '',
    createdDate: row.created_at,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    exhibitCount,
    exhibit_count: exhibitCount,
    claimsTotal,
    claims_total: claimsTotal,
    exhibits,
    claims
  };
}

/**
 * GET /api/cases
 * List all cases for current user with exhibit count & claims sum
 */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM exhibits WHERE case_id = c.id) as exhibit_count,
        (SELECT COALESCE(SUM(amount), 0) FROM claims WHERE case_id = c.id) as claims_total
      FROM cases c
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).all(req.userId);

    const formatted = rows.map(r => formatCase(r));
    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error('Error fetching cases:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch cases: ' + err.message
    });
  }
});

/**
 * POST /api/cases
 * Create new case
 */
router.post('/', (req, res) => {
  try {
    const {
      title,
      disputeType,
      dispute_type,
      opposingParty,
      opposing_party,
      claimAmount,
      claim_amount,
      status,
      batesPrefix,
      bates_prefix,
      jurisdiction,
      description,
      notes
    } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Case title is required.'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const cleanPrefix = (batesPrefix || bates_prefix || 'PB-').trim().toUpperCase();
    const prefix = cleanPrefix.endsWith('-') ? cleanPrefix : `${cleanPrefix}-`;

    const stmt = db.prepare(`
      INSERT INTO cases (
        id, user_id, title, dispute_type, opposing_party, claim_amount,
        status, bates_prefix, jurisdiction, description, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      req.userId,
      title.trim(),
      disputeType || dispute_type || 'General Dispute',
      opposingParty || opposing_party || '',
      claimAmount || claim_amount || '₹0.00',
      status || 'Active File',
      prefix,
      jurisdiction || '',
      description || '',
      notes || '',
      now,
      now
    );

    const created = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
    return res.status(201).json({
      success: true,
      data: formatCase(created, [], [])
    });
  } catch (err) {
    console.error('Error creating case:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create case: ' + err.message
    });
  }
});

/**
 * POST /api/cases/seed-demo
 * Copies preloaded demo case (Aisha Khan deposit dispute) into the user's account
 */
router.post('/seed-demo', (req, res) => {
  try {
    const caseId = uuidv4();
    const now = new Date().toISOString();
    const title = "Landlord Security Deposit Dispute - Apt 4B";
    const disputeType = "Tenant / Landlord Deposit";
    const opposingParty = "Vikas Malhotra (Property Owner) & Horizon Realty";
    const claimAmount = "₹1,20,000 (~$1,450)";
    const batesPrefix = "PB-APT4B-";
    const jurisdiction = "Rent Mediation Forum / Civil Court";
    const description = "Landlord refused to return security deposit of ₹1,20,000 citing pre-existing ceiling water seepage damage and unauthorized repairs, despite multiple written notifications sent between Oct 2025 and Jan 2026.";
    const notes = "Evidence establishes landlord was informed within 48h of leak, promised repairs via WhatsApp, delayed action, tenant mitigated damage, and returned apartment in broom-clean condition.";

    db.prepare(`
      INSERT INTO cases (
        id, user_id, title, dispute_type, opposing_party, claim_amount,
        status, bates_prefix, jurisdiction, description, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(caseId, req.userId, title, disputeType, opposingParty, claimAmount, 'Active Preparation', batesPrefix, jurisdiction, description, notes, now, now);

    // Seed exhibits
    const demoExhibits = [
      {
        id: uuidv4(),
        bates_number: `${batesPrefix}0001`,
        title: "Executed Residential Tenancy Agreement (Clause 9: Deposit Refund)",
        category: "Agreement",
        timestamp: "2025-02-01T11:00:00Z",
        source_type: "PDF Document",
        file_name: "Residential_Lease_Agreement_Apt4B_Executed.pdf",
        file_size: "2.4 MB",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        sender: "Horizon Properties / Vikas Malhotra",
        recipient: "Aisha Khan (Tenant)",
        summary: "Original 11-month lease establishing ₹1,20,000 security deposit refundable within 7 business days of vacancy minus verified intentional damage.",
        relevance: "Proves legal tenancy, deposit amount paid, and contract obligation to return deposit within 7 days of handover.",
        preview_type: "pdf"
      },
      {
        id: uuidv4(),
        bates_number: `${batesPrefix}0002`,
        title: "Initial Security Deposit Bank Transfer Receipt",
        category: "Payment",
        timestamp: "2025-02-02T14:22:10Z",
        source_type: "Bank Statement / UPI Receipt",
        file_name: "HDFC_Txn_Ref_40332891_DepositPaid.pdf",
        file_size: "412 KB",
        sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
        sender: "Aisha Khan (HDFC A/c ****4102)",
        recipient: "Vikas Malhotra (ICICI A/c ****9912)",
        summary: "Official bank confirmation voucher for ₹1,20,000 transfer with IMPS reference 40332891.",
        relevance: "Definitively defeats any potential claim that security deposit was never received by landlord.",
        preview_type: "pdf"
      },
      {
        id: uuidv4(),
        bates_number: `${batesPrefix}0003`,
        title: "First Written Notice of Ceiling Water Seepage & Video Link",
        category: "Communication",
        timestamp: "2025-10-14T09:15:32Z",
        source_type: "WhatsApp Chat Export",
        file_name: "WhatsApp_Chat_Vikas_Malhotra_20251014.txt",
        file_size: "18 KB",
        sha256: "5d41402abc4b2a76b9719d911017c592b0c39962a9c336b1130d2fb69da8a509",
        sender: "Aisha Khan",
        recipient: "Vikas Malhotra",
        summary: "Notice informing landlord that ceiling paint in second bedroom began flaking and damp patch appeared following heavy rain on Oct 12.",
        relevance: "Demonstrates prompt notification by tenant within 48 hours of defect manifestation.",
        preview_type: "chat"
      },
      {
        id: uuidv4(),
        bates_number: `${batesPrefix}0004`,
        title: "Photographic Evidence: Bedroom Ceiling Water Leak & Plaster Damage",
        category: "Damage Photo",
        timestamp: "2025-10-28T16:45:10Z",
        source_type: "Smartphone Camera (iPhone 14)",
        file_name: "IMG_20251028_164510_CeilingLeak_Damage.jpg",
        file_size: "3.8 MB",
        sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
        sender: "Aisha Khan (Shot on location)",
        recipient: "Transmitted via WhatsApp to Vikas Malhotra",
        summary: "High-resolution photograph showing continuous water seepage along structural joint and peeling plaster measuring approx 4ft x 2ft.",
        relevance: "Establishes source of damage was building exterior seepage, not internal tenant misuse.",
        preview_type: "image"
      },
      {
        id: uuidv4(),
        bates_number: `${batesPrefix}0005`,
        title: "Emergency Waterproofing Plumber Invoice & Payment Voucher",
        category: "Payment",
        timestamp: "2025-11-02T17:30:00Z",
        source_type: "Tax Invoice / Plumber Receipt",
        file_name: "Apex_Plumbing_Services_Inv_9942_Mitigation.pdf",
        file_size: "620 KB",
        sha256: "c18f3a35f795dbad067644f128c715f22c8c4a92c0a4e3fa3cf89d04f1a23806",
        sender: "Apex Plumbing Services (Proprietor: R. Sharma)",
        recipient: "Aisha Khan",
        summary: "Receipt for ₹8,500 emergency ceiling sealant and drainage clearance incurred after landlord failed to send maintenance.",
        relevance: "Validates tenant's good-faith duty of mitigation and forms part of reimbursable damages claim.",
        preview_type: "pdf"
      },
      {
        id: uuidv4(),
        bates_number: `${batesPrefix}0006`,
        title: "Move-Out Video Inspection & Key Handover Receipt",
        category: "Notice",
        timestamp: "2026-01-15T18:00:00Z",
        source_type: "Digital Video & Signed Handover Slip",
        file_name: "Apt4B_Final_Handover_Inspection_Receipt.pdf",
        file_size: "1.1 MB",
        sha256: "a35b4c1e8276f5923b32087593c66f54c935d21a9a4e32049e89b271d4b68ef5",
        sender: "Aisha Khan & Horizon Realty Agent (Sunil)",
        recipient: "Vikas Malhotra",
        summary: "Signed inventory handover slip confirming all 3 sets of keys returned and apartment cleared of tenant belongings.",
        relevance: "Establishes formal vacancy date of Jan 15, 2026, triggering the 7-day deposit refund clock.",
        preview_type: "document"
      }
    ];

    const insertExStmt = db.prepare(`
      INSERT INTO exhibits (
        id, case_id, bates_number, title, category, timestamp, source_type,
        file_name, file_size, sha256, sender, recipient, summary, relevance,
        verified, preview_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const ex of demoExhibits) {
      insertExStmt.run(
        ex.id, caseId, ex.bates_number, ex.title, ex.category, ex.timestamp,
        ex.source_type, ex.file_name, ex.file_size, ex.sha256, ex.sender,
        ex.recipient, ex.summary, ex.relevance, ex.preview_type, now
      );
    }

    // Seed claims
    const demoClaims = [
      {
        id: uuidv4(),
        title: "Refund of Security Deposit (Full Principal)",
        category: "Principal Deposit",
        amount: 120000,
        date: "2026-01-22",
        notes: "Held unlawfully beyond 7-day contractual deadline without legitimate damage proof.",
        is_deduction: 0
      },
      {
        id: uuidv4(),
        title: "Emergency Waterproofing Plumber Mitigation Cost",
        category: "Out-of-Pocket Mitigation",
        amount: 8500,
        date: "2025-11-02",
        notes: "Authorized verbally on Oct 28 phone call and confirmed via WhatsApp.",
        is_deduction: 0
      },
      {
        id: uuidv4(),
        title: "Disputed Ceiling Plaster Contractor Forfeiture Claim",
        category: "Disputed Deduction",
        amount: -140000,
        date: "2026-01-22",
        notes: "Opposing party's unjustified counter-claim for pre-existing monsoon water seepage.",
        is_deduction: 1
      }
    ];

    const insertClStmt = db.prepare(`
      INSERT INTO claims (
        id, case_id, title, category, amount, date, notes, is_deduction, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const cl of demoClaims) {
      insertClStmt.run(
        cl.id, caseId, cl.title, cl.category, cl.amount, cl.date, cl.notes, cl.is_deduction, now
      );
    }

    const created = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
    const exhibits = db.prepare('SELECT * FROM exhibits WHERE case_id = ? ORDER BY timestamp ASC').all(caseId).map(formatExhibit);
    const claims = db.prepare('SELECT * FROM claims WHERE case_id = ? ORDER BY date ASC').all(caseId).map(formatClaim);

    return res.status(201).json({
      success: true,
      data: formatCase(created, exhibits, claims)
    });
  } catch (err) {
    console.error('Error seeding demo case:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to seed demo case: ' + err.message
    });
  }
});

/**
 * GET /api/cases/:id
 * Get single case with all exhibits + claims
 */
router.get('/:id', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!caseRow) {
      return res.status(404).json({
        success: false,
        error: 'Case not found or access denied.'
      });
    }

    const exhibits = db.prepare('SELECT * FROM exhibits WHERE case_id = ? ORDER BY timestamp ASC, created_at ASC').all(caseRow.id).map(formatExhibit);
    const claims = db.prepare('SELECT * FROM claims WHERE case_id = ? ORDER BY date ASC, created_at ASC').all(caseRow.id).map(formatClaim);

    return res.json({
      success: true,
      data: formatCase(caseRow, exhibits, claims)
    });
  } catch (err) {
    console.error('Error fetching case:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch case: ' + err.message
    });
  }
});

/**
 * PUT /api/cases/:id
 * Update case fields
 */
router.put('/:id', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!caseRow) {
      return res.status(404).json({
        success: false,
        error: 'Case not found or access denied.'
      });
    }

    const {
      title,
      disputeType,
      dispute_type,
      opposingParty,
      opposing_party,
      claimAmount,
      claim_amount,
      status,
      batesPrefix,
      bates_prefix,
      jurisdiction,
      description,
      notes
    } = req.body || {};

    const updatedTitle = title !== undefined ? title.trim() : caseRow.title;
    const updatedDisputeType = disputeType || dispute_type || caseRow.dispute_type;
    const updatedOpposingParty = opposingParty !== undefined ? opposingParty : (opposing_party !== undefined ? opposing_party : caseRow.opposing_party);
    const updatedClaimAmount = claimAmount !== undefined ? claimAmount : (claim_amount !== undefined ? claim_amount : caseRow.claim_amount);
    const updatedStatus = status || caseRow.status;
    
    let updatedPrefix = batesPrefix || bates_prefix || caseRow.bates_prefix;
    if (updatedPrefix) {
      updatedPrefix = updatedPrefix.trim().toUpperCase();
      if (!updatedPrefix.endsWith('-')) updatedPrefix += '-';
    }

    const updatedJurisdiction = jurisdiction !== undefined ? jurisdiction : caseRow.jurisdiction;
    const updatedDescription = description !== undefined ? description : caseRow.description;
    const updatedNotes = notes !== undefined ? notes : caseRow.notes;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE cases SET
        title = ?,
        dispute_type = ?,
        opposing_party = ?,
        claim_amount = ?,
        status = ?,
        bates_prefix = ?,
        jurisdiction = ?,
        description = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updatedTitle,
      updatedDisputeType,
      updatedOpposingParty,
      updatedClaimAmount,
      updatedStatus,
      updatedPrefix,
      updatedJurisdiction,
      updatedDescription,
      updatedNotes,
      now,
      caseRow.id
    );

    const updated = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseRow.id);
    const exhibits = db.prepare('SELECT * FROM exhibits WHERE case_id = ? ORDER BY timestamp ASC').all(caseRow.id).map(formatExhibit);
    const claims = db.prepare('SELECT * FROM claims WHERE case_id = ? ORDER BY date ASC').all(caseRow.id).map(formatClaim);

    return res.json({
      success: true,
      data: formatCase(updated, exhibits, claims)
    });
  } catch (err) {
    console.error('Error updating case:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update case: ' + err.message
    });
  }
});

/**
 * DELETE /api/cases/:id
 * Delete case + cascade exhibits/claims/files
 */
router.delete('/:id', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!caseRow) {
      return res.status(404).json({
        success: false,
        error: 'Case not found or access denied.'
      });
    }

    // Delete case files from disk
    const caseUploadDir = path.join(__dirname, '..', 'uploads', caseRow.id);
    if (fs.existsSync(caseUploadDir)) {
      try {
        fs.rmSync(caseUploadDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Could not remove upload folder:', e.message);
      }
    }

    // Explicitly delete claims and exhibits in case foreign keys cascade is disabled
    db.prepare('DELETE FROM claims WHERE case_id = ?').run(caseRow.id);
    db.prepare('DELETE FROM exhibits WHERE case_id = ?').run(caseRow.id);
    db.prepare('DELETE FROM cases WHERE id = ?').run(caseRow.id);

    return res.json({
      success: true,
      data: { id: caseRow.id }
    });
  } catch (err) {
    console.error('Error deleting case:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete case: ' + err.message
    });
  }
});

module.exports = {
  router,
  formatCase,
  formatExhibit,
  formatClaim
};
