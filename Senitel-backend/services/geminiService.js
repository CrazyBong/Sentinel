import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    // Analysis prompts
    this.prompts = {
      tweetAnalysis: this.createTweetAnalysisPrompt(),
      sentimentAnalysis: this.createSentimentAnalysisPrompt(),
      threatClassification: this.createThreatClassificationPrompt(),
      patternDetection: this.createPatternDetectionPrompt(),
      reportGeneration: this.createReportGenerationPrompt()
    };
  }

  // Analyze single tweet for misinformation, sentiment, and threats
  async analyzeTweet(tweetContent, additionalContext = {}) {
    try {
      const prompt = `${this.prompts.tweetAnalysis}

TWEET CONTENT:
"${tweetContent}"

ADDITIONAL CONTEXT:
- Username: ${additionalContext.username || 'Unknown'}
- Timestamp: ${additionalContext.timestamp || 'Unknown'}
- Engagement: ${additionalContext.engagement || 'Unknown'}
- Platform: ${additionalContext.platform || 'X/Twitter'}

Please provide a comprehensive analysis in the exact JSON format specified above.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      this.validateAnalysisResponse(analysis);
      
      return {
        success: true,
        analysis,
        rawResponse: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Gemini tweet analysis error:', error);
      return {
        success: false,
        error: error.message,
        fallbackAnalysis: this.getFallbackAnalysis(tweetContent)
      };
    }
  }

  // Analyze multiple tweets for patterns and trends
  async analyzeBatch(tweets, analysisType = 'comprehensive') {
    try {
      if (!tweets || tweets.length === 0) {
        throw new Error('No tweets provided for analysis');
      }

      // Limit batch size to avoid token limits
      const batchSize = 20;
      const batches = this.chunkArray(tweets, batchSize);
      const results = [];

      for (const batch of batches) {
        const batchResult = await this.processBatch(batch, analysisType);
        results.push(...batchResult);
      }

      // Generate summary insights
      const summary = this.generateBatchSummary(results);

      return {
        success: true,
        totalProcessed: tweets.length,
        results,
        summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Gemini batch analysis error:', error);
      return {
        success: false,
        error: error.message,
        partialResults: []
      };
    }
  }

  // Generate campaign report using AI
  async generateCampaignReport(campaignData, tweets, analytics) {
    try {
      const prompt = `${this.prompts.reportGeneration}

CAMPAIGN DATA:
${JSON.stringify(campaignData, null, 2)}

TWEET SAMPLE (First 10):
${JSON.stringify(tweets.slice(0, 10), null, 2)}

ANALYTICS DATA:
${JSON.stringify(analytics, null, 2)}

Generate a comprehensive threat intelligence report following the structure above.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const reportText = response.text();

      return {
        success: true,
        report: reportText,
        generatedAt: new Date().toISOString(),
        campaignId: campaignData.id,
        dataPoints: tweets.length
      };
    } catch (error) {
      console.error('Gemini report generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Detect patterns across multiple tweets
  async detectPatterns(tweets, patternType = 'all') {
    try {
      const tweetTexts = tweets.map(t => t.content).join('\n---\n');
      
      const prompt = `${this.prompts.patternDetection}

PATTERN TYPE: ${patternType}

TWEETS TO ANALYZE:
${tweetTexts}

Analyze these tweets for the specified pattern types and respond in JSON format.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in pattern analysis response');
      }

      const patterns = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        patterns,
        analyzedTweets: tweets.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Pattern detection error:', error);
      return {
        success: false,
        error: error.message,
        patterns: null
      };
    }
  }

  // AI-powered chat interface for campaign insights
  async chatWithAI(query, context = {}) {
    try {
      const prompt = `You are SentinelAI, an expert threat intelligence analyst specializing in disinformation detection and social media analysis.

CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUERY: ${query}

Provide a helpful, accurate response based on the context provided. If you need more information, ask specific questions. Keep responses concise but informative.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text,
        timestamp: new Date().toISOString(),
        query,
        contextUsed: Object.keys(context)
      };
    } catch (error) {
      console.error('Chat with AI error:', error);
      return {
        success: false,
        error: error.message,
        response: "I'm sorry, I encountered an error processing your request. Please try again."
      };
    }
  }

  // Helper method to create comprehensive tweet analysis prompt
  createTweetAnalysisPrompt() {
    return `You are a specialized AI trained in misinformation detection, sentiment analysis, and threat assessment for social media content.

Analyze the provided tweet content and respond with a JSON object containing the following structure:

{
  "classification": {
    "category": "real|fake|propaganda|satire|opinion|unclear",
    "confidence": 0.85,
    "reasoning": "Detailed explanation of the classification"
  },
  "sentiment": {
    "score": 0.2,
    "label": "positive|negative|neutral",
    "confidence": 0.78,
    "emotions": ["anger", "fear", "joy"]
  },
  "threat_assessment": {
    "level": "low|medium|high|critical",
    "score": 0.45,
    "factors": ["misleading_statistics", "emotional_manipulation"],
    "potential_impact": "Description of potential harm"
  },
  "content_analysis": {
    "topics": ["health", "politics", "economy"],
    "keywords": ["vaccine", "government", "conspiracy"],
    "entities": ["WHO", "CDC", "Biden"],
    "claims": ["Vaccines cause autism", "Government cover-up"],
    "source_credibility": "high|medium|low|unknown"
  },
  "linguistic_features": {
    "tone": "aggressive|neutral|concerned|promotional",
    "writing_style": "formal|informal|emotional|technical",
    "persuasion_techniques": ["appeal_to_fear", "bandwagon", "false_dilemma"],
    "urgency_level": "low|medium|high"
  },
  "risk_indicators": {
    "bot_likelihood": 0.15,
    "coordination_signs": false,
    "manipulation_tactics": ["cherry_picking", "strawman"],
    "verification_status": "verified|unverified|disputed"
  },
  "recommendations": {
    "action": "monitor|investigate|alert|escalate",
    "priority": "low|medium|high|urgent",
    "next_steps": ["Fact-check claims", "Monitor account activity"],
    "alert_stakeholders": true
  }
}

Be thorough but concise in your analysis. Base conclusions on evidence present in the content.`;
  }

  createSentimentAnalysisPrompt() {
    return `Analyze the sentiment and emotional content of the provided text. Focus on:
- Overall sentiment polarity (-1 to 1 scale)
- Emotional intensity
- Specific emotions present
- Tone and mood indicators
- Potential emotional manipulation techniques

Respond in JSON format with detailed sentiment metrics.`;
  }

  createThreatClassificationPrompt() {
    return `Classify the threat level of the provided content based on:
- Potential for real-world harm
- Misinformation severity
- Reach and virality potential
- Target audience vulnerability
- Coordinated campaign indicators

Provide threat level, confidence score, and mitigation recommendations in JSON format.`;
  }

  createPatternDetectionPrompt() {
    return `Analyze the collection of tweets for patterns including:

{
  "messaging_patterns": {
    "repeated_phrases": ["exact phrases appearing multiple times"],
    "similar_structures": "description of structural similarities",
    "coordinated_language": "evidence of coordinated messaging"
  },
  "behavioral_patterns": {
    "posting_times": "timing analysis",
    "account_similarities": "similar account characteristics",
    "engagement_patterns": "unusual engagement behaviors"
  },
  "content_patterns": {
    "narrative_evolution": "how the narrative changes over time",
    "topic_clusters": ["related topic groups"],
    "influence_networks": "evidence of influence operations"
  },
  "anomaly_detection": {
    "unusual_spikes": "abnormal activity patterns",
    "bot_indicators": "signs of automated behavior",
    "amplification_tactics": "artificial amplification methods"
  },
  "threat_assessment": {
    "coordination_likelihood": 0.75,
    "campaign_sophistication": "low|medium|high",
    "potential_impact": "assessment of potential harm",
    "recommended_response": "suggested actions"
  }
}`;
  }

  createReportGenerationPrompt() {
    return `Generate a comprehensive threat intelligence report in the following format:

# THREAT INTELLIGENCE REPORT

## EXECUTIVE SUMMARY
[Brief overview of key findings and threat assessment]

## CAMPAIGN OVERVIEW
- **Campaign Name**: 
- **Duration**: 
- **Platforms Monitored**: 
- **Total Content Analyzed**: 

## KEY FINDINGS
1. **Primary Threats Identified**
2. **Misinformation Narratives**
3. **Coordinated Activity Evidence**
4. **Target Audience Analysis**

## DETAILED ANALYSIS
### Content Classification
- Real Content: X%
- Misinformation: X%
- Propaganda: X%
- Unclear: X%

### Sentiment Trends
[Analysis of emotional patterns and sentiment evolution]

### Network Analysis
[Account relationships and influence patterns]

### Geographic Distribution
[Location-based activity patterns]

## THREAT ASSESSMENT
- **Overall Risk Level**: [Critical/High/Medium/Low]
- **Confidence Score**: [0-1]
- **Potential Impact**: [Description]

## RECOMMENDATIONS
1. **Immediate Actions**
2. **Monitoring Enhancements**
3. **Stakeholder Notifications**
4. **Long-term Strategy**

## APPENDIX
- Data sources and methodology
- Key indicators and metrics
- Supporting evidence

Generate this report based on the provided campaign and analytics data.`;
  }

  // Helper methods
  validateAnalysisResponse(analysis) {
    const requiredFields = ['classification', 'sentiment', 'threat_assessment'];
    for (const field of requiredFields) {
      if (!analysis[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  getFallbackAnalysis(content) {
    // Simple rule-based fallback when AI fails
    return {
      classification: {
        category: 'unclear',
        confidence: 0.5,
        reasoning: 'AI analysis failed, using fallback classification'
      },
      sentiment: {
        score: 0,
        label: 'neutral',
        confidence: 0.5
      },
      threat_assessment: {
        level: 'low',
        score: 0.2,
        factors: ['analysis_unavailable']
      }
    };
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async processBatch(tweets, analysisType) {
    const results = [];
    for (const tweet of tweets) {
      const analysis = await this.analyzeTweet(tweet.content, {
        username: tweet.username,
        timestamp: tweet.timestamp,
        engagement: tweet.likes + tweet.retweets + tweet.replies
      });
      
      if (analysis.success) {
        results.push({
          tweetId: tweet._id,
          analysis: analysis.analysis
        });
      }
      
      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return results;
  }

  generateBatchSummary(results) {
    if (!results || results.length === 0) {
      return { totalAnalyzed: 0, patterns: [], insights: [] };
    }

    const classifications = results.map(r => r.analysis?.classification?.category).filter(Boolean);
    const threats = results.map(r => r.analysis?.threat_assessment?.level).filter(Boolean);
    const sentiments = results.map(r => r.analysis?.sentiment?.score).filter(s => s !== undefined);

    return {
      totalAnalyzed: results.length,
      classification_distribution: this.getDistribution(classifications),
      threat_distribution: this.getDistribution(threats),
      average_sentiment: sentiments.length > 0 ? 
        sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0,
      high_risk_count: threats.filter(t => ['high', 'critical'].includes(t)).length,
      misinformation_rate: classifications.filter(c => ['fake', 'propaganda'].includes(c)).length / classifications.length
    };
  }

  getDistribution(array) {
    return array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});
  }
}

export default GeminiService;