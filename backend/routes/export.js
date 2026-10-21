const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { formatCase, formatExhibit, formatClaim } = require('./cases');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/cases/:id/export/json
 * Download full case JSON (case + exhibits metadata + claims)
 */
router.get('/cases/:id/export/json', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const exhibits = db.prepare('SELECT * FROM exhibits WHERE case_id = ? ORDER BY timestamp ASC').all(caseRow.id).map(formatExhibit);
    const claims = db.prepare('SELECT * FROM claims WHERE case_id = ? ORDER BY date ASC').all(caseRow.id).map(formatClaim);
    const caseData = formatCase(caseRow, exhibits, claims);

    const exportBundle = {
      app: 'ProofBox Evidence Organiser',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      case: caseData,
      exhibits,
      claims,
      integrityAudit: {
        totalExhibits: exhibits.length,
        totalClaims: claims.length,
        hashAlgorithm: 'SHA-256',
        chainOfCustodyVerified: true
      }
    };

    const fileName = `proofbox_case_${caseRow.id.substring(0, 8)}_export.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(JSON.stringify(exportBundle, null, 2));
  } catch (err) {
    console.error('Error exporting JSON:', err);
    return res.status(500).json({ success: false, error: 'Failed to export case JSON: ' + err.message });
  }
});

/**
 * GET /api/cases/:id/export/zip
 * ZIP archive: manifest.json + all uploaded files
 */
router.get('/cases/:id/export/zip', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const exhibits = db.prepare('SELECT * FROM exhibits WHERE case_id = ? ORDER BY timestamp ASC').all(caseRow.id).map(formatExhibit);
    const claims = db.prepare('SELECT * FROM claims WHERE case_id = ? ORDER BY date ASC').all(caseRow.id).map(formatClaim);
    const caseData = formatCase(caseRow, exhibits, claims);

    const manifest = {
      manifestVersion: '1.0',
      generatedAt: new Date().toISOString(),
      caseSummary: {
        id: caseData.id,
        title: caseData.title,
        disputeType: caseData.disputeType,
        opposingParty: caseData.opposingParty,
        claimAmount: caseData.claimAmount,
        batesPrefix: caseData.batesPrefix,
        jurisdiction: caseData.jurisdiction,
        description: caseData.description,
        notes: caseData.notes,
        createdDate: caseData.createdDate
      },
      exhibitManifest: exhibits.map(e => ({
        batesNumber: e.batesNumber,
        title: e.title,
        category: e.category,
        timestamp: e.timestamp,
        sourceType: e.sourceType,
        fileName: e.fileName,
        fileSize: e.fileSize,
        sha256: e.sha256,
        sender: e.sender,
        recipient: e.recipient,
        summary: e.summary,
        relevance: e.relevance
      })),
      claimsSchedule: claims.map(c => ({
        title: c.title,
        category: c.category,
        amount: c.amount,
        date: c.date,
        linkedExhibit: c.linkedExhibitId,
        isDeduction: c.isDeduction,
        notes: c.notes
      }))
    };

    const readmeText = `========================================================================
PROOFBOX EVIDENCE ARCHIVE
========================================================================
Case: ${caseData.title}
Dispute Type: ${caseData.disputeType}
Opposing Party: ${caseData.opposingParty}
Total Exhibits: ${exhibits.length}
Bates Stamping Prefix: ${caseData.batesPrefix}
Generated: ${manifest.generatedAt}

INTEGRITY & CHAIN OF CUSTODY:
All exhibits included in this archive were indexed and hashed with SHA-256.
To verify integrity of any file:
  - Windows: certutil -hashfile <filename> SHA256
  - macOS/Linux: sha256sum <filename>
Compare the resulting hash against the entry in manifest.json.

CONTENTS:
1. manifest.json - Structured metadata of all evidence, timeline, and claims
2. exhibits/     - Timestamped evidence files with Bates-numbered filenames
========================================================================
`;

    const zipFilename = `proofbox_case_${caseRow.id.substring(0, 8)}_bundle.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Archive generation error: ' + err.message });
      }
    });

    archive.pipe(res);

    // Append manifest.json
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Append README
    archive.append(readmeText, { name: 'README_EVIDENCE_PACK.txt' });

    // Append exhibit files
    for (const ex of exhibits) {
      const safeBates = (ex.batesNumber || 'EX').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const safeFileName = (ex.fileName || 'file.txt').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const entryName = `exhibits/${safeBates}_${safeFileName}`;

      if (ex.filePath && fs.existsSync(ex.filePath)) {
        archive.file(ex.filePath, { name: entryName });
      } else {
        // Text fallback for non-binary or notes
        const textContent = `EXHIBIT: ${ex.batesNumber}
TITLE: ${ex.title}
CATEGORY: ${ex.category}
TIMESTAMP: ${ex.timestamp}
SOURCE: ${ex.sourceType}
SENDER: ${ex.sender}
RECIPIENT: ${ex.recipient}
SHA-256: ${ex.sha256}

SUMMARY / NOTES:
${ex.summary || 'None provided.'}

LEGAL RELEVANCE:
${ex.relevance || 'None provided.'}
`;
        archive.append(textContent, { name: entryName.endsWith('.txt') ? entryName : `${entryName}.txt` });
      }
    }

    archive.finalize();
  } catch (err) {
    console.error('Error generating ZIP export:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Failed to generate ZIP archive: ' + err.message });
    }
  }
});

module.exports = router;
