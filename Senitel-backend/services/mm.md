http://localhost:5000/api/dashboard/overview

````json
{
    "success": true,
    "data": {
        "timestamp": "2025-08-30T18:35:50.686Z",
        "summary": {
            "totalCampaigns": 0,
            "activeCampaigns": 0,
            "totalTweets": 0,
            "totalAlerts": 0,
            "openAlerts": 0,
            "alertsToday": 0,
            "systemStatus": "unknown"
        },
        "campaigns": {
            "byStatus": [],
            "recent": [],
            "topPerforming": []
        },
        "alerts": {
            "bySeverity": [],
            "trends": [],
            "responseTimeStats": [],
            "totalOpen": 0
        },
        "content": {
            "sentiment": [],
            "classification": [],
            "topHashtags": [],
            "totalProcessed": 0
        },
        "threats": {
            "byType": [],
            "byLocation": [],
            "totalThreats": 0
        },
        "trends": {
            "activity": [],
            "engagement": []
        },
        "realTime": {
            "activeUsers": 0,
            "systemHealth": {
                "status": "healthy",
                "services": {
                    "database": "connected",
                    "redis": "connected",
                    "socketio": "active",
                    "crawler": "running"
                },
                "performance": {
                    "responseTime": "normal",
                    "throughput": "normal",
                    "errorRate": "low"
                },
                "timestamp": "2025-08-30T18:35:50.825Z"
            },
            "lastUpdate": "2025-08-30T18:35:50.825Z"
        }
    },
    "meta": {
        "timeRange": 24,
        "userId": "68aed39a668f75194c9aec9c",
        "generatedAt": "2025-08-30T18:35:50.825Z"
    }
}
````

post http://localhost:5000/api/campaigns

```json
{
  "name": "2024 Election Misinformation Monitoring",
  "description": "Monitor and analyze potential misinformation related to the 2024 presidential election across social media platforms",
  "topic": "2024 election",
  "priority": "high",
  "category": "political",
  "platforms": ["x", "reddit", "facebook"],
  "keywords": [
    "2024 election",
    "voting fraud",
    "ballot harvesting",
    "election rigged",
    "stolen election"
  ],
  "hashtags": [
    "#Election2024",
    "#VotingFraud",
    "#ElectionIntegrity",
    "#StopTheSteal"
  ],
  "targetAccounts": [
    {
      "platform": "x",
      "username": "suspicious_account_1",
      "handle": "@suspicious_account_1",
      "notes": "Known for spreading election misinformation"
    },
    {
      "platform": "reddit",
      "username": "election_truther",
      "notes": "Active in political conspiracy subreddits"
    }
  ],
  "settings": {
    "maxTweets": 500,
    "crawlInterval": 180000,
    "alertThreshold": 0.8,
    "enableRealTimeAlerts": true,
    "autoClassification": true
  },
  "tags": ["election", "misinformation", "politics", "urgent"]
}
```

response

{
    "success": true,
    "message": "Campaign created successfully",
    "data": {
        "campaign": {
            "name": "2024 Election Misinformation Monitoring",
            "description": "Monitor and analyze potential misinformation related to the 2024 presidential election across social media platforms",
            "topic": "2024 election",
            "status": "active",
            "priority": "high",
            "category": "political",
            "platforms": [
                "x",
                "reddit",
                "facebook"
            ],
            "keywords": [
                "2024 election",
                "voting fraud",
                "ballot harvesting",
                "election rigged",
                "stolen election"
            ],
            "hashtags": [
                "#Election2024",
                "#VotingFraud",
                "#ElectionIntegrity",
                "#StopTheSteal"
            ],
            "targetAccounts": [
                {
                    "platform": "x",
                    "username": "suspicious_account_1",
                    "handle": "@suspicious_account_1",
                    "notes": "Known for spreading election misinformation",
                    "_id": "68b3497c7dfa4db7c5b8d80f"
                },
                {
                    "platform": "reddit",
                    "username": "election_truther",
                    "notes": "Active in political conspiracy subreddits",
                    "_id": "68b3497c7dfa4db7c5b8d810"
                }
            ],
            "settings": {
                "maxTweets": 500,
                "crawlInterval": 180000,
                "alertThreshold": 0.8,
                "enableRealTimeAlerts": true,
                "autoClassification": true
            },
            "stats": {
                "totalTweets": 0,
                "realPosts": 0,
                "fakePosts": 0,
                "propagandaPosts": 0,
                "pendingPosts": 0,
                "totalEngagement": 0,
                "avgSentiment": 0,
                "alertsGenerated": 0
            },
            "team": [
                {
                    "user": {
                        "_id": "68aed39a668f75194c9aec9c",
                        "email": "cpojha17@gmail.com",
                        "role": "user",
                        "isActive": true,
                        "lastLogin": "2025-08-30T18:15:54.695Z",
                        "createdAt": "2025-08-27T09:44:58.530Z",
                        "updatedAt": "2025-08-30T18:15:54.699Z",
                        "__v": 0,
                        "username": "Chandra"
                    },
                    "role": "lead",
                    "_id": "68b3497c7dfa4db7c5b8d811",
                    "assignedAt": "2025-08-30T18:57:00.089Z"
                }
            ],
            "tags": [
                {
                    "_id": "68b3497c7dfa4db7c5b8d7ff",
                    "name": "election",
                    "color": "#3B82F6",
                    "usageCount": 1,
                    "createdBy": "68aed39a668f75194c9aec9c",
                    "isSystem": false,
                    "createdAt": "2025-08-30T18:57:00.033Z",
                    "updatedAt": "2025-08-30T18:57:00.045Z",
                    "__v": 0
                },
                {
                    "_id": "68b3497c7dfa4db7c5b8d803",
                    "name": "misinformation",
                    "color": "#3B82F6",
                    "usageCount": 1,
                    "createdBy": "68aed39a668f75194c9aec9c",
                    "isSystem": false,
                    "createdAt": "2025-08-30T18:57:00.064Z",
                    "updatedAt": "2025-08-30T18:57:00.067Z",
                    "__v": 0
                },
                {
                    "_id": "68b3497c7dfa4db7c5b8d807",
                    "name": "politics",
                    "color": "#3B82F6",
                    "usageCount": 1,
                    "createdBy": "68aed39a668f75194c9aec9c",
                    "isSystem": false,
                    "createdAt": "2025-08-30T18:57:00.071Z",
                    "updatedAt": "2025-08-30T18:57:00.073Z",
                    "__v": 0
                },
                {
                    "_id": "68b3497c7dfa4db7c5b8d80b",
                    "name": "urgent",
                    "color": "#3B82F6",
                    "usageCount": 1,
                    "createdBy": "68aed39a668f75194c9aec9c",
                    "isSystem": false,
                    "createdAt": "2025-08-30T18:57:00.079Z",
                    "updatedAt": "2025-08-30T18:57:00.081Z",
                    "__v": 0
                }
            ],
            "evidence": [],
            "createdBy": {
                "_id": "68aed39a668f75194c9aec9c",
                "email": "cpojha17@gmail.com",
                "role": "user",
                "isActive": true,
                "lastLogin": "2025-08-30T18:15:54.695Z",
                "createdAt": "2025-08-27T09:44:58.530Z",
                "updatedAt": "2025-08-30T18:15:54.699Z",
                "__v": 0,
                "username": "Chandra"
            },
            "isArchived": false,
            "_id": "68b3497c7dfa4db7c5b8d80e",
            "createdAt": "2025-08-30T18:57:00.093Z",
            "updatedAt": "2025-08-30T18:57:00.093Z",
            "__v": 0
        }
    }
}
```

get http://localhost:5000/api/campaigns

```json
{
    "success": true,
    "data": {
        "campaigns": [
            {
                "_id": "68b3497c7dfa4db7c5b8d80e",
                "name": "2024 Election Misinformation Monitoring",
                "description": "Monitor and analyze potential misinformation related to the 2024 presidential election across social media platforms",
                "topic": "2024 election",
                "status": "active",
                "priority": "high",
                "category": "political",
                "platforms": [
                    "x",
                    "reddit",
                    "facebook"
                ],
                "keywords": [
                    "2024 election",
                    "voting fraud",
                    "ballot harvesting",
                    "election rigged",
                    "stolen election"
                ],
                "hashtags": [
                    "#Election2024",
                    "#VotingFraud",
                    "#ElectionIntegrity",
                    "#StopTheSteal"
                ],
                "targetAccounts": [
                    {
                        "platform": "x",
                        "username": "suspicious_account_1",
                        "handle": "@suspicious_account_1",
                        "notes": "Known for spreading election misinformation",
                        "_id": "68b3497c7dfa4db7c5b8d80f"
                    },
                    {
                        "platform": "reddit",
                        "username": "election_truther",
                        "notes": "Active in political conspiracy subreddits",
                        "_id": "68b3497c7dfa4db7c5b8d810"
                    }
                ],
                "settings": {
                    "maxTweets": 500,
                    "crawlInterval": 180000,
                    "alertThreshold": 0.8,
                    "enableRealTimeAlerts": true,
                    "autoClassification": true
                },
                "stats": {
                    "totalTweets": 0,
                    "realPosts": 0,
                    "fakePosts": 0,
                    "propagandaPosts": 0,
                    "pendingPosts": 0,
                    "totalEngagement": 0,
                    "avgSentiment": 0,
                    "alertsGenerated": 0
                },
                "team": [
                    {
                        "user": {
                            "_id": "68aed39a668f75194c9aec9c",
                            "email": "cpojha17@gmail.com"
                        },
                        "role": "lead",
                        "_id": "68b3497c7dfa4db7c5b8d811",
                        "assignedAt": "2025-08-30T18:57:00.089Z"
                    }
                ],
                "tags": [
                    {
                        "_id": "68b3497c7dfa4db7c5b8d7ff",
                        "name": "election",
                        "color": "#3B82F6"
                    },
                    {
                        "_id": "68b3497c7dfa4db7c5b8d803",
                        "name": "misinformation",
                        "color": "#3B82F6"
                    },
                    {
                        "_id": "68b3497c7dfa4db7c5b8d807",
                        "name": "politics",
                        "color": "#3B82F6"
                    },
                    {
                        "_id": "68b3497c7dfa4db7c5b8d80b",
                        "name": "urgent",
                        "color": "#3B82F6"
                    }
                ],
                "evidence": [],
                "createdBy": {
                    "_id": "68aed39a668f75194c9aec9c",
                    "email": "cpojha17@gmail.com"
                },
                "isArchived": false,
                "createdAt": "2025-08-30T18:57:00.093Z",
                "updatedAt": "2025-08-30T18:57:00.093Z",
                "__v": 0,
                "severity": "low",
                "activityScore": 0,
                "sparkData": [
                    {
                        "v": 31
                    },
                    {
                        "v": 65
                    },
                    {
                        "v": 24
                    },
                    {
                        "v": 29
                    },
                    {
                        "v": 77
                    },
                    {
                        "v": 78
                    },
                    {
                        "v": 61
                    },
                    {
                        "v": 33
                    },
                    {
                        "v": 43
                    },
                    {
                        "v": 60
                    },
                    {
                        "v": 21
                    },
                    {
                        "v": 43
                    }
                ]
            }
        ],
        "pagination": {
            "current": 1,
            "pages": 1,
            "total": 1,
            "limit": 10
        },
        "filters": {
            "statuses": [
                "active"
            ],
            "priorities": [
                "high"
            ],
            "categories": [
                "political"
            ]
        }
    }
}
````