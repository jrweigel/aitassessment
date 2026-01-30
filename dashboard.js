// AX&E AI Transformation Dashboard
// Displays anonymized organizational rollup with export capabilities

class TransformationDashboard {
    constructor() {
        this.assessmentData = [];
        this.teamNames = ['CXS', 'DevRel', 'Product', 'Eng', 'Learn', 'Startups'];
        this.teamDisplayNames = {
            'CXS': 'Cloud Experience Studio',
            'DevRel': 'Developer Relations', 
            'Product': 'AX&E Product',
            'Eng': 'AX&E Engineering',
            'Learn': 'Learn',
            'Startups': 'Startups'
        };
        this.stageNames = ['', 'Unboxing & Assembling', 'Riding with Training Wheels', 'Training Wheels Off', 'Making the Bike Yours', 'Riding Without Thinking'];
        this.stageColors = ['', '#6b7280', '#f97316', '#eab308', '#2563eb', '#16a34a'];
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderDashboard();
        this.bindEvents();
    }

    async loadData() {
        try {
            // Try to load data from Azure API
            const allData = await window.assessmentDataService.getAssessments({ admin: false });
            console.log('Dashboard loadData:', allData.length, 'assessments found from Azure');
            
            // Filter for last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            const recentData = allData.filter(assessment => {
                return new Date(assessment.timestamp) >= ninetyDaysAgo;
            });
            
            // Keep only latest assessment per manager (most recent submission per manager name)
            const latestByManager = {};
            recentData.forEach(assessment => {
                const managerKey = assessment.managerName || assessment.sessionId || `unknown_${Date.now()}`;
                if (!latestByManager[managerKey] || new Date(assessment.timestamp) > new Date(latestByManager[managerKey].timestamp)) {
                    latestByManager[managerKey] = assessment;
                }
            });
            
            this.assessmentData = Object.values(latestByManager);
            
        } catch (error) {
            console.error('Failed to load data from Azure, falling back to localStorage:', error);
            
            // Fallback to localStorage
            const storedData = localStorage.getItem('axe-ai-assessments');
            const allData = storedData ? JSON.parse(storedData) : [];
            
            // Filter for last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            const recentData = allData.filter(assessment => {
                return new Date(assessment.timestamp) >= ninetyDaysAgo;
            });
            
            // Keep only latest assessment per manager (most recent submission per manager name)
            const latestByManager = {};
            recentData.forEach(assessment => {
                const managerKey = assessment.managerName || assessment.sessionId || `unknown_${Date.now()}`;
                if (!latestByManager[managerKey] || new Date(assessment.timestamp) > new Date(latestByManager[managerKey].timestamp)) {
                    latestByManager[managerKey] = assessment;
                }
            });
            
            this.assessmentData = Object.values(latestByManager);
            
            // Show notification that we're using offline data
            this.showOfflineNotification();
        }
        
        // If no data, show empty state
        if (this.assessmentData.length === 0) {
            this.showEmptyState();
            return;
        }
    }

    renderDashboard() {
        this.renderOverviewStats();
        this.renderTeamDistribution();
        this.renderStageDistribution();
        this.renderRecentActivity();
    }

    renderOverviewStats() {
        const totalAssessments = this.assessmentData.length;
        const latestAssessment = this.assessmentData.length > 0 
            ? new Date(Math.max(...this.assessmentData.map(a => new Date(a.timestamp)))).toLocaleDateString()
            : 'No data';

        document.getElementById('total-assessments').textContent = totalAssessments;
        document.getElementById('latest-assessment').textContent = latestAssessment;
    }

    renderTeamDistribution() {
        const teamGrid = document.getElementById('team-grid');
        const teamStats = this.calculateTeamStats();
        
        teamGrid.innerHTML = '';
        
        this.teamNames.forEach(teamName => {
            const teamData = teamStats[teamName] || { total: 0, stages: {} };
            const teamCard = this.createTeamCard(teamName, teamData);
            teamGrid.appendChild(teamCard);
        });
    }

    createTeamCard(teamName, teamData) {
        const card = document.createElement('div');
        card.className = 'team-card';
        
        const stageStats = Object.entries(teamData.stages)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([stage, count]) => `
                <div class="stage-count">
                    <div class="stage-label">
                        <span class="stage-indicator stage-${stage}"></span>
                        Stage ${stage}
                    </div>
                    <span>${count}</span>
                </div>
            `).join('');
        
        const displayName = this.teamDisplayNames[teamName] || teamName;
        
        card.innerHTML = `
            <h3>${displayName}</h3>
            <div class="team-stats">
                ${teamData.total > 0 ? stageStats : '<p class="empty-state">No assessments yet</p>'}
            </div>
        `;
        
        return card;
    }

    calculateTeamStats() {
        const stats = {};
        
        this.assessmentData.forEach(assessment => {
            const team = assessment.axeTeam;
            const stage = assessment.suggestedStage;
            
            if (!stats[team]) {
                stats[team] = { total: 0, stages: {} };
            }
            
            stats[team].total++;
            stats[team].stages[stage] = (stats[team].stages[stage] || 0) + 1;
        });
        
        return stats;
    }

    renderStageDistribution() {
        const stageBreakdown = document.getElementById('stage-breakdown');
        const distributionChart = document.getElementById('distribution-chart');
        
        const stageCounts = this.calculateStageCounts();
        const total = this.assessmentData.length;
        
        // Render stage summary cards
        stageBreakdown.innerHTML = '';
        for (let stage = 1; stage <= 5; stage++) {
            const count = stageCounts[stage] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            
            const summaryCard = document.createElement('div');
            summaryCard.className = `stage-summary stage-${stage}`;
            summaryCard.innerHTML = `
                <h4>Stage ${stage}</h4>
                <span class="count">${count}</span>
                <div class="percentage">${percentage}%</div>
            `;
            
            stageBreakdown.appendChild(summaryCard);
        }
        
        // Render chart
        this.renderChart(stageCounts, total);
    }

    renderChart(stageCounts, total) {
        const distributionChart = document.getElementById('distribution-chart');
        
        let chartHtml = '';
        for (let stage = 1; stage <= 5; stage++) {
            const count = stageCounts[stage] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            chartHtml += `
                <div class="chart-bar">
                    <div class="chart-label">Stage ${stage}</div>
                    <div class="chart-visual">
                        <div class="chart-fill stage-${stage}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="chart-value">${count}</div>
                </div>
            `;
        }
        
        distributionChart.innerHTML = chartHtml;
    }

    calculateStageCounts() {
        const counts = {};
        
        this.assessmentData.forEach(assessment => {
            const stage = assessment.suggestedStage;
            counts[stage] = (counts[stage] || 0) + 1;
        });
        
        return counts;
    }

    renderRecentActivity() {
        const timeline = document.getElementById('assessment-timeline');
        
        // Sort by timestamp (most recent first) and take last 10
        const recentAssessments = this.assessmentData
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        if (recentAssessments.length === 0) {
            timeline.innerHTML = '<p class="empty-state">No recent assessment activity</p>';
            return;
        }
        
        const timelineHtml = recentAssessments.map(assessment => `
            <div class="timeline-item">
                <div class="timeline-date">${new Date(assessment.timestamp).toLocaleDateString()}</div>
                <div class="timeline-team">${assessment.axeTeam}</div>
                <div class="timeline-stage">
                    <span class="stage-indicator stage-${assessment.suggestedStage}"></span>
                    Stage ${assessment.suggestedStage}: ${this.stageNames[assessment.suggestedStage]}
                </div>
            </div>
        `).join('');
        
        timeline.innerHTML = timelineHtml;
    }

    bindEvents() {
        document.getElementById('export-csv')?.addEventListener('click', () => this.exportCSV());
        document.getElementById('export-summary')?.addEventListener('click', () => this.exportSummary());
        document.getElementById('refresh-data')?.addEventListener('click', () => this.refreshData());
    }

    exportCSV() {
        if (this.assessmentData.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Prepare anonymized data for export
        const csvData = this.assessmentData.map(assessment => ({
            'Assessment Date': new Date(assessment.timestamp).toLocaleDateString(),
            'AX&E Team': assessment.axeTeam,
            'Assessed Stage': assessment.assessedStage || assessment.suggestedStage,
            'Suggested Stage': assessment.suggestedStage,
            'Average Score': this.calculateAverageScore(assessment.scores),
            'Session ID': assessment.sessionId
        }));
        
        const csvContent = this.convertToCSV(csvData);
        this.downloadFile(csvContent, 'axe-ai-transformation-data.csv', 'text/csv');
    }

    exportSummary() {
        const teamStats = this.calculateTeamStats();
        const stageCounts = this.calculateStageCounts();
        const total = this.assessmentData.length;
        
        let summary = `AX&E AI Transformation Assessment Summary\n`;
        summary += `Generated: ${new Date().toLocaleDateString()}\n`;
        summary += `Total Assessments: ${total}\n\n`;
        
        summary += `OVERALL DISTRIBUTION:\n`;
        for (let stage = 1; stage <= 5; stage++) {
            const count = stageCounts[stage] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            summary += `Stage ${stage} (${this.stageNames[stage]}): ${count} teams (${percentage}%)\n`;
        }
        
        summary += `\nTEAM BREAKDOWN:\n`;
        this.teamNames.forEach(teamName => {
            const teamData = teamStats[teamName];
            if (teamData) {
                summary += `${teamName}: ${teamData.total} assessments\n`;
                Object.entries(teamData.stages).forEach(([stage, count]) => {
                    summary += `  - Stage ${stage}: ${count} teams\n`;
                });
            } else {
                summary += `${teamName}: No assessments\n`;
            }
        });
        
        this.downloadFile(summary, 'axe-ai-transformation-summary.txt', 'text/plain');
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    calculateAverageScore(scores) {
        if (!scores || scores.length === 0) return 0;
        return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    }

    async refreshData() {
        // Show loading state on refresh button
        const refreshBtn = document.getElementById('refresh-data');
        const originalText = refreshBtn.textContent;
        refreshBtn.innerHTML = '⟳ Refreshing...';
        refreshBtn.disabled = true;
        
        try {
            // Perform data refresh
            await this.loadData();
            this.renderDashboard();
            
            // Show success state
            refreshBtn.innerHTML = '✓ Updated!';
            refreshBtn.style.background = '#16a34a';
            
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.style.background = '';
                refreshBtn.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('Refresh failed:', error);
            
            refreshBtn.innerHTML = '✕ Failed';
            refreshBtn.style.background = '#dc2626';
            
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.style.background = '';
                refreshBtn.disabled = false;
            }, 2000);
        }
    }

    showOfflineNotification() {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('offline-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f97316;
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = 'Using offline data. Some assessments may not be visible.';
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }

    showEmptyState() {
        document.querySelector('main').innerHTML = `
            <section class="empty-state">
                <h3>No Assessment Data</h3>
                <p>No team assessments have been completed yet.</p>
                <p><a href="index.html">Complete your first assessment</a> to see dashboard data.</p>
            </section>
        `;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    new TransformationDashboard();
});