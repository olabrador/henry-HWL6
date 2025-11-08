#!/usr/bin/env node

/**
 * Lighthouse Report Comparator
 *
 * This script compares a Lighthouse JSON report against performance thresholds
 * defined in performance-thresholds.json and generates a comprehensive analysis report.
 *
 * Usage:
 *   node lighthouse-comparator.js --lighthouse-report ./lighthouse-report.json --thresholds ./configs/performance-thresholds.json
 *
 * Dependencies:
 *   - Node.js built-in fs/promises module
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LighthouseComparator {
  constructor(options = {}) {
    this.options = {
      outputDir: path.join(__dirname, "test-results"),
      thresholdsPath: path.join(__dirname, "performance-thresholds.json"),
      ...options,
    };
    this.thresholds = null;
  }

  async compareReport(lighthouseReportPath) {
    console.log(`📊 Comparing Lighthouse report: ${lighthouseReportPath}`);

    // Load Lighthouse report
    const lighthouseReport = JSON.parse(await fs.readFile(lighthouseReportPath, 'utf8'));
    
    // Load thresholds
    this.thresholds = JSON.parse(await fs.readFile(this.options.thresholdsPath, 'utf8'));

    // Ensure output directory exists
    await fs.mkdir(this.options.outputDir, { recursive: true });

    const results = {
      url: lighthouseReport.finalUrl || lighthouseReport.requestedUrl || "Unknown",
      timestamp: new Date().toISOString(),
      lighthouseReportPath,
      metrics: {},
      comparison: {},
      bottlenecks: [],
      summary: {},
      recommendations: [],
      score: 0,
      grade: "F",
    };

    try {
      // Extract metrics from Lighthouse report
      results.metrics = this.extractMetrics(lighthouseReport);
      
      // Compare against thresholds
      results.comparison = this.compareMetrics(results.metrics);
      
      // Identify bottlenecks
      results.bottlenecks = this.identifyBottlenecks(results.comparison);
      
      // Generate summary
      results.summary = this.generateSummary(results.comparison, results.bottlenecks);
      
      // Calculate overall score and grade
      const scoreData = this.calculateScore(results.comparison);
      results.score = scoreData.score;
      results.grade = scoreData.grade;
      
      // Generate recommendations
      results.recommendations = this.generateRecommendations(results.bottlenecks, results.comparison);

      // Display results
      this.displayResults(results);

      // Save results
      await this.saveResults(results);

      return results;
    } catch (error) {
      console.error("❌ Comparison failed:", error.message);
      throw error;
    }
  }

  extractMetrics(lighthouseReport) {
    const audits = lighthouseReport.audits || {};
    const categories = lighthouseReport.categories || {};
    
    // Extract Core Web Vitals
    const lcpAudit = audits["largest-contentful-paint"];
    const fcpAudit = audits["first-contentful-paint"];
    const clsAudit = audits["cumulative-layout-shift"];
    const fidAudit = audits["max-potential-fid"] || audits["first-input-delay"];
    const inpAudit = audits["interaction-to-next-paint"];

    // Extract loading metrics
    const ttfbAudit = audits["server-response-time"];
    const domContentLoaded = this.getNavigationTiming(lighthouseReport, "domContentLoadedEventEnd");
    const loadComplete = this.getNavigationTiming(lighthouseReport, "loadEventEnd");
    const ttiAudit = audits["interactive"];
    const tbtAudit = audits["total-blocking-time"];
    const speedIndexAudit = audits["speed-index"];

    // Extract resource metrics
    const totalRequests = audits["network-requests"]?.details?.items?.length || 0;
    const totalTransferSize = audits["total-byte-weight"]?.numericValue || 0;
    
    // Extract resource breakdown
    const resourceBreakdown = this.extractResourceBreakdown(audits);

    return {
      coreWebVitals: {
        largestContentfulPaint: lcpAudit?.numericValue || null,
        firstContentfulPaint: fcpAudit?.numericValue || null,
        cumulativeLayoutShift: clsAudit?.numericValue || null,
        firstInputDelay: fidAudit?.numericValue || null,
        interactionToNextPaint: inpAudit?.numericValue || null,
      },
      loadingMetrics: {
        timeToFirstByte: ttfbAudit?.numericValue || null,
        domContentLoaded: domContentLoaded || null,
        loadComplete: loadComplete || null,
        timeToInteractive: ttiAudit?.numericValue || null,
        totalBlockingTime: tbtAudit?.numericValue || null,
        speedIndex: speedIndexAudit?.numericValue || null,
      },
      resourceMetrics: {
        totalRequests: totalRequests,
        totalTransferSize: totalTransferSize,
        imageSize: resourceBreakdown.imageSize,
        scriptSize: resourceBreakdown.scriptSize,
        stylesheetSize: resourceBreakdown.stylesheetSize,
        fontSize: resourceBreakdown.fontSize,
      },
      lighthouseScore: categories.performance?.score ? Math.round(categories.performance.score * 100) : null,
    };
  }

  getNavigationTiming(lighthouseReport, metric) {
    try {
      const timing = lighthouseReport.timing || {};
      const navigationTiming = timing.navigation || {};
      return navigationTiming[metric] || null;
    } catch (e) {
      return null;
    }
  }

  extractResourceBreakdown(audits) {
    const breakdown = {
      imageSize: 0,
      scriptSize: 0,
      stylesheetSize: 0,
      fontSize: 0,
    };

    try {
      const resourceSummary = audits["resource-summary"]?.details?.items || [];
      
      resourceSummary.forEach((item) => {
        const resourceType = item.resourceType?.toLowerCase() || "";
        const size = item.transferSize || 0;

        if (resourceType.includes("image")) {
          breakdown.imageSize += size;
        } else if (resourceType.includes("script") || resourceType.includes("javascript")) {
          breakdown.scriptSize += size;
        } else if (resourceType.includes("stylesheet") || resourceType.includes("css")) {
          breakdown.stylesheetSize += size;
        } else if (resourceType.includes("font")) {
          breakdown.fontSize += size;
        }
      });
    } catch (e) {
      // If resource breakdown is not available, try alternative method
      const networkRequests = audits["network-requests"]?.details?.items || [];
      networkRequests.forEach((request) => {
        const url = request.url?.toLowerCase() || "";
        const size = request.transferSize || 0;

        if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/)) {
          breakdown.imageSize += size;
        } else if (url.match(/\.(js|mjs)$/)) {
          breakdown.scriptSize += size;
        } else if (url.match(/\.(css)$/)) {
          breakdown.stylesheetSize += size;
        } else if (url.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
          breakdown.fontSize += size;
        }
      });
    }

    return breakdown;
  }

  compareMetrics(metrics) {
    const comparison = {
      coreWebVitals: {},
      loadingMetrics: {},
      resourceMetrics: {},
    };

    // Compare Core Web Vitals
    const cwvThresholds = this.thresholds.coreWebVitals || {};
    Object.keys(cwvThresholds).forEach((metric) => {
      const threshold = cwvThresholds[metric];
      const value = metrics.coreWebVitals[metric];
      
      if (value !== null && value !== undefined) {
        comparison.coreWebVitals[metric] = this.compareValue(
          value,
          threshold.good,
          threshold.needsImprovement,
          threshold.poor,
          threshold.unit
        );
      }
    });

    // Compare Loading Metrics
    const loadingThresholds = this.thresholds.loadingMetrics || {};
    Object.keys(loadingThresholds).forEach((metric) => {
      const threshold = loadingThresholds[metric];
      const value = metrics.loadingMetrics[metric];
      
      if (value !== null && value !== undefined) {
        comparison.loadingMetrics[metric] = this.compareValue(
          value,
          threshold.good,
          threshold.needsImprovement,
          threshold.poor,
          threshold.unit
        );
      }
    });

    // Compare Resource Metrics
    const resourceThresholds = this.thresholds.resourceMetrics || {};
    Object.keys(resourceThresholds).forEach((metric) => {
      const threshold = resourceThresholds[metric];
      const value = metrics.resourceMetrics[metric];
      
      if (value !== null && value !== undefined) {
        comparison.resourceMetrics[metric] = this.compareValue(
          value,
          threshold.good,
          threshold.needsImprovement,
          threshold.poor,
          threshold.unit
        );
      }
    });

    return comparison;
  }

  compareValue(value, goodThreshold, needsImprovementThreshold, poorThreshold, unit) {
    let status = "good";
    let rating = "✅ Good";

    if (value <= goodThreshold) {
      status = "good";
      rating = "✅ Good";
    } else if (value <= needsImprovementThreshold) {
      status = "needsImprovement";
      rating = "⚠️ Needs Improvement";
    } else {
      status = "poor";
      rating = "❌ Poor";
    }

    return {
      value,
      threshold: {
        good: goodThreshold,
        needsImprovement: needsImprovementThreshold,
        poor: poorThreshold,
      },
      status,
      rating,
      unit,
      difference: value - goodThreshold,
      percentageOverGood: ((value - goodThreshold) / goodThreshold) * 100,
    };
  }

  identifyBottlenecks(comparison) {
    const bottlenecks = [];

    // Check Core Web Vitals
    Object.keys(comparison.coreWebVitals).forEach((metric) => {
      const comp = comparison.coreWebVitals[metric];
      if (comp.status !== "good") {
        bottlenecks.push({
          category: "Core Web Vitals",
          metric,
          severity: comp.status === "poor" ? "high" : "medium",
          currentValue: comp.value,
          threshold: comp.threshold.good,
          impact: this.getImpactDescription(metric, comp.status),
          recommendation: this.getRecommendation(metric, comp.status),
        });
      }
    });

    // Check Loading Metrics
    Object.keys(comparison.loadingMetrics).forEach((metric) => {
      const comp = comparison.loadingMetrics[metric];
      if (comp.status !== "good") {
        bottlenecks.push({
          category: "Loading Metrics",
          metric,
          severity: comp.status === "poor" ? "high" : "medium",
          currentValue: comp.value,
          threshold: comp.threshold.good,
          impact: this.getImpactDescription(metric, comp.status),
          recommendation: this.getRecommendation(metric, comp.status),
        });
      }
    });

    // Check Resource Metrics
    Object.keys(comparison.resourceMetrics).forEach((metric) => {
      const comp = comparison.resourceMetrics[metric];
      if (comp.status !== "good") {
        bottlenecks.push({
          category: "Resource Metrics",
          metric,
          severity: comp.status === "poor" ? "high" : "medium",
          currentValue: comp.value,
          threshold: comp.threshold.good,
          impact: this.getImpactDescription(metric, comp.status),
          recommendation: this.getRecommendation(metric, comp.status),
        });
      }
    });

    // Sort by severity (high first)
    bottlenecks.sort((a, b) => {
      const severityOrder = { high: 2, medium: 1, low: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    return bottlenecks;
  }

  getImpactDescription(metric, status) {
    const impacts = {
      "largestContentfulPaint": "Affects perceived load time and user experience",
      "firstContentfulPaint": "Affects initial page render perception",
      "cumulativeLayoutShift": "Causes visual instability and poor user experience",
      "firstInputDelay": "Affects interactivity and responsiveness",
      "interactionToNextPaint": "Affects perceived responsiveness after user interaction",
      "timeToFirstByte": "Indicates server response time issues",
      "domContentLoaded": "Affects when page becomes interactive",
      "loadComplete": "Affects full page load time",
      "timeToInteractive": "Affects when page becomes fully interactive",
      "totalBlockingTime": "Affects page responsiveness during load",
      "speedIndex": "Affects visual completeness perception",
      "totalRequests": "High number of requests increases load time",
      "totalTransferSize": "Large transfer size increases load time, especially on slow connections",
      "imageSize": "Large images significantly impact load time",
      "scriptSize": "Large JavaScript files block rendering and increase parse time",
      "stylesheetSize": "Large CSS files block rendering",
      "fontSize": "Large font files can cause FOIT/FOUT issues",
    };

    return impacts[metric] || "Affects overall performance";
  }

  getRecommendation(metric, status) {
    const recommendations = {
      "largestContentfulPaint": "Optimize images, use CDN, implement lazy loading, optimize server response time",
      "firstContentfulPaint": "Minimize render-blocking resources, optimize CSS delivery, reduce server response time",
      "cumulativeLayoutShift": "Set explicit dimensions for images/videos, avoid inserting content above existing content, use font-display: swap",
      "firstInputDelay": "Reduce JavaScript execution time, break up long tasks, optimize third-party scripts",
      "interactionToNextPaint": "Optimize event handlers, reduce JavaScript execution, use web workers for heavy tasks",
      "timeToFirstByte": "Improve server response time, use CDN, enable compression, optimize database queries",
      "domContentLoaded": "Reduce render-blocking resources, optimize JavaScript execution",
      "loadComplete": "Optimize resource loading, reduce total transfer size, implement resource prioritization",
      "timeToInteractive": "Reduce JavaScript execution time, minimize main thread work, optimize third-party scripts",
      "totalBlockingTime": "Break up long tasks, defer non-critical JavaScript, optimize third-party scripts",
      "speedIndex": "Optimize above-the-fold content, reduce render-blocking resources, improve server response time",
      "totalRequests": "Combine files, use HTTP/2, implement resource bundling, reduce third-party requests",
      "totalTransferSize": "Enable compression (gzip/brotli), minify resources, remove unused code, optimize images",
      "imageSize": "Compress images, use modern formats (WebP/AVIF), implement responsive images, use lazy loading",
      "scriptSize": "Code splitting, tree shaking, minification, remove unused code, defer non-critical scripts",
      "stylesheetSize": "Remove unused CSS, minify CSS, split CSS by page, inline critical CSS",
      "fontSize": "Subset fonts, use font-display: swap, preload critical fonts, consider system fonts",
    };

    return recommendations[metric] || "Review and optimize this metric";
  }

  generateSummary(comparison, bottlenecks) {
    const totalMetrics = 
      Object.keys(comparison.coreWebVitals).length +
      Object.keys(comparison.loadingMetrics).length +
      Object.keys(comparison.resourceMetrics).length;

    let goodCount = 0;
    let needsImprovementCount = 0;
    let poorCount = 0;

    // Count statuses
    Object.values(comparison.coreWebVitals).forEach((comp) => {
      if (comp.status === "good") goodCount++;
      else if (comp.status === "needsImprovement") needsImprovementCount++;
      else poorCount++;
    });

    Object.values(comparison.loadingMetrics).forEach((comp) => {
      if (comp.status === "good") goodCount++;
      else if (comp.status === "needsImprovement") needsImprovementCount++;
      else poorCount++;
    });

    Object.values(comparison.resourceMetrics).forEach((comp) => {
      if (comp.status === "good") goodCount++;
      else if (comp.status === "needsImprovement") needsImprovementCount++;
      else poorCount++;
    });

    return {
      totalMetrics,
      good: goodCount,
      needsImprovement: needsImprovementCount,
      poor: poorCount,
      bottlenecksCount: bottlenecks.length,
      criticalBottlenecks: bottlenecks.filter((b) => b.severity === "high").length,
    };
  }

  calculateScore(comparison) {
    const weights = this.thresholds.reporting?.scoreCalculation?.weights || {
      coreWebVitals: 0.4,
      loadingMetrics: 0.3,
      resourceMetrics: 0.2,
      userExperience: 0.1,
    };

    const gradeThresholds = this.thresholds.reporting?.scoreCalculation?.gradeThresholds || {
      A: { min: 90, max: 100 },
      B: { min: 80, max: 89 },
      C: { min: 70, max: 79 },
      D: { min: 60, max: 69 },
      F: { min: 0, max: 59 },
    };

    // Calculate score for each category
    const cwvScore = this.calculateCategoryScore(comparison.coreWebVitals);
    const loadingScore = this.calculateCategoryScore(comparison.loadingMetrics);
    const resourceScore = this.calculateCategoryScore(comparison.resourceMetrics);

    // Weighted average
    const totalScore = Math.round(
      cwvScore * weights.coreWebVitals +
      loadingScore * weights.loadingMetrics +
      resourceScore * weights.resourceMetrics
    );

    // Determine grade
    let grade = "F";
    Object.keys(gradeThresholds).forEach((g) => {
      const range = gradeThresholds[g];
      if (totalScore >= range.min && totalScore <= range.max) {
        grade = g;
      }
    });

    return { score: totalScore, grade };
  }

  calculateCategoryScore(categoryComparison) {
    const metrics = Object.values(categoryComparison);
    if (metrics.length === 0) return 100;

    let totalScore = 0;
    metrics.forEach((comp) => {
      if (comp.status === "good") {
        totalScore += 100;
      } else if (comp.status === "needsImprovement") {
        // Score between 50-99 based on how close to good threshold
        const ratio = (comp.threshold.needsImprovement - comp.value) / 
                     (comp.threshold.needsImprovement - comp.threshold.good);
        totalScore += 50 + Math.max(0, Math.min(49, ratio * 49));
      } else {
        // Score between 0-49 based on how bad it is
        const ratio = Math.min(1, (comp.threshold.poor - comp.value) / 
                              (comp.threshold.poor - comp.threshold.needsImprovement));
        totalScore += ratio * 49;
      }
    });

    return totalScore / metrics.length;
  }

  generateRecommendations(bottlenecks, comparison) {
    const recommendations = [];

    // High priority bottlenecks
    bottlenecks
      .filter((b) => b.severity === "high")
      .slice(0, 5)
      .forEach((bottleneck) => {
        recommendations.push({
          priority: "High",
          metric: bottleneck.metric,
          category: bottleneck.category,
          issue: `${bottleneck.metric} is ${bottleneck.severity === "high" ? "poor" : "needs improvement"}`,
          impact: bottleneck.impact,
          recommendation: bottleneck.recommendation,
          currentValue: this.formatValue(bottleneck.currentValue, bottleneck.metric),
          targetValue: this.formatValue(bottleneck.threshold, bottleneck.metric),
        });
      });

    // Medium priority bottlenecks
    bottlenecks
      .filter((b) => b.severity === "medium")
      .slice(0, 5)
      .forEach((bottleneck) => {
        recommendations.push({
          priority: "Medium",
          metric: bottleneck.metric,
          category: bottleneck.category,
          issue: `${bottleneck.metric} needs improvement`,
          impact: bottleneck.impact,
          recommendation: bottleneck.recommendation,
          currentValue: this.formatValue(bottleneck.currentValue, bottleneck.metric),
          targetValue: this.formatValue(bottleneck.threshold, bottleneck.metric),
        });
      });

    return recommendations;
  }

  formatValue(value, metric) {
    if (value === null || value === undefined) return "N/A";

    // Check if it's a size metric
    if (metric.includes("Size") || metric === "totalTransferSize") {
      if (value >= 1048576) {
        return `${(value / 1048576).toFixed(2)} MB`;
      } else if (value >= 1024) {
        return `${(value / 1024).toFixed(2)} KB`;
      }
      return `${value} bytes`;
    }

    // Check if it's time-based
    if (metric.includes("Time") || metric.includes("Paint") || metric.includes("Delay") || 
        metric.includes("Index") || metric.includes("Interactive") || metric.includes("Loaded")) {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} s`;
      }
      return `${Math.round(value)} ms`;
    }

    // Check if it's a score (CLS)
    if (metric.includes("LayoutShift")) {
      return value.toFixed(3);
    }

    return value.toString();
  }

  displayResults(results) {
    console.log(`\n📊 Performance Analysis Results:`);
    console.log(`   URL: ${results.url}`);
    console.log(`   Overall Score: ${results.score}/100 (Grade: ${results.grade})`);
    console.log(`   Lighthouse Score: ${results.metrics.lighthouseScore || "N/A"}`);
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Good: ${results.summary.good}`);
    console.log(`   ⚠️  Needs Improvement: ${results.summary.needsImprovement}`);
    console.log(`   ❌ Poor: ${results.summary.poor}`);
    console.log(`   🔴 Bottlenecks: ${results.summary.bottlenecksCount} (${results.summary.criticalBottlenecks} critical)`);
    
    if (results.bottlenecks.length > 0) {
      console.log(`\n🚨 Top Bottlenecks:`);
      results.bottlenecks.slice(0, 5).forEach((b, i) => {
        console.log(`   ${i + 1}. [${b.severity.toUpperCase()}] ${b.metric}: ${this.formatValue(b.currentValue, b.metric)}`);
      });
    }
  }

  async saveResults(results) {
    const timestamp = Date.now();
    const reportPath = path.join(
      this.options.outputDir,
      `performance-comparison_${timestamp}.json`
    );
    const htmlPath = path.join(
      this.options.outputDir,
      `performance-comparison_${timestamp}.html`
    );

    // Save JSON report
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');

    // Generate HTML report
    const htmlContent = this.generateHTMLReport(results);
    await fs.writeFile(htmlPath, htmlContent);

    console.log(`\n📄 Reports saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  generateHTMLReport(results) {
    const formatValue = (value, metric) => {
      if (value === null || value === undefined) return "N/A";
      if (metric.includes("Size") || metric === "totalTransferSize") {
        if (value >= 1048576) return `${(value / 1048576).toFixed(2)} MB`;
        if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
        return `${value} bytes`;
      }
      if (metric.includes("Time") || metric.includes("Paint") || metric.includes("Delay") || 
          metric.includes("Index") || metric.includes("Interactive") || metric.includes("Loaded")) {
        if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
        return `${Math.round(value)} ms`;
      }
      if (metric.includes("LayoutShift")) return value.toFixed(3);
      return value.toString();
    };

    const getStatusClass = (status) => {
      if (status === "good") return "status-good";
      if (status === "needsImprovement") return "status-warning";
      return "status-poor";
    };

    const getStatusIcon = (status) => {
      if (status === "good") return "✅";
      if (status === "needsImprovement") return "⚠️";
      return "❌";
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Comparison Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f5f5f5; padding: 20px; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .score-card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .score-large { font-size: 4em; font-weight: bold; color: #667eea; }
        .grade { font-size: 2em; color: #764ba2; margin-top: 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-card h3 { color: #333; margin-bottom: 10px; font-size: 0.9em; text-transform: uppercase; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-poor { color: #dc3545; }
        .section { background: white; padding: 25px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h2 { color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        .comparison-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .comparison-table th, .comparison-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .comparison-table th { background: #f8f9fa; font-weight: 600; color: #333; }
        .comparison-table tr:hover { background: #f8f9fa; }
        .bottleneck { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .bottleneck.high { background: #f8d7da; border-left-color: #dc3545; }
        .bottleneck h3 { color: #333; margin-bottom: 10px; }
        .bottleneck p { margin: 5px 0; }
        .recommendation { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .recommendation.high { border-left-color: #dc3545; }
        .recommendation.medium { border-left-color: #ffc107; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; }
        .badge-high { background: #dc3545; color: white; }
        .badge-medium { background: #ffc107; color: #333; }
        .badge-good { background: #28a745; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Performance Comparison Report</h1>
            <p><strong>URL:</strong> ${results.url}</p>
            <p><strong>Date:</strong> ${new Date(results.timestamp).toLocaleString()}</p>
        </div>

        <div class="score-card">
            <div class="score-large">${results.score}</div>
            <div class="grade">Grade: ${results.grade}</div>
            ${results.metrics.lighthouseScore ? `<p style="margin-top: 10px; color: #666;">Lighthouse Score: ${results.metrics.lighthouseScore}</p>` : ''}
        </div>

        <div class="summary-grid">
            <div class="metric-card">
                <h3>Good Metrics</h3>
                <div class="metric-value status-good">${results.summary.good}</div>
            </div>
            <div class="metric-card">
                <h3>Needs Improvement</h3>
                <div class="metric-value status-warning">${results.summary.needsImprovement}</div>
            </div>
            <div class="metric-card">
                <h3>Poor Metrics</h3>
                <div class="metric-value status-poor">${results.summary.poor}</div>
            </div>
            <div class="metric-card">
                <h3>Bottlenecks</h3>
                <div class="metric-value">${results.summary.bottlenecksCount}</div>
                <small style="color: #dc3545;">${results.summary.criticalBottlenecks} critical</small>
            </div>
        </div>

        ${results.bottlenecks.length > 0 ? `
        <div class="section">
            <h2>🚨 Performance Bottlenecks</h2>
            ${results.bottlenecks.map(b => `
                <div class="bottleneck ${b.severity}">
                    <h3>${b.metric} <span class="badge badge-${b.severity}">${b.severity.toUpperCase()}</span></h3>
                    <p><strong>Current:</strong> ${formatValue(b.currentValue, b.metric)} | <strong>Target:</strong> ${formatValue(b.threshold, b.metric)}</p>
                    <p><strong>Impact:</strong> ${b.impact}</p>
                    <p><strong>Recommendation:</strong> ${b.recommendation}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="section">
            <h2>📊 Core Web Vitals</h2>
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Threshold (Good)</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(results.comparison.coreWebVitals).map(metric => {
                        const comp = results.comparison.coreWebVitals[metric];
                        return `
                            <tr>
                                <td><strong>${metric}</strong></td>
                                <td>${formatValue(comp.value, metric)}</td>
                                <td><span class="${getStatusClass(comp.status)}">${getStatusIcon(comp.status)} ${comp.rating}</span></td>
                                <td>${formatValue(comp.threshold.good, metric)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>⏱️ Loading Metrics</h2>
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Threshold (Good)</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(results.comparison.loadingMetrics).map(metric => {
                        const comp = results.comparison.loadingMetrics[metric];
                        return `
                            <tr>
                                <td><strong>${metric}</strong></td>
                                <td>${formatValue(comp.value, metric)}</td>
                                <td><span class="${getStatusClass(comp.status)}">${getStatusIcon(comp.status)} ${comp.rating}</span></td>
                                <td>${formatValue(comp.threshold.good, metric)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📦 Resource Metrics</h2>
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Threshold (Good)</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(results.comparison.resourceMetrics).map(metric => {
                        const comp = results.comparison.resourceMetrics[metric];
                        return `
                            <tr>
                                <td><strong>${metric}</strong></td>
                                <td>${formatValue(comp.value, metric)}</td>
                                <td><span class="${getStatusClass(comp.status)}">${getStatusIcon(comp.status)} ${comp.rating}</span></td>
                                <td>${formatValue(comp.threshold.good, metric)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        ${results.recommendations.length > 0 ? `
        <div class="section">
            <h2>💡 Optimization Recommendations</h2>
            ${results.recommendations.map(rec => `
                <div class="recommendation ${rec.priority.toLowerCase()}">
                    <h3>${rec.metric} <span class="badge badge-${rec.priority.toLowerCase()}">${rec.priority}</span></h3>
                    <p><strong>Issue:</strong> ${rec.issue}</p>
                    <p><strong>Impact:</strong> ${rec.impact}</p>
                    <p><strong>Current:</strong> ${rec.currentValue} | <strong>Target:</strong> ${rec.targetValue}</p>
                    <p><strong>Recommendation:</strong> ${rec.recommendation}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    const value = args[i + 1];
    options[key] = value;
  }

  if (!options["lighthouse-report"]) {
    console.error("❌ Error: --lighthouse-report parameter is required");
    console.log(
      "Usage: node lighthouse-comparator.js --lighthouse-report <path> [--thresholds <path>] [--output-dir <path>]"
    );
    process.exit(1);
  }

  const comparator = new LighthouseComparator(options);

  try {
    const results = await comparator.compareReport(options["lighthouse-report"]);
    process.exit(results.summary.poor > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Comparison failed:", error.message);
    process.exit(1);
  }
}

// Export for use as module
export default LighthouseComparator;

// Run if called directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

