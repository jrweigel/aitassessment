// AX&E AI Assessment Data Service
// Handles communication with Azure Functions API

class AssessmentDataService {
    constructor() {
        // API endpoints with fallback to standalone Functions app
        this.apiBaseUrls = [
            'https://aitassessment-api.azurewebsites.net/api',  // Standalone Functions app (working)
            '/api'  // Static Web App API (fallback)
        ];
        
        this.currentApiBaseUrl = this.apiBaseUrls[0]; // Start with standalone Functions app
        
        console.log('AssessmentDataService initialized with API URLs:', this.apiBaseUrls);
        console.log('Current hostname:', window.location.hostname);
        console.log('Using API base URL:', this.currentApiBaseUrl);
    }

    async submitAssessment(assessmentData) {
        console.log('submitAssessment called with:', assessmentData);
        
        try {
            const response = await fetch(`${this.currentApiBaseUrl}/submit-assessment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(assessmentData)
            });

            console.log('API Response status:', response.status);
            console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

            // Check if response has content
            const responseText = await response.text();
            console.log('API Response text:', responseText);

            let result;
            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError);
                result = { error: 'Invalid response from server', rawResponse: responseText };
            }

            console.log('API Response parsed:', result);
            
            if (!response.ok) {
                throw new Error(result.error || `API returned ${response.status}: ${response.statusText}`);
            }

            console.log('Assessment submitted successfully to API');
            return result;
        } catch (error) {
            console.error('Error submitting assessment to API:', error);
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Fallback to localStorage for offline scenarios
            console.log('Falling back to localStorage');
            this.saveToLocalStorage(assessmentData);
            throw error;
        }
    }

    async getAssessments(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.admin) params.append('admin', 'true');
            if (options.sessionId) params.append('sessionId', options.sessionId);

            const response = await fetch(`${this.currentApiBaseUrl}/get-assessments?${params}`);
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

            const response = await fetch(`${this.currentApiBaseUrl}/delete-assessment?${params}`, {
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