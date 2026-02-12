let isAuthenticated = false;
let currentUser = null;
let socket = null;
let currentRoom = null;
let selectedRoomType = 'public';
let roomsMap = {};

// Configuration - Update this to your backend URL
const API_BASE_URL = 'http://localhost:1234/api';

let activeBlogId = null;
// Check authentication status on load
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        isAuthenticated = true;
        currentUser = JSON.parse(userData);
    } else {
        isAuthenticated = false;
        currentUser = null;
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

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // Connect to your specific route: POST /api/profile/login
        const response = await fetch(`${API_BASE_URL}/profile/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Assuming your backend returns { token: "...", user: {...} }
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user)); // or fetch profile separately

        currentUser = data.user;
        isAuthenticated = true;
        
        updateAuthUI();
        navigateTo('home');
        event.target.reset();

    } catch (error) {
        alert(error.message);
        console.error('Login Error:', error);
    }

}

async function handleRegister(event) {
    event.preventDefault();

    // Gather data from form
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        // Auto-login after register (if your backend sends token on register)
        if (data.token) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            currentUser = data.user;
            isAuthenticated = true;
            updateAuthUI();
            navigateTo('home');
        } else {
            // If backend doesn't auto-login, send them to login page
            alert("Account created! Please log in.");
            showLoginPage();
        }
        event.target.reset();

    } catch (error) {
        alert(error.message);
    }
}

function socialLogin(provider) {
    alert(`${provider} login would be implemented here. This would redirect to ${provider}'s OAuth flow.`);
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    isAuthenticated = false;
    updateAuthUI();
    // showLoginPage();
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
            alert("Cannot connect to backend: " + error.message);
            return []; // Return empty array or null to prevent crash
        }
}


// Load Blogs on Home Page
async function loadHomeBlogs() {
    const blogsGrid = document.getElementById('homeBlogsGrid');
    blogsGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading blogs...</p></div>';

    const blogsReq = await apiRequest('/blog');
    const blogs = blogsReq.data || [];
    
    blogsGrid.innerHTML = '';
    if (blogs.length === 0) {
        blogsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No blogs found.</p>';
        return;
    }

    blogs.forEach(blog => {
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
        const authorInitials = `${username[0]}${(username[1] || '')}`;
        const blogDate = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'Unknown date';
        
        blogCard.innerHTML = `
            <div class="home-blog-header">
                <div class="blog-author-avatar">${authorInitials}</div>
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
}

// Search Blogs
let blogSearchTimeout;
function searchBlogs() {
    clearTimeout(blogSearchTimeout);
    blogSearchTimeout = setTimeout(() => {
        const searchTerm = document.getElementById('blogSearch').value.toLowerCase();
        const blogCards = document.querySelectorAll('.home-blog-card');
        
        blogCards.forEach(card => {
            const title = card.querySelector('.home-blog-title').textContent.toLowerCase();
            const excerpt = card.querySelector('.home-blog-excerpt').textContent.toLowerCase();
            const author = card.querySelector('.blog-author-name').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || excerpt.includes(searchTerm) || author.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }, 300);
}

// Like Blog
async function likeBlog(blogId) {
    if (!isAuthenticated) {
        logout();
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

        const isAuthor = c.username === currentUser?.username;

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
        logout();
        return showAuthAlert("Login to post a comment!");
    }
    
    const content = document.getElementById('commentInput').value.trim();
    if (!content) return;

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

function showAccessCodeModal(roomId, roomName, correctCode) {
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
    const authorInitials = `${firstName[0]}${(lastName[0] || '')}`;
    const username = user?.username || 'unknown';
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
    const isBlogAuthor = currentUser && (blog.user?._id === currentUser.id || blog.user === currentUser.id);

    document.getElementById('fullBlogContent').innerHTML = `
        <div class="auth-card" style="max-width: 100%; border-radius: 16px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="blog-author-avatar" style="width: 50px; height: 50px; font-size: 1.2rem;">
                        ${authorInitials}
                    </div>
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
        const searchTerm = document.getElementById('roomSearch').value.toLowerCase();
        const roomCards = document.querySelectorAll('.room-card');
        
        roomCards.forEach(card => {
            const title = card.querySelector('.room-title').textContent.toLowerCase();
            const description = card.querySelector('.room-description').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }, 300);
}

async function loadRooms() {
    const roomsGrid = document.getElementById('roomsGrid');
    roomsGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading rooms...</p></div>';

    const response = await apiRequest('/rooms');
    const rooms = response.data || [];
    
    roomsGrid.innerHTML = '';
    
    if (rooms.length === 0) {
        roomsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No rooms available. Create one to get started!</p>';
        return;
    }
    
    rooms.forEach(room => {
        const description = room.description || 'No description provided.';
        const isPrivate = room.type === 'private';
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
                    <!--  <span class="participant-count">👥 ${room.participants || 0} online</span> -->
                </div>
                <button class="join-btn" onclick="joinRoom('${room._id}', '${room.name}')">${isPrivate ? 'Join with Code' : 'Join'}</button>
            </div>
        `;
        roomsGrid.appendChild(roomCard);
    });
}
// Delete Blog
async function deleteBlog(blogId) {
    if (!confirm('Are you sure you want to delete this blog?')) return;
    
    await apiRequest(`/blog/${blogId}`, 'DELETE');
    navigateTo('Home');
}
// Modal Management
function openCreateRoomModal() {
    if (!isAuthenticated) {
        logout();
        showLoginPage();
        return;
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

function selectRoomType(type) {
    selectedRoomType = type;
    document.getElementById('roomType').value = type;
    document.querySelectorAll('#createRoomModal .toggle-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.getAttribute('data-type') === type) {
            opt.classList.add('active');
        }
    });
    
    // Show/hide access code field based on room type
    const accessCodeGroup = document.getElementById('accessCodeGroup');
    const accessCodeInput = document.getElementById('roomAccessCode');
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
    const roomType = document.getElementById('roomType').value;
    const roomData = {
        name: document.getElementById('roomName').value,
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
        logout();
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

    currentRoom = { id: roomId, name: roomName, type: room.type, accessCode: room.accessCode };
    console.log(currentRoom);
    
    // Hide other pages, show chat
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('chatPage').style.display = 'block';
    
    // Update chat header with room name and access code for private rooms
    const titleElement = document.getElementById('chatRoomTitle');
    if (room.type === 'private' && room.accessCode) {
        titleElement.innerHTML = `
            <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>${roomName}</span>
                    <span style="font-size: 1.2rem;">🔒</span>
                </div>
                <div style="font-size: 0.85rem; font-weight: 400; color: var(--text-secondary); margin-top: 0.3rem;">
                    Access Code: <span style="font-family: 'Space Mono', monospace; background: var(--bg-tertiary); padding: 0.2rem 0.6rem; border-radius: 6px; color: var(--accent-primary);">${room.accessCode}</span>
                </div>
            </div>
        `;
    } else {
        titleElement.textContent = roomName;
    }
    
    // Clear chat messages when switching rooms
    document.getElementById('chatMessages').innerHTML = '';
    
    // Initialize Socket.IO connection only once
    if (!socket) {
        socket = io(API_BASE_URL.replace('/api', ''));
        
        socket.on('connect', () => {
            console.log('Connected to chat server');
            currentUser.socketId = socket.id;
            socket.emit('join-room', { roomId: currentRoom.id, currentUser });
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
    }
    
    // If already connected, just join the new room
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

// Load Profile
async function loadProfile() {
    const profile = await apiRequest('/profile');

    document.getElementById('profileName').textContent = `${profile.data.firstName} ${profile.data.lastName}`;
    document.getElementById('profileUsername').textContent = `@${profile.data.username}`;
    document.getElementById('profileAvatar').textContent = `${profile.data.firstName[0]}${profile.data.lastName[0]}`;
    document.getElementById('roomsCreated').textContent = profile.data.roomsCreated;
    document.getElementById('blogsPublished').textContent = profile.data.blogsPublished;
    document.getElementById('totalConnections').textContent = profile.data.totalConnections;

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

        blogCard.innerHTML = `
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
        `;
        blogList.appendChild(blogCard);
    });
}

// Create Blog
async function createBlog(event) {
    event.preventDefault();
    const blogData = {
        title: document.getElementById('blogTitle').value,
        content: document.getElementById('blogContent').value
    };

    await apiRequest('/blog', 'POST', blogData);
    closeModal('createBlogModal');
    loadHomeBlogs();
    
    // Reset form
    event.target.reset();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    checkAuth();
    loadHomeBlogs();
});

// Close modals when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});