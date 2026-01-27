// AX&E AI Assessment Data Service
// Handles communication with Azure Functions API

class AssessmentDataService {
    constructor() {
        // For production, this will be automatically set by Azure Static Web Apps
        // For local development, you'll need to update this
        this.apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:7071/api'  // Local Functions development
            : '/api';  // Production Azure Static Web Apps
    }

    async submitAssessment(assessmentData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/submit-assessment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(assessmentData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit assessment');
            }

            return result;
        } catch (error) {
            console.error('Error submitting assessment:', error);
            // Fallback to localStorage for offline scenarios
            this.saveToLocalStorage(assessmentData);
            throw error;
        }
    }

    async getAssessments(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.admin) params.append('admin', 'true');
            if (options.sessionId) params.append('sessionId', options.sessionId);

            const response = await fetch(`${this.apiBaseUrl}/get-assessments?${params}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to retrieve assessments');
            }

            return result.assessments;
        } catch (error) {
            console.error('Error fetching assessments:', error);
            // Fallback to localStorage for offline scenarios
            return this.getFromLocalStorage();
        }
    }

    async deleteAssessment(sessionId, axeTeam) {
        try {
            const params = new URLSearchParams({
                sessionId: sessionId,
                partitionKey: axeTeam
            });

            const response = await fetch(`${this.apiBaseUrl}/delete-assessment?${params}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete assessment');
            }

            return result;
        } catch (error) {
            console.error('Error deleting assessment:', error);
            throw error;
        }
    }

    // Fallback localStorage methods for offline scenarios
    saveToLocalStorage(assessmentData) {
        console.log('Saving to localStorage as fallback');
        const existingData = JSON.parse(localStorage.getItem('axe-ai-assessments') || '[]');
        
        const existingIndex = existingData.findIndex(item => item.sessionId === assessmentData.sessionId);
        if (existingIndex >= 0) {
            existingData[existingIndex] = assessmentData;
        } else {
            existingData.push(assessmentData);
        }
        
        localStorage.setItem('axe-ai-assessments', JSON.stringify(existingData));
        localStorage.setItem('axe-ai-latest-result', JSON.stringify(assessmentData));
    }

    getFromLocalStorage() {
        console.log('Loading from localStorage as fallback');
        const storedData = localStorage.getItem('axe-ai-assessments');
        return storedData ? JSON.parse(storedData) : [];
    }

    // Check if API is available
    async checkApiHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/get-assessments?admin=false`, {
                method: 'HEAD'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Make it globally available
window.assessmentDataService = new AssessmentDataService();