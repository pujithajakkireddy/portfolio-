// Add this line at the very top of script.js
console.log('script.js: File loaded and starting execution!');

// Theme toggle functionality
let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

function toggleTheme() {
    console.log('script.js: toggleTheme() called'); // Debug log
    isDarkMode = !isDarkMode; // Toggle the state

    const themeToggle = document.querySelector('.theme-toggle');

    // IMPORTANT: Change to use data-theme attribute, not style.colorScheme
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) { // Ensure themeToggle exists before accessing its properties
            themeToggle.textContent = '☀️';
        }
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeToggle) { // Ensure themeToggle exists before accessing its properties
            themeToggle.textContent = '🌙';
        }
    }
    console.log('script.js: Theme set to:', isDarkMode ? 'dark' : 'light'); // Debug log
}

// Set initial theme and event listener
document.addEventListener('DOMContentLoaded', function() {
    console.log('script.js: DOMContentLoaded event fired.'); // Debug log
    const themeToggle = document.querySelector('.theme-toggle');

    // Set the initial data-theme attribute on page load based on system preference
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) { // Ensure themeToggle exists
            themeToggle.textContent = '☀️';
        }
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeToggle) { // Ensure themeToggle exists
            themeToggle.textContent = '🌙';
        }
    }
    console.log('script.js: Initial theme set to:', isDarkMode ? 'dark' : 'light'); // Debug log

    // Add event listener to the theme toggle button
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        console.log('script.js: Event listener added to theme toggle.'); // Debug log
    } else {
        console.error('script.js: Theme toggle button not found!'); // Debug log
    }

    // Also add an event listener for the form using JavaScript, which is more robust
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleSubmit);
        console.log('script.js: Event listener added to contact form.'); // Debug log
    } else {
        console.error('script.js: Contact form not found on DOMContentLoaded!'); // Debug log
    }
});

// Smooth scrolling for navigation links (existing code)
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// --- CORRECTED Form submission handler ---
async function handleSubmit(event) {
    console.log('script.js: handleSubmit function called!'); // Debug log
    event.preventDefault(); // Prevent default form submission and page reload

    const form = event.target;
    const submitButton = form.querySelector('.submit-btn'); // Get the submit button
    const originalButtonText = submitButton.textContent;

    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    const formData = new FormData(form);
    const data = {};
    // Convert FormData to a plain object for JSON.stringify
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    console.log('script.js: Form data collected:', data); // Debug log

    try {
        // Make sure this URL matches your backend's address and port
        const response = await fetch('http://localhost:3000/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data), // Send the data as a JSON string
        });
        console.log('script.js: Fetch response received, status:', response.status); // Debug log

        const result = await response.json(); // Parse the JSON response from the backend
        console.log('script.js: Parsed response JSON:', result); // Debug log

        if (response.ok) { // Status codes 200-299 are considered 'ok'
            alert(result.message); // Show the success message from your backend
            form.reset(); // Clear the form fields
        } else {
            // Handle specific errors from your backend (e.g., validation errors)
            const errorMessage = result.errors 
                                        ? result.errors.join('\n') // If backend sends an array of errors
                                        : result.message || 'An unknown error occurred. Please try again.';
            alert(`Error: ${errorMessage}`);
        }
    } catch (error) {
        // This catches network errors or issues before the backend responds
        console.error('script.js: Frontend contact form submission failed (caught error):', error); // Debug log
        alert('Failed to send message. Please check your internet connection or try again later.');
    } finally {
        // Re-enable button and restore text, regardless of success or failure
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        console.log('script.js: Submit button re-enabled.'); // Debug log
    }
}
// --- END CORRECTED Form submission handler ---


// Add scroll effect to navigation (existing code)
window.addEventListener('scroll', function() {
    const nav = document.querySelector('nav');
    if (window.scrollY > 100) {
        // You might want to use CSS variables here too for consistency if you modify nav background for dark mode
        nav.style.background = 'rgba(255, 255, 255, 0.2)'; 
        nav.style.backdropFilter = 'blur(30px)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.1)';
        nav.style.backdropFilter = 'blur(20px)';
    }
});

// Intersection Observer for animations (existing code)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards and sections (existing code)
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.education-card, .project-card, .skill-category');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Parallax effect for hero section (existing code)
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const rate = scrolled * -0.5;
    
    if (hero) {
        hero.style.transform = `translateY(${rate}px)`;
    }
});