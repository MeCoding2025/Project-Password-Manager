document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const passwordForm = document.getElementById('passwordForm');
    const logoutButton = document.getElementById('logoutButton');
    const homepageButton = document.getElementById('homepageButton')
    const registerPassword = document.getElementById('registerPassword');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const storedPassword = localStorage.getItem(username);

            if (storedPassword && storedPassword === password) {
                localStorage.setItem('loggedInUser', username);
                window.location.href = 'logged_in.html';
            } else {
                swal({
                    title: 'Warning',
                    text: 'Invalid username or password.',
                    icon: 'error' 
                })
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const password = document.getElementById('registerPassword').value;

            if (!validatePassword(password)) {
                swal({
                    title: 'Warning',
                    text: 'Password does not meet the requirements.',
                    icon: 'warning' 
                })
                return;
            }

            if (localStorage.getItem(username)) {
                swal({
                    title: 'Warning',
                    text: 'User already exists!',
                    icon: 'warning' 
                })
            } else {
                localStorage.setItem(username, password);
                swal({
                    title: 'Account successfully created!',
                    text: "Don't froget to save your Password, cannot be restored!",
                    icon: 'success' 
                })
                window.location.href = 'logged_in.html';
            }
        });

        registerPassword.addEventListener('input', () => {
            const password = registerPassword.value;
            updatePasswordIndicators(password);
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const site = document.getElementById('site').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const encryptedPassword = await encryptPassword(password);
            const loggedInUser = localStorage.getItem('loggedInUser');
        
            localStorage.setItem(`${loggedInUser}-${site}`, JSON.stringify({ username, password: encryptedPassword }));
            console.log('Data saved:', { site, username, encryptedPassword });
        
            displaySavedData();
        });

        const loggedInUser = localStorage.getItem('loggedInUser');
        document.getElementById('usernameDisplay').textContent = loggedInUser;

        displaySavedData();
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'logged_out.html';
        });
    }

    if (homepageButton) {
        homepageButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

function updatePasswordIndicators(password) {
    const lengthIndicator = document.getElementById('lengthIndicator');
    const uppercaseIndicator = document.getElementById('uppercaseIndicator');
    const lowercaseIndicator = document.getElementById('lowercaseIndicator');
    const numberIndicator = document.getElementById('numberIndicator');
    const specialCharIndicator = document.getElementById('specialCharIndicator');

    lengthIndicator.textContent = password.length >= 8 ? '✅' : '❌';
    uppercaseIndicator.textContent = /[A-Z]/.test(password) ? '✅' : '❌';
    lowercaseIndicator.textContent = /[a-z]/.test(password) ? '✅' : '❌';
    numberIndicator.textContent = /[0-9]/.test(password) ? '✅' : '❌';
    specialCharIndicator.textContent = /[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✅' : '❌';
}

async function encryptPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    console.log('Encrypted data:', { encrypted: Array.from(new Uint8Array(encrypted)), iv: Array.from(iv), key: exportedKey });
    return { encrypted: Array.from(new Uint8Array(encrypted)), iv: Array.from(iv), key: exportedKey };
}

async function decryptPassword(encryptedData) {
    const { encrypted, iv, key } = encryptedData;
    console.log('Decrypting data:', encryptedData);
    const importedKey = await crypto.subtle.importKey(
        'jwk',
        key,
        { name: 'AES-GCM' },
        true,
        ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        importedKey,
        new Uint8Array(encrypted)
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

async function displaySavedData() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    const savedDataTable = document.getElementById('savedDataTable').getElementsByTagName('tbody')[0];
    savedDataTable.innerHTML = ''; // Clear existing data

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`${loggedInUser}-`)) {
            const site = key.split(`${loggedInUser}-`)[1];
            const data = JSON.parse(localStorage.getItem(key));
            try {
                const decryptedPassword = await decryptPassword(data.password);
                const row = savedDataTable.insertRow();
                row.insertCell(0).textContent = site;
                row.insertCell(1).textContent = data.username;

                const passwordCell = row.insertCell(2);
                const passwordText = document.createElement('span');
                passwordText.textContent = '********';
                passwordText.style.cursor = 'pointer';
                passwordText.addEventListener('click', () => {
                    passwordText.textContent = passwordText.textContent === '********' ? decryptedPassword : '********';
                });
                passwordCell.appendChild(passwordText);

                const actionsCell = row.insertCell(3);
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => deleteItem(site));
                actionsCell.appendChild(deleteButton);
            } catch (error) {
                console.error('Error decrypting data for site:', site, error);
            }
        }
    }
}

async function deleteItem(site) {
    const loggedInUser = localStorage.getItem('loggedInUser');
    localStorage.removeItem(`${loggedInUser}-${site}`);
    displaySavedData();
}

const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});