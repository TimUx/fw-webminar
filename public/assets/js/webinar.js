const API_BASE = '/api';

let currentWebinar = null;
let currentSlideIndex = 0;
let currentQuestionIndex = 0;
let userAnswers = [];
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// Load settings and webinars on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadPublicSettings();
  await loadWebinarList();
});

// Load public settings (header, logo)
async function loadPublicSettings() {
  try {
    const response = await fetch(`${API_BASE}/webinar/settings`);
    const settings = await response.json();
    
    document.getElementById('headerTitle').textContent = settings.headerTitle || 'Webinar Platform';
    
    if (settings.logoPath) {
      const logo = document.getElementById('headerLogo');
      logo.src = settings.logoPath;
      logo.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Load list of available webinars
async function loadWebinarList() {
  try {
    const response = await fetch(`${API_BASE}/webinar/list`);
    const webinars = await response.json();
    
    const loading = document.getElementById('loadingWebinars');
    const list = document.getElementById('webinarList');
    
    loading.classList.add('hidden');
    
    if (webinars.length === 0) {
      list.innerHTML = '<p>Derzeit sind keine Webinare verfügbar.</p>';
      return;
    }
    
    list.innerHTML = webinars.map(webinar => `
      <div class="webinar-card" onclick="loadWebinar('${webinar.id}')">
        <h3>${webinar.title}</h3>
        <p>Erstellt: ${new Date(webinar.createdAt).toLocaleDateString('de-DE')}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading webinars:', error);
    document.getElementById('loadingWebinars').innerHTML = 
      '<p style="color: #e74c3c;">Fehler beim Laden der Webinare.</p>';
  }
}

// Load and start a specific webinar
async function loadWebinar(id) {
  try {
    const response = await fetch(`${API_BASE}/webinar/${id}`);
    currentWebinar = await response.json();
    
    document.getElementById('webinarTitle').textContent = currentWebinar.title;
    
    // Hide welcome, show presentation
    document.getElementById('welcome-section').classList.add('hidden');
    document.getElementById('presentation-section').classList.remove('hidden');
    
    // Load presentation
    if (currentWebinar.slides && currentWebinar.slides.length > 0) {
      loadPresentation();
    } else {
      // No slides, go directly to quiz
      document.getElementById('presentation-section').classList.add('hidden');
      startQuiz();
    }
  } catch (error) {
    console.error('Error loading webinar:', error);
    alert('Fehler beim Laden des Webinars.');
  }
}

// Load presentation slides
function loadPresentation() {
  const iframe = document.getElementById('presentationFrame');
  iframe.src = `/slides/${currentWebinar.id}/presentation.html`;
  
  currentSlideIndex = 0;
  updateSlideCounter();
  
  // Wait for iframe to load
  iframe.onload = () => {
    updateSlideCounter();
    
    // Start narration for first slide
    setTimeout(() => {
      speakSlideNote(0);
    }, 1000);
  };
  
  // Show quiz button when all slides are viewed
  document.getElementById('startQuizBtn').style.display = 'none';
}

// Navigation functions
function nextSlide() {
  const iframe = document.getElementById('presentationFrame');
  const totalSlides = currentWebinar.slides.length;
  
  if (currentSlideIndex < totalSlides - 1) {
    currentSlideIndex++;
    
    try {
      iframe.contentWindow.revealControl?.next();
    } catch (e) {
      console.error('Cannot control iframe:', e);
    }
    
    updateSlideCounter();
    speakSlideNote(currentSlideIndex);
  } else {
    // Last slide reached, show quiz button
    stopSpeaking();
    document.getElementById('startQuizBtn').style.display = 'inline-block';
  }
}

function previousSlide() {
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    
    const iframe = document.getElementById('presentationFrame');
    try {
      iframe.contentWindow.revealControl?.prev();
    } catch (e) {
      console.error('Cannot control iframe:', e);
    }
    
    updateSlideCounter();
    speakSlideNote(currentSlideIndex);
  }
}

function updateSlideCounter() {
  const totalSlides = currentWebinar.slides?.length || 1;
  document.getElementById('currentSlide').textContent = currentSlideIndex + 1;
  document.getElementById('totalSlides').textContent = totalSlides;
  
  const progress = ((currentSlideIndex + 1) / totalSlides) * 100;
  document.getElementById('progressFill').style.width = `${progress}%`;
  
  document.getElementById('prevSlideBtn').disabled = currentSlideIndex === 0;
  document.getElementById('nextSlideBtn').disabled = currentSlideIndex >= totalSlides - 1;
}

// Speech synthesis for narration
function speakSlideNote(slideIndex) {
  stopSpeaking();
  
  const slide = currentWebinar.slides[slideIndex];
  if (!slide || !slide.speakerNote) return;
  
  const text = slide.speakerNote;
  
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = 'de-DE';
  currentUtterance.rate = 0.9;
  currentUtterance.pitch = 1;
  
  currentUtterance.onstart = () => {
    const indicator = document.getElementById('narrationIndicator');
    indicator.classList.remove('hidden');
    indicator.classList.add('speaking');
  };
  
  currentUtterance.onend = () => {
    const indicator = document.getElementById('narrationIndicator');
    indicator.classList.add('hidden');
    indicator.classList.remove('speaking');
  };
  
  speechSynthesis.speak(currentUtterance);
}

function stopSpeaking() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  
  const indicator = document.getElementById('narrationIndicator');
  indicator.classList.add('hidden');
  indicator.classList.remove('speaking');
}

// Start quiz
function startQuiz() {
  stopSpeaking();
  
  document.getElementById('presentation-section').classList.add('hidden');
  document.getElementById('quiz-section').classList.remove('hidden');
  
  currentQuestionIndex = 0;
  userAnswers = new Array(currentWebinar.questions.length).fill(null);
  
  displayQuestion();
}

// Display current question
function displayQuestion() {
  const question = currentWebinar.questions[currentQuestionIndex];
  const totalQuestions = currentWebinar.questions.length;
  
  const quizContent = document.getElementById('quizContent');
  quizContent.innerHTML = `
    <div class="question-box">
      <div class="question-number">Frage ${currentQuestionIndex + 1} von ${totalQuestions}</div>
      <div class="question-text">${question.question}</div>
      <div class="answers">
        ${question.answers.map((answer, index) => `
          <div class="answer-option ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}" 
               onclick="selectAnswer(${index})">
            ${answer}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Update navigation buttons
  document.getElementById('prevQuestionBtn').style.display = 
    currentQuestionIndex > 0 ? 'inline-block' : 'none';
  
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;
  document.getElementById('nextQuestionBtn').style.display = 
    !isLastQuestion ? 'inline-block' : 'none';
  document.getElementById('finishQuizBtn').style.display = 
    isLastQuestion ? 'inline-block' : 'none';
}

function selectAnswer(answerIndex) {
  userAnswers[currentQuestionIndex] = answerIndex;
  displayQuestion();
}

function nextQuestion() {
  if (currentQuestionIndex < currentWebinar.questions.length - 1) {
    currentQuestionIndex++;
    displayQuestion();
  }
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
  }
}

function finishQuiz() {
  // Check if all questions are answered
  const unanswered = userAnswers.findIndex(a => a === null);
  if (unanswered !== -1) {
    alert(`Bitte beantworten Sie alle Fragen. Frage ${unanswered + 1} ist noch offen.`);
    return;
  }
  
  // Show participant form
  document.getElementById('quiz-section').classList.add('hidden');
  document.getElementById('participant-section').classList.remove('hidden');
}

// Submit participant data and results
document.getElementById('participantForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('participantName').value;
  const email = document.getElementById('participantEmail').value;
  
  try {
    const response = await fetch(`${API_BASE}/webinar/${currentWebinar.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        answers: userAnswers
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Absenden');
    }
    
    const data = await response.json();
    
    // Show result
    displayResult(data.result);
  } catch (error) {
    alert('Fehler: ' + error.message);
  }
});

// Display result
function displayResult(result) {
  document.getElementById('participant-section').classList.add('hidden');
  document.getElementById('result-section').classList.remove('hidden');
  
  const passed = result.passed;
  
  document.getElementById('resultIcon').textContent = passed ? '✅' : '❌';
  document.getElementById('resultTitle').textContent = passed ? 'Herzlichen Glückwunsch!' : 'Nicht bestanden';
  
  const scoreElement = document.getElementById('resultScore');
  scoreElement.textContent = `${result.percentage}%`;
  scoreElement.className = 'result-score ' + (passed ? 'passed' : 'failed');
  
  document.getElementById('correctAnswers').textContent = result.score;
  document.getElementById('totalQuestions').textContent = result.totalQuestions;
  document.getElementById('percentage').textContent = result.percentage;
  
  const messageElement = document.getElementById('resultMessage');
  if (passed) {
    messageElement.className = 'result-message success';
    messageElement.innerHTML = `
      <strong>Glückwunsch!</strong> Sie haben das Quiz erfolgreich bestanden.<br>
      Sie erhalten in Kürze eine Bestätigungs-E-Mail mit Ihrem Ergebnis.
    `;
  } else {
    messageElement.className = 'result-message info';
    messageElement.innerHTML = `
      <strong>Leider nicht bestanden.</strong><br>
      Sie können das Webinar jederzeit wiederholen, um Ihr Wissen zu vertiefen.<br>
      Sie erhalten eine E-Mail mit Ihrem Ergebnis.
    `;
  }
}
