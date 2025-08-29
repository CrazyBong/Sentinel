import Evidence from '../models/evidence.model.js';
import Campaign from '../models/campaign.model.js';
import { processFile, checkDuplicate, validateFile } from '../middlewares/upload.js';
import socketService from '../services/socketService.js';
import fs from 'fs/promises';
import path from 'path';
import Joi from 'joi';

// Validation schemas
const evidenceUpdateSchema = Joi.object({
  tags: Joi.array().items(Joi.string().trim()).optional(),
  category: Joi.string().valid('screenshot', 'media_file', 'document', 'report', 'backup', 'other').optional(),
  visibility: Joi.string().valid('public', 'team', 'private').optional(),
  description: Joi.string().max(1000).optional()
});

// Upload evidence files
export const uploadEvidence = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tags = [], category = 'other', visibility = 'team', description = '' } = req.body;

    // Validate campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check access permissions
    const hasAccess = campaign.createdBy.toString() === req.user._id.toString() ||
                     campaign.team.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Validate file
        const validationErrors = validateFile(file);
        if (validationErrors.length > 0) {
          errors.push({ file: file.originalname, errors: validationErrors });
          continue;
        }

        // Process file
        const processedFile = await processFile(file, campaignId);

        // Check for duplicates
        const duplicate = await checkDuplicate(processedFile.hash, campaignId);
        if (duplicate) {
          errors.push({ 
            file: file.originalname, 
            errors: [`Duplicate file detected: ${duplicate.originalName}`] 
          });
          
          // Delete uploaded file
          await fs.unlink(file.path).catch(console.error);
          continue;
        }

        // Create evidence record
        const evidence = new Evidence({
          filename: file.filename,
          originalName: file.originalname,
          fileType: processedFile.fileType,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
          url: processedFile.url,
          thumbnailUrl: processedFile.thumbnailUrl,
          metadata: processedFile.metadata,
          campaign: campaignId,
          tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()),
          category,
          visibility,
          uploadedBy: req.user._id,
          status: 'ready',
          versions: [{
            version: 1,
            filename: file.filename,
            filePath: file.path,
            url: processedFile.url,
            uploadedAt: new Date(),
            uploadedBy: req.user._id,
            changes: 'Initial upload'
          }]
        });

        await evidence.save();
        await evidence.populate('uploadedBy', 'name email');

        uploadedFiles.push(evidence);

        // Log access
        evidence.accessLog.push({
          user: req.user._id,
          action: 'view',
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        await evidence.save();

        // Send real-time update
        socketService.sendCampaignUpdate({
          id: campaignId,
          type: 'evidence_added',
          evidence: {
            id: evidence._id,
            filename: evidence.originalName,
            type: evidence.fileType
          }
        });

      } catch (fileError) {
        console.error('File processing error:', fileError);
        errors.push({ 
          file: file.originalname, 
          errors: [fileError.message] 
        });
        
        // Clean up file on error
        await fs.unlink(file.path).catch(console.error);
      }
    }

    res.status(uploadedFiles.length > 0 ? 201 : 400).json({
      success: uploadedFiles.length > 0,
      message: uploadedFiles.length > 0 ? 
        `${uploadedFiles.length} file(s) uploaded successfully` : 
        'No files were uploaded successfully',
      data: {
        uploaded: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined,
        stats: {
          total: req.files.length,
          successful: uploadedFiles.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    console.error('Upload evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload evidence'
    });
  }
};

// Get evidence for a campaign
export const getCampaignEvidence = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      fileType, 
      category, 
      tags, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Build query
    const query = {
      campaign: campaignId,
      isArchived: false
    };

    if (fileType) query.fileType = fileType;
    if (category) query.category = category;
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagList };
    }
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { 'metadata.title': { $regex: search, $options: 'i' } },
        { 'metadata.description': { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const evidence = await Evidence.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('uploadedBy', 'name email avatar')
      .populate('relatedTweets', 'content username')
      .lean();

    const total = await Evidence.countDocuments(query);

    // Add access log entry for each viewed evidence
    const evidenceIds = evidence.map(e => e._id);
    if (evidenceIds.length > 0) {
      await Evidence.updateMany(
        { _id: { $in: evidenceIds } },
        {
          $push: {
            accessLog: {
              user: req.user._id,
              action: 'view',
              timestamp: new Date(),
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          }
        }
      );
    }

    res.json({
      success: true,
      data: {
        evidence,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        },
        filters: {
          fileTypes: await Evidence.distinct('fileType', { campaign: campaignId }),
          categories: await Evidence.distinct('category', { campaign: campaignId }),
          allTags: await Evidence.distinct('tags', { campaign: campaignId })
        }
      }
    });
  } catch (error) {
    console.error('Get campaign evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get evidence'
    });
  }
};

// Get single evidence details
export const getEvidenceById = async (req, res) => {
  try {
    const { id } = req.params;

    const evidence = await Evidence.findById(id)
      .populate('uploadedBy', 'name email avatar')
      .populate('campaign', 'name topic')
      .populate('relatedTweets', 'content username likes retweets')
      .populate('relatedAlerts', 'title severity')
      .populate('versions.uploadedBy', 'name email')
      .populate('accessLog.user', 'name email');

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // Check access permissions
    const campaign = evidence.campaign;
    const hasAccess = campaign.createdBy.toString() === req.user._id.toString() ||
                     campaign.team?.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Log access
    evidence.accessLog.push({
      user: req.user._id,
      action: 'view',
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    await evidence.save();

    res.json({
      success: true,
      data: { evidence }
    });
  } catch (error) {
    console.error('Get evidence by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get evidence'
    });
  }
};

// Update evidence metadata
export const updateEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = evidenceUpdateSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // Check permissions
    const hasEditAccess = evidence.uploadedBy.toString() === req.user._id.toString();
    if (!hasEditAccess) {
      return res.status(403).json({
        success: false,
        message: 'Only the uploader can edit evidence metadata'
      });
    }

    // Update fields
    Object.assign(evidence, value);
    await evidence.save();

    // Log access
    evidence.accessLog.push({
      user: req.user._id,
      action: 'edit',
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    await evidence.save();

    await evidence.populate('uploadedBy', 'name email');

    res.json({
      success: true,
      message: 'Evidence updated successfully',
      data: { evidence }
    });
  } catch (error) {
    console.error('Update evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update evidence'
    });
  }
};

// Download evidence file
export const downloadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // Get file path for specific version or current
    let filePath = evidence.filePath;
    let filename = evidence.originalName;

    if (version) {
      const versionData = evidence.versions.find(v => v.version === parseInt(version));
      if (!versionData) {
        return res.status(404).json({
          success: false,
          message: 'Version not found'
        });
      }
      filePath = versionData.filePath;
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (fileError) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Log download
    evidence.accessLog.push({
      user: req.user._id,
      action: 'download',
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    await evidence.save();

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Download failed'
          });
        }
      }
    });
  } catch (error) {
    console.error('Download evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download evidence'
    });
  }
};

// Delete evidence
export const deleteEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // Check permissions (only uploader or campaign lead)
    const campaign = await Campaign.findById(evidence.campaign);
    const isUploader = evidence.uploadedBy.toString() === req.user._id.toString();
    const isCampaignLead = campaign.createdBy.toString() === req.user._id.toString();

    if (!isUploader && !isCampaignLead) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete evidence'
      });
    }

    if (permanent === 'true') {
      // Permanent deletion - remove files and database record
      try {
        // Delete main file
        await fs.unlink(evidence.filePath).catch(console.error);
        
        // Delete thumbnail if exists
        if (evidence.thumbnailUrl) {
          const thumbnailPath = path.join(process.cwd(), evidence.thumbnailUrl);
          await fs.unlink(thumbnailPath).catch(console.error);
        }

        // Delete version files
        for (const version of evidence.versions) {
          if (version.filePath !== evidence.filePath) {
            await fs.unlink(version.filePath).catch(console.error);
          }
        }

        await Evidence.findByIdAndDelete(id);
      } catch (deleteError) {
        console.error('File deletion error:', deleteError);
      }

      res.json({
        success: true,
        message: 'Evidence permanently deleted'
      });
    } else {
      // Soft deletion - archive
      evidence.isArchived = true;
      evidence.archivedAt = new Date();
      evidence.archivedBy = req.user._id;
      
      // Log deletion
      evidence.accessLog.push({
        user: req.user._id,
        action: 'delete',
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await evidence.save();

      res.json({
        success: true,
        message: 'Evidence archived successfully'
      });
    }
  } catch (error) {
    console.error('Delete evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete evidence'
    });
  }
};

// Get evidence analytics
export const getEvidenceAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const analytics = await Evidence.aggregate([
      {
        $match: {
          campaign: new mongoose.Types.ObjectId(campaignId),
          isArchived: false
        }
      },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          fileTypes: { $push: '$fileType' },
          categories: { $push: '$category' },
          avgFileSize: { $avg: '$fileSize' },
          uploaders: { $addToSet: '$uploadedBy' }
        }
      }
    ]);

    const summary = analytics[0] || {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: [],
      categories: [],
      avgFileSize: 0,
      uploaders: []
    };

    // File type distribution
    const fileTypeDistribution = summary.fileTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Category distribution
    const categoryDistribution = summary.categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Recent uploads
    const recentUploads = await Evidence.find({
      campaign: campaignId,
      isArchived: false
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('uploadedBy', 'name')
    .select('originalName fileType fileSize createdAt uploadedBy');

    res.json({
      success: true,
      data: {
        summary: {
          totalFiles: summary.totalFiles,
          totalSize: summary.totalSize,
          avgFileSize: Math.round(summary.avgFileSize || 0),
          uniqueUploaders: summary.uploaders.length
        },
        distributions: {
          fileTypes: fileTypeDistribution,
          categories: categoryDistribution
        },
        recentUploads
      }
    });
  } catch (error) {
    console.error('Get evidence analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get evidence analytics'
    });
  }
};