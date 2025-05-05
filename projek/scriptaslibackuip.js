// Firebase configuration - replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyCHs9VqpuDsjHqcl1ciDnzQs161Xm1O3Tc",
    authDomain: "projekss-8d9ac.firebaseapp.com",
    projectId: "projekss-8d9ac",
    storageBucket: "projekss-8d9ac.firebasestorage.app",
    messagingSenderId: "521300239719",
    appId: "1:521300239719:web:7f0e0f2262f6e1e4063bc2"
  };

// Initialize Firebase app and database reference
let firebaseApp = null;
let database = null;
let currentUser = null;

function initFirebase() {
    if (!firebaseApp) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    }

    currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('signup.html')) {
            alert('User belum login, silakan login terlebih dahulu.');
            window.location.href = 'login.html';
        }
    }
}


document.getElementById('signupForm')?.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!username || !password || !email) {
        alert('Semua field harus diisi.');
        return;
    }

    database.ref('users/' + username).once('value').then(snapshot => {
        if (snapshot.exists()) {
            alert('Username sudah terdaftar. Silakan pilih username lain.');
            return;
        }

        database.ref('users/' + username).set({
            password: password,
            email: email,
            quiz1: false,
            quiz2: false,
            quiz3: false,
            quizakhir: false
        }).then(() => {
            alert('Registrasi berhasil! Silakan login.');
            window.location.href = 'login.html';
        }).catch(error => {
            alert('Gagal mendaftar: ' + error.message);
        });
    });
});

document.getElementById('loginForm')?.addEventListener('submit', function(event) {
    event.preventDefault();
    const loginUsername = document.getElementById('loginUsername').value.trim();
    const loginPassword = document.getElementById('loginPassword').value.trim();

    if (!loginUsername || !loginPassword) {
        alert('Username dan password harus diisi.');
        return;
    }

    database.ref('users/' + loginUsername).once('value').then(snapshot => {
        const userData = snapshot.val();
        if (userData && userData.password === loginPassword) {
            localStorage.setItem('currentUser', loginUsername);
            window.location.href = 'profile.html';
        } else {
            alert('Username atau password salah.');
        }
    });
});

window.onload = function() {
    initFirebase();

    const welcomeMessage = document.getElementById('welcomeMessage');
    const materiList = document.getElementById('materiList');

    if (welcomeMessage && materiList) {
        welcomeMessage.textContent = 'Selamat datang, ' + currentUser;

        database.ref('users/' + currentUser).once('value').then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                showMateriAvailability(userData);
            } else {
                alert('Data pengguna tidak ditemukan.');
            }
        }).catch(error => {
            alert('Gagal mengambil data pengguna: ' + error.message);
        });
    }
};

async function loadQuiz(materiKey, quizContainerId, resultId, progressKey, nextPage, isFinalTest = false) {
    const quizContainer = document.getElementById(quizContainerId);
    const resultEl = document.getElementById(resultId);
    const submitBtn = document.getElementById('submitQuizBtn');

    try {
        const response = await fetch('question.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const questionsData = await response.json();

        if (!questionsData[materiKey]) {
            quizContainer.innerHTML = '<p>Materi tidak ditemukan.</p>';
            submitBtn.style.display = 'none';
            return;
        }

        const materi = questionsData[materiKey];
        const quizzes = materi.quizzes;

        quizContainer.innerHTML = '';
        quizzes.forEach((quiz, idx) => {
            const div = document.createElement('div');
            div.className = 'quiz-question';
            div.style.marginBottom = '15px';

            const qTitle = document.createElement('p');
            qTitle.textContent = (idx + 1) + '. ' + quiz.question;
            div.appendChild(qTitle);

            quiz.options.forEach((option, i) => {
                const optionId = `q${idx}_option${i}`;
                const label = document.createElement('label');
                label.setAttribute('for', optionId);

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `q${idx}`;
                input.id = optionId;
                input.value = i;

                label.appendChild(input);
                label.insertAdjacentText('beforeend', option);
                div.appendChild(label);
                div.appendChild(document.createElement('br'));
            });

            quizContainer.appendChild(div);
        });

        submitBtn.disabled = false;
        resultEl.textContent = '';

        submitBtn.onclick = () => {
            const answers = [];
            let allAnswered = true;
            for (let i = 0; i < quizzes.length; i++) {
                const selected = document.querySelector(`input[name="q${i}"]:checked`);
                if (!selected) {
                    allAnswered = false;
                    break;
                }
                answers.push(parseInt(selected.value));
            }

            if (!allAnswered) {
                alert('Silakan jawab semua pertanyaan terlebih dahulu.');
                return;
            }

            let correctCount = 0;
            quizzes.forEach((quiz, idx) => {
                if (answers[idx] === quiz.answer) correctCount++;
            });
            const score = (correctCount / quizzes.length) * 100;

            resultEl.textContent = `Skor Anda: ${score.toFixed(0)}%`;

            if (score >= 80) {
                resultEl.style.color = 'green';
                saveProgress(progressKey).then(() => {
                    alert('Selamat! Anda lulus materi ini. Anda akan diarahkan ke materi berikutnya.');
                    window.location.href = nextPage;
                }).catch(err => {
                    alert('Terjadi kesalahan saat menyimpan progres: ' + err.message);
                });
            } else {
                resultEl.style.color = 'red';
                alert('Skor kurang dari 80%, silakan ulangi kuis.');
            }
        };
    } catch (error) {
        quizContainer.innerHTML = `<p>Gagal memuat soal: ${error.message}</p>`;
        submitBtn.style.display = 'none';
    }
}

function saveProgress(progressKey) {
    return new Promise((resolve, reject) => {
        if (!currentUser) {
            reject(new Error('User tidak ditemukan'));
            return;
        }
        const userProgressRef = database.ref('users/' + currentUser + '/' + progressKey);
        userProgressRef.set(true, error => {
            if (error) reject(error);
            else resolve();
        });
    });
}

// Show all materi with lock emoji if not unlocked (quiz false)
// Show all materi with lock emoji if not unlocked (quiz false)
function showMateriAvailability(userData) {
    const materiListEl = document.getElementById('materiList');
    if (!materiListEl) return;
    materiListEl.innerHTML = '';

    // Define materi list with links
    const materis = [
        { key: 'materi1', label: 'Materi 1: Pengenalan HTML', progressKey: 'quiz1', link: 'materi1.html' },
        { key: 'materi2', label: 'Materi 2: Element Teks HTML', progressKey: 'quiz2', link: 'materi2.html' },
        { key: 'materi3', label: 'Materi 3: Elemen Lanjutan HTML', progressKey: 'quiz3', link: 'materi3.html' },
        { key: 'quizakhir', label: 'Evaluasi Akhir (Final Test)', progressKey: 'quizakhir', link: 'final-test.html' } // Ensure this points to the correct final test page
    ];

    // Unlock logic: first materi always unlocked, others unlocked if previous progress is true
    for (let i = 0; i < materis.length; i++) {
        const m = materis[i];
        let unlocked = false;

        if (i === 0) {
            // First materi always unlocked
            unlocked = true;
        } else {
            // Check previous quiz progress key is true to unlock
            const prevProgressKey = materis[i - 1].progressKey;
            unlocked = userData[prevProgressKey] === true;
        }

        const isCompleted = userData[m.progressKey] === true;
        // If unlocked, label is clickable button else locked with emoji and disabled button styling
        if (unlocked) {
            materiListEl.innerHTML += `<button onclick="window.location.href='${m.link}'">${m.label} ${isCompleted ? '✅' : ''}</button><br>`;
        } else {
            materiListEl.innerHTML += `<button disabled style="cursor:not-allowed;">${m.label} 🔒</button><br>`;
        }
    }
}

