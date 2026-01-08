// === PWA Memo - Aplicación Principal ===
// App de memorización offline-first

(function() {
  'use strict';

  // ============================================
  // UTILIDADES
  // ============================================

  // Distancia de Levenshtein para comparación tolerante
  function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Normalizar texto para comparación
  function normalize(str) {
    return str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // Comparar respuestas (tolerante para texto, exacto para números)
  function compareAnswers(userAnswer, correctAnswer, isNumeric = false) {
    const normUser = normalize(userAnswer);
    const normCorrect = normalize(correctAnswer);

    if (!normUser) return false;
    if (normUser === normCorrect) return true;

    // Para números: comparación exacta después de normalizar
    if (isNumeric) {
      return normUser.replace(/\s/g, '') === normCorrect.replace(/\s/g, '');
    }

    // Para texto: tolerancia a typos con Levenshtein
    const maxDistance = Math.max(1, Math.floor(normCorrect.length * 0.2));
    return levenshtein(normUser, normCorrect) <= maxDistance;
  }

  // Generar permutación aleatoria de array
  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Sample sin reemplazo
  function sampleWithoutReplacement(array, n) {
    const shuffled = shuffle(array);
    return shuffled.slice(0, Math.min(n, array.length));
  }

  // Formatear tiempo mm:ss
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Parsear tiempo mm:ss a segundos
  function parseTime(str) {
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }

  // Fecha local YYYY-MM-DD
  function getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  // Generar número aleatorio de N cifras
  function randomNumber(digits) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ============================================
  // ALMACENAMIENTO (IndexedDB)
  // ============================================

  const DB_NAME = 'memo-db';
  const DB_VERSION = 1;
  let db = null;

  async function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Store para casillero mental
        if (!database.objectStoreNames.contains('casillero')) {
          database.createObjectStore('casillero', { keyPath: 'n' });
        }

        // Store para ejercicios (números, objetos, conceptos)
        if (!database.objectStoreNames.contains('exercises')) {
          const store = database.createObjectStore('exercises', { keyPath: 'id', autoIncrement: true });
          store.createIndex('module_date', ['module', 'date'], { unique: true });
          store.createIndex('module', 'module');
        }

        // Store para configuración
        if (!database.objectStoreNames.contains('config')) {
          database.createObjectStore('config', { keyPath: 'key' });
        }

        // Store para estado del casillero rolling
        if (!database.objectStoreNames.contains('casillero_state')) {
          database.createObjectStore('casillero_state', { keyPath: 'id' });
        }
      };
    });
  }

  // Operaciones genéricas de DB
  async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGetByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGetAllByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // CASILLERO MENTAL
  // ============================================

  async function getCasillero() {
    const items = await dbGetAll('casillero');
    if (items.length === 0) {
      // Inicializar con valores por defecto
      for (const item of CASILLERO_DEFAULT) {
        await dbPut('casillero', item);
      }
      return CASILLERO_DEFAULT;
    }
    return items.sort((a, b) => a.n - b.n);
  }

  async function updateCasilleroItem(n, objeto) {
    await dbPut('casillero', { n, objeto });
  }

  async function getCasilleroState() {
    const state = await dbGet('casillero_state', 'current');
    if (!state) {
      return await generateNewCasilleroState();
    }
    return state;
  }

  async function generateNewCasilleroState(previousPermutation = null) {
    let numbers = Array.from({ length: 100 }, (_, i) => i + 1);
    let permutation;

    // Generar permutación diferente a la anterior
    do {
      permutation = shuffle(numbers);
    } while (previousPermutation && arraysEqual(permutation, previousPermutation));

    const state = {
      id: 'current',
      permutation,
      currentIndex: 0
    };

    await dbPut('casillero_state', state);
    return state;
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  async function saveCasilleroState(state) {
    await dbPut('casillero_state', state);
  }

  // ============================================
  // EJERCICIOS
  // ============================================

  async function getExerciseForToday(module) {
    const date = getTodayDate();
    return await dbGetByIndex('exercises', 'module_date', [module, date]);
  }

  async function getExerciseHistory(module) {
    const exercises = await dbGetAllByIndex('exercises', 'module', module);
    return exercises.sort((a, b) => b.date.localeCompare(a.date));
  }

  async function saveExercise(exercise) {
    await dbPut('exercises', exercise);
    return exercise;
  }

  async function getExerciseById(id) {
    return await dbGet('exercises', id);
  }

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  async function getConfig(key, defaultValue) {
    const config = await dbGet('config', key);
    return config ? config.value : defaultValue;
  }

  async function setConfig(key, value) {
    await dbPut('config', { key, value });
  }

  // ============================================
  // ROUTER
  // ============================================

  const routes = {
    'home': renderHome,
    'numeros': renderNumeros,
    'objetos': renderObjetos,
    'conceptos': renderConceptos,
    'ajustes': renderAjustes
  };

  let currentRoute = 'home';
  let currentState = {}; // Estado temporal de la vista actual

  function navigate(route, state = {}) {
    currentRoute = route;
    currentState = state;
    window.location.hash = route;
    render();
    updateNavigation();
  }

  function handleHashChange() {
    const hash = window.location.hash.slice(1) || 'home';
    if (routes[hash]) {
      currentRoute = hash;
      currentState = {};
      render();
      updateNavigation();
    }
  }

  function updateNavigation() {
    document.querySelectorAll('nav button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === currentRoute);
    });
  }

  function render() {
    const main = document.querySelector('main');
    const renderer = routes[currentRoute];
    if (renderer) {
      renderer(main);
    }
  }

  // ============================================
  // VISTAS - HOME (CASILLERO MENTAL)
  // ============================================

  async function renderHome(container) {
    const casillero = await getCasillero();
    const state = await getCasilleroState();

    let revealed = false;
    const currentNumber = state.permutation[state.currentIndex];
    const currentItem = casillero.find(c => c.n === currentNumber);

    container.innerHTML = `
      <h1>Casillero Mental</h1>
      <div class="flashcard-container">
        <div class="flashcard" id="flashcard">
          <div class="number">${currentNumber}</div>
          <div class="object">${currentItem ? currentItem.objeto : '???'}</div>
        </div>
        <div class="flashcard-nav">
          <button class="btn btn-secondary" id="prevBtn" ${state.currentIndex === 0 ? 'disabled' : ''}>
            Anterior
          </button>
          <button class="btn btn-primary" id="nextBtn">
            Siguiente
          </button>
        </div>
        <div class="text-muted" style="font-size: 0.85rem;">
          ${state.currentIndex + 1} / 100
        </div>
      </div>
    `;

    const flashcard = document.getElementById('flashcard');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    flashcard.addEventListener('click', () => {
      flashcard.classList.toggle('revealed');
      revealed = !revealed;
    });

    prevBtn.addEventListener('click', async () => {
      if (state.currentIndex > 0) {
        state.currentIndex--;
        await saveCasilleroState(state);
        renderHome(container);
      }
    });

    nextBtn.addEventListener('click', async () => {
      if (state.currentIndex < 99) {
        state.currentIndex++;
        await saveCasilleroState(state);
        renderHome(container);
      } else {
        // Completado: generar nueva permutación
        await generateNewCasilleroState(state.permutation);
        renderHome(container);
      }
    });
  }

  // ============================================
  // VISTAS - MÓDULOS DE EJERCICIOS
  // ============================================

  // Vista landing genérica para módulos
  async function renderModuleLanding(container, module, title) {
    const todayExercise = await getExerciseForToday(module);
    const hasTodayExercise = !!todayExercise;

    container.innerHTML = `
      <h1>${title}</h1>
      <div class="module-landing">
        <button class="btn btn-primary" id="startBtn" ${hasTodayExercise ? 'disabled' : ''}>
          ${hasTodayExercise ? 'Ejercicio de hoy completado' : 'Comenzar ejercicio del día'}
        </button>
        <button class="btn btn-secondary" id="historyBtn">
          Revisar ejercicios pasados
        </button>
      </div>
    `;

    document.getElementById('startBtn').addEventListener('click', () => {
      currentState = { phase: 'setup', module };
      render();
    });

    document.getElementById('historyBtn').addEventListener('click', () => {
      currentState = { phase: 'history', module };
      render();
    });
  }

  // Vista de histórico
  async function renderHistory(container, module, title) {
    const exercises = await getExerciseHistory(module);

    if (exercises.length === 0) {
      container.innerHTML = `
        <h1>${title}</h1>
        <div class="empty-state">
          <p>No hay ejercicios guardados.</p>
          <button class="btn btn-secondary mt-1" id="backBtn">Volver</button>
        </div>
      `;
      document.getElementById('backBtn').addEventListener('click', () => {
        currentState = {};
        render();
      });
      return;
    }

    container.innerHTML = `
      <h1>Historial - ${title}</h1>
      <div class="history-list">
        ${exercises.map(ex => `
          <div class="history-item" data-id="${ex.id}">
            <div class="date">${ex.date}</div>
            <div class="stats">
              <span>Total: ${formatTime(ex.totalTime || 0)}</span>
              <span>Media: ${formatTime(Math.round((ex.totalTime || 0) / ex.items.length))}</span>
              <span class="result">${ex.lastResult ? `${ex.lastResult.correct}/${ex.lastResult.total}` : '—'}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary btn-full mt-1" id="backBtn">Volver</button>
    `;

    document.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', async () => {
        const exercise = await getExerciseById(parseInt(item.dataset.id));
        if (exercise) {
          currentState = { phase: 'timer', module, exercise };
          render();
        }
      });
    });

    document.getElementById('backBtn').addEventListener('click', () => {
      currentState = {};
      render();
    });
  }

  // ============================================
  // MÓDULO NÚMEROS
  // ============================================

  async function renderNumeros(container) {
    if (currentState.phase === 'setup') {
      renderNumerosSetup(container);
    } else if (currentState.phase === 'memo') {
      renderMemo(container, 'numeros', 'Números');
    } else if (currentState.phase === 'timer') {
      renderTimer(container, 'numeros', 'Números');
    } else if (currentState.phase === 'test') {
      renderTest(container, 'numeros', 'Números');
    } else if (currentState.phase === 'results') {
      renderResults(container, 'numeros', 'Números');
    } else if (currentState.phase === 'history') {
      renderHistory(container, 'numeros', 'Números');
    } else {
      renderModuleLanding(container, 'numeros', 'Números');
    }
  }

  function renderNumerosSetup(container) {
    container.innerHTML = `
      <h1>Configurar Ejercicio</h1>
      <form class="setup-form" id="setupForm">
        <div class="form-group">
          <label>¿Cuántos números?</label>
          <input type="number" id="count" min="1" max="100" value="10" required>
        </div>
        <div class="form-group">
          <label>¿Cifras por número?</label>
          <input type="number" id="digits" min="1" max="10" value="4" required>
        </div>
        <div class="form-group toggle-group">
          <label>¿Asociar objeto?</label>
          <div class="toggle" id="withObjects"></div>
        </div>
        <div class="test-actions">
          <button type="button" class="btn btn-secondary" id="cancelBtn">Cancelar</button>
          <button type="submit" class="btn btn-primary">Comenzar</button>
        </div>
      </form>
    `;

    const toggle = document.getElementById('withObjects');
    toggle.addEventListener('click', () => toggle.classList.toggle('active'));

    document.getElementById('cancelBtn').addEventListener('click', () => {
      currentState = {};
      render();
    });

    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const count = parseInt(document.getElementById('count').value);
      const digits = parseInt(document.getElementById('digits').value);
      const withObjects = toggle.classList.contains('active');

      // Generar números únicos
      const usedNumbers = new Set();
      const numbers = [];
      while (numbers.length < count) {
        const num = randomNumber(digits);
        if (!usedNumbers.has(num)) {
          usedNumbers.add(num);
          numbers.push(num);
        }
      }

      // Generar objetos si es necesario
      let objects = null;
      if (withObjects) {
        objects = sampleWithoutReplacement(OBJETOS, count);
      }

      const items = numbers.map((num, i) => ({
        number: num,
        object: objects ? objects[i] : null
      }));

      const exercise = {
        module: 'numeros',
        date: getTodayDate(),
        items,
        withObjects,
        digits,
        totalTime: 0,
        lastResult: null
      };

      currentState = { phase: 'memo', module: 'numeros', exercise, startTime: null, currentIndex: 0 };
      render();
    });
  }

  // ============================================
  // MÓDULO OBJETOS
  // ============================================

  async function renderObjetos(container) {
    if (currentState.phase === 'setup') {
      renderObjetosSetup(container);
    } else if (currentState.phase === 'memo') {
      renderMemo(container, 'objetos', 'Objetos');
    } else if (currentState.phase === 'timer') {
      renderTimer(container, 'objetos', 'Objetos');
    } else if (currentState.phase === 'test') {
      renderTest(container, 'objetos', 'Objetos');
    } else if (currentState.phase === 'results') {
      renderResults(container, 'objetos', 'Objetos');
    } else if (currentState.phase === 'history') {
      renderHistory(container, 'objetos', 'Objetos');
    } else {
      renderModuleLanding(container, 'objetos', 'Objetos');
    }
  }

  function renderObjetosSetup(container) {
    container.innerHTML = `
      <h1>Configurar Ejercicio</h1>
      <form class="setup-form" id="setupForm">
        <div class="form-group">
          <label>¿Cuántos objetos?</label>
          <input type="number" id="count" min="1" max="100" value="10" required>
        </div>
        <div class="test-actions">
          <button type="button" class="btn btn-secondary" id="cancelBtn">Cancelar</button>
          <button type="submit" class="btn btn-primary">Comenzar</button>
        </div>
      </form>
    `;

    document.getElementById('cancelBtn').addEventListener('click', () => {
      currentState = {};
      render();
    });

    document.getElementById('setupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const count = parseInt(document.getElementById('count').value);
      const objects = sampleWithoutReplacement(OBJETOS, count);

      const items = objects.map(obj => ({ object: obj }));

      const exercise = {
        module: 'objetos',
        date: getTodayDate(),
        items,
        totalTime: 0,
        lastResult: null
      };

      currentState = { phase: 'memo', module: 'objetos', exercise, startTime: null, currentIndex: 0 };
      render();
    });
  }

  // ============================================
  // MÓDULO CONCEPTOS
  // ============================================

  async function renderConceptos(container) {
    if (currentState.phase === 'setup') {
      renderConceptosSetup(container);
    } else if (currentState.phase === 'memo') {
      renderMemo(container, 'conceptos', 'Conceptos');
    } else if (currentState.phase === 'timer') {
      renderTimer(container, 'conceptos', 'Conceptos');
    } else if (currentState.phase === 'test') {
      renderTest(container, 'conceptos', 'Conceptos');
    } else if (currentState.phase === 'results') {
      renderResults(container, 'conceptos', 'Conceptos');
    } else if (currentState.phase === 'history') {
      renderHistory(container, 'conceptos', 'Conceptos');
    } else {
      renderModuleLanding(container, 'conceptos', 'Conceptos');
    }
  }

  function renderConceptosSetup(container) {
    container.innerHTML = `
      <h1>Configurar Ejercicio</h1>
      <form class="setup-form" id="setupForm">
        <div class="form-group">
          <label>¿Cuántos conceptos?</label>
          <input type="number" id="count" min="1" max="100" value="10" required>
        </div>
        <div class="test-actions">
          <button type="button" class="btn btn-secondary" id="cancelBtn">Cancelar</button>
          <button type="submit" class="btn btn-primary">Comenzar</button>
        </div>
      </form>
    `;

    document.getElementById('cancelBtn').addEventListener('click', () => {
      currentState = {};
      render();
    });

    document.getElementById('setupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const count = parseInt(document.getElementById('count').value);
      const concepts = sampleWithoutReplacement(CONCEPTOS, count);

      const items = concepts.map(concept => ({ concept }));

      const exercise = {
        module: 'conceptos',
        date: getTodayDate(),
        items,
        totalTime: 0,
        lastResult: null
      };

      currentState = { phase: 'memo', module: 'conceptos', exercise, startTime: null, currentIndex: 0 };
      render();
    });
  }

  // ============================================
  // FASE DE MEMORIZACIÓN (compartida)
  // ============================================

  function renderMemo(container, module, title) {
    const { exercise, currentIndex } = currentState;
    const item = exercise.items[currentIndex];
    const isLast = currentIndex === exercise.items.length - 1;

    // Iniciar tiempo si es el primer item
    if (currentState.startTime === null) {
      currentState.startTime = Date.now();
    }

    let content = '';
    let secondary = '';

    if (module === 'numeros') {
      content = item.number;
      if (item.object) {
        secondary = item.object;
      }
    } else if (module === 'objetos') {
      content = item.object;
    } else if (module === 'conceptos') {
      content = item.concept;
    }

    container.innerHTML = `
      <h1>Memorizar - ${title}</h1>
      <div class="memo-container">
        <div class="memo-card">
          <div class="position">${currentIndex + 1} de ${exercise.items.length}</div>
          <div class="content">${content}</div>
          ${secondary ? `<div class="secondary">${secondary}</div>` : ''}
        </div>
        ${isLast ? `
          <div class="test-actions" style="width: 100%; max-width: 320px;">
            <button class="btn btn-secondary" id="saveBtn">Guardar</button>
            <button class="btn btn-primary" id="testBtn">Test hoy</button>
          </div>
        ` : `
          <button class="btn btn-primary" id="nextBtn" style="width: 100%; max-width: 320px;">
            Siguiente
          </button>
        `}
        <div class="memo-timer">
          Tiempo: <span id="elapsed">0:00</span>
        </div>
      </div>
    `;

    // Actualizar tiempo cada segundo
    const elapsedEl = document.getElementById('elapsed');
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
      elapsedEl.textContent = formatTime(elapsed);
    }, 1000);

    if (isLast) {
      document.getElementById('saveBtn').addEventListener('click', async () => {
        clearInterval(timerInterval);
        exercise.totalTime = Math.floor((Date.now() - currentState.startTime) / 1000);
        await saveExercise(exercise);
        currentState = {};
        render();
      });

      document.getElementById('testBtn').addEventListener('click', async () => {
        clearInterval(timerInterval);
        exercise.totalTime = Math.floor((Date.now() - currentState.startTime) / 1000);
        await saveExercise(exercise);
        currentState = { phase: 'timer', module, exercise };
        render();
      });
    } else {
      document.getElementById('nextBtn').addEventListener('click', () => {
        currentState.currentIndex++;
        render();
      });
    }
  }

  // ============================================
  // TEMPORIZADOR (compartido)
  // ============================================

  async function renderTimer(container, module, title) {
    const timerDuration = await getConfig('timerDuration', 180); // 3 minutos por defecto
    let remaining = timerDuration;
    let timerInterval = null;

    function updateDisplay() {
      const display = document.getElementById('timerDisplay');
      if (display) {
        display.textContent = formatTime(remaining);
      }
    }

    container.innerHTML = `
      <h1>Preparación - ${title}</h1>
      <div class="timer-container">
        <div class="timer-label">Repasa mentalmente antes del test</div>
        <div class="timer-display" id="timerDisplay">${formatTime(remaining)}</div>
        <button class="btn btn-primary" id="startTestBtn" style="display: none;">
          Comenzar test
        </button>
        <button class="btn btn-secondary" id="skipBtn">
          Saltar espera
        </button>
      </div>
    `;

    const startTestBtn = document.getElementById('startTestBtn');
    const skipBtn = document.getElementById('skipBtn');

    timerInterval = setInterval(() => {
      remaining--;
      updateDisplay();
      if (remaining <= 0) {
        clearInterval(timerInterval);
        skipBtn.style.display = 'none';
        startTestBtn.style.display = 'block';
      }
    }, 1000);

    skipBtn.addEventListener('click', () => {
      clearInterval(timerInterval);
      skipBtn.style.display = 'none';
      startTestBtn.style.display = 'block';
    });

    startTestBtn.addEventListener('click', () => {
      currentState = { phase: 'test', module, exercise: currentState.exercise, answers: [] };
      render();
    });
  }

  // ============================================
  // TEST (compartido)
  // ============================================

  function renderTest(container, module, title) {
    const { exercise } = currentState;

    let testPrompts = [];
    if (module === 'numeros') {
      if (exercise.withObjects) {
        // Mostrar objetos, pedir números
        testPrompts = exercise.items.map((item, i) => ({
          prompt: item.object,
          expected: item.number.toString(),
          isNumeric: true
        }));
      } else {
        // Sin objetos: mostrar posición, pedir número
        testPrompts = exercise.items.map((item, i) => ({
          prompt: `Posición ${i + 1}`,
          expected: item.number.toString(),
          isNumeric: true
        }));
      }
    } else if (module === 'objetos') {
      // Mostrar posición, pedir objeto
      testPrompts = exercise.items.map((item, i) => ({
        prompt: `Posición ${i + 1}`,
        expected: item.object,
        isNumeric: false
      }));
    } else if (module === 'conceptos') {
      // Mostrar posición, pedir concepto
      testPrompts = exercise.items.map((item, i) => ({
        prompt: `Posición ${i + 1}`,
        expected: item.concept,
        isNumeric: false
      }));
    }

    container.innerHTML = `
      <h1>Test - ${title}</h1>
      <div class="test-container">
        ${testPrompts.map((t, i) => `
          <div class="test-item">
            <div class="position">${i + 1}</div>
            <div class="prompt">${t.prompt}</div>
            <input type="${t.isNumeric ? 'tel' : 'text'}"
                   data-index="${i}"
                   placeholder="Tu respuesta"
                   autocomplete="off"
                   autocapitalize="off">
          </div>
        `).join('')}
        <button class="btn btn-primary btn-full" id="submitBtn">
          Corregir
        </button>
      </div>
    `;

    document.getElementById('submitBtn').addEventListener('click', async () => {
      const answers = [];
      document.querySelectorAll('.test-item input').forEach((input, i) => {
        answers.push({
          userAnswer: input.value,
          expected: testPrompts[i].expected,
          isNumeric: testPrompts[i].isNumeric,
          correct: compareAnswers(input.value, testPrompts[i].expected, testPrompts[i].isNumeric)
        });
      });

      const correctCount = answers.filter(a => a.correct).length;
      exercise.lastResult = { correct: correctCount, total: answers.length };
      await saveExercise(exercise);

      currentState = { phase: 'results', module, exercise, answers };
      render();
    });
  }

  // ============================================
  // RESULTADOS (compartido)
  // ============================================

  function renderResults(container, module, title) {
    const { exercise, answers } = currentState;
    const correctCount = answers.filter(a => a.correct).length;

    container.innerHTML = `
      <h1>Resultados - ${title}</h1>
      <div class="results-container">
        <div class="results-score">
          <div class="score">${correctCount}/${answers.length}</div>
          <div class="label">aciertos</div>
        </div>
        <div class="results-table">
          ${answers.map((a, i) => `
            <div class="result-row">
              <span class="pos">${i + 1}</span>
              <span class="${a.correct ? 'correct' : 'incorrect'} user-answer">
                ${a.userAnswer || '(vacío)'}
              </span>
              <span class="expected">${a.correct ? '✓' : a.expected}</span>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary btn-full" id="finishBtn">
          Terminar
        </button>
      </div>
    `;

    document.getElementById('finishBtn').addEventListener('click', () => {
      currentState = {};
      render();
    });
  }

  // ============================================
  // AJUSTES
  // ============================================

  async function renderAjustes(container) {
    const casillero = await getCasillero();
    const timerDuration = await getConfig('timerDuration', 180);

    container.innerHTML = `
      <h1>Ajustes</h1>

      <div class="settings-section">
        <h2>Temporizador</h2>
        <div class="timer-setting">
          <span>Duración:</span>
          <input type="text" id="timerInput" value="${formatTime(timerDuration)}" placeholder="mm:ss">
          <button class="btn btn-secondary" id="saveTimerBtn">Guardar</button>
        </div>
        <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.5rem;">
          Formato mm:ss (mín 0:30, máx 10:00)
        </p>
      </div>

      <div class="settings-section">
        <h2>Casillero Mental (1-100)</h2>
        <div class="casillero-list">
          ${casillero.map(item => `
            <div class="casillero-item" data-n="${item.n}">
              <span class="num">${item.n}</span>
              <span class="obj">${item.objeto}</span>
              <button class="edit-btn" data-n="${item.n}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Guardar temporizador
    document.getElementById('saveTimerBtn').addEventListener('click', async () => {
      const input = document.getElementById('timerInput').value;
      const seconds = parseTime(input);
      if (seconds === null || seconds < 30 || seconds > 600) {
        alert('Formato inválido o fuera de rango (0:30 - 10:00)');
        return;
      }
      await setConfig('timerDuration', seconds);
      alert('Temporizador guardado');
    });

    // Editar casillero
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.n);
        const item = casillero.find(c => c.n === n);
        showEditModal(n, item.objeto, async (newObjeto) => {
          await updateCasilleroItem(n, newObjeto);
          renderAjustes(container);
        });
      });
    });
  }

  function showEditModal(n, currentValue, onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Editar #${n}</h3>
        <input type="text" id="modalInput" value="${currentValue}" placeholder="Objeto asociado">
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modalCancel">Cancelar</button>
          <button class="btn btn-primary" id="modalSave">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('modalInput').focus();

    document.getElementById('modalCancel').addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('modalSave').addEventListener('click', () => {
      const newValue = document.getElementById('modalInput').value.trim();
      if (newValue) {
        onSave(newValue);
      }
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  async function init() {
    try {
      await initDB();

      // Configurar navegación
      document.querySelectorAll('nav button').forEach(btn => {
        btn.addEventListener('click', () => {
          navigate(btn.dataset.route);
        });
      });

      // Manejar cambios de hash
      window.addEventListener('hashchange', handleHashChange);

      // Renderizar ruta inicial
      handleHashChange();

      // Registrar service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
      }
    } catch (error) {
      console.error('Error inicializando app:', error);
    }
  }

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
