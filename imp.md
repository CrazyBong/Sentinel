# SentinelAI Backend API Documentation 📚

**Complete System Documentation for Frontend Integration**

---

## 🏗️ System Architecture Overview

### Core Data Flow
```
User Request → Authentication → Controller → Service → Database → Response
                    ↓
            Socket.IO Real-time Updates → Frontend
```

### Key Components
- **MongoDB**: Primary database for all entities
- **Redis**: Caching and session management  
- **Socket.IO**: Real-time communication
- **Gemini AI**: Content analysis and threat detection
- **Multer**: File upload handling

---

## 🔐 Authentication System

### System Flow
1. User registers/logs in with credentials
2. JWT token generated and returned
3. Token required for all protected routes
4. Token validation on each request

### Features Implemented
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Token refresh mechanism
- ✅ Account verification system

### API Endpoints

#### **POST** `/api/auth/register`
**Purpose**: Register new user account

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "analyst"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "userId",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "analyst"
    },
    "token": "jwt_token_here"
  }
}
```

#### **POST** `/api/auth/login`
**Purpose**: Authenticate user and get access token

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "userId",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "analyst"
    },
    "token": "jwt_token_here"
  }
}
```

#### **GET** `/api/auth/profile`
**Purpose**: Get current user profile
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "userId",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "analyst",
    "verified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **POST** `/api/auth/logout`
**Purpose**: Logout user and invalidate token
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🎯 Campaign Management System

### System Flow
1. User creates campaign with targets and keywords
2. Campaign validates and saves to database
3. Background crawlers start monitoring based on campaign settings
4. Evidence can be attached to campaigns
5. Real-time updates sent via Socket.IO

### Features Implemented
- ✅ Full CRUD operations
- ✅ Team collaboration with roles
- ✅ Evidence attachment system
- ✅ Real-time statistics tracking
- ✅ Advanced filtering and search
- ✅ Campaign archiving
- ✅ Activity scoring algorithm

### API Endpoints

#### **POST** `/api/campaigns`
**Purpose**: Create new campaign
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Election Monitoring 2024",
  "description": "Monitor election-related misinformation",
  "topic": "politics",
  "priority": "high",
  "category": "misinformation",
  "platforms": ["x"],
  "keywords": ["election", "vote", "ballot"],
  "hashtags": ["#election2024", "#vote"],
  "targetAccounts": [
    {
      "platform": "x",
      "username": "@suspiciousaccount",
      "handle": "suspiciousaccount",
      "notes": "Known misinformation spreader"
    }
  ],
  "settings": {
    "maxTweets": 500,
    "crawlInterval": 300000,
    "alertThreshold": 0.8,
    "enableRealTimeAlerts": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "_id": "campaignId",
    "name": "Election Monitoring 2024",
    "status": "active",
    "createdBy": "userId",
    "stats": {
      "totalTweets": 0,
      "realPosts": 0,
      "fakePosts": 0,
      "alertsGenerated": 0
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **GET** `/api/campaigns`
**Purpose**: Get list of campaigns with filtering
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `status`: Filter by status (active, paused, completed, archived)
- `priority`: Filter by priority (low, medium, high, critical)
- `category`: Filter by category
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in name/description

**Response**:
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "_id": "campaignId",
        "name": "Election Monitoring 2024",
        "description": "Monitor election-related misinformation",
        "status": "active",
        "priority": "high",
        "stats": {
          "totalTweets": 156,
          "realPosts": 120,
          "fakePosts": 36,
          "alertsGenerated": 8
        },
        "severity": "medium",
        "activityScore": 85,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### **GET** `/api/campaigns/:id`
**Purpose**: Get detailed campaign information
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "campaignId",
    "name": "Election Monitoring 2024",
    "description": "Monitor election-related misinformation",
    "topic": "politics",
    "status": "active",
    "priority": "high",
    "category": "misinformation",
    "platforms": ["x"],
    "keywords": ["election", "vote", "ballot"],
    "hashtags": ["#election2024", "#vote"],
    "targetAccounts": [...],
    "settings": {...},
    "stats": {...},
    "team": [
      {
        "user": {
          "_id": "userId",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "role": "lead",
        "assignedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "evidence": [
      {
        "_id": "evidenceId",
        "filename": "screenshot.png",
        "fileType": "image",
        "category": "screenshot",
        "uploadedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "severity": "medium",
    "activityScore": 85,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **PUT** `/api/campaigns/:id`
**Purpose**: Update campaign details
**Headers**: `Authorization: Bearer <token>`

**Request Body**: (Same structure as POST, all fields optional)

#### **DELETE** `/api/campaigns/:id`
**Purpose**: Archive campaign (soft delete)
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Campaign archived successfully"
}
```

#### **POST** `/api/campaigns/:id/team`
**Purpose**: Add team member to campaign
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "userId": "userIdToAdd",
  "role": "analyst"
}
```

#### **GET** `/api/campaigns/:id/analytics`
**Purpose**: Get campaign analytics data
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTweets": 156,
      "realPosts": 120,
      "fakePosts": 36,
      "averageSentiment": 0.2,
      "engagementRate": 0.15
    },
    "trends": {
      "daily": [...],
      "hourly": [...]
    },
    "topKeywords": [...],
    "threatDistribution": [...]
  }
}
```

---

## 📂 Evidence Management System

### System Flow
1. User uploads files (images, documents, videos)
2. Multer middleware processes and validates files
3. Files stored in `/uploads` directory with metadata
4. Evidence linked to campaigns
5. File analysis performed (type detection, metadata extraction)

### Features Implemented
- ✅ Multi-file upload support
- ✅ File type validation and security checks
- ✅ Metadata extraction and storage
- ✅ Campaign association
- ✅ Tagging and categorization
- ✅ File download and streaming
- ✅ Duplicate detection (MD5 hashing)

### API Endpoints

#### **POST** `/api/evidence/upload`
**Purpose**: Upload evidence files to campaign
**Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`

**Form Data**:
```
files: [file1, file2, ...] (max 10 files, 10MB each)
campaignId: "campaignId"
category: "screenshot" | "media_file" | "document" | "report" | "backup" | "other"
tags: ["tag1", "tag2"]
description: "Description of evidence"
visibility: "public" | "team" | "private"
```

**Response**:
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "uploaded": [
      {
        "_id": "evidenceId",
        "filename": "screenshot.png",
        "originalName": "evidence_screenshot.png",
        "fileType": "image",
        "fileSize": 245760,
        "mimeType": "image/png",
        "category": "screenshot",
        "tags": ["suspicious", "profile"],
        "campaign": "campaignId",
        "metadata": {
          "dimensions": { "width": 1920, "height": 1080 },
          "hash": { "md5": "abc123..." }
        },
        "uploadedBy": "userId",
        "uploadedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "failed": []
  }
}
```

#### **GET** `/api/evidence/campaign/:campaignId`
**Purpose**: Get all evidence for a campaign
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `category`: Filter by category
- `fileType`: Filter by file type (image, document, video, etc.)
- `tags`: Filter by tags (comma-separated)
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "evidence": [
      {
        "_id": "evidenceId",
        "filename": "screenshot.png",
        "originalName": "evidence_screenshot.png",
        "fileType": "image",
        "fileSize": 245760,
        "category": "screenshot",
        "tags": ["suspicious", "profile"],
        "description": "Suspicious profile screenshot",
        "visibility": "team",
        "downloadUrl": "/api/evidence/download/evidenceId",
        "uploadedBy": {
          "_id": "userId",
          "name": "John Doe"
        },
        "uploadedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 3,
      "hasNext": false
    }
  }
}
```

#### **GET** `/api/evidence/:id`
**Purpose**: Get single evidence details
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "evidenceId",
    "filename": "screenshot.png",
    "originalName": "evidence_screenshot.png",
    "fileType": "image",
    "fileSize": 245760,
    "mimeType": "image/png",
    "category": "screenshot",
    "tags": ["suspicious", "profile"],
    "description": "Suspicious profile screenshot",
    "visibility": "team",
    "metadata": {
      "dimensions": { "width": 1920, "height": 1080 },
      "hash": { "md5": "abc123..." },
      "exif": {...}
    },
    "campaign": {
      "_id": "campaignId",
      "name": "Election Monitoring 2024"
    },
    "uploadedBy": {
      "_id": "userId",
      "name": "John Doe"
    },
    "downloadUrl": "/api/evidence/download/evidenceId",
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **GET** `/api/evidence/download/:id`
**Purpose**: Download evidence file
**Headers**: `Authorization: Bearer <token>`

**Response**: File stream with appropriate headers

#### **PUT** `/api/evidence/:id`
**Purpose**: Update evidence metadata
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "tags": ["updated", "tags"],
  "category": "document",
  "description": "Updated description",
  "visibility": "private"
}
```

#### **DELETE** `/api/evidence/:id`
**Purpose**: Delete evidence (soft delete)
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Evidence deleted successfully"
}
```

#### **GET** `/api/evidence/analytics`
**Purpose**: Get evidence analytics
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalFiles": 45,
    "totalSize": "125.6 MB",
    "byCategory": {
      "screenshot": 20,
      "document": 15,
      "media_file": 10
    },
    "byFileType": {
      "image": 25,
      "pdf": 10,
      "video": 10
    },
    "recentUploads": [...]
  }
}
```

---

## 🚨 Alert Management System

### System Flow
1. AI analyzes content and generates alerts based on rules
2. Alert rules engine evaluates conditions
3. Alerts created with severity and type classification
4. Real-time notifications sent via Socket.IO
5. Users can manage and respond to alerts

### Features Implemented
- ✅ Dynamic alert rules engine
- ✅ Severity classification (low, medium, high, critical)
- ✅ Multiple alert types (threat, misinformation, spam, etc.)
- ✅ Real-time notifications
- ✅ Alert lifecycle management
- ✅ Bulk operations
- ✅ Response time tracking

### API Endpoints

#### **GET** `/api/alerts`
**Purpose**: Get alerts with filtering
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `status`: Filter by status (open, investigating, resolved, dismissed)
- `severity`: Filter by severity (low, medium, high, critical)
- `type`: Filter by type
- `campaignId`: Filter by campaign
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "_id": "alertId",
        "title": "High Threat Content Detected",
        "description": "Multiple threatening tweets detected from coordinated accounts",
        "type": "threat_detection",
        "category": "safety",
        "severity": "high",
        "status": "open",
        "confidence": 0.89,
        "relatedTweets": ["tweetId1", "tweetId2"],
        "relatedCampaigns": ["campaignId"],
        "metadata": {
          "accountsInvolved": 5,
          "timeframe": "2 hours",
          "pattern": "coordinated_posting"
        },
        "createdBy": "system",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 25,
      "hasNext": true
    }
  }
}
```

#### **GET** `/api/alerts/:id`
**Purpose**: Get detailed alert information
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "alertId",
    "title": "High Threat Content Detected",
    "description": "Multiple threatening tweets detected from coordinated accounts",
    "type": "threat_detection",
    "category": "safety",
    "severity": "high",
    "status": "open",
    "confidence": 0.89,
    "relatedTweets": [
      {
        "_id": "tweetId",
        "content": "Threatening content...",
        "username": "@suspicious",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "relatedCampaigns": [...],
    "metadata": {...},
    "actions": [
      {
        "action": "status_change",
        "from": "open",
        "to": "investigating",
        "performedBy": "userId",
        "timestamp": "2024-01-01T01:00:00.000Z",
        "notes": "Starting investigation"
      }
    ],
    "assignedTo": "userId",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **PUT** `/api/alerts/:id/status`
**Purpose**: Update alert status
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "status": "investigating",
  "notes": "Starting detailed analysis",
  "assignedTo": "userId"
}
```

#### **POST** `/api/alerts/rules`
**Purpose**: Create custom alert rule
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "High Threat Keywords",
  "description": "Alert on posts containing threat keywords",
  "enabled": true,
  "conditions": {
    "keywords": ["bomb", "attack", "kill"],
    "sentiment": { "max": -0.5 },
    "confidence": { "min": 0.7 }
  },
  "actions": {
    "alertSeverity": "high",
    "notifyUsers": ["userId1", "userId2"],
    "autoAssign": "userId1"
  },
  "scope": {
    "campaigns": ["campaignId"],
    "platforms": ["x"]
  }
}
```

#### **GET** `/api/alerts/rules`
**Purpose**: Get list of alert rules
**Headers**: `Authorization: Bearer <token>`

#### **DELETE** `/api/alerts/bulk`
**Purpose**: Bulk delete/archive alerts
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "alertIds": ["alertId1", "alertId2"],
  "action": "archive"
}
```

---

## 🤖 AI Analysis System

### System Flow
1. Content submitted for analysis (tweets, posts, etc.)
2. Gemini AI processes content for multiple analysis types
3. Results include classification, sentiment, threat detection
4. Confidence scores calculated for each analysis
5. Results stored and linked to original content

### Features Implemented
- ✅ Multi-type content analysis
- ✅ Sentiment analysis (-1 to 1 scale)
- ✅ Threat detection with confidence scoring
- ✅ Content classification (real, fake, propaganda, spam)
- ✅ Batch processing capabilities
- ✅ Language detection
- ✅ Entity extraction

### API Endpoints

#### **POST** `/api/ai/analyze`
**Purpose**: Analyze content using AI
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "content": "This is the text content to analyze",
  "type": "tweet",
  "context": {
    "username": "@example",
    "platform": "x",
    "campaignId": "campaignId"
  },
  "analysisTypes": ["sentiment", "classification", "threats", "entities"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contentId": "analysisId",
    "analysis": {
      "sentiment": {
        "score": -0.3,
        "label": "negative",
        "confidence": 0.87
      },
      "classification": {
        "category": "misinformation",
        "confidence": 0.74,
        "reasoning": "Contains unverified claims about political figures"
      },
      "threats": [
        {
          "type": "harassment",
          "confidence": 0.65,
          "severity": "medium",
          "indicators": ["threatening language", "personal attacks"]
        }
      ],
      "entities": [
        {
          "text": "John Doe",
          "type": "PERSON",
          "confidence": 0.99
        },
        {
          "text": "New York",
          "type": "LOCATION",
          "confidence": 0.95
        }
      ],
      "language": {
        "detected": "en",
        "confidence": 0.99
      },
      "metadata": {
        "processingTime": 1250,
        "modelVersion": "gemini-1.5-pro",
        "analysisTimestamp": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

#### **POST** `/api/ai/analyze/batch`
**Purpose**: Analyze multiple content items
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "items": [
    {
      "id": "item1",
      "content": "First content to analyze",
      "type": "tweet"
    },
    {
      "id": "item2", 
      "content": "Second content to analyze",
      "type": "post"
    }
  ],
  "analysisTypes": ["sentiment", "classification"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "item1",
        "analysis": {...}
      },
      {
        "id": "item2",
        "analysis": {...}
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "averageProcessingTime": 1100
    }
  }
}
```

#### **GET** `/api/ai/analysis/:id`
**Purpose**: Get stored analysis results
**Headers**: `Authorization: Bearer <token>`

#### **GET** `/api/ai/models`
**Purpose**: Get available AI models and capabilities
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "gemini-1.5-pro",
        "capabilities": ["text", "multimodal"],
        "languages": ["en", "es", "fr", "de"],
        "maxTokens": 2000000,
        "status": "active"
      }
    ],
    "analysisTypes": [
      {
        "type": "sentiment",
        "description": "Emotional tone analysis",
        "outputRange": "(-1, 1)"
      },
      {
        "type": "classification",
        "description": "Content categorization",
        "categories": ["real", "fake", "misinformation", "propaganda", "spam"]
      }
    ]
  }
}
```

---

## 🕷️ Crawler System

### System Flow
1. Campaign defines targets (keywords, accounts, hashtags)
2. Twitter crawler monitors specified content
3. Real-time tweets collected and stored
4. AI analysis triggered automatically
5. Alerts generated based on analysis results

### Features Implemented
- ✅ Real-time Twitter monitoring
- ✅ Keyword and hashtag tracking
- ✅ Account monitoring
- ✅ Rate limiting and error handling
- ✅ Configurable crawl intervals
- ✅ Data deduplication
- ✅ Geographic filtering

### API Endpoints

#### **POST** `/api/crawler/start`
**Purpose**: Start crawler for campaign
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "campaignId": "campaignId",
  "config": {
    "maxTweets": 100,
    "interval": 300000,
    "enableRealTime": true,
    "filters": {
      "language": "en",
      "verified": false,
      "minFollowers": 0
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Crawler started successfully",
  "data": {
    "crawlerId": "crawlerId",
    "campaignId": "campaignId",
    "status": "running",
    "config": {...},
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **POST** `/api/crawler/stop`
**Purpose**: Stop crawler for campaign
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "campaignId": "campaignId"
}
```

#### **GET** `/api/crawler/status/:campaignId`
**Purpose**: Get crawler status
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "crawlerId": "crawlerId",
    "campaignId": "campaignId",
    "status": "running",
    "stats": {
      "tweetsCollected": 156,
      "lastCrawl": "2024-01-01T00:30:00.000Z",
      "averageInterval": 290000,
      "errorsEncountered": 2
    },
    "config": {...},
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **GET** `/api/crawler/tweets/:campaignId`
**Purpose**: Get collected tweets for campaign
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page`: Page number
- `limit`: Items per page
- `sentiment`: Filter by sentiment range
- `classification`: Filter by classification
- `dateFrom`: Start date filter
- `dateTo`: End date filter

**Response**:
```json
{
  "success": true,
  "data": {
    "tweets": [
      {
        "_id": "tweetId",
        "tweetId": "123456789",
        "content": "This is a tweet content...",
        "username": "@example",
        "displayName": "Example User",
        "verified": false,
        "followerCount": 1500,
        "likes": 25,
        "retweets": 5,
        "replies": 2,
        "sentiment": 0.2,
        "classification": "real",
        "classificationConfidence": 0.87,
        "threats": [],
        "entities": [...],
        "hashtags": ["#example"],
        "mentions": ["@mentioned"],
        "urls": ["https://example.com"],
        "location": {
          "country": "US",
          "city": "New York"
        },
        "campaign": "campaignId",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### **GET** `/api/crawler/stats`
**Purpose**: Get overall crawler statistics
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "activeCrawlers": 3,
    "totalTweetsToday": 1250,
    "totalCampaigns": 8,
    "averageProcessingTime": 850,
    "errorRate": 0.02,
    "platformStats": {
      "x": {
        "active": true,
        "tweetsCollected": 1250,
        "rateLimit": {
          "remaining": 180,
          "resetTime": "2024-01-01T01:00:00.000Z"
        }
      }
    }
  }
}
```

---

## 📊 Analytics & Dashboard System

### System Flow
1. Data collected from all systems (campaigns, tweets, alerts)
2. Real-time aggregation and processing
3. Analytics calculations (trends, patterns, statistics)
4. Dashboard data prepared and cached
5. Real-time updates sent via Socket.IO

### Features Implemented
- ✅ Real-time dashboard metrics
- ✅ Campaign performance analytics
- ✅ Threat intelligence reporting
- ✅ System performance monitoring
- ✅ Activity feed tracking
- ✅ Export functionality
- ✅ Custom time range filtering

### API Endpoints

#### **GET** `/api/dashboard/overview`
**Purpose**: Get dashboard overview data
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `timeRange`: Hours to look back (default: 24)
- `campaignId`: Filter by specific campaign
- `refresh`: Force refresh cache (true/false)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCampaigns": 8,
      "activeCampaigns": 5,
      "totalTweets": 1250,
      "totalAlerts": 45,
      "openAlerts": 12,
      "systemStatus": "operational"
    },
    "campaigns": {
      "byStatus": [
        { "_id": "active", "count": 5 },
        { "_id": "paused", "count": 2 }
      ],
      "recent": [...],
      "topPerforming": [...]
    },
    "alerts": {
      "bySeverity": [
        { "_id": "high", "count": 8, "resolved": 3 },
        { "_id": "medium", "count": 20, "resolved": 15 }
      ],
      "trends": [...],
      "responseTimeStats": [...]
    },
    "content": {
      "sentiment": [...],
      "classification": [...],
      "topHashtags": [...]
    },
    "threats": {
      "byType": [...],
      "byLocation": [...],
      "totalThreats": 23
    },
    "realTime": {
      "activeUsers": 3,
      "systemHealth": {...},
      "lastUpdate": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### **GET** `/api/dashboard/realtime`
**Purpose**: Get real-time data streams
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `type`: Data type (live_tweets, live_alerts, system_status, activity_feed)
- `limit`: Number of items (default: 20)
- `campaignId`: Filter by campaign
- `severity`: Filter alerts by severity

**Response**:
```json
{
  "success": true,
  "data": {
    "tweets": [...],
    "alerts": [...],
    "count": 15,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **GET** `/api/dashboard/system/metrics`
**Purpose**: Get system performance metrics
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "system": {
      "uptime": 86400,
      "memory": {
        "used": 134217728,
        "total": 536870912
      },
      "cpu": {...},
      "activeConnections": 5
    },
    "database": {
      "collections": {
        "tweets": 5000,
        "campaigns": 25,
        "alerts": 150
      },
      "status": "connected"
    },
    "socketStats": {...},
    "health": {
      "status": "healthy",
      "services": {...}
    }
  }
}
```

#### **GET** `/api/campaigns/:id/analytics`
**Purpose**: Get detailed campaign analytics
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "campaign": "campaignId",
    "timeRange": 24,
    "content": {
      "sentiment": [...],
      "classification": [...],
      "totalProcessed": 156
    },
    "threats": {
      "byType": [...],
      "byLocation": [...],
      "totalThreats": 8
    },
    "alerts": {
      "bySeverity": [...],
      "trends": [...],
      "totalOpen": 3
    },
    "trends": {
      "activity": [...],
      "engagement": [...]
    }
  }
}
```

#### **POST** `/api/dashboard/export`
**Purpose**: Export analytics data
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "type": "dashboard",
  "format": "json",
  "timeRange": 24
}
```

#### **POST** `/api/dashboard/subscribe`
**Purpose**: Subscribe to real-time dashboard updates
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "preferences": {
    "dashboard": true,
    "alerts": true,
    "campaigns": true,
    "system": false
  }
}
```

---

## 🔍 Search System

### System Flow
1. User submits search query with filters
2. Multi-collection search across tweets, campaigns, evidence, alerts
3. Text indexing and relevance scoring
4. Pattern detection and content correlation
5. Results ranked and paginated

### Features Implemented
- ✅ Universal search across all content types
- ✅ Advanced filtering (sentiment, date, type, etc.)
- ✅ Pattern detection algorithms
- ✅ Content similarity analysis
- ✅ Search history and suggestions
- ✅ Real-time autocomplete
- ✅ Export search results

### API Endpoints

#### **POST** `/api/search/universal`
**Purpose**: Universal search across all content
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "query": "election misinformation",
  "contentTypes": ["tweets", "campaigns", "evidence", "alerts"],
  "filters": {
    "sentiment": {
      "min": -1,
      "max": 0.5
    },
    "classification": ["misinformation", "propaganda"],
    "severity": ["high", "critical"],
    "dateRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-02T00:00:00.000Z"
    }
  },
  "page": 1,
  "limit": 20,
  "sortBy": "relevance"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tweets": [...],
    "campaigns": [...],
    "evidence": [...],
    "alerts": [...],
    "users": [...],
    "total": 45,
    "combined": [...],
    "searchTime": 150,
    "query": "election misinformation",
    "options": {...}
  }
}
```

#### **GET** `/api/search/quick`
**Purpose**: Quick search with autocomplete
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `q`: Search query (minimum 2 characters)
- `type`: Content type filter (default: all)
- `limit`: Number of results (default: 10)

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "election fraud",
      "election security",
      "election results"
    ],
    "results": [...],
    "total": 25,
    "searchTime": 50
  }
}
```

#### **POST** `/api/search/similar`
**Purpose**: Find similar content
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "contentId": "tweetId",
  "contentType": "tweet",
  "limit": 10,
  "threshold": 0.7
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "similarContent": [
      {
        "_id": "similarTweetId",
        "content": "Similar tweet content...",
        "similarity": 0.85,
        "type": "tweet"
      }
    ],
    "contentId": "tweetId",
    "contentType": "tweet",
    "threshold": 0.7,
    "count": 5
  }
}
```

#### **GET** `/api/search/patterns`
**Purpose**: Detect content patterns
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `campaignId`: Filter by campaign
- `timeRange`: Hours to analyze (default: 24)
- `minOccurrences`: Minimum pattern occurrences (default: 3)

**Response**:
```json
{
  "success": true,
  "data": {
    "patterns": {
      "repeatedContent": [
        {
          "_id": "Exact same content posted",
          "count": 15,
          "usernames": ["@bot1", "@bot2", "@bot3"],
          "tweets": [...]
        }
      ],
      "coordinatedPosting": [...],
      "suspiciousAccounts": [...],
      "viralContent": [...],
      "temporalPatterns": [...]
    },
    "analysis": {
      "timeRange": 24,
      "detectionTime": "2024-01-01T00:00:00.000Z",
      "summary": {
        "repeatedContentCount": 5,
        "coordinatedActivityCount": 3,
        "suspiciousAccountsCount": 8,
        "viralContentCount": 2,
        "temporalPatternsCount": 12
      }
    }
  }
}
```

#### **GET** `/api/search/history`
**Purpose**: Get user search history
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit`: Number of recent searches (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "query": "election misinformation",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "resultCount": 45
      }
    ],
    "count": 15
  }
}
```

---

## 🔌 Real-time Communication (Socket.IO)

### System Flow
1. Client connects to Socket.IO server
2. User authentication via JWT token
3. Subscription to relevant channels (campaigns, alerts, dashboard)
4. Real-time events broadcasted to subscribed clients
5. Bidirectional communication for interactive features

### Features Implemented
- ✅ Real-time dashboard updates
- ✅ Live alert notifications
- ✅ Campaign activity streams
- ✅ System status broadcasting
- ✅ User presence tracking
- ✅ Message broadcasting
- ✅ Private notifications

### Socket Events

#### **Client → Server Events**

**`authenticate`**
```javascript
socket.emit('authenticate', {
  token: 'jwt_token_here'
});
```

**`subscribe_dashboard`**
```javascript
socket.emit('subscribe_dashboard', {
  preferences: {
    alerts: true,
    campaigns: true,
    system: false
  }
});
```

**`join_campaign`**
```javascript
socket.emit('join_campaign', {
  campaignId: 'campaignId'
});
```

**`leave_campaign`**
```javascript
socket.emit('leave_campaign', {
  campaignId: 'campaignId'
});
```

#### **Server → Client Events**

**`authenticated`**
```javascript
{
  success: true,
  userId: 'userId',
  message: 'Authentication successful'
}
```

**`dashboard_update`**
```javascript
{
  type: 'dashboard_update',
  title: 'Dashboard Update',
  data: {
    summary: {...},
    realTime: {...},
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

**`live_alerts_update`**
```javascript
{
  type: 'live_alerts_update',
  title: 'New Alerts Detected',
  data: {
    alerts: [...],
    count: 3,
    timestamp: '2024-01-01T00:00:00.000Z'
  },
  urgent: true
}
```

**`campaign_update`**
```javascript
{
  type: 'campaign_update',
  campaignId: 'campaignId',
  data: {
    stats: {...},
    newTweets: [...],
    alerts: [...],
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

**`system_metrics`**
```javascript
{
  type: 'system_metrics',
  data: {
    timestamp: '2024-01-01T00:00:00.000Z',
    system: {...},
    database: {...},
    application: {...}
  }
}
```

**`notification`**
```javascript
{
  type: 'notification',
  title: 'Alert Resolved',
  message: 'High priority alert has been resolved',
  data: {...},
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

---

## 🔧 Error Handling & Response Format

### Standard Response Format

**Success Response**:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {...},
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_123456"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "Specific error details",
    "field": "fieldName"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_123456"
  }
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

## 🔐 Authentication Requirements

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

Token expires in 24 hours and needs to be refreshed using the login endpoint.

---

## 📋 Summary

This documentation covers all implemented systems in the SentinelAI backend:

1. **Authentication System** - JWT-based user management
2. **Campaign Management** - Complete CRUD with team collaboration
3. **Evidence Management** - File upload and metadata system
4. **Alert System** - Intelligent alert rules and notifications
5. **AI Analysis** - Gemini-powered content analysis
6. **Crawler System** - Real-time social media monitoring
7. **Analytics Dashboard** - Real-time metrics and insights
8. **Search System** - Advanced search and pattern detection
9. **Real-time Communication** - Socket.IO integration

All systems are production-ready with proper error handling, validation, and real-time capabilities for your frontend integration.