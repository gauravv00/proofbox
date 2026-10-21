const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { formatClaim } = require('./cases');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/cases/:caseId/claims
 * List claims for case
 */
router.get('/cases/:caseId/claims', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const rows = db.prepare('SELECT * FROM claims WHERE case_id = ? ORDER BY date ASC, created_at ASC').all(caseRow.id);
    return res.json({
      success: true,
      data: rows.map(formatClaim)
    });
  } catch (err) {
    console.error('Error fetching claims:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claims: ' + err.message });
  }
});

/**
 * POST /api/cases/:caseId/claims
 * Create claim
 */
router.post('/cases/:caseId/claims', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const {
      title,
      category,
      amount,
      date,
      linkedExhibitId,
      linked_exhibit_id,
      notes,
      isDeduction,
      is_deduction
    } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Claim title is required.' });
    }

    const claimId = uuidv4();
    const now = new Date().toISOString();
    const isDed = isDeduction || is_deduction ? 1 : 0;
    const parsedAmount = Math.abs(parseFloat(amount) || 0) * (isDed ? -1 : 1);

    const stmt = db.prepare(`
      INSERT INTO claims (
        id, case_id, title, category, amount, date,
        linked_exhibit_id, notes, is_deduction, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      claimId,
      caseRow.id,
      title.trim(),
      category || 'Disputed Item',
      parsedAmount,
      date || now.split('T')[0],
      linkedExhibitId || linked_exhibit_id || null,
      notes || '',
      isDed,
      now
    );

    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(now, caseRow.id);

    const created = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
    return res.status(201).json({
      success: true,
      data: formatClaim(created)
    });
  } catch (err) {
    console.error('Error creating claim:', err);
    return res.status(500).json({ success: false, error: 'Failed to create claim: ' + err.message });
  }
});

/**
 * PUT /api/cases/:caseId/claims/:id
 * Update claim
 */
router.put('/cases/:caseId/claims/:id', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const claimRow = db.prepare('SELECT * FROM claims WHERE id = ? AND case_id = ?').get(req.params.id, caseRow.id);
    if (!claimRow) {
      return res.status(404).json({ success: false, error: 'Claim not found.' });
    }

    const {
      title,
      category,
      amount,
      date,
      linkedExhibitId,
      linked_exhibit_id,
      notes,
      isDeduction,
      is_deduction
    } = req.body || {};

    const isDed = isDeduction !== undefined ? (isDeduction ? 1 : 0) : (is_deduction !== undefined ? (is_deduction ? 1 : 0) : claimRow.is_deduction);
    let parsedAmount = claimRow.amount;
    if (amount !== undefined) {
      parsedAmount = Math.abs(parseFloat(amount) || 0) * (isDed ? -1 : 1);
    } else if (isDeduction !== undefined || is_deduction !== undefined) {
      parsedAmount = Math.abs(parsedAmount) * (isDed ? -1 : 1);
    }

    const updatedTitle = title !== undefined ? title.trim() : claimRow.title;
    const updatedCategory = category !== undefined ? category : claimRow.category;
    const updatedDate = date !== undefined ? date : claimRow.date;
    const updatedLinkedExhibit = (linkedExhibitId !== undefined || linked_exhibit_id !== undefined) 
      ? (linkedExhibitId || linked_exhibit_id || null) 
      : claimRow.linked_exhibit_id;
    const updatedNotes = notes !== undefined ? notes : claimRow.notes;

    db.prepare(`
      UPDATE claims SET
        title = ?,
        category = ?,
        amount = ?,
        date = ?,
        linked_exhibit_id = ?,
        notes = ?,
        is_deduction = ?
      WHERE id = ?
    `).run(
      updatedTitle,
      updatedCategory,
      parsedAmount,
      updatedDate,
      updatedLinkedExhibit,
      updatedNotes,
      isDed,
      claimRow.id
    );

    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), caseRow.id);

    const updated = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimRow.id);
    return res.json({
      success: true,
      data: formatClaim(updated)
    });
  } catch (err) {
    console.error('Error updating claim:', err);
    return res.status(500).json({ success: false, error: 'Failed to update claim: ' + err.message });
  }
});

/**
 * DELETE /api/cases/:caseId/claims/:id
 * Delete claim
 */
router.delete('/cases/:caseId/claims/:id', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const claimRow = db.prepare('SELECT * FROM claims WHERE id = ? AND case_id = ?').get(req.params.id, caseRow.id);
    if (!claimRow) {
      return res.status(404).json({ success: false, error: 'Claim not found.' });
    }

    db.prepare('DELETE FROM claims WHERE id = ?').run(claimRow.id);
    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), caseRow.id);

    return res.json({
      success: true,
      data: { id: claimRow.id }
    });
  } catch (err) {
    console.error('Error deleting claim:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete claim: ' + err.message });
  }
});

module.exports = router;
