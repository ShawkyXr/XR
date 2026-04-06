let isAuthenticated = false;
let currentUser = null;
let socket = null;
let currentRoom = null;
let selectedRoomType = 'public';
let roomsMap = {};

// Configuration - Update this to your backend URL
const API_BASE_URL = 'http://localhost:1234/api';

let activeBlogId = null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PROFILE_PICTURE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PROFILE_PICTURE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const HOME_BLOGS_PER_PAGE = 9;
const ROOMS_PER_PAGE = 12;

let allHomeBlogs = [];
let filteredHomeBlogs = [];
let homeCurrentPage = 1;

let allRooms = [];
let filteredRooms = [];
let roomsCurrentPage = 1;

function getServerBaseUrl() {
    return API_BASE_URL.replace('/api', '');
}

function getAbsoluteMediaUrl(path) {
    if (!isNonEmpty(path)) {
        return null;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${getServerBaseUrl()}${normalizedPath}`;
}

function getUserInitials(user) {
    const firstInitial = user?.firstName?.[0] || user?.username?.[0] || 'U';
    const lastInitial = user?.lastName?.[0] || user?.username?.[1] || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
}

function getProfilePictureFromUser(user) {
    return user?.profilePictureUrl || null;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createAvatarMarkup(user, extraClass = '') {
    const profilePictureUrl = getProfilePictureFromUser(user);
    const absoluteUrl = getAbsoluteMediaUrl(profilePictureUrl);
    const baseClass = extraClass ? `blog-author-avatar ${extraClass}` : 'blog-author-avatar';
    const className = absoluteUrl ? `${baseClass} has-image` : baseClass;
    const safeInitials = escapeHtml(getUserInitials(user));

    if (!absoluteUrl) {
        return `<div class="${className}">${safeInitials}</div>`;
    }

    const encodedUrl = encodeURIComponent(profilePictureUrl);
    const safeName = escapeHtml(user?.username || 'user');
    return `
        <div class="${className} clickable" onclick="event.stopPropagation(); openProfilePictureViewerFromEncoded('${encodedUrl}')">
            <img src="${escapeHtml(absoluteUrl)}" alt="${safeName} profile picture">
        </div>
    `;
}

function isNonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(email) {
    return EMAIL_REGEX.test(email.trim());
}

function isStrongPassword(password) {
    return STRONG_PASSWORD_REGEX.test(password);
}

async function isUsernameUnique(username) {
    try {
        const response = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            return true;
        }

        const responseData = await response.json();
        return !responseData?.data;
    } catch (error) {
        console.error('Username uniqueness check failed:', error);
        return true;
    }
}

// Check authentication status on load
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    if (token && userData) {
        isAuthenticated = true;
        currentUser = JSON.parse(userData);
        
        // Ensure _id exists for socket compatibility
        if (currentUser && currentUser.id && !currentUser._id) {
            currentUser._id = currentUser.id;
            localStorage.setItem('userData', JSON.stringify(currentUser));
        }
        
        console.log('User authenticated:', currentUser);
    } else {
        isAuthenticated = false;
        currentUser = null;
        console.log('No authenticated user');
    }
    updateAuthUI();
}

// Update UI based on authentication status
function updateAuthUI() {
    const authButton = document.getElementById('authButton');
    const profileNavItem = document.getElementById('profileNavItem');
    
    if (isAuthenticated && currentUser) {
        authButton.textContent = 'Logout';
        authButton.onclick = logout;
        profileNavItem.style.display = 'block'; // Show Profile link
    } else {
        authButton.textContent = 'Login';
        authButton.onclick = showLoginPage;
        profileNavItem.style.display = 'none'; // Hide Profile link
    }
}

// Authentication Functions
function showLoginPage() {
    leaveRoomWithoutNavigating();
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('loginPage').style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
}

function showRegisterPage() {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('registerPage').style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!isNonEmpty(email) || !isNonEmpty(password)) {
        showPopupAlert('Email and password are required.', '⚠️', 3500);
        return;
    }

    if (!isValidEmail(email)) {
        showPopupAlert('Please enter a valid email address.', '⚠️', 3500);
        return;
    }

    try {
        // Connect to your specific route: POST /api/profile/login
        const response = await fetch(`${API_BASE_URL}/profile/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, rememberMe })
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || 'Login failed');
        }

        const userData = responseData.data;
        
        if (!userData || !userData.token) {
            throw new Error('Invalid response from server');
        }

        localStorage.setItem('authToken', userData.token);
        
        // Normalize user data - ensure _id exists for socket compatibility
        if (userData.id && !userData._id) {
            userData._id = userData.id;
        }
        
        localStorage.setItem('userData', JSON.stringify(userData));
        currentUser = userData;
        isAuthenticated = true;
        
        console.log('Login successful, user:', currentUser);
        updateAuthUI();
        event.target.reset();
        navigateTo('home');

    } catch (error) {
        console.error('Login Error:', error);
        
        // More specific error messages
        if (error.message.includes('fetch')) {
            showPopupAlert('Cannot connect to server. Make sure the backend is running on port 1234.', '⚠️', 4000);
        } else {
            showPopupAlert('Login failed: ' + error.message, '⚠️', 4000);
        }
    }
}


async function handleRegister(event) {
    event.preventDefault();

    // Gather data from form
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!isNonEmpty(firstName) || !isNonEmpty(lastName) || !isNonEmpty(username) || !isNonEmpty(email) || !isNonEmpty(password) || !isNonEmpty(confirmPassword)) {
        showPopupAlert('All registration fields are required.', '⚠️', 4000);
        return;
    }

    if (!isValidEmail(email)) {
        showPopupAlert('Please enter a valid email address.', '⚠️', 3500);
        return;
    }

    if (!isStrongPassword(password)) {
        showPopupAlert('Password must be at least 8 chars and include uppercase, lowercase, number, and special character.', '⚠️', 5500);
        return;
    }

    if (password !== confirmPassword) {
        showPopupAlert('Password and confirm password do not match.', '⚠️', 3500);
        return;
    }

    const usernameIsUnique = await isUsernameUnique(username);
    if (!usernameIsUnique) {
        showPopupAlert('Username already exists. Please choose another one.', '⚠️', 4000);
        return;
    }

    try {
        // Connect to your specific route: POST /api/profile/register
        const response = await fetch(`${API_BASE_URL}/profile/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                firstName, 
                lastName, 
                username, 
                email, 
                password 
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Registration failed');
        }

        alert("Account created! Please log in.");
        showLoginPage();
        event.target.reset();

    } catch (error) {
        console.error('Registration Error:', error);
        
        // More specific error messages
        if (error.message.includes('fetch')) {
            alert('Cannot connect to server. Make sure the backend is running on port 1234.');
        } else {
            alert('Registration failed: ' + error.message);
        }
    }
}

function socialLogin(provider) {
    alert(`${provider} login would be implemented here. This would redirect to ${provider}'s OAuth flow.`);
}

function logout() {
    console.log('Logging out user');
    
    // Disconnect socket if connected
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    isAuthenticated = false;
    currentRoom = null;
    updateAuthUI();
    navigateTo('home');
}

// Theme Management
function toggleTheme() {
    const html = document.documentElement;
    const slider = document.getElementById('themeSlider');
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'light') {
        html.removeAttribute('data-theme');
        slider.classList.remove('light');
        localStorage.setItem('theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
        slider.classList.add('light');
        localStorage.setItem('theme', 'light');
    }
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('themeSlider').classList.add('light');
    }
}

// Navigation
function navigateTo(page) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');

    // Show selected page
    if (page === 'home') {
        document.getElementById('homePage').style.display = 'block';
        leaveRoomWithoutNavigating();
        loadHomeBlogs();
    } else if (page === 'rooms') {
        document.getElementById('roomsPage').style.display = 'block';
        loadRooms();
    } else if (page === 'profile') {
        if (!isAuthenticated) {
            logout();
            showLoginPage();
            return;
        }
        leaveRoomWithoutNavigating();
        document.getElementById('profilePage').style.display = 'block';
        loadProfile();
    }
}

// REST API Functions
async function apiRequest(endpoint, method = 'GET', data = null) {
            const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                // Send the token if we have one
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'API request failed');
            }

            return responseData;
        } catch (error) {
            console.error('API Error:', error);
            if (error.message === 'Invalid or Expired token'){
                logout();
                showAuthAlert("Session expired. Please log in again.");
            }
            // Only alert for non-GET requests to avoid annoying popups on page load
            if (method !== 'GET') {
                alert("Cannot connect to backend: " + error.message);
            }
            return { data: [] }; // Return object with empty data array
        }
}

function renderPagination(containerId, currentPage, totalPages, pageHandlerName) {
    const paginationElement = document.getElementById(containerId);

    if (!paginationElement) {
        return;
    }

    if (totalPages <= 1) {
        paginationElement.innerHTML = '';
        paginationElement.classList.add('is-hidden');
        return;
    }

    paginationElement.classList.remove('is-hidden');

    let paginationMarkup = `
        <button
            type="button"
            class="pagination-btn"
            aria-label="Previous page"
            onclick="${pageHandlerName}(${currentPage - 1})"
            ${currentPage === 1 ? 'disabled' : ''}
        >
            &larr;
        </button>
    `;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        paginationMarkup += `
            <button
                type="button"
                class="pagination-number ${pageNumber === currentPage ? 'active' : ''}"
                aria-label="Go to page ${pageNumber}"
                aria-current="${pageNumber === currentPage ? 'page' : 'false'}"
                onclick="${pageHandlerName}(${pageNumber})"
            >
                ${pageNumber}
            </button>
        `;
    }

    paginationMarkup += `
        <button
            type="button"
            class="pagination-btn"
            aria-label="Next page"
            onclick="${pageHandlerName}(${currentPage + 1})"
            ${currentPage === totalPages ? 'disabled' : ''}
        >
            &rarr;
        </button>
    `;

    paginationElement.innerHTML = paginationMarkup;
}

function applyHomeBlogFilter() {
    const searchInput = document.getElementById('blogSearch');
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();

    filteredHomeBlogs = allHomeBlogs.filter((blog) => {
        const title = String(blog.title || '').toLowerCase();
        const excerpt = String(blog.content || '').toLowerCase();
        const author = String(blog.username || blog.user?.username || '').toLowerCase();
        return title.includes(searchTerm) || excerpt.includes(searchTerm) || author.includes(searchTerm);
    });
}

function renderHomeBlogsPage(page = 1) {
    const blogsGrid = document.getElementById('homeBlogsGrid');

    if (!blogsGrid) {
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredHomeBlogs.length / HOME_BLOGS_PER_PAGE));
    homeCurrentPage = Math.min(Math.max(page, 1), totalPages);

    const startIndex = (homeCurrentPage - 1) * HOME_BLOGS_PER_PAGE;
    const endIndex = startIndex + HOME_BLOGS_PER_PAGE;
    const blogsToRender = filteredHomeBlogs.slice(startIndex, endIndex);

    blogsGrid.innerHTML = '';

    if (filteredHomeBlogs.length === 0) {
        blogsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No blogs found.</p>';
        renderPagination('homePagination', 1, 0, 'goToHomeBlogsPage');
        return;
    }

    blogsToRender.forEach(blog => {
        const blogCard = document.createElement('div');
        blogCard.className = 'home-blog-card';

        // Open blog when clicking anywhere on the card
        blogCard.onclick = (e) => {
            // Prevent opening the blog if the user clicked a button (like or read more)
            if (e.target.tagName !== 'BUTTON' && e.target.parentElement.tagName !== 'BUTTON') {
                viewBlog(blog._id || blog.id);
            }
        };

        const username = blog.username || 'Unknown';
        const authorUser = {
            username,
            firstName: blog.user?.firstName,
            lastName: blog.user?.lastName,
            profilePictureUrl: blog.profilePictureUrl || blog.user?.profilePictureUrl || null
        };
        const blogDate = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'Unknown date';

        blogCard.innerHTML = `
            <div class="home-blog-header">
                ${createAvatarMarkup(authorUser)}
                <div class="blog-author-info">
                    <div class="blog-author-name">${username}</div>
                    <div class="blog-date">${blogDate}</div>
                </div>
            </div>
            <div class="home-blog-content">
                <h3 class="home-blog-title">${blog.title || 'Untitled'}</h3>
                <p class="home-blog-excerpt">${blog.content?.substring(0, 150)}...</p>
            </div>
            <div class="home-blog-footer">
                <div class="blog-stats">
                    <button class="stat-btn" onclick="likeBlog('${blog._id || blog.id}')">
                        <span>👍</span> <span>${blog.likes?.length || 0}</span>
                    </button>
                    <button class="stat-btn">
                        <span>💬</span> <span>${blog.comments?.length || 0}</span>
                    </button>
                </div>
                <button class="read-more-btn" onclick="viewBlog('${blog._id || blog.id}')">Read More</button>
            </div>
        `;
        blogsGrid.appendChild(blogCard);
    });

    renderPagination('homePagination', homeCurrentPage, totalPages, 'goToHomeBlogsPage');
}

function goToHomeBlogsPage(page) {
    renderHomeBlogsPage(page);
}


// Load Blogs on Home Page
async function loadHomeBlogs() {
    console.log('loadHomeBlogs called');
    const blogsGrid = document.getElementById('homeBlogsGrid');
    
    if (!blogsGrid) {
        console.error('homeBlogsGrid element not found!');
        return;
    }
    
    console.log('Showing loading spinner...');
    blogsGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading blogs...</p></div>';

    const blogsReq = await apiRequest('/blog');
    
    allHomeBlogs = blogsReq.data || [];
    applyHomeBlogFilter();
    renderHomeBlogsPage(1);
}

// Search Blogs
let blogSearchTimeout;
function searchBlogs() {
    clearTimeout(blogSearchTimeout);
    blogSearchTimeout = setTimeout(() => {
        applyHomeBlogFilter();
        renderHomeBlogsPage(1);
    }, 300);
}

// Like Blog
async function likeBlog(blogId) {
    checkAuth();
    if (!isAuthenticated) {
        return showAuthAlert("Login to like this blog!");
    }

    try {
        // Your backend route for liking usually toggles automatically 
        // if the user ID is already in the likes array.
        await apiRequest(`/blog/${blogId}/like`, 'POST');
        
        // Refresh the current view to update counts
        const currentPage = document.querySelector('.page[style*="display: block"]').id;
        
        if (currentPage === 'homePage') {
            loadHomeBlogs();
        } else if (currentPage === 'profilePage') {
            loadProfile(); 
        } else if (currentPage === 'blogViewPage') {
            viewBlog(blogId);
        }
    } catch (error) {
        console.error("Error liking blog:", error);
    }
}

function renderComments(comments) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        list.innerHTML = '<p class="blog-date">No comments yet.</p>';
        return;
    }

    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'blog-card';
        div.style.cursor = 'default';

        // Check if current user is the comment author (using ID for reliability, fallback to username)
        const isAuthor = currentUser && (
            c.user?._id === currentUser._id || 
            c.user?.id === currentUser.id || 
            c.userId === currentUser._id ||
            c.userId === currentUser.id ||
            c.username === currentUser.username
        );

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div class="blog-author-name" style="font-size: 0.9rem;">${c.username || 'User'}</div>
                    <div class="blog-excerpt" style="margin-bottom: 0;">${c.content}</div>
                    <div class="blog-date" style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.5rem;"></div>
                </div>
                ${isAuthor ? `
                <button class="action-btn" style="color: #ff4d4d; border-color: transparent; margin-left: 1rem;" 
                        onclick="deleteComment('${c._id}')">
                    Delete
                </button>
            ` : ''}
            </div>
        `;
        list.appendChild(div);
    });
}


async function submitComment() {
    if (!isAuthenticated) {
        return showAuthAlert("Login to post a comment!");
    }
    
    const content = document.getElementById('commentInput').value.trim();
    if (!content) {
        showPopupAlert('Comment content cannot be empty.', '⚠️', 3000);
        return;
    }

    const response = await apiRequest(`/blog/${activeBlogId}/comment`, 'POST', { content });
    if (response) {
        document.getElementById('commentInput').value = '';
        viewBlog(activeBlogId); // Refresh view
    }
}

async function deleteComment(commentId) {
    if (!isAuthenticated) {
        logout();
        return showAuthAlert("Login to delete this comment!");
    }

    const response = await apiRequest(`/blog/${activeBlogId}/comment/${commentId}`, 'DELETE');
    if (response) {
        viewBlog(activeBlogId); // Refresh view
    }
}

function showAuthAlert(message = "Please login to perform this action.") {
    // Remove existing popup if there is one
    const existing = document.querySelector('.auth-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'auth-popup';
    popup.innerHTML = `
        <span>⚠️ ${message}</span>
        <span class="login-link" onclick="showLoginPage(); this.parentElement.remove();">Login Now</span>
    `;

    document.body.appendChild(popup);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (popup) {
            popup.style.animation = "slideInRight 0.4s ease reverse";
            setTimeout(() => popup.remove(), 400);
        }
    }, 4000);
}

function showPopupAlert(message, icon = '⚠️', duration = 4000) {
    // Remove existing popup if there is one
    const existing = document.querySelector('.custom-popup-alert');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'custom-popup-alert';
    popup.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.8rem;">
            <span style="font-size: 1.5rem;">${icon}</span>
            <span>${message}</span>
        </div>
    `;
    
    // Add styling
    popup.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        box-shadow: var(--shadow-lg);
        color: var(--text-primary);
        z-index: 9999;
        animation: slideInRight 0.4s ease;
        max-width: 400px;
    `;

    document.body.appendChild(popup);

    // Auto-remove after specified duration
    setTimeout(() => {
        if (popup) {
            popup.style.animation = "slideInRight 0.4s ease reverse";
            setTimeout(() => popup.remove(), 400);
        }
    }, duration);
}

function showAccessCodeModal(roomId, roomName, correctCode) {
    console.log('Showing access code modal for room:', correctCode);
    const modal = document.getElementById('accessCodeModal');
    modal.querySelector('.modal-title').textContent = `Enter Access Code for ${roomName}`;
    const input = modal.querySelector('#accessCodeInput');
    const submitBtn = modal.querySelector('#accessCodeSubmit');
    const errorMsg = modal.querySelector('#accessCodeError');
    input.value = '';
    errorMsg.textContent = '';
    
    // Clone and replace the button to remove any existing event listeners
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    newSubmitBtn.onclick = () => {
        const enteredCode = input.value.trim();
        if (enteredCode === correctCode) {
            closeModal('accessCodeModal');
            joinRoom(roomId, roomName, true); // Pass true to skip access code check
        } else {
            errorMsg.textContent = 'Incorrect access code. Please try again.';
        }
    };
    modal.classList.add('active');
}

// View Blog Detail (placeholder - can expand this)
async function viewBlog(blogId) {
    const response = await apiRequest(`/blog/${blogId}`);
    if (!response || !response.data) return;
    
    const blog = response.data.blog;
    const user = response.data.user; 
    activeBlogId = blogId;

    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('blogViewPage').style.display = 'block';

    const firstName = user?.firstName || 'User';
    const lastName = user?.lastName || '';
    const username = user?.username || 'unknown';
    const authorUser = {
        username,
        firstName,
        lastName,
        profilePictureUrl: user?.profilePictureUrl || null
    };
    const blogDate = new Date(blog.createdAt).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    }) + ' ' + new Date(blog.createdAt).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    });

    // Check if current user is the author of the blog
    const isBlogAuthor = currentUser && (blog.username === currentUser.username);
    document.getElementById('fullBlogContent').innerHTML = `
        <div class="auth-card" style="max-width: 100%; border-radius: 16px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    ${createAvatarMarkup(authorUser, 'blog-view-avatar')}
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">${firstName} ${lastName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary);">@${username}</div>
                        <div style="font-size: 0.85rem; color: var(--text-tertiary);">${blogDate}</div>
                    </div>
                </div>
                
                ${isBlogAuthor ? `
                    <button class="action-btn" style="color: #ff4d4d; border-color: #ff4d4d; padding: 0.6rem 1rem;" 
                            onclick="deleteBlog('${blog._id || blog.id}')">
                        Delete Blog
                    </button>
                ` : ''}
            </div>

            <h1 style="font-family: 'Space Mono', monospace; font-size: 2.5rem; margin-bottom: 1.5rem; color: var(--accent-primary);">
                ${blog.title}
            </h1>
            
            <div style="font-size: 1.1rem; line-height: 1.8; color: var(--text-secondary);">
                ${blog.content}
            </div>
        </div>
    `;

    renderComments(blog.comments);
}
// Search Rooms
let roomSearchTimeout;
function searchRooms() {
    clearTimeout(roomSearchTimeout);
    roomSearchTimeout = setTimeout(() => {
        applyRoomsFilter();
        renderRoomsPage(1);
    }, 300);
}

function applyRoomsFilter() {
    const searchInput = document.getElementById('roomSearch');
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();

    filteredRooms = allRooms.filter((room) => {
        const roomName = String(room.name || '').toLowerCase();
        const roomDescription = String(room.description || '').toLowerCase();
        return roomName.includes(searchTerm) || roomDescription.includes(searchTerm);
    });
}

function renderRoomsPage(page = 1) {
    const roomsGrid = document.getElementById('roomsGrid');

    if (!roomsGrid) {
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
    roomsCurrentPage = Math.min(Math.max(page, 1), totalPages);

    const startIndex = (roomsCurrentPage - 1) * ROOMS_PER_PAGE;
    const endIndex = startIndex + ROOMS_PER_PAGE;
    const roomsToRender = filteredRooms.slice(startIndex, endIndex);

    roomsGrid.innerHTML = '';

    if (filteredRooms.length === 0) {
        roomsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No rooms available. Create one to get started!</p>';
        renderPagination('roomsPagination', 1, 0, 'goToRoomsPage');
        return;
    }

    roomsToRender.forEach(room => {
        console.log('Processing room:', room);
        const description = room.description || 'No description provided.';
        const isPrivate = room.type === 'private';

        // Determine active participant count
        // Handles cases where backend sends an array or a direct number
        let activeCount = 0;
        if (Array.isArray(room.participants)) {
            activeCount = room.participants.length;
        } else if (typeof room.participants === 'number') {
            activeCount = room.participants;
        }

        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        roomCard.innerHTML = `
            <div class="room-header">
                <div>
                    <h3 class="room-title">${room.name} ${isPrivate ? '🔒' : ''}</h3>
                    <span class="room-badge ${room.type}">${isPrivate ? 'Private' : 'Public'}</span>
                </div>
            </div>
            <p class="room-description">${description}</p>
            <div class="room-meta">
                <div class="room-participants">
                        <span class="participant-count">👥 ${activeCount} online</span>
                </div>
                <button class="join-btn" onclick="joinRoom('${room._id}', '${room.name}')">${isPrivate ? 'Join with Code' : 'Join'}</button>
            </div>
        `;
        roomsGrid.appendChild(roomCard);
    });

    renderPagination('roomsPagination', roomsCurrentPage, totalPages, 'goToRoomsPage');
}

function goToRoomsPage(page) {
    renderRoomsPage(page);
}

// Updated loadRooms to calculate participants and pass to delete function
async function loadRooms() {
    const roomsGrid = document.getElementById('roomsGrid');
    roomsGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading rooms...</p></div>';

    const response = await apiRequest('/rooms');
    allRooms = response.data || [];
    applyRoomsFilter();
    renderRoomsPage(1);
}

// Delete room from chat interface
async function deleteRoomFromChat() {
    if (!currentRoom) return;
    
    await deleteRoom(currentRoom.id, currentRoom.name, 0);
}

// Updated deleteRoom to check for active users
async function deleteRoom(roomId, roomName, activeCount) {
    // 1. Check if there are active users
    if (activeCount > 0) {
        showPopupAlert(`Cannot delete "${roomName}" while ${activeCount} user(s) are active.`, '🚫', 4000);
        return;
    }

    // 2. Proceed with deletion confirmation
    if (!confirm(`Are you sure you want to delete the room "${roomName}"?`)) return;

    const response = await apiRequest(`/rooms/${roomId}`, 'DELETE');
    
    if (response) {
        showPopupAlert('Room deleted successfully', '✅', 3000);
        
        // If user is currently in the room being deleted, leave it
        if (currentRoom && currentRoom.id === roomId) {
            leaveRoomWithoutNavigating();
            navigateTo('rooms');
        }
    }
}
// Delete Blog
async function deleteBlog(blogId) {
    if (!confirm('Are you sure you want to delete this blog?')) return;
    
    await apiRequest(`/blog/${blogId}`, 'DELETE');
    navigateTo('home');
}
// Modal Management
function openCreateRoomModal() {
    if (!isAuthenticated) {
        logout();
        showLoginPage();
        return;
    }

    initializeRoomTypeToggle();
    selectRoomType('public');

    const createRoomForm = document.querySelector('#createRoomModal form');
    if (createRoomForm) {
        createRoomForm.reset();
    }

    document.getElementById('createRoomModal').classList.add('active');
}

function openCreateBlogModal() {
    if (!isAuthenticated) {
        logout();
        showLoginPage();
        return;
    }
    document.getElementById('createBlogModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function initializeRoomTypeToggle() {
    const toggleOptions = document.querySelectorAll('#createRoomModal .toggle-option');

    toggleOptions.forEach((option) => {
        if (option.dataset.toggleBound === 'true') {
            return;
        }

        option.addEventListener('click', () => {
            const type = option.getAttribute('data-type');
            if (type) {
                selectRoomType(type);
            }
        });

        option.dataset.toggleBound = 'true';
    });
}

function selectRoomType(type) {
    selectedRoomType = type;
    const roomTypeInput = document.getElementById('roomType');
    if (roomTypeInput) {
        roomTypeInput.value = type;
    }

    document.querySelectorAll('#createRoomModal .toggle-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.getAttribute('data-type') === type) {
            opt.classList.add('active');
        }
    });
    
    // Show/hide access code field based on room type
    const accessCodeGroup = document.getElementById('accessCodeGroup');
    const accessCodeInput = document.getElementById('roomAccessCode');
    if (!accessCodeGroup || !accessCodeInput) {
        return;
    }

    if (type === 'private') {
        accessCodeGroup.style.display = 'flex';
        accessCodeInput.required = true;
    } else {
        accessCodeGroup.style.display = 'none';
        accessCodeInput.required = false;
        accessCodeInput.value = '';
    }
}

// Create Room
async function createRoom(event) {
    event.preventDefault();
    const roomName = document.getElementById('roomName').value.trim();
    if (!isNonEmpty(roomName)) {
        showPopupAlert('Room name cannot be empty.', '⚠️', 3000);
        return;
    }

    const normalizedRoomName = roomName.toLowerCase().replace(/\s+/g, ' ').trim();
    const roomsSnapshotResponse = await apiRequest('/rooms');
    const latestRooms = roomsSnapshotResponse?.data || [];

    const duplicateRoomExists = latestRooms.some((room) => {
        const existingName = String(room.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
        return existingName === normalizedRoomName;
    });

    if (duplicateRoomExists) {
        showPopupAlert('Room name already exists. Please choose a different name.', '⚠️', 4000);
        return;
    }

    allRooms = latestRooms;

    const roomType = document.getElementById('roomType').value || 'public';
    const roomData = {
        name: roomName,
        description: document.getElementById('roomDescription').value,
        type: roomType
    };

    // Add access code if room is private
    if (roomType === 'private') {
        const accessCode = document.getElementById('roomAccessCode').value.trim();
        if (!accessCode) {
            alert('Please enter an access code for the private room');
            return;
        }
        roomData.accessCode = accessCode;
    }

    await apiRequest('/rooms', 'POST', roomData);
    closeModal('createRoomModal');
    loadRooms();
    
    // Reset form and hide access code field
    event.target.reset();
    document.getElementById('accessCodeGroup').style.display = 'none';
    document.getElementById('roomAccessCode').required = false;
}

// Join Room (Socket.IO connection)
async function joinRoom(roomId, roomName, skipAccessCheck = false) {
    if (!isAuthenticated) {
        return showAuthAlert('Login to join this room!')
    }
    
    const response = await apiRequest(`/rooms/${roomId}`);
    if (!response || !response.data) {
        alert("Failed to join room. Please try again.");
        return;
    }

    const room = response.data;

    // Show access code modal for private rooms (unless user already entered code)
    if (room.type === 'private' && !skipAccessCheck) {
        showAccessCodeModal(roomId, roomName, room.accessCode);
        return;
    }

    currentRoom = { id: roomId, name: roomName, type: room.type, accessCode: room.accessCode, createdBy: room.createdBy };
    console.log(currentRoom);
    
    // Hide other pages, show chat
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('chatPage').style.display = 'block';
    
    // Check if current user is the room creator
    const isRoomCreator = currentUser && (room.createdBy === currentUser.username);
    
    // Update chat header with room name, access code for private rooms, and delete button for creators
    const titleElement = document.getElementById('chatRoomTitle');
    if (room.type === 'private' && room.accessCode) {
        titleElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>${roomName}</span>
                        <span style="font-size: 1.2rem;">🔒</span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 400; color: var(--text-secondary); margin-top: 0.3rem;">
                        Access Code: <span style="font-family: 'Space Mono', monospace; background: var(--bg-tertiary); padding: 0.2rem 0.6rem; border-radius: 6px; color: var(--accent-primary);">${room.accessCode}</span>
                    </div>
                </div>
                ${isRoomCreator ? `
                    <button class="action-btn" style="color: #ff4d4d; border-color: #ff4d4d; padding: 0.5rem 1rem; font-size: 0.85rem;" 
                            onclick="deleteRoomFromChat()"
                            title="Delete room">
                        Delete Room
                    </button>
                ` : ''}
            </div>
        `;
    } else {
        titleElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>${roomName}</span>
                ${isRoomCreator ? `
                    <button class="action-btn" style="color: #ff4d4d; border-color: #ff4d4d; padding: 0.5rem 1rem; font-size: 0.85rem;" 
                            onclick="deleteRoomFromChat()"
                            title="Delete room">
                        Delete Room
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    // Clear chat messages when switching rooms
    document.getElementById('chatMessages').innerHTML = '';
    
    // Initialize Socket.IO connection only once
    if (!socket) {
        const token = localStorage.getItem('authToken');
        socket = io(API_BASE_URL.replace('/api', ''), {
            auth: {
                token: token
            }
        });
        
        socket.on('connect', () => {
            console.log('Connected to chat server');
            currentUser.socketId = socket.id;
            socket.emit('join-room', { roomId: currentRoom.id, currentUser });
        });
        
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            alert('Failed to connect to chat server. Please try logging in again.');
        });
        
        socket.on('message', (message) => {
            displayMessage(message);
        });

        socket.on('user-joined', (payload) => {
            updateParticipants(payload.participants);
        });

        socket.on('user-left', (data) => {
            updateParticipants(data.participants);
        });

        socket.on('disconnect', (data) => {
            updateParticipants(data.participants);
        });

        socket.on('already-in-room', () => {
            console.log('User already in room alert');
            showPopupAlert('You are already in this room in another tab', '🔒', 3000);
            navigateTo('rooms')
        });
    }
    
    if (socket.connected) {
        currentUser.socketId = socket.id;
        socket.emit('join-room', { roomId, currentUser });
    }
}

// Leave Room
function leaveRoom() {
    if (socket && currentRoom) {
        socket.emit('leave-room', { roomId: currentRoom.id, currentUser });
    }
    currentRoom = null;
    navigateTo('rooms'); 
}

function leaveRoomWithoutNavigating() {
    if (socket && currentRoom) {
        socket.emit('leave-room', { roomId: currentRoom.id, currentUser });
    }
    currentRoom = null;
}

// Send Message (Socket.IO)
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message && socket && currentRoom && currentUser) {
        const messageData = {
            roomId: currentRoom.id,
            userId: currentUser._id,
            author: `${currentUser.firstName} ${currentUser.lastName}`,
            text: message,
            timestamp: new Date().toISOString()
        };        
        
        socket.emit('send-message', messageData);
        input.value = '';
    }
}

function handleMessageKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Display Message
function displayMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const isOwn = message.userId === currentUser._id;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${message.author.split(' ').map(n => n[0]).join('')}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${message.author}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-text">${message.text}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// Update Participants
function updateParticipants(participants) {
    const participantList = document.getElementById('participantList');
    const participantCount = document.getElementById('participantCount');
    participantCount.textContent = participants.length;
    
    participantList.innerHTML = '';
    
    if (participants.length === 0) {
        participantList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No participants</p>';
        return;
    }
    
    participants.forEach(participant => {
        const participantDiv = document.createElement('div');
        const name = `${participant.firstName} ${participant.lastName}`;
        const initials = `${participant.firstName[0]}${participant.lastName[0]}`;
        
        participantDiv.className = 'participant-item';
        participantDiv.innerHTML = `
            <div class="participant-avatar">${initials}</div>
            <div class="participant-info">
                <div class="participant-name">${name}</div>
            </div>
        `;
        participantList.appendChild(participantDiv);
    });
}

function syncCurrentUserWithProfile(profileData) {
    if (!profileData) {
        return;
    }

    if (!currentUser) {
        currentUser = profileData;
    } else {
        currentUser = { ...currentUser, ...profileData };
    }

    localStorage.setItem('userData', JSON.stringify(currentUser));
}

function renderProfileAvatar(user) {
    const avatarElement = document.getElementById('profileAvatar');
    if (!avatarElement) {
        return;
    }

    const profilePictureUrl = getProfilePictureFromUser(user);
    const absoluteProfilePictureUrl = getAbsoluteMediaUrl(profilePictureUrl);
    const viewOption = document.getElementById('viewProfilePictureOption');

    avatarElement.classList.toggle('has-image', Boolean(absoluteProfilePictureUrl));

    if (absoluteProfilePictureUrl) {
        const safeUrl = escapeHtml(absoluteProfilePictureUrl);
        console.log('Rendering profile picture with URL:', profilePictureUrl);
        avatarElement.innerHTML = `<img src="${profilePictureUrl}" alt="Profile picture">`;
    } else {
        avatarElement.textContent = getUserInitials(user);
    }

    if (viewOption) {
        viewOption.style.display = absoluteProfilePictureUrl ? 'block' : 'none';
    }
}

function closeProfilePictureMenu() {
    const menu = document.getElementById('profilePictureMenu');
    const wrapper = document.getElementById('profileAvatarWrapper');
    if (menu) {
        menu.classList.remove('active');
    }
    if (wrapper) {
        wrapper.classList.remove('menu-open');
    }
}

function toggleProfilePictureMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('profilePictureMenu');
    const wrapper = document.getElementById('profileAvatarWrapper');
    if (!menu || !wrapper) {
        return;
    }

    const isActive = menu.classList.toggle('active');
    wrapper.classList.toggle('menu-open', isActive);
}

function triggerProfilePictureUpload() {
    closeProfilePictureMenu();
    const input = document.getElementById('profilePictureInput');
    if (input) {
        input.click();
    }
}

function isAllowedProfilePictureFile(file) {
    if (!file) {
        return false;
    }

    if (PROFILE_PICTURE_ALLOWED_MIME_TYPES.includes(file.type)) {
        return true;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    return Boolean(extension && PROFILE_PICTURE_ALLOWED_EXTENSIONS.includes(extension));
}

async function handleProfilePictureSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
        return;
    }

    if (!isAllowedProfilePictureFile(file)) {
        showPopupAlert('Only JPG, PNG, and WEBP images are allowed.', '⚠️', 3500);
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const response = await fetch(`${API_BASE_URL}/profile/profile-picture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to upload profile picture');
        }

        syncCurrentUserWithProfile(responseData.data);
        renderProfileAvatar(currentUser);
        showPopupAlert('Profile picture updated successfully.', '✅', 2800);
        console.log('Profile picture upload response:', responseData);
    } catch (error) {
        console.error('Profile picture upload failed:', error);
        showPopupAlert(error.message || 'Failed to upload profile picture.', '⚠️', 3500);
    }
}

async function deleteProfilePicture() {
    closeProfilePictureMenu();

    if (!currentUser?.profilePictureUrl) {
        showPopupAlert('No profile picture to delete.', '⚠️', 2500);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/profile/profile-picture`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to delete profile picture');
        }

        syncCurrentUserWithProfile(responseData.data);
        currentUser.profilePictureUrl = null;
        localStorage.setItem('userData', JSON.stringify(currentUser));
        renderProfileAvatar(currentUser);
        showPopupAlert('Profile picture deleted.', '✅', 2500);
    } catch (error) {
        console.error('Profile picture delete failed:', error);
        showPopupAlert(error.message || 'Failed to delete profile picture.', '⚠️', 3500);
    }
}

function openProfilePictureViewerFromEncoded(encodedUrl) {
    const decodedUrl = decodeURIComponent(encodedUrl);
    openProfilePictureViewer(decodedUrl);
}

function openProfilePictureViewer(profilePictureUrl) {
    const absoluteUrl = getAbsoluteMediaUrl(profilePictureUrl);
    if (!absoluteUrl) {
        return;
    }

    const modal = document.getElementById('profilePictureViewer');
    const image = document.getElementById('profilePictureViewerImage');

    if (!modal || !image) {
        return;
    }

    image.src = profilePictureUrl;
    modal.classList.add('active');
}

function closeProfilePictureViewer(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }

    const modal = document.getElementById('profilePictureViewer');
    const image = document.getElementById('profilePictureViewerImage');

    if (modal) {
        modal.classList.remove('active');
    }

    if (image) {
        image.src = '';
    }
}

function viewOwnProfilePicture() {
    closeProfilePictureMenu();

    const profilePictureUrl = getProfilePictureFromUser(currentUser);
    if (!profilePictureUrl) {
        return;
    }

    openProfilePictureViewer(profilePictureUrl);
}

// Load Profile
async function loadProfile() {
    const profile = await apiRequest('/profile');

    if (!profile?.data) {
        return;
    }

    syncCurrentUserWithProfile(profile.data);

    document.getElementById('profileName').textContent = `${profile.data.firstName} ${profile.data.lastName}`;
    document.getElementById('profileUsername').textContent = `@${profile.data.username}`;
    renderProfileAvatar(profile.data);

    loadBlogs(profile.data.username);
}

// Load Blogs
async function loadBlogs(username) {
    const blogsReq = await apiRequest(`/blog/user/${username}`);
    const blogs = blogsReq.data || [];
    const blogList = document.getElementById('blogList');
    
    blogList.innerHTML = '';
    blogs.forEach(blog => {
        const date = new Date(blog.createdAt).toLocaleDateString();
        const blogCard = document.createElement('div');
        blogCard.className = 'blog-card';
        
        // Clicking the block opens the full blog
        blogCard.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.parentElement.tagName !== 'BUTTON') {
                viewBlog(blog._id || blog.id);
            }
        };

        const isBlogAuthor = currentUser && (
            blog.user?._id === currentUser._id || 
            blog.user?.id === currentUser.id || 
            blog.userId === currentUser._id ||
            blog.userId === currentUser.id
        );
        console.log('Is current user the blog author?', isBlogAuthor);
        
        blogCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <h3 class="blog-title">${blog.title}</h3>
                    <p class="blog-excerpt">${blog.content.substring(0, 100)}...</p>
                    <div class="blog-meta">
                        <span>${date}</span>
                        <div class="blog-actions">
                            <button class="action-btn" onclick="likeBlog('${blog._id || blog.id}')">
                                <span>👍</span>
                                <span>${blog.likes?.length || 0}</span>
                            </button>
                            <button class="action-btn">
                                <span>💬</span>
                                <span>${blog.comments?.length || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>
                ${isBlogAuthor ? `
                    <button class="action-btn" style="color: #ff4d4d; border-color: transparent; margin-left: 1rem;" 
                            onclick="deleteBlog('${blog._id || blog.id}')">
                        Delete
                    </button>
                ` : ''}
            </div>
        `;
        blogList.appendChild(blogCard);
    });
}

// Create Blog
async function createBlog(event) {
    event.preventDefault();
    const title = document.getElementById('blogTitle').value.trim();
    const content = document.getElementById('blogContent').value.trim();

    if (!isNonEmpty(title) || !isNonEmpty(content)) {
        showPopupAlert('Blog title and content cannot be empty.', '⚠️', 3500);
        return;
    }

    const blogData = {
        title,
        content
    };

    await apiRequest('/blog', 'POST', blogData);
    closeModal('createBlogModal');
    loadHomeBlogs();
    
    // Reset form
    event.target.reset();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded - Initializing...');
    
    loadTheme();
    checkAuth();
    initializeRoomTypeToggle();
    selectRoomType('public');

    document.addEventListener('click', (event) => {
        const wrapper = document.getElementById('profileAvatarWrapper');
        if (wrapper && !wrapper.contains(event.target)) {
            closeProfilePictureMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeProfilePictureMenu();
            closeProfilePictureViewer();
        }
    });
    
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
        console.log('Setting up home page...');
        
        // Hide all pages first
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
            p.classList.remove('active');
        });
        
        // Show and activate home page
        const homePage = document.getElementById('homePage');
        if (homePage) {
            homePage.style.display = 'block';
            homePage.classList.add('active');
            console.log('Home page displayed');
        } else {
            console.error('Home page element not found!');
        }
        
        // Set home nav link as active
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === 'home') {
                link.classList.add('active');
            }
        });
        
        // Load blogs
        console.log('Loading blogs...');
        loadHomeBlogs();
    }, 100);
});

// Close modals when clicking outside
setTimeout(() => {
    const modals = document.querySelectorAll('.modal');
    if (modals.length > 0) {
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
}, 100);