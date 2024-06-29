// SÉLECTIONNE L'ÉLÉMENT VIDÉO HTML OÙ LE FLUX VIDÉO SERA AFFICHÉ
const video = document.getElementById('video');

// SÉLECTIONNE L'ÉLÉMENT CANVAS HTML OÙ LES PRÉDICTIONS SERONT DESSINÉES
const canvas = document.getElementById('canvas');

// SÉLECTIONNE LE BOUTON HTML QUI PERMETTRA DE CAPTURER DES IMAGES
const captureButton = document.getElementById('capture');

// SÉLECTIONNE LE CONTENEUR HTML OÙ LES IMAGES CAPTURÉES SERONT AFFICHÉES
const captureContainer = document.getElementById('capture-container');

// SÉLECTIONNE LE BOUTON HTML POUR BASCULER ENTRE LE MODE JOUR ET LE MODE NUIT
const themeToggleButton = document.getElementById('theme-toggle');

// VARIABLE POUR SUIVRE L'ÉTAT ACTUEL DU MODE NUIT (INITIALEMENT, MODE NUIT DÉSACTIVÉ)
let isNightMode = false;

// ACCÈS À LA CAMÉRA
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error("Erreur d'accès à la caméra : " + err);
    });

// CHARGEMENT DU MODÈLE COCO-SSD 
let model;
cocoSsd.load().then(loadedModel => {
    model = loadedModel;
    detectFrame();
});

// DÉTECTION D'OBJET À LA CAMÉRA
function detectFrame() {
    model.detect(video).then(predictions => {
        renderPredictions(predictions);
        requestAnimationFrame(detectFrame);
    }).catch(err => {
        console.error("Erreur de détection d'objets : " + err);
        requestAnimationFrame(detectFrame); // Réessayer la détection
    });
}

// PRÉDICTION SUR LE CANVAS
function renderPredictions(predictions) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);

    predictions.forEach(prediction => {
        ctx.beginPath();
        ctx.rect(prediction.bbox[0], prediction.bbox[1], prediction.bbox[2], prediction.bbox[3]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FF0000';
        ctx.fillStyle = '#FF0000';
        ctx.stroke();
        ctx.fillText(
            `${prediction.class} (${(prediction.score * 100).toFixed(2)}%)`,
            prediction.bbox[0],
            prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
        );
    });
}

// CAPTURE DE L'IMAGE DEPUIS LE CANVAS
captureButton.addEventListener('click', () => {
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    captureContainer.appendChild(img);
    console.log("Image capturée ajoutée au conteneur.");
    savePrediction(img.src);
});

// SWITCH ENTRE LE MODE SOMBRE ET LE MODE JOUR
themeToggleButton.addEventListener('click', () => {
    document.body.classList.toggle('night-mode');
    isNightMode = !isNightMode;
    themeToggleButton.textContent = isNightMode ? 'Mode Jour' : 'Mode Nuit';
});

// ENREGISTRE LES PRÉDICTIONS DANS INDEXEDDB
function savePrediction(imageData) {
    const dbRequest = indexedDB.open('predictions', 1);

    dbRequest.onupgradeneeded = function(event) {
        const db = event.target.result;
        db.createObjectStore('images', { autoIncrement: true });
    };

    dbRequest.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction('images', 'readwrite');
        const store = transaction.objectStore('images');
        store.add({ image: imageData });
        console.log("Prédiction sauvegardée dans IndexedDB.");
    };

    dbRequest.onerror = function(event) {
        console.error("Erreur de sauvegarde de la prédiction : " + event.target.errorCode);
    };
}
