const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { formatExhibit } = require('./cases');

const router = express.Router();
router.use(authMiddleware);

// Configure multer storage per case
const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseId = req.params.caseId || 'general';
    const baseUploads = isVercel
      ? path.join('/tmp', 'uploads')
      : path.join(__dirname, '..', 'uploads');
    const uploadDir = path.join(baseUploads, caseId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
    cb(null, `${Date.now()}_${safeName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectCategory(filename, fallbackCat) {
  if (fallbackCat && fallbackCat !== 'Document' && fallbackCat !== 'auto' && fallbackCat !== '') {
    return fallbackCat;
  }
  const ext = path.extname(filename || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'].includes(ext)) return 'Damage Photo';
  if (ext === '.pdf') return 'Document';
  if (['.eml', '.msg'].includes(ext)) return 'Email';
  if (['.txt', '.chat'].includes(ext)) return 'Communication';
  return fallbackCat || 'Document';
}

function detectPreviewType(filename, category) {
  const ext = path.extname(filename || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
  if (ext === '.pdf') return 'pdf';
  if (category === 'Communication' || ext === '.txt') return 'chat';
  return 'document';
}

/**
 * GET /api/cases/:caseId/exhibits
 * List exhibits ordered by timestamp
 */
router.get('/cases/:caseId/exhibits', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const rows = db.prepare(`
      SELECT * FROM exhibits
      WHERE case_id = ?
      ORDER BY timestamp ASC, created_at ASC
    `).all(caseRow.id);

    return res.json({
      success: true,
      data: rows.map(formatExhibit)
    });
  } catch (err) {
    console.error('Error fetching exhibits:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch exhibits: ' + err.message });
  }
});

/**
 * POST /api/cases/:caseId/exhibits
 * Create exhibit (multipart/form-data with optional file, OR JSON for verbal notes)
 */
router.post('/cases/:caseId/exhibits', upload.single('file'), (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const {
      title,
      category,
      timestamp,
      sourceType,
      source_type,
      sender,
      recipient,
      summary,
      relevance,
      notes,
      previewType,
      preview_type
    } = req.body || {};

    const countRow = db.prepare('SELECT COUNT(*) as count FROM exhibits WHERE case_id = ?').get(caseRow.id);
    const exhibitCount = (countRow ? countRow.count : 0) + 1;
    const prefix = caseRow.bates_prefix || 'PB-';
    const batesNumber = `${prefix}${String(exhibitCount).padStart(4, '0')}`;

    let fileName = '';
    let filePath = '';
    let fileSize = '';
    let sha256 = '';
    let resolvedCategory = category || 'Document';
    let resolvedPreviewType = previewType || preview_type || 'text';

    if (req.file) {
      fileName = req.file.originalname;
      filePath = req.file.path;
      fileSize = formatFileSize(req.file.size);
      
      // Calculate SHA256 of file buffer
      const fileBuffer = fs.readFileSync(filePath);
      sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      resolvedCategory = detectCategory(fileName, category);
      resolvedPreviewType = detectPreviewType(fileName, resolvedCategory);
    } else {
      // Verbal note or manual entry without physical file
      fileName = (req.body.fileName || req.body.file_name) || `Note_${batesNumber}.txt`;
      fileSize = `${(summary || notes || title || '').length} bytes`;
      
      // Hash of textual content
      const content = `${title || ''}|${summary || ''}|${notes || ''}|${timestamp || ''}`;
      sha256 = crypto.createHash('sha256').update(content).digest('hex');

      resolvedCategory = category || (sourceType === 'Phone Call Log' ? 'Communication' : 'Document');
      resolvedPreviewType = previewType || preview_type || (resolvedCategory === 'Communication' ? 'chat' : 'text');
    }

    const exhibitId = uuidv4();
    const now = new Date().toISOString();
    const resolvedTimestamp = timestamp || now;
    const resolvedTitle = (title && title.trim()) || fileName || `Evidence Exhibit ${batesNumber}`;
    const resolvedSource = sourceType || source_type || (req.file ? 'Uploaded File' : 'Verbal Note / Statement');

    const exifData = {
      source: resolvedSource,
      uploadedAt: now,
      originalName: fileName,
      fileSize: fileSize,
      mimeType: req.file ? req.file.mimetype : 'text/plain'
    };

    const stmt = db.prepare(`
      INSERT INTO exhibits (
        id, case_id, bates_number, title, category, timestamp, source_type,
        file_name, file_path, file_size, sha256, sender, recipient, summary,
        relevance, exif_json, verified, preview_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    stmt.run(
      exhibitId,
      caseRow.id,
      batesNumber,
      resolvedTitle,
      resolvedCategory,
      resolvedTimestamp,
      resolvedSource,
      fileName,
      filePath,
      fileSize,
      sha256,
      sender || '',
      recipient || '',
      summary || notes || '',
      relevance || '',
      JSON.stringify(exifData),
      resolvedPreviewType,
      now
    );

    // Update case updated_at
    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(now, caseRow.id);

    const created = db.prepare('SELECT * FROM exhibits WHERE id = ?').get(exhibitId);
    return res.status(201).json({
      success: true,
      data: formatExhibit(created)
    });
  } catch (err) {
    console.error('Error creating exhibit:', err);
    return res.status(500).json({ success: false, error: 'Failed to create exhibit: ' + err.message });
  }
});

/**
 * POST /api/cases/:caseId/exhibits/batch
 * Batch create exhibits from parsed chat transcript or multiple items
 */
router.post('/cases/:caseId/exhibits/batch', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const items = Array.isArray(req.body) ? req.body : (req.body.exhibits || []);
    if (!items.length) {
      return res.status(400).json({ success: false, error: 'No exhibit items provided in batch.' });
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM exhibits WHERE case_id = ?').get(caseRow.id);
    let nextIndex = (countRow ? countRow.count : 0) + 1;
    const prefix = caseRow.bates_prefix || 'PB-';
    const now = new Date().toISOString();
    const createdExhibits = [];

    const insertStmt = db.prepare(`
      INSERT INTO exhibits (
        id, case_id, bates_number, title, category, timestamp, source_type,
        file_name, file_path, file_size, sha256, sender, recipient, summary,
        relevance, exif_json, verified, preview_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const item of items) {
      const exhibitId = uuidv4();
      const batesNumber = `${prefix}${String(nextIndex).padStart(4, '0')}`;
      nextIndex++;

      const title = item.title || `Chat Message - ${item.sender || 'Party'}`;
      const category = item.category || 'Communication';
      const timestamp = item.timestamp || now;
      const sourceType = item.sourceType || item.source_type || 'WhatsApp Chat Export';
      const fileName = item.fileName || item.file_name || `chat_message_${batesNumber}.txt`;
      const fileSize = item.fileSize || item.file_size || `${(item.summary || '').length} bytes`;
      
      const content = `${title}|${item.summary || ''}|${timestamp}|${item.sender || ''}`;
      const sha256 = item.sha256 || crypto.createHash('sha256').update(content).digest('hex');

      const exifData = {
        source: sourceType,
        uploadedAt: now,
        sender: item.sender || '',
        recipient: item.recipient || ''
      };

      insertStmt.run(
        exhibitId,
        caseRow.id,
        batesNumber,
        title,
        category,
        timestamp,
        sourceType,
        fileName,
        '',
        fileSize,
        sha256,
        item.sender || '',
        item.recipient || '',
        item.summary || item.text || '',
        item.relevance || 'Contemporaneous communication documenting dispute.',
        JSON.stringify(exifData),
        'chat',
        now
      );

      createdExhibits.push(db.prepare('SELECT * FROM exhibits WHERE id = ?').get(exhibitId));
    }

    // Update case updated_at
    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(now, caseRow.id);

    return res.status(201).json({
      success: true,
      data: createdExhibits.map(formatExhibit)
    });
  } catch (err) {
    console.error('Error batch creating exhibits:', err);
    return res.status(500).json({ success: false, error: 'Failed to batch create exhibits: ' + err.message });
  }
});

/**
 * PUT /api/cases/:caseId/exhibits/:id
 * Update exhibit title/category/notes/relevance
 */
router.put('/cases/:caseId/exhibits/:id', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const exhibitRow = db.prepare('SELECT * FROM exhibits WHERE id = ? AND case_id = ?').get(req.params.id, caseRow.id);
    if (!exhibitRow) {
      return res.status(404).json({ success: false, error: 'Exhibit not found.' });
    }

    const {
      title,
      category,
      summary,
      notes,
      relevance,
      sender,
      recipient,
      timestamp
    } = req.body || {};

    const updatedTitle = title !== undefined ? title : exhibitRow.title;
    const updatedCategory = category !== undefined ? category : exhibitRow.category;
    const updatedSummary = summary !== undefined ? summary : (notes !== undefined ? notes : exhibitRow.summary);
    const updatedRelevance = relevance !== undefined ? relevance : exhibitRow.relevance;
    const updatedSender = sender !== undefined ? sender : exhibitRow.sender;
    const updatedRecipient = recipient !== undefined ? recipient : exhibitRow.recipient;
    const updatedTimestamp = timestamp !== undefined ? timestamp : exhibitRow.timestamp;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE exhibits SET
        title = ?,
        category = ?,
        summary = ?,
        relevance = ?,
        sender = ?,
        recipient = ?,
        timestamp = ?
      WHERE id = ?
    `).run(
      updatedTitle,
      updatedCategory,
      updatedSummary,
      updatedRelevance,
      updatedSender,
      updatedRecipient,
      updatedTimestamp,
      exhibitRow.id
    );

    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(now, caseRow.id);

    const updated = db.prepare('SELECT * FROM exhibits WHERE id = ?').get(exhibitRow.id);
    return res.json({
      success: true,
      data: formatExhibit(updated)
    });
  } catch (err) {
    console.error('Error updating exhibit:', err);
    return res.status(500).json({ success: false, error: 'Failed to update exhibit: ' + err.message });
  }
});

/**
 * DELETE /api/cases/:caseId/exhibits/:id
 * Delete exhibit + file from disk
 */
router.delete('/cases/:caseId/exhibits/:id', (req, res) => {
  try {
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(req.params.caseId, req.userId);
    if (!caseRow) {
      return res.status(404).json({ success: false, error: 'Case not found or access denied.' });
    }

    const exhibitRow = db.prepare('SELECT * FROM exhibits WHERE id = ? AND case_id = ?').get(req.params.id, caseRow.id);
    if (!exhibitRow) {
      return res.status(404).json({ success: false, error: 'Exhibit not found.' });
    }

    // Delete file from disk if path exists
    if (exhibitRow.file_path && fs.existsSync(exhibitRow.file_path)) {
      try {
        fs.unlinkSync(exhibitRow.file_path);
      } catch (e) {
        console.warn('Failed to delete exhibit file:', e.message);
      }
    }

    // Unlink any claims referencing this exhibit
    db.prepare('UPDATE claims SET linked_exhibit_id = NULL WHERE linked_exhibit_id = ?').run(exhibitRow.id);

    db.prepare('DELETE FROM exhibits WHERE id = ?').run(exhibitRow.id);
    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), caseRow.id);

    return res.json({
      success: true,
      data: { id: exhibitRow.id }
    });
  } catch (err) {
    console.error('Error deleting exhibit:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete exhibit: ' + err.message });
  }
});

/**
 * GET /api/exhibits/:id/file
 * Stream the uploaded file for download/view
 */
router.get('/exhibits/:id/file', (req, res) => {
  try {
    const exhibitRow = db.prepare(`
      SELECT e.*, c.user_id 
      FROM exhibits e
      JOIN cases c ON e.case_id = c.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!exhibitRow) {
      return res.status(404).json({ success: false, error: 'Exhibit file not found.' });
    }

    // Verify user owns this case
    if (exhibitRow.user_id !== req.userId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (exhibitRow.file_path && fs.existsSync(exhibitRow.file_path)) {
      return res.sendFile(path.resolve(exhibitRow.file_path));
    }

    // If no physical file (e.g. text/verbal note), generate plain text response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${exhibitRow.file_name || 'exhibit.txt'}"`);
    return res.send(`PRODUCED EXHIBIT: ${exhibitRow.bates_number}\nTitle: ${exhibitRow.title}\nCategory: ${exhibitRow.category}\nTimestamp: ${exhibitRow.timestamp}\nSHA-256: ${exhibitRow.sha256}\n\nSUMMARY & NOTES:\n${exhibitRow.summary || 'No text summary provided.'}\n\nLEGAL RELEVANCE:\n${exhibitRow.relevance || 'Not specified.'}`);
  } catch (err) {
    console.error('Error streaming exhibit file:', err);
    return res.status(500).json({ success: false, error: 'Failed to stream file: ' + err.message });
  }
});

module.exports = router;
