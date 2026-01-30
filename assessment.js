// AX&E AI Transformation Assessment Tool
// Interactive assessment with localStorage persistence and organizational rollup

// Global variables for debugging
let assessmentTool = null;

// Global function for button click - defined immediately
function startAssessment() {
    if (assessmentTool) {
        assessmentTool.startUpfrontAssessment();
    } else if (window.assessmentTool) {
        window.assessmentTool.startUpfrontAssessment();
    } else {
        // Try to initialize now
        try {
            assessmentTool = new AITransformationAssessment();
            window.assessmentTool = assessmentTool;
            assessmentTool.startUpfrontAssessment();
        } catch (error) {
            console.error('Assessment initialization error:', error);
        }
    }
}

class AITransformationAssessment {
    constructor() {
        this.currentStage = null;
        this.assessmentData = {};
        this.currentSection = 'start';
        
        this.init();
    }

    init() {
        this.addBikeIcons();
        this.bindSimpleEvents();
        this.loadSavedData();
        // Don't auto-hide sections on startup
    }

    addBikeIcons() {
        // Add SVG bike icons with accessibility patterns
        const icons = {
            1: '📦', // Box/parts
            2: '🚲', // Bike with training wheels 
            3: '🚴', // Person riding
            4: '🎨', // Customization
            5: '⚡'  // Speed/automatic
        };

        Object.entries(icons).forEach(([stage, icon]) => {
            const iconElement = document.getElementById(`bike-stage-${stage}`);
            if (iconElement) {
                iconElement.textContent = icon;
            }
        });
    }

    bindSimpleEvents() {
        // Simple event binding without complex error handling
        
        // Stage card clicks - use setTimeout to ensure DOM is ready
        setTimeout(() => {
            document.querySelectorAll('.stage-card').forEach((card, index) => {
                card.addEventListener('click', (e) => {
                    const stage = parseInt(e.currentTarget.dataset.stage);
                    this.showStageDetail(stage);
                });
            });

            // Navigation buttons
            const backToStart = document.getElementById('back-to-start');
            if (backToStart) {
                backToStart.addEventListener('click', () => this.showStartSection());
            }
            
            const backToFramework = document.getElementById('back-to-framework');
            if (backToFramework) {
                backToFramework.addEventListener('click', () => this.showAllStagesOverview());
            }
            
            // Results actions
            const viewStages = document.getElementById('view-stages');
            if (viewStages) {
                viewStages.addEventListener('click', () => this.showAllStagesOverview());
            }
            
            const viewDashboard = document.getElementById('view-dashboard');
            if (viewDashboard) {
                viewDashboard.addEventListener('click', () => this.goToDashboard());
            }
            
            const retakeAssessment = document.getElementById('retake-assessment');
            if (retakeAssessment) {
                retakeAssessment.addEventListener('click', () => this.resetAssessment());
            }

            const backToStartFromStages = document.getElementById('back-to-start-from-stages');
            if (backToStartFromStages) {
                backToStartFromStages.addEventListener('click', () => this.showStartAssessment());
            }
        }, 200);
    }

    showStartSection() {
        this.hideAllSections();
        document.getElementById('start-assessment').classList.remove('hidden');
        this.currentSection = 'start';
    }

    showFrameworkOverview() {
        this.hideAllSections();
        document.getElementById('framework-overview').classList.remove('hidden');
        
        // Add bike icons to the framework cards
        setTimeout(() => {
            const stageCards = document.querySelectorAll('.stage-card');
            stageCards.forEach((card, index) => {
                const stage = card.dataset.stage;
                let iconDiv = card.querySelector('.bike-icon');
                if (!iconDiv) {
                    iconDiv = document.createElement('div');
                    iconDiv.className = 'bike-icon';
                    iconDiv.id = `bike-stage-${stage}`;
                    card.insertBefore(iconDiv, card.querySelector('h3'));
                }
            });
            this.addBikeIcons();
        }, 50);
        
        this.currentSection = 'framework';
    }

    showStartAssessment() {
        this.hideAllSections();
        document.getElementById('start-assessment').classList.remove('hidden');
        this.currentSection = 'start';
    }

    showStageDetail(stage) {
        console.log(`showStageDetail called with stage: ${stage}`);
        this.hideAllSections();
        const stageDetailSection = document.getElementById('stage-detail-section');
        if (stageDetailSection) {
            stageDetailSection.classList.remove('hidden');
            console.log('Stage detail section shown');
        } else {
            console.error('stage-detail-section element not found!');
        }
        this.loadStageDetail(stage);
        this.addStageNavigation(stage);
        this.currentSection = 'stage-detail';
    }

    hideAllSections() {
        document.querySelectorAll('main > section').forEach(section => {
            section.classList.add('hidden');
        });
    }

    startUpfrontAssessment() {
        this.hideAllSections();
        const assessmentSection = document.getElementById('assessment-section');
        if (assessmentSection) {
            assessmentSection.classList.remove('hidden');
            this.loadUpfrontAssessmentContent();
            this.currentSection = 'assessment';
        } else {
            console.error('Assessment section not found');
        }
    }

    loadUpfrontAssessmentContent() {
        const assessmentContent = this.getUpfrontAssessmentContent();
        document.getElementById('assessment-content').innerHTML = assessmentContent;
        
        // Bind form submission
        document.getElementById('assessment-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitUpfrontAssessment();
        });
    }

    loadStageDetail(stage) {
        console.log(`loadStageDetail called with stage: ${stage}`);
        const stageContent = this.getStageDetailContent(stage);
        console.log('Generated stage content length:', stageContent.length);
        const contentElement = document.getElementById('stage-detail-content');
        if (contentElement) {
            contentElement.innerHTML = stageContent;
            console.log('Stage content loaded successfully');
        } else {
            console.error('stage-detail-content element not found!');
        }
    }
    showAllStagesOverview() {
        this.hideAllSections();
        document.getElementById('all-stages-section').classList.remove('hidden');
        
        const allStagesContent = this.getAllStagesContent();
        document.getElementById('all-stages-content').innerHTML = allStagesContent;
    }

    addStageNavigation(currentStage) {
        const navContainer = document.getElementById('stage-navigation');
        const prevStage = currentStage > 1 ? currentStage - 1 : null;
        const nextStage = currentStage < 5 ? currentStage + 1 : null;
        
        let navHtml = '<div class="stage-navigation-buttons">';
        
        if (prevStage) {
            navHtml += `<button class="nav-button prev-stage" onclick="window.assessmentTool.showStageDetail(${prevStage})">
                ← Previous: Stage ${prevStage}
            </button>`;
        }
        
        navHtml += `<button class="nav-button back-to-overview" onclick="window.assessmentTool.showAllStagesOverview()">
            ← Back to Framework
        </button>`;
        
        if (nextStage) {
            navHtml += `<button class="nav-button next-stage" onclick="window.assessmentTool.showStageDetail(${nextStage})">
                Next: Stage ${nextStage} →
            </button>`;
        }
        
        navHtml += '</div>';
        navContainer.innerHTML = navHtml;
    }

    getAllStagesContent() {
        return `
            <div class="stages-snapshot">
                <div class="stages-progression">
                    <div class="stage-summary stage-1" data-stage="1" onclick="window.assessmentTool.showStageDetail(1)" style="cursor: pointer;">
                        <div class="bike-icon" id="bike-stage-1"></div>
                        <h3>1. Unboxing & Assembling</h3>
                        <p class="stage-subtitle">foundations</p>
                        <p class="stage-brief">Getting access, learning basics, understanding what AI can do</p>
                    </div>
                    
                    <div class="stage-arrow">→</div>
                    
                    <div class="stage-summary stage-2" data-stage="2" onclick="window.assessmentTool.showStageDetail(2)" style="cursor: pointer;">
                        <div class="bike-icon" id="bike-stage-2"></div>
                        <h3>2. Riding with Training Wheels</h3>
                        <p class="stage-subtitle">safe adoption</p>
                        <p class="stage-brief">AI use with guardrails & oversight. Building confidence.</p>
                    </div>
                    
                    <div class="stage-arrow">→</div>
                    
                    <div class="stage-summary stage-3" data-stage="3" onclick="window.assessmentTool.showStageDetail(3)" style="cursor: pointer;">
                        <div class="bike-icon" id="bike-stage-3"></div>
                        <h3>3. Training Wheels Off</h3>
                        <p class="stage-subtitle">operating differently</p>
                        <p class="stage-brief">AI in real work, closely monitored. Workflows changing.</p>
                    </div>
                    
                    <div class="stage-arrow">→</div>
                    
                    <div class="stage-summary stage-4" data-stage="4" onclick="window.assessmentTool.showStageDetail(4)" style="cursor: pointer;">
                        <div class="bike-icon" id="bike-stage-4"></div>
                        <h3>4. Making the Bike Yours</h3>
                        <p class="stage-subtitle">designed for our business</p>
                        <p class="stage-brief">Customizing AI for your needs. Purpose-built solutions.</p>
                    </div>
                    
                    <div class="stage-arrow">→</div>
                    
                    <div class="stage-summary stage-5" data-stage="5" onclick="window.assessmentTool.showStageDetail(5)" style="cursor: pointer;">
                        <div class="bike-icon" id="bike-stage-5"></div>
                        <h3>5. Riding Without Thinking</h3>
                        <p class="stage-subtitle">default operating model</p>
                        <p class="stage-brief">Fully integrated & automatic. AI is the default.</p>
                    </div>
                </div>
                
                <div class="assessment-prompt">
                    <h3>Ask Yourself:</h3>
                    <p class="key-question">How much do we still have to think about balance?</p>
                    <div class="progress-indicators">
                        <div class="indicator">
                            <div class="indicator-icon">🧠</div>
                            <span>Thinking Less</span>
                        </div>
                        <div class="indicator">
                            <div class="indicator-icon">🤝</div>
                            <span>More Trust</span>
                        </div>
                    </div>
                </div>
                
                <div class="framework-guidance">
                    <div class="guidance-section">
                        <h3>About this model:</h3>
                        <ul>
                            <li>The goal is anyone can easily state where their team is at in a single sentence. This framework is shared language, not the operating plan.</li>
                            <li>We're not measuring tool sophistication or enthusiasm, we're measuring the degree of muscle memory.</li>
                            <li>It's important to remember that teams ride different bikes at different speeds; that's normal. The org doesn't move as one bike; variation is expected and healthy. This prevents false debates about whether we're "ahead" or "behind."</li>
                            <li>Progress = thinking less, trusting more — not skipping steps.</li>
                            <li>Guardrails aren't temporary; they're part of safe riding.</li>
                            <li>Transformation happens when training wheels come off. That's the shift from "using AI" to "trusting it in real workflows."</li>
                            <li>Success is when people get on and ride without thinking about how they pedal. AI becomes the default: owned, measured, and maintained. It's not that we're "finished," but stable.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    getUpfrontAssessmentContent() {
        return `
            <div class="assessment-form">
                <h2>AI Transformation Assessment</h2>
                <p class="assessment-intro">Answer these questions about your team's current AI usage patterns.</p>
                
                <form id="assessment-form">
                    <div class="question-group">
                        <h3>How often does your team currently use AI tools in daily work?</h3>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="usage_frequency" value="0" required>
                                <span>Never or rarely - we're still figuring out access and setup</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="usage_frequency" value="1" required>
                                <span>Occasionally - some team members experiment inconsistently</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="usage_frequency" value="2" required>
                                <span>Regularly - most team members use AI for specific tasks</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="usage_frequency" value="3" required>
                                <span>Continuously - AI is integrated into most workflows</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="question-group">
                        <h3>How much oversight and validation does AI-generated work require?</h3>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="oversight_level" value="0" required>
                                <span>Significant manual review and validation for everything</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="oversight_level" value="1" required>
                                <span>Regular spot-checking with established review processes</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="oversight_level" value="2" required>
                                <span>Periodic oversight with trust for routine tasks</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="oversight_level" value="3" required>
                                <span>Minimal oversight - AI outputs are trusted by default</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="team-info">
                        <div class="form-group">
                            <label for="manager-name">Name of the manager for the team you're assessing</label>
                            <input type="text" id="manager-name" name="managerName" required>
                        </div>
                        <div class="form-group">
                            <label for="axe-team">Select your org</label>
                            <select id="axe-team" name="axeTeam" required>
                                <option value="">Select your organization...</option>
                                <option value="CXS">Cloud Experience Studio</option>
                                <option value="DevRel">Developer Relations</option>
                                <option value="Product">AX&E Product</option>
                                <option value="Eng">AX&E Engineering</option>
                                <option value="Learn">Learn</option>
                                <option value="Startups">Startups</option>
                            </select>
                        </div>
                    </div>
                    
                    <button type="submit" class="submit-assessment">Complete Assessment</button>
                </form>
            </div>
        `;
    }

    getStageDetailContent(stage) {
        const stageData = this.getStageData(stage);
        
        if (!stageData) {
            console.error(`No stage data found for stage: ${stage}`);
            return '<p>Error: Stage data not found</p>';
        }
        
        return `
            <div class="stage-detail">
                <h2>${stageData.title}</h2>
                <p class="stage-subtitle">${stageData.subtitle}</p>
                <p class="stage-description">${stageData.description}</p>
                
                <div class="detail-sections">
                    <div class="detail-section">
                        <h3>What it looks like</h3>
                        <ul>
                            ${stageData.whatItLooks.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="detail-section">
                        <h3>What it sounds like</h3>
                        <ul>
                            ${stageData.peopleAreSaying.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="detail-section warning">
                        <h3>Signs we're not past this stage yet</h3>
                        <ul>
                            ${stageData.notPastThisStage.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    
                    ${stageData.whatToFocus ? `
                    <div class="detail-section focus">
                        <h3>What to focus on to get to the next stage</h3>
                        <ul>
                            ${stageData.whatToFocus.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <div class="detail-section importance">
                        <h3>Why this stage matters</h3>
                        <p>${stageData.whyThisMatters}</p>
                    </div>
                </div>
            </div>
        `;
    }

    getStageData(stage) {
        const stages = {
            1: {
                title: "Stage 1: Unboxing & Assembling the Bike",
                subtitle: "foundations",
                description: "The bike is unboxed and parts are being examined, adjusted, and assembled. People might be climbing on the bike, but no one is riding yet.",
                whatItLooks: [
                    "Team members are getting access to basic AI tools",
                    "People are learning through experimentation and trial-and-error",
                    "Significant manual setup is required for most AI tasks",
                    "Results require heavy human review and validation",
                    "Usage is inconsistent across the team"
                ],
                peopleAreSaying: [
                    "\"I'm still learning the basics\"",
                    "\"What tool should I use?\"",
                    "\"What does this actually do?\"",
                    "\"I tried AI for this but it didn't work great\"",
                    "\"I don't trust this output - let me double-check everything\""
                ],
                notPastThisStage: [
                    "Many lack access or setup, and there is confusion over tools and permissions",
                    "Discussions center on AI's definition rather than its impact on work", 
                    "If AI vanished, most real work would remain unchanged"
                ],
                whatToFocus: [
                    "Ensure everyone has access to essential AI tools",
                    "Provide basic training on prompt engineering and best practices",
                    "Share successful use cases and templates within the team",
                    "Establish guidelines for appropriate AI tool usage",
                    "Build confidence through hands-on experimentation"
                ],
                whyThisMatters: "This foundation stage is critical for building team confidence and establishing good habits. Don't rush through it - solid basics enable faster progress in later stages.",
                questions: [
                    {
                        text: "How often does your team currently use AI tools in their daily work?",
                        options: [
                            "Never or rarely - we're still figuring out access and basic setup",
                            "Occasionally - some team members experiment but it's not consistent", 
                            "Regularly - most team members use AI tools for specific tasks",
                            "Continuously - AI is integrated into most of our workflows"
                        ]
                    },
                    {
                        text: "When team members use AI tools, how much manual setup or configuration is required?",
                        options: [
                            "Significant setup needed every time - lots of manual configuration",
                            "Some setup required - need to think through prompts and settings each time",
                            "Minimal setup - we have established patterns and templates", 
                            "No setup needed - everything is automated and configured"
                        ]
                    }
                ]
            },
            2: {
                title: "Stage 2: Riding with Training Wheels",
                subtitle: "safe adoption", 
                description: "People are riding confidently, but the training wheels keep them upright. Helmets are on, rules are being learned, and falls are unlikely.",
                whatItLooks: [
                    "Regular AI usage with established review processes",
                    "Clear policies and guidelines for AI tool usage",
                    "Team has developed prompt templates and best practices",
                    "Human oversight is standard but not burdensome",
                    "AI assists, but humans remain firmly in control"
                ],
                peopleAreSaying: [
                    "\"This saves me time.\"",
                    "\"I'm getting more comfortable with this tool\"",
                    "\"I use it, but double-check.\"", 
                    "\"Here's the template I use for these prompts\"",
                    "\"I know what to watch out for when using AI here\""
                ],
                notPastThisStage: [
                    "People avoid AI because they're unsure what's allowed",
                    "Or they use it quietly and inconsistently",
                    "Spending significant time on validation and review",
                    "Hesitation to use AI for important or visible work",
                    "Lack of shared best practices or templates"
                ],
                whatToFocus: [
                    "Develop team-specific AI usage guidelines and standards",
                    "Create templates and workflows that reduce setup time",
                    "Create review processes and quality checkpoints",
                    "Build confidence through consistent positive experiences",
                    "Share success stories and best practices across the team"
                ],
                whyThisMatters: "This stage builds systematic confidence and establishes healthy habits. The guardrails here prevent costly mistakes while the team develops judgment and expertise.",
                questions: [
                    {
                        text: "How does your team handle AI-generated content or decisions?",
                        options: [
                            "We review and validate everything before using it",
                            "We spot-check most outputs and have clear review processes",
                            "We trust AI for routine tasks but review complex outputs",
                            "We rarely review AI outputs - they're trusted by default"
                        ]
                    },
                    {
                        text: "What level of guardrails and policies guide your team's AI usage?",
                        options: [
                            "Strict guidelines with mandatory approvals for AI usage",
                            "Clear policies with regular compliance checks",
                            "General guidelines that people follow consistently",
                            "Minimal formal guidelines - people use their judgment"
                        ]
                    }
                ]
            },
            3: {
                title: "Stage 3: Training Wheels Off",
                subtitle: "operating differently",
                description: "The training wheels are gone. People can ride on their own, but they're still thinking about maintaining balance, and proper hand signals.",
                whatItLooks: [
                    "This is a turning point: workflows are changing, AI is assumed rather than optional",
                    "AI is trusted for important work with periodic check-ins, and people are rethinking work processes",
                    "Workflows have been redesigned to incorporate AI capabilities", 
                    "AI handles real responsibilities, not just experimentation",
                    "Balance between AI efficiency and human judgment"
                ],
                peopleAreSaying: [
                    "\"We don't do this the old way anymore. We've changed how we approach this type of work\"",
                    "\"AI handles this part; I handle that.\"",
                    "\"We're seeing actual productivity gains from using AI here\""
                ],
                notPastThisStage: [
                    "AI is optional or easily bypassed (teams can easily revert to old behaviors)",
                    "Workflows still mostly look the same as before",
                    "Constant second-guessing of AI recommendations",
                    "Team still thinks about AI as an add-on rather than integrated tool"
                ],
                whatToFocus: [
                    "Make AI the default path, with manual processes as backup",
                    "Redesign key workflows to take advantage of AI capabilities",
                    "Measure and communicate the value AI brings to work quality and speed"
                    "Create feedback loops to improve AI integration",
                    "Share success stories and lessons learned"
                ],
                whyThisMatters: "This is where real value starts. Without this shift, AI remains an add-on instead of changing how work gets done.",
                questions: [
                    {
                        text: "How have your team's workflows and processes changed due to AI adoption?",
                        options: [
                            "We're still figuring out how AI fits into our existing processes",
                            "We've made some workflow adjustments but still adapting",
                            "We've significantly redesigned processes around AI capabilities", 
                            "Our workflows are fully optimized for AI-human collaboration"
                        ]
                    },
                    {
                        text: "How comfortable is your team with AI handling critical work without constant oversight?",
                        options: [
                            "We're not comfortable with AI handling critical work unsupervised",
                            "We allow AI for critical work but with active monitoring",
                            "We trust AI for critical work with periodic check-ins",
                            "AI handles critical work autonomously with minimal oversight"
                        ]
                    }
                ]
            },
            4: {
                title: "Stage 4: Making the Bike Yours",
                subtitle: "designed for our business",
                description: "The bike is being modified on purpose — adding a basket, customizing the seat, paint, and handlebars. Each upgrade changes how it feels, and riders are adapting.",
                whatItLooks: [
                    "Custom AI solutions built for team-specific needs",
                    "Integration of AI capabilities into existing tools and systems",
                    "Team actively evaluates and implements new AI capabilities",
                    "Sophisticated prompt engineering and fine-tuning",
                    "AI solutions are maintained and iteratively improved"
                ],
                peopleAreSaying: [
                    "\"This fits how we work\"",
                    "\"This AI model works better when we configure it like this\"",
                    "\"Let's evaluate this new AI capability for our use case\"",
                    "\"We've automated this entire process with AI\"",
                    "\"We built this for our needs\""
                ],
                notPastThisStage: [
                    "Solutions are one-off or duplicated across teams",
                    "Every change replaces ad hoc usage",
                    "Waiting for others to build integrations rather than creating them",
                    "Manual configuration required each time AI tools are used",
                    "No custom prompts, models, or AI workflows developed",
                    "AI tools feel disconnected from your main work systems"
                ],
                whatToFocus: [
                    "Identify opportunities for custom AI solutions and integrations",
                    "Build team capabilities in AI tool configuration and optimization",
                    "Develop APIs and workflows that connect AI with your existing systems",
                    "Create reusable templates and solutions for common team needs",
                    "Establish processes for evaluating and implementing new AI capabilities"
                ],
                whyThisMatters: "This is how AI becomes scalable and differentiated. Customization is where AI truly becomes a competitive advantage. Teams that design purpose-built solutions see order-of-magnitude improvements rather than incremental gains.",
                questions: [
                    {
                        text: "How customized are your AI tools and workflows for your team's specific needs?",
                        options: [
                            "We use standard AI tools with minimal customization",
                            "We've configured some tools for our specific use cases",
                            "We have purpose-built AI solutions and custom integrations",
                            "We have fully customized AI ecosystem designed for our workflows"
                        ]
                    },
                    {
                        text: "How does your team approach AI tool selection and integration decisions?",
                        options: [
                            "We rely on IT/leadership to select and configure AI tools",
                            "We provide input on tool selection but implementation is managed centrally",
                            "We actively evaluate and integrate new AI capabilities ourselves",
                            "We build and maintain our own AI solutions and integrations"
                        ]
                    }
                ]
            },
            5: {
                title: "Stage 5: Riding Without Thinking",
                subtitle: "default operating model",
                description: "People hop on and ride without thinking about pedaling or balance. Riding is automatic.",
                whatItLooks: [
                    "AI is integrated by default, with defined ownership, metrics, and upkeep",
                     "AI is invisible infrastructure that just works",
                    "Team defaults to AI-enhanced approaches without conscious thought",
                    "Continuous optimization happens in the background",
                    "AI augments human thinking rather than replacing it"
                ],
                peopleAreSaying: [
                    "\"Of course AI is involved\"",
                    "\"I don't really think about whether to use AI - it's just how we work\"",
                    "\"Our systems automatically handle most of the AI complexity\"",
                    "\"I can focus on the creative/strategic work while AI handles the routine\"",
                ],
                notPastThisStage: [
                    "AI issues are addressed reactively, changes cause confusion, and escalation processes are unclear",
                    "AI is not the default, and new work doesn't automatically adopt AI-enabled practices",
                    "AI feels like an additional tool rather than integrated capability",
                    "AI usage requires planning and conscious effort"
                ],
                whyThisMatters: "This how AI becomes operational - the technology disappears and becomes invisible infrastructure that amplifies human capability. It's the difference between using AI and being AI-enhanced.",
                questions: [
                    {
                        text: "How automatic is AI usage in your team's daily operations?",
                        options: [
                            "Team members consciously decide when and how to use AI",
                            "AI usage is habitual but people still think about the approach",
                            "AI is integrated seamlessly - people use it without much thought",
                            "AI is completely automatic - the default way we operate"
                        ]
                    },
                    {
                        text: "How much mental overhead does AI usage add to your team's work?",
                        options: [
                            "Using AI requires significant mental energy and planning",
                            "Some mental overhead but manageable with established patterns",
                            "Minimal overhead - AI usage feels natural and efficient", 
                            "No overhead - AI enhances rather than complicates our thinking"
                        ]
                    }
                ]
            }
        };
        
        return stages[stage];
    }

    submitUpfrontAssessment() {
        const form = document.getElementById('assessment-form');
        const formData = new FormData(form);
        
        // Calculate suggested stage based on responses
        const usageFrequency = parseInt(formData.get('usage_frequency'));
        const oversightLevel = parseInt(formData.get('oversight_level'));
        
        const averageScore = (usageFrequency + oversightLevel) / 2;
        const suggestedStage = this.calculateStageFromScore(averageScore);
        
        // Store assessment data
        const assessmentResult = {
            assessedStage: null, // Will be set when team makes final choice
            suggestedStage: suggestedStage,
            scores: [usageFrequency, oversightLevel],
            managerName: formData.get('managerName'),
            axeTeam: formData.get('axeTeam'),
            timestamp: new Date().toISOString(),
            assessmentDate: new Date().toLocaleDateString(),
            assessmentTime: new Date().toLocaleTimeString(),
            sessionId: this.generateSessionId(),
            assessmentFinalized: false
        };
        
        this.saveAssessmentResult(assessmentResult);
        this.showResults(assessmentResult);
    }

    calculateStageFromScore(averageScore) {
        // Map average scores to stages
        if (averageScore <= 0.5) return 1;
        if (averageScore <= 1.5) return 2;
        if (averageScore <= 2.5) return 3;
        if (averageScore <= 2.8) return 4;
        return 5;
    }

    showResults(result) {
        const stageColors = ['', '#6b7280', '#f97316', '#eab308', '#2563eb', '#16a34a'];
        const stageNames = ['', 'Unboxing & Assembling', 'Riding with Training Wheels', 'Training Wheels Off', 'Making the Bike Yours', 'Riding Without Thinking'];
        
        const resultsHtml = `
            <div class="stage-result">
                <div class="stage-badge" style="background-color: ${stageColors[result.suggestedStage]}">
                    Stage ${result.suggestedStage}: ${stageNames[result.suggestedStage]}
                </div>
                <h3>Your Team Assessment Results</h3>
                <p>Based on your responses about your team's AI usage patterns, your team appears to be at <strong>Stage ${result.suggestedStage}</strong>.</p>
                <div class="results-explanation">
                    ${this.getStageExplanation(result.suggestedStage)}
                </div>

                <div class="final-stage-selection">
                    <h4>Do you agree with this assessment?</h4>
                    <p>After reviewing all stages below, select the stage that best represents your team:</p>
                    
                    <div class="stage-options">
                        ${this.generateStageOptions(result.suggestedStage)}
                    </div>
                    
                    <button class="primary-button confirm-assessment-btn" id="confirm-assessment" style="margin-top: 1.5rem; padding: 16px 32px; font-size: 18px; font-weight: 600; min-height: 60px;" disabled>
                        Confirm Assessment
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('results-content').innerHTML = resultsHtml;
        this.setupStageSelection(result);
        this.showResultsSection();
    }

    showResultsSection() {
        this.hideAllSections();
        document.getElementById('results-section').classList.remove('hidden');
        this.currentSection = 'results';
    }

    getStageExplanation(stage) {
        const explanations = {
            1: "Your team is still in the foundational phase. Focus on establishing access, basic training, and understanding AI capabilities. This is normal and expected - take time to build confidence with the basics.",
            2: "Your team is building confidence with AI tools but maintaining appropriate guardrails. This is a healthy stage - continue developing trust while keeping human oversight for quality and safety.",
            3: "Your team is gaining independence with AI. This is the key transformation moment - workflows are changing and AI is trusted for real work. Focus on optimizing processes and building confidence.",
            4: "Your team is customizing AI to fit your specific needs. You're building purpose-built solutions and integrations. This shows maturity in understanding how AI can serve your unique workflows.",
            5: "Your team has achieved AI fluency. Usage is automatic and integrated into your default operating model. You've reached the goal of 'not thinking about balance' while riding the AI bike."
        };
        return explanations[stage] || "";
    }

    generateStageOptions(suggestedStage) {
        const stageColors = ['', '#6b7280', '#f97316', '#eab308', '#2563eb', '#16a34a'];
        const stageNames = ['', 'Unboxing & Assembling', 'Riding with Training Wheels', 'Training Wheels Off', 'Making the Bike Yours', 'Riding Without Thinking'];
        const stageDescriptions = [
            '',
            'Getting access, basic training, and understanding capabilities. Building foundational knowledge.',
            'Using AI tools with appropriate guardrails and human oversight. Building confidence gradually.',
            'Gaining independence, trusting AI for real work, changing workflows. Key transformation moment.',
            'Customizing AI for specific needs, building purpose-built solutions and integrations.',
            'AI usage is automatic and integrated. Default operating model without thinking about balance.'
        ];

        let optionsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const isRecommended = i === suggestedStage;
            optionsHtml += `
                <div class="stage-option ${isRecommended ? 'recommended' : ''}" data-stage="${i}">
                    <div class="stage-option-header">
                        <input type="radio" name="final-stage" value="${i}" id="stage-${i}">
                        <label for="stage-${i}">
                            <div class="stage-badge" style="background-color: ${stageColors[i]}">
                                Stage ${i}: ${stageNames[i]}
                            </div>
                            ${isRecommended ? '<span class="recommended-tag">Recommended</span>' : ''}
                        </label>
                    </div>
                    <div class="stage-option-description">
                        ${stageDescriptions[i]}
                    </div>
                </div>
            `;
        }
        return optionsHtml;
    }

    setupStageSelection(originalResult) {
        const radioButtons = document.querySelectorAll('input[name="final-stage"]');
        const confirmButton = document.getElementById('confirm-assessment');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                confirmButton.disabled = false;
            });
        });

        confirmButton.addEventListener('click', () => {
            const selectedStage = document.querySelector('input[name="final-stage"]:checked');
            if (selectedStage) {
                this.finalizeAssessment(originalResult, parseInt(selectedStage.value));
            }
        });
    }

    finalizeAssessment(originalResult, selectedStage) {
        // Update the result with team's final choice
        const finalResult = {
            ...originalResult,
            assessedStage: selectedStage,
            assessmentFinalized: true
        };
        
        // Save the updated result
        this.saveAssessmentResult(finalResult);
        
        // Show confirmation and next steps
        this.showFinalConfirmation(finalResult);
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Remove any existing notifications
        const existingNotification = document.getElementById('app-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.id = 'app-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#f97316' : '#2563eb'};
            color: white;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-hide after specified duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    showFinalConfirmation(result) {
        const stageColors = ['', '#6b7280', '#f97316', '#eab308', '#2563eb', '#16a34a'];
        const stageNames = ['', 'Unboxing & Assembling', 'Riding with Training Wheels', 'Training Wheels Off', 'Making the Bike Yours', 'Riding Without Thinking'];
        
        const confirmationHtml = `
            <div class="assessment-complete">
                <div class="success-message">
                    <h3>✅ Assessment Complete</h3>
                    <p>Your team has been assessed at:</p>
                    <div class="stage-badge" style="background-color: ${stageColors[result.assessedStage]}">
                        Stage ${result.assessedStage}: ${stageNames[result.assessedStage]}
                    </div>
                </div>
                
                <div class="next-steps">
                    <h4>Next Steps</h4>
                    <p>${this.getStageExplanation(result.assessedStage)}</p>
                </div>
            </div>
        `;
        
        document.getElementById('results-content').innerHTML = confirmationHtml;
    }

    async saveAssessmentResult(result) {
        try {
            // Try to save to Azure first
            await window.assessmentDataService.submitAssessment(result);
            console.log('Assessment saved to Azure successfully');
            
            // Also save to localStorage as backup
            const existingData = JSON.parse(localStorage.getItem('axe-ai-assessments') || '[]');
            
            // If this is an update (has sessionId), replace the existing entry
            if (result.sessionId) {
                const existingIndex = existingData.findIndex(item => item.sessionId === result.sessionId);
                if (existingIndex >= 0) {
                    existingData[existingIndex] = result;
                } else {
                    existingData.push(result);
                }
            } else {
                existingData.push(result);
            }
            
            localStorage.setItem('axe-ai-assessments', JSON.stringify(existingData));
            localStorage.setItem('axe-ai-latest-result', JSON.stringify(result));
            
        } catch (error) {
            console.error('Failed to save to Azure, data saved locally only:', error);
            // Show user notification that data is saved locally
            this.showNotification('Assessment saved locally. Data will sync when connection is restored.', 'warning');
        }
    }

    loadSavedData() {
        // Check if there's a recent assessment result to display
        const latestResult = localStorage.getItem('axe-ai-latest-result');
        if (latestResult) {
            // Could show a "View Last Results" option
            console.log('Previous assessment found:', JSON.parse(latestResult));
        }
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    resetAssessment() {
        this.currentStage = null;
        this.assessmentData = {};
        this.currentSection = 'start';
        this.showStartSection();
    }

    goToDashboard() {
        window.location.href = 'dashboard.html';
    }
}

// Initialize the assessment tool
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAssessment);
} else {
    initializeAssessment();
}

function initializeAssessment() {
    try {
        assessmentTool = new AITransformationAssessment();
        window.assessmentTool = assessmentTool; // Make it globally available
    } catch (error) {
        console.error('Assessment initialization error:', error);
    }
}

// Global functions for footer navigation
function showFrameworkOverview() {
    if (window.assessmentTool) {
        window.assessmentTool.showFrameworkOverview();
    } else {
        console.error('Assessment tool not initialized');
    }
}

function showAllStages() {
    if (window.assessmentTool) {
        window.assessmentTool.showAllStagesOverview();
    } else {
        console.error('Assessment tool not initialized');
    }
}
