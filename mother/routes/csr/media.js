/**
 * mother/routes/csr/media.js
 *
 * JSON-based router for media management, using meltdown events from mediaManager.
 * Provides endpoints for listing folders, creating subfolders, renaming/deleting items,
 * uploading files (multi-upload), and making files public.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { motherEmitter } = require('../../emitters/motherEmitter');
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/**
 * GET /admin/content/media
 * => Return a minimal JSON or do meltdown => listLocalFolder on root path
 */
router.get(
  '/',
  requireAuthCookie,
  requirePermission('content.media.list'),
  (req, res) => {
    // If you want to immediately list the root folder, you can meltdown => listLocalFolder:
    // Otherwise just return a simple message
    return res.json({
      success: true,
      message: 'Use /folder?path=some/subfolder to list a specific folder.'
    });
  }
);

/**
 * GET /admin/content/media/folder?path=subfolder
 * => meltdown => listLocalFolder
 */
router.get(
  '/folder',
  requireAuthCookie,
  requirePermission('content.media.list'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const subPath = req.query.path || '';

    motherEmitter.emit(
      'listLocalFolder',
      {
        jwt: userToken,
        moduleName: 'mediaManager',
        moduleType: 'core',
        subPath
      },
      (err, result) => {
        if (err) {
          console.error('[MEDIA ROUTE] listLocalFolder =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        // result => { currentPath, parentPath, folders:[], files:[] }
        return res.json({
          success: true,
          currentPath: result.currentPath,
          parentPath: result.parentPath,
          folders: result.folders || [],
          files: result.files || []
        });
      }
    );
  }
);

/**
 * POST /admin/content/media/folder/new
 * => meltdown => createLocalFolder
 */
router.post(
  '/folder/new',
  requireAuthCookie,
  requirePermission('content.media.create'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { currentPath, newFolderName } = req.body;

    motherEmitter.emit(
      'createLocalFolder',
      {
        jwt: userToken,
        moduleName: 'mediaManager',
        moduleType: 'core',
        currentPath: currentPath || '',
        newFolderName
      },
      (err) => {
        if (err) {
          console.error('[MEDIA ROUTE] createLocalFolder =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: 'Folder created.'
        });
      }
    );
  }
);

/**
 * POST /admin/content/media/folder/rename
 * => meltdown => renameLocalItem
 */
router.post(
  '/folder/rename',
  requireAuthCookie,
  requirePermission('content.media.edit'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { currentPath, oldName, newName } = req.body;

    motherEmitter.emit(
      'renameLocalItem',
      {
        jwt: userToken,
        moduleName: 'mediaManager',
        moduleType: 'core',
        currentPath: currentPath || '',
        oldName,
        newName
      },
      (err) => {
        if (err) {
          console.error('[MEDIA ROUTE] renameLocalItem =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: 'Rename succeeded.'
        });
      }
    );
  }
);

/**
 * POST /admin/content/media/folder/delete
 * => meltdown => deleteLocalItem
 */
router.post(
  '/folder/delete',
  requireAuthCookie,
  requirePermission('content.media.delete'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { currentPath, itemName } = req.body;

    motherEmitter.emit(
      'deleteLocalItem',
      {
        jwt: userToken,
        moduleName: 'mediaManager',
        moduleType: 'core',
        currentPath: currentPath || '',
        itemName
      },
      (err) => {
        if (err) {
          console.error('[MEDIA ROUTE] deleteLocalItem =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: 'Item deleted.'
        });
      }
    );
  }
);

/**
 * POST /admin/content/media/multi-upload
 * => meltdown => uploadFileToFolder
 * This code manually parses multipart/form-data, then calls meltdown => "uploadFileToFolder"
 */
router.post(
  '/multi-upload',
  requireAuthCookie,
  requirePermission('content.media.create'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ success: false, error: 'Expected multipart/form-data' });
    }
    const boundaryMatch = contentType.match(/boundary=(.*)$/);
    if (!boundaryMatch) {
      return res.status(400).json({ success: false, error: 'No multipart boundary found' });
    }
    const boundary = '--' + boundaryMatch[1];

    // We'll parse the stream manually (similar to your existing approach)
    let chunkBuffer = Buffer.alloc(0);
    let filePromises = [];

    // Optional: track a userFolder if the client sends it
    let userFolder = '';

    req.on('data', (chunk) => {
      chunkBuffer = Buffer.concat([chunkBuffer, chunk]);

      let boundaryPos;
      while ((boundaryPos = chunkBuffer.indexOf(boundary)) !== -1) {
        let partBuffer = chunkBuffer.slice(0, boundaryPos);
        chunkBuffer    = chunkBuffer.slice(boundaryPos + boundary.length);

        const nextTwo = chunkBuffer.slice(0, 2).toString('binary');
        if (nextTwo === '--') {
          chunkBuffer = Buffer.alloc(0);
          break;
        }

        if (partBuffer.slice(0, 2).toString('binary') === '\r\n') {
          partBuffer = partBuffer.slice(2);
        }

        const partInfo = parsePart(partBuffer);
        if (!partInfo) continue;

        if (partInfo.isFile) {
          const finalFolder = userFolder && userFolder.trim()
            ? userFolder
            : autoFolderForFile(partInfo.fileName, partInfo.mimeType);

          // meltdown => uploadFileToFolder
          const p = meltdownUploadFile(userToken, partInfo, finalFolder);
          filePromises.push(p);
        } else {
          if (partInfo.fieldName === 'folderChoice') {
            userFolder = partInfo.textValue || '';
          }
        }
      }
    });

    req.on('end', () => {
      Promise.all(filePromises)
        .then(() => res.json({ success: true, message: `Uploaded ${filePromises.length} file(s)` }))
        .catch(err => {
          console.error('[MEDIA ROUTE] multi-upload =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        });
    });

    req.on('error', (err) => {
      console.error('[MEDIA ROUTE] Request error =>', err.message);
      return res.status(500).json({ success: false, error: err.message });
    });
  }
);

/**
 * parsePart:
 *  Detects file part vs. text field by looking for filename="..."
 */
function parsePart(partBuffer) {
  const partStr = partBuffer.toString('binary');
  const nameMatch = partStr.match(/name="([^"]*)"/);
  if (!nameMatch) return null;

  const fieldName = nameMatch[1];
  if (partStr.includes('filename="')) {
    // It's a file
    const fileNameMatch = partStr.match(/filename="([^"]*)"/);
    const fileName = fileNameMatch ? fileNameMatch[1] : 'unknown.bin';

    let mimeType = 'application/octet-stream';
    const ctypeMatch = partStr.match(/Content-Type: (.*)\r\n\r\n/);
    let offset = partStr.indexOf('\r\n\r\n') + 4;
    if (ctypeMatch) {
      mimeType = ctypeMatch[1].trim();
    }
    let fileData = partBuffer.slice(offset);
    if (fileData.slice(-2).toString('binary') === '\r\n') {
      fileData = fileData.slice(0, -2);
    }
    return { isFile: true, fileName, mimeType, fileData };
  } else {
    // It's a text field
    const doubleCrlfPos = partStr.indexOf('\r\n\r\n');
    if (doubleCrlfPos === -1) {
      return { isFile: false, fieldName, textValue: '' };
    }
    let text = partStr.slice(doubleCrlfPos + 4);
    if (text.endsWith('\r\n')) {
      text = text.slice(0, -2);
    }
    return { isFile: false, fieldName, textValue: text };
  }
}

/**
 * meltdownUploadFile => meltdown => uploadFileToFolder
 */
function meltdownUploadFile(userToken, partInfo, finalFolder) {
  return new Promise((resolve, reject) => {
    motherEmitter.emit(
      'uploadFileToFolder',
      {
        jwt: userToken,
        moduleName: 'mediaManager',
        moduleType: 'core',
        fileName: partInfo.fileName,
        fileData: partInfo.fileData,
        mimeType: partInfo.mimeType,
        subPath: finalFolder
      },
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

/**
 * autoFolderForFile:
 *  Example approach: guess subfolder by mimeType
 */
function autoFolderForFile(fileName, mimeType) {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType === 'application/pdf') return 'docs';
  return 'misc';
}

/**
 * POST /admin/content/media/make-public
 * => meltdown => makeFilePublic
 * Body: { filePath, userId }
 * If user is admin => isAdmin = true, else meltdown => checks "media.makePublic" permission
 */
router.post(
  '/make-public',
  requireAuthCookie,
  requirePermission('content.media.edit'), // or your chosen permission
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { filePath } = req.body || {};

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'No filePath provided.' });
    }

    const userId  = req.user?.id;
    const isAdmin = req.user?.roles?.includes('admin') || req.user?.role === 'admin';

    motherEmitter.emit(
      'makeFilePublic',
      {
        jwt: userToken,
        moduleName: 'mediaManager',
        moduleType: 'core',
        userId,
        filePath,
        isAdmin
      },
      (err, result) => {
        if (err) {
          console.error('[MEDIA ROUTE] makeFilePublic =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          publicPath: result.publicPath,
          shareLink: result.shareLink || null
        });
      }
    );
  }
);

module.exports = router;
