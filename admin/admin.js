// AX&E AI Transformation Admin Dashboard
// Internal view with manager names and detailed analytics

class AdminDashboard {
    constructor() {
        this.assessmentData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.stageNames = ['', 'Unboxing & Assembling', 'Riding with Training Wheels', 'Training Wheels Off', 'Making the Bike Yours', 'Riding Without Thinking'];
        
        this.init();
    }

    init() {
        this.loadData();
        this.renderAdminDashboard();
        this.bindEvents();
    }

    async loadData() {
        try {
            // Try to load data from Azure API with admin access
            const allData = await window.assessmentDataService.getAssessments({ admin: true });
            console.log('Admin loadData:', allData.length, 'assessments found from Azure');
            
            // Filter for last 90 days for admin persistence
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            // Show all assessments from last 90 days for admin log
            this.assessmentData = allData.filter(assessment => {
                return new Date(assessment.timestamp) >= ninetyDaysAgo;
            });
            
        } catch (error) {
            console.error('Failed to load admin data from Azure, falling back to localStorage:', error);
            
            // Fallback to localStorage
            const storedData = localStorage.getItem('axe-ai-assessments');
            const allData = storedData ? JSON.parse(storedData) : [];
            
            // Filter for last 90 days for admin persistence
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            // Show all assessments from last 90 days for admin log
            this.assessmentData = allData.filter(assessment => {
                return new Date(assessment.timestamp) >= ninetyDaysAgo;
            });
            
            // Show notification that we're using offline data
            this.showOfflineNotification();
        }
        
        // Sort by timestamp descending (newest first) for record log
        this.assessmentData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        this.filteredData = [...this.assessmentData];
        
        if (this.assessmentData.length === 0) {
            console.log('No assessment data found, showing empty state');
            this.showEmptyState();
            return;
        }
    }

    renderAdminDashboard() {
        this.renderAdminStats();
        this.renderAssessmentLog();
        this.renderAnalytics();
    }

    renderAdminStats() {
        const totalAssessments = this.assessmentData.length;
        const uniqueManagers = new Set(this.assessmentData.map(a => a.managerName)).size;
        
        document.getElementById('admin-total-assessments').textContent = totalAssessments;
        document.getElementById('admin-unique-managers').textContent = uniqueManagers;
        
        // Mini distribution
        this.renderMiniDistribution();
    }

    renderMiniDistribution() {
        const stageCounts = this.calculateStageCounts();
        const total = this.assessmentData.length;
        const miniDistribution = document.getElementById('admin-mini-distribution');
        
        let html = '';
        for (let stage = 1; stage <= 5; stage++) {
            const count = stageCounts[stage] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            html += `<div class="mini-bar stage-${stage}" style="width: ${percentage}%" title="Stage ${stage}: ${count} teams"></div>`;
        }
        
        miniDistribution.innerHTML = html;
    }

    renderAssessmentLog() {
        const tableBody = document.getElementById('log-table-body');
        console.log('renderAssessmentLog called, table body element:', tableBody);
        console.log('Filtered data length:', this.filteredData.length);
        
        tableBody.innerHTML = '';

        if (this.filteredData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="empty-admin">No assessment records found</td></tr>';
            return;
        }

        this.filteredData.forEach((assessment, index) => {
            const row = document.createElement('tr');
            
            const timestamp = new Date(assessment.timestamp);
            const formattedDate = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${assessment.managerName}</td>
                <td>${assessment.axeTeam}</td>
                <td>
                    <span class="stage-badge stage-${assessment.assessedStage}">
                        Stage ${assessment.assessedStage}
                    </span>
                </td>
                <td>
                    <button class="delete-btn" onclick="adminDashboard.deleteRecord('${assessment.timestamp}')" title="Delete Record">
                        ✖
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    async deleteRecord(timestamp) {
        const assessment = this.assessmentData.find(a => a.timestamp === timestamp);
        if (!assessment) return;
        
        if (confirm('Are you sure you want to delete this assessment record?')) {
            try {
                // Try to delete from Azure first
                await window.assessmentDataService.deleteAssessment(assessment.sessionId, assessment.axeTeam);
                console.log('Assessment deleted from Azure successfully');
                
            } catch (error) {
                console.error('Failed to delete from Azure:', error);
                // Continue with local deletion anyway
            }
            
            // Remove from current filtered data
            this.assessmentData = this.assessmentData.filter(a => a.timestamp !== timestamp);
            this.filteredData = this.filteredData.filter(a => a.timestamp !== timestamp);
            
            // Remove from localStorage as backup
            const storedData = localStorage.getItem('axe-ai-assessments');
            const allData = storedData ? JSON.parse(storedData) : [];
            const updatedAllData = allData.filter(a => a.timestamp !== timestamp);
            localStorage.setItem('axe-ai-assessments', JSON.stringify(updatedAllData));
            
            // Re-render the dashboard
            this.renderAdminDashboard();
        }
    }

    renderManagerTable() {
        const tableBody = document.getElementById('manager-table-body');
        
        if (this.filteredData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="empty-admin">No data matches current filters</td></tr>';
            return;
        }
        
        // Sort by timestamp (most recent first)
        const sortedData = this.filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedData = sortedData.slice(startIndex, endIndex);
        
        const rowsHtml = paginatedData.map(assessment => `
            <tr>
                <td><strong>${this.escapeHtml(assessment.managerName)}</strong></td>
                <td><span class="team-badge">${assessment.axeTeam}</span></td>
                <td>${new Date(assessment.timestamp).toLocaleDateString()}</td>
                <td><span class="stage-badge stage-${assessment.assessedStage}">Stage ${assessment.assessedStage}</span></td>
                <td><span class="stage-badge stage-${assessment.suggestedStage}">Stage ${assessment.suggestedStage}</span></td>
                <td><span class="scores-display">[${assessment.scores.join(', ')}]</span></td>
                <td>
                    <button class="action-btn" onclick="adminDashboard.viewDetails('${assessment.sessionId}')">
                        View Details
                    </button>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = rowsHtml;
        
        // Render pagination controls
        this.renderPagination(sortedData.length);
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const tableContainer = document.querySelector('.manager-table-container');
        
        if (totalPages <= 1) {
            // Remove existing pagination if present
            const existingPagination = tableContainer.nextElementSibling;
            if (existingPagination && existingPagination.classList.contains('pagination')) {
                existingPagination.remove();
            }
            return;
        }
        
        let paginationHtml = '<div class="pagination">';
        paginationHtml += `<button ${this.currentPage === 1 ? 'disabled' : ''} onclick="adminDashboard.changePage(${this.currentPage - 1})">Previous</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === this.currentPage ? 'current-page' : '';
            paginationHtml += `<button class="${activeClass}" onclick="adminDashboard.changePage(${i})">${i}</button>`;
        }
        
        paginationHtml += `<button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="adminDashboard.changePage(${this.currentPage + 1})">Next</button>`;
        paginationHtml += '</div>';
        
        // Remove existing pagination
        const existingPagination = tableContainer.nextElementSibling;
        if (existingPagination && existingPagination.classList.contains('pagination')) {
            existingPagination.remove();
        }
        
        // Add new pagination
        tableContainer.insertAdjacentHTML('afterend', paginationHtml);
    }

    changePage(page) {
        this.currentPage = page;
        this.renderManagerTable();
    }

    renderAnalytics() {
        this.renderProgressionAnalysis();
        this.renderReadinessIndicators();
        this.renderQualityMetrics();
    }

    renderProgressionAnalysis() {
        const progressionDiv = document.getElementById('progression-analysis');
        
        // Only use finalized assessments for analytics
        const finalizedAssessments = this.assessmentData.filter(assessment => 
            assessment.assessmentFinalized === true && 
            assessment.assessedStage !== null
        );
        
        // Analyze team final choice vs suggested stages
        const progressionData = finalizedAssessments.reduce((acc, assessment) => {
            const diff = assessment.assessedStage - assessment.suggestedStage;
            if (diff > 0) acc.overestimated++;
            else if (diff < 0) acc.underestimated++;
            else acc.accurate++;
            return acc;
        }, { accurate: 0, underestimated: 0, overestimated: 0 });
        
        const total = finalizedAssessments.length;
        const progressionHtml = `
            <div class="metric-item">
                <span class="metric-label">Accurate Self-Assessment</span>
                <span class="metric-value">${total > 0 ? Math.round((progressionData.accurate / total) * 100) : 0}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Teams Underestimating</span>
                <span class="metric-value">${total > 0 ? Math.round((progressionData.underestimated / total) * 100) : 0}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Teams Overestimating</span>
                <span class="metric-value">${total > 0 ? Math.round((progressionData.overestimated / total) * 100) : 0}%</span>
            </div>
        `;
        
        progressionDiv.innerHTML = progressionHtml;
    }

    renderReadinessIndicators() {
        const readinessDiv = document.getElementById('readiness-indicators');
        
        // Calculate team readiness by AX&E team
        const teamReadiness = this.calculateTeamReadiness();
        const teamReadinessHtml = Object.entries(teamReadiness)
            .sort(([,a], [,b]) => b.avgStage - a.avgStage)
            .map(([team, data]) => `
                <div class="metric-item">
                    <span class="metric-label">${team} Avg Stage</span>
                    <span class="metric-value">${data.avgStage.toFixed(1)}</span>
                </div>
            `).join('');
        
        readinessDiv.innerHTML = teamReadinessHtml;
    }

    renderQualityMetrics() {
        const qualityDiv = document.getElementById('quality-metrics');
        
        // Calculate assessment quality metrics
        const avgConfidence = this.calculateAverageConfidence();
        const responsePattern = this.analyzeResponsePatterns();
        
        const qualityHtml = `
            <div class="metric-item">
                <span class="metric-label">Avg Response Confidence</span>
                <span class="metric-value">${avgConfidence.toFixed(1)}/3.0</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Response Variety</span>
                <span class="metric-value">${responsePattern.variety}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Complete Assessments</span>
                <span class="metric-value">${responsePattern.complete}%</span>
            </div>
        `;
        
        qualityDiv.innerHTML = qualityHtml;
    }

    calculateStageCounts() {
        const counts = {};
        this.assessmentData.forEach(assessment => {
            const stage = assessment.suggestedStage;
            counts[stage] = (counts[stage] || 0) + 1;
        });
        return counts;
    }

    calculateTeamReadiness() {
        const teamData = {};
        
        this.assessmentData.forEach(assessment => {
            const team = assessment.axeTeam;
            if (!teamData[team]) {
                teamData[team] = { stages: [], count: 0 };
            }
            teamData[team].stages.push(assessment.suggestedStage);
            teamData[team].count++;
        });
        
        // Calculate averages
        Object.keys(teamData).forEach(team => {
            const stages = teamData[team].stages;
            teamData[team].avgStage = stages.reduce((a, b) => a + b, 0) / stages.length;
        });
        
        return teamData;
    }

    calculateAverageConfidence() {
        if (this.assessmentData.length === 0) return 0;
        
        const allScores = this.assessmentData.flatMap(assessment => assessment.scores);
        return allScores.reduce((a, b) => a + b, 0) / allScores.length;
    }

    analyzeResponsePatterns() {
        if (this.assessmentData.length === 0) return { variety: 0, complete: 0 };
        
        // Analyze response variety and completeness
        const responseVariety = this.assessmentData.filter(assessment => {
            const uniqueScores = new Set(assessment.scores).size;
            return uniqueScores > 1; // Teams used variety in responses
        }).length;
        
        const completeAssessments = this.assessmentData.filter(assessment => 
            assessment.scores.length === 2 && 
            assessment.managerName && 
            assessment.axeTeam
        ).length;
        
        return {
            variety: Math.round((responseVariety / this.assessmentData.length) * 100),
            complete: Math.round((completeAssessments / this.assessmentData.length) * 100)
        };
    }

    bindEvents() {
        // Search and filtering
        document.getElementById('manager-search')?.addEventListener('input', (e) => this.filterData());
        document.getElementById('team-filter')?.addEventListener('change', (e) => this.filterData());
        document.getElementById('stage-filter')?.addEventListener('change', (e) => this.filterData());
        document.getElementById('refresh-log')?.addEventListener('click', () => this.refreshData());
        
        // Export actions
        document.getElementById('export-detailed-csv')?.addEventListener('click', () => this.exportDetailedCSV());
        document.getElementById('export-manager-report')?.addEventListener('click', () => this.exportManagerReport());
        document.getElementById('clear-all-data')?.addEventListener('click', () => this.clearAllData());
    }

    filterData() {
        const searchTerm = document.getElementById('manager-search')?.value.toLowerCase() || '';
        const teamFilter = document.getElementById('team-filter')?.value || '';
        const stageFilter = document.getElementById('stage-filter')?.value || '';
        
        this.filteredData = this.assessmentData.filter(assessment => {
            const matchesSearch = assessment.managerName.toLowerCase().includes(searchTerm);
            const matchesTeam = !teamFilter || assessment.axeTeam === teamFilter;
            const matchesStage = !stageFilter || assessment.assessedStage.toString() === stageFilter;
            
            return matchesSearch && matchesTeam && matchesStage;
        });
        
        this.renderAssessmentLog();
    }

    refreshData() {
        this.loadData();
        this.renderAdminDashboard();
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
        
        notification.textContent = 'Using offline data. Full admin features may not be available.';
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }

    viewDetails(sessionId) {
        const assessment = this.assessmentData.find(a => a.sessionId === sessionId);
        if (!assessment) return;
        
        const details = `
Assessment Details:
Manager: ${assessment.managerName}
Team: ${assessment.axeTeam}
Date: ${new Date(assessment.timestamp).toLocaleString()}
Self-Assessed Stage: ${assessment.assessedStage}
Suggested Stage: ${assessment.suggestedStage}
Individual Scores: ${assessment.scores.join(', ')}
Session ID: ${assessment.sessionId}
        `.trim();
        
        alert(details);
    }

    exportDetailedCSV() {
        if (this.assessmentData.length === 0) {
            alert('No data to export');
            return;
        }
        
        const csvData = this.assessmentData.map(assessment => ({
            'Assessment Date': new Date(assessment.timestamp).toLocaleDateString(),
            'Manager Name': assessment.managerName,
            'AX&E Team': assessment.axeTeam,
            'Self-Assessed Stage': assessment.assessedStage,
            'Suggested Stage': assessment.suggestedStage,
            'Question 1 Score': assessment.scores[0] || '',
            'Question 2 Score': assessment.scores[1] || '',
            'Average Score': this.calculateAverageScore(assessment.scores),
            'Session ID': assessment.sessionId,
            'Timestamp': assessment.timestamp
        }));
        
        const csvContent = this.convertToCSV(csvData);
        this.downloadFile(csvContent, 'axe-ai-transformation-detailed-data.csv', 'text/csv');
    }

    exportManagerReport() {
        const managerSummary = this.generateManagerSummary();
        this.downloadFile(managerSummary, 'axe-ai-transformation-manager-report.txt', 'text/plain');
    }

    generateManagerSummary() {
        const teamReadiness = this.calculateTeamReadiness();
        let report = `AX&E AI Transformation - Manager Summary Report\n`;
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `Total Assessments: ${this.assessmentData.length}\n`;
        report += `Unique Managers: ${new Set(this.assessmentData.map(a => a.managerName)).size}\n\n`;
        
        report += `TEAM READINESS SUMMARY:\n`;
        Object.entries(teamReadiness)
            .sort(([,a], [,b]) => b.avgStage - a.avgStage)
            .forEach(([team, data]) => {
                report += `${team}: Average Stage ${data.avgStage.toFixed(1)} (${data.count} assessments)\n`;
            });
        
        report += `\nDETAILED MANAGER BREAKDOWN:\n`;
        this.assessmentData
            .sort((a, b) => a.axeTeam.localeCompare(b.axeTeam))
            .forEach(assessment => {
                report += `${assessment.managerName} (${assessment.axeTeam}): `;
                report += `Stage ${assessment.suggestedStage} - ${new Date(assessment.timestamp).toLocaleDateString()}\n`;
            });
        
        return report;
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

    clearAllData() {
        if (!confirm('Are you sure you want to clear ALL assessment data? This cannot be undone.')) {
            return;
        }
        
        if (!confirm('This will permanently delete all manager names and assessment results. Continue?')) {
            return;
        }
        
        localStorage.removeItem('axe-ai-assessments');
        localStorage.removeItem('axe-ai-latest-result');
        
        alert('All data has been cleared.');
        window.location.reload();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEmptyState() {
        document.querySelector('main').innerHTML = `
            <section class="empty-admin">
                <h3>No Assessment Data</h3>
                <p>No assessments have been completed yet.</p>
                <p><a href="../index.html">Complete your first assessment</a> to see admin data.</p>
            </section>
        `;
    }
}

// Make it globally accessible for onclick handlers
let adminDashboard;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});