// Theme management
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.initializeTheme();
        this.bindEvents();
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('preferred-theme');
        } catch (e) {
            return null;
        }
    }

    setStoredTheme(theme) {
        try {
            localStorage.setItem('preferred-theme', theme);
        } catch (e) {
            // Silent fail for privacy modes
        }
    }

    initializeTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateActiveButton();
    }

    setTheme(theme) {
        if (['light', 'dark', 'contrast-light', 'contrast-dark'].includes(theme)) {
            this.currentTheme = theme;
            document.body.setAttribute('data-theme', theme);
            this.setStoredTheme(theme);
            this.updateActiveButton();
        }
    }

    updateActiveButton() {
        // Remove active class from all buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to current theme button
        const themeMap = {
            'light': 'lightMode',
            'dark': 'darkMode',
            'contrast-light': 'contrastLightMode',
            'contrast-dark': 'contrastDarkMode'
        };

        const activeButton = document.getElementById(themeMap[this.currentTheme]);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    bindEvents() {
        document.getElementById('lightMode')?.addEventListener('click', () => {
            this.setTheme('light');
        });

        document.getElementById('darkMode')?.addEventListener('click', () => {
            this.setTheme('dark');
        });

        document.getElementById('contrastLightMode')?.addEventListener('click', () => {
            this.setTheme('contrast-light');
        });

        document.getElementById('contrastDarkMode')?.addEventListener('click', () => {
            this.setTheme('contrast-dark');
        });
    }
}

// Services data loader and renderer
class ServicesManager {
    constructor() {
        this.services = {};
        this.loadingElement = document.getElementById('loading');
        this.servicesGrid = document.getElementById('servicesGrid');
        this.init();
    }

    async init() {
        try {
            await this.loadServices();
            this.renderServices();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load services:', error);
            this.showError();
        }
    }

    async loadServices() {
        try {
            const response = await fetch('./assets/data/services.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.services = await response.json();
        } catch (error) {
            console.error('Error loading services data:', error);
            throw error;
        }
    }

    getProviderImage(category) {
        const imageMap = {
            'Bee': './assets/img/basil.jpeg',
            'Onyx': './assets/img/onyx.jpeg',
            'General': './assets/img/general.jpeg',
            'Searching': './assets/img/searching.jpeg'
        };
        return imageMap[category] || './assets/img/general.jpeg';
    }

    getProviderName(category) {
        const nameMap = {
            'Bee': 'Basil',
            'Onyx': 'Onyx',
            'General': 'General',
            'Searching': 'Looking for'
        };
        return nameMap[category] || category;
    }

    getProviderMessage(category) {
        const messageMap = {
            'Bee': 'Basil can help you!',
            'Onyx': 'Onyx can help you!',
            'General': 'We can help you!',
            'Searching': "We're searching for"
        };
        return messageMap[category] || 'We can help you!';
    }

    createServiceCard(service, category) {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        const providerImage = this.getProviderImage(category);
        const providerName = this.getProviderName(category);
        const providerMessage = this.getProviderMessage(category);
        
        // Handle image path - ensure it starts with ./
        let imagePath = service.img;
        if (imagePath && !imagePath.startsWith('./') && !imagePath.startsWith('http')) {
            imagePath = './' + imagePath.replace(/^\//, '');
        }

        card.innerHTML = `
            ${imagePath ? `<img src="${imagePath}" alt="${service.name}" class="service-card-image" loading="lazy">` : ''}
            <div class="service-card-content">
                <div class="service-card-header">
                    <h3 class="service-card-title">${this.escapeHtml(service.name)}</h3>
                    <div class="service-provider-container">
                        <img src="${providerImage}" alt="${providerName}" class="service-provider" loading="lazy" data-message="${this.escapeHtml(providerMessage)}">
                        <div class="provider-message">${this.escapeHtml(providerMessage)}</div>
                    </div>
                </div>
                ${service.description ? `<p class="service-card-description">${this.escapeHtml(service.description)}</p>` : ''}
                ${this.createSubItemsDropdown(service)}
            </div>
        `;

        return card;
    }

    createSubItemsDropdown(service) {
        if (!service.sub_items || !Array.isArray(service.sub_items) || service.sub_items.length === 0) {
            return '';
        }

        const options = service.sub_items.map(item => 
            `<option value="${this.escapeHtml(item.name)}">${this.escapeHtml(item.name)}</option>`
        ).join('');

        return `
            <div class="sub-items-dropdown">
                <label for="subItems_${this.generateId()}" class="dropdown-label">Choose a type:</label>
                <select id="subItems_${this.generateId()}" class="dropdown-select">
                    <option value="">Select an option...</option>
                    ${options}
                </select>
            </div>
        `;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderServices() {
        if (!this.servicesGrid) {
            console.error('Services grid element not found');
            return;
        }

        // Clear existing content
        this.servicesGrid.innerHTML = '';

        // Check if we have services data
        if (!this.services || Object.keys(this.services).length === 0) {
            this.showEmptyState();
            return;
        }

        const fragment = document.createDocumentFragment();
        const allServices = [];

        // Collect all services with their categories
        Object.entries(this.services).forEach(([category, serviceList]) => {
            if (Array.isArray(serviceList)) {
                serviceList.forEach(service => {
                    allServices.push({ service, category });
                });
            }
        });

        // Sort services alphabetically by name, but keep Searching category at the bottom
        allServices.sort((a, b) => {
            // If one is from Searching category, prioritize it for bottom placement
            if (a.category === 'Searching' && b.category !== 'Searching') {
                return 1; // a goes after b
            }
            if (b.category === 'Searching' && a.category !== 'Searching') {
                return -1; // a goes before b
            }
            
            // For non-Searching services, sort alphabetically by service name
            return a.service.name.localeCompare(b.service.name);
        });

        // Create and append cards in sorted order
        allServices.forEach(({ service, category }) => {
            const card = this.createServiceCard(service, category);
            fragment.appendChild(card);
        });

        this.servicesGrid.appendChild(fragment);
        
        // Add click handlers for provider bubbles
        this.addProviderBubbleHandlers();
    }

    showEmptyState() {
        this.servicesGrid.innerHTML = `
            <div class="empty-state">
                <h2>No services available</h2>
                <p>We're working on adding services. Please check back later!</p>
            </div>
        `;
    }

    showError() {
        this.hideLoading();
        this.servicesGrid.innerHTML = `
            <div class="empty-state">
                <h2>Unable to load services</h2>
                <p>There was an error loading the services data. Please try refreshing the page.</p>
            </div>
        `;
    }

    addProviderBubbleHandlers() {
        const providerBubbles = document.querySelectorAll('.service-provider');
        let activeMessage = null;

        providerBubbles.forEach(bubble => {
            bubble.addEventListener('click', (e) => {
                e.stopPropagation();
                const message = bubble.parentElement.querySelector('.provider-message');
                
                // Close any other active messages
                if (activeMessage && activeMessage !== message) {
                    this.hideProviderMessage(activeMessage);
                }
                
                // Toggle current message
                if (activeMessage === message) {
                    this.hideProviderMessage(message);
                    activeMessage = null;
                } else {
                    this.showProviderMessage(message);
                    activeMessage = message;
                }
            });
        });

        // Close message when clicking outside
        document.addEventListener('click', () => {
            if (activeMessage) {
                this.hideProviderMessage(activeMessage);
                activeMessage = null;
            }
        });

        // Prevent closing when clicking on the message itself
        document.addEventListener('click', (e) => {
            if (e.target.closest('.provider-message')) {
                e.stopPropagation();
            }
        });
    }

    showProviderMessage(message) {
        message.classList.remove('flow-in');
        message.classList.add('flow-out');
        setTimeout(() => {
            message.classList.remove('flow-out');
            message.classList.add('show');
        }, 400);
    }

    hideProviderMessage(message) {
        message.classList.remove('show');
        message.classList.add('flow-in');
        setTimeout(() => {
            message.classList.remove('flow-in');
        }, 400);
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
            setTimeout(() => {
                this.loadingElement.style.display = 'none';
            }, 300);
        }
    }
}

// Accessibility enhancements
class AccessibilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.handleReducedMotion();
        this.improveKeyboardNavigation();
        this.addAriaLabels();
    }

    handleReducedMotion() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--transition-fast', '0s');
            document.documentElement.style.setProperty('--transition-normal', '0s');
            document.documentElement.style.setProperty('--transition-slow', '0s');
        }
    }

    improveKeyboardNavigation() {
        // Add keyboard support for theme buttons
        document.querySelectorAll('.theme-btn').forEach(button => {
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        });
    }

    addAriaLabels() {
        // Add aria-label to main content area
        const main = document.querySelector('.main');
        if (main) {
            main.setAttribute('aria-label', 'Services we offer');
        }

        // Add aria-label to services grid
        const grid = document.querySelector('.services-grid');
        if (grid) {
            grid.setAttribute('role', 'grid');
            grid.setAttribute('aria-label', 'Available services');
        }
    }
}

// Performance optimizations
class PerformanceManager {
    constructor() {
        this.init();
    }

    init() {
        this.lazyLoadImages();
        this.optimizeScrolling();
    }

    lazyLoadImages() {
        // Modern browsers with native lazy loading support
        if ('loading' in HTMLImageElement.prototype) {
            return; // Native lazy loading is already used in HTML
        }

        // Fallback for older browsers
        const images = document.querySelectorAll('img[loading="lazy"]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    optimizeScrolling() {
        // Throttle scroll events for better performance
        let ticking = false;
        
        function updateScroll() {
            // Add any scroll-based animations here
            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateScroll);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick);
    }
}

// Service worker registration for offline support
class ServiceWorkerManager {
    constructor() {
        this.register();
    }

    async register() {
        if ('serviceWorker' in navigator) {
            try {
                // We can add a service worker later for offline functionality
                console.log('Service Worker support detected');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    const themeManager = new ThemeManager();
    const servicesManager = new ServicesManager();
    const accessibilityManager = new AccessibilityManager();
    const performanceManager = new PerformanceManager();
    const serviceWorkerManager = new ServiceWorkerManager();

    // Global error handling
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
        console.log('Connection restored');
    });

    window.addEventListener('offline', () => {
        console.log('Connection lost');
    });
});

// Export managers for potential external use
window.HowCanWeHelp = {
    ThemeManager,
    ServicesManager,
    AccessibilityManager,
    PerformanceManager
};
