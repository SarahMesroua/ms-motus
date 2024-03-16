const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;


/***************************************************** Vérification des droit d'accès au motus ********************************************************/

app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'motus-secret-key'
}));


function isLoggedIn(req, res, next) {

    if (!req.session.user && req.path !== '/callback') {
        // Redirection vers le serveur d'authentification
        const authentOpenId = process.env.AUTHENT_OPENID || 'http://localhost:4000';
        const redirectUri = encodeURIComponent('http://localhost:3000/callback');
        const redirectUrl = `${authentOpenId}/authorize?clientid=mymotusapp&scope=openid&redirect_uri=${redirectUri}`;
        return res.redirect(redirectUrl);
    }
    next();
}

// Vérification du droit d'accès au route
app.use(isLoggedIn);

// Route callback qui permet la déclaration d'un utilisateur
app.get('/callback', (req, res) => {

    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Missing authorization code');
    }

    // on vérifie que le code est dans la base de données d'authentification
    // le serveur auth retourne un jwt à décoder pour définir l'utilisateur de la session 
    axios.get(`http://auth:4000/token?code=${code}`)
        .then(response => {
            const data = response.data;
            const decoded = jwt.verify(data.id_token, 'motus-secret-key');
            const username = decoded.result;
            req.session.user = username;

            return res.redirect('/');
        })
        .catch(error => {
            console.error('Erreur lors de la requête Axios :', error); // Ajoutez ce log pour afficher l'erreur
            res.status(500).send('Error exchanging code for token');
        });
});

// déconnexion
app.post('/logout', async (req, res) => {
    try {
        // Supprimer le ticket dans la bdd Redis
        await axios.get(`http://auth:4000/delete/${req.session.user}`);

        // Supprimer le champ "username" de la session
        delete req.session.user;

        res.redirect('/');
    } catch (error) {
        res.status(500).send('Erreur lors de la suppression de la session');
    }
});

/*************************************************** Application motus **********************************************************/

/*** Chemin du fichier texte contenant les mots ***/

// Chemin du dossier contenant le fichier .txt
const dossierData = path.join(__dirname, 'data');

// Nom du fichier .txt à importer
const nomFichier = 'liste_francais_utf8.txt';

// Chemin complet du fichier
const cheminFichier = path.join(dossierData, nomFichier);


//Fonction qui génère un nombre aléatoire selon la date
function generateDailyRandomNumber() {
    const date = new Date();
    const seed = date.getFullYear() + (date.getMonth() + 1) + date.getDate();
    const random = Math.abs(Math.sin(seed)) * 10000;
    return Math.floor(random);
}

//Rendre les fichier du dossier "www" accessible
const dossierStatic = path.join(__dirname, 'www');
app.use(express.static(dossierStatic));

/****************************************************** API *********************************************************************/
app.get('/', (req, res) => {
    res.sendFile(path.join(dossierStatic, 'motus.html'));
})

// récupérer le mot du jour
app.get('/wordOfTheDay', (req, res) => {
    // Lire le contenu du fichier
    fs.readFile(cheminFichier, 'utf8', (err, data) => {

        if (err) {
            console.error('Erreur lors de la lecture du fichier :', err);
            res.status(500).send('Erreur lors de la lecture du fichier');
            return;
        }

        // Diviser le contenu du fichier en mots
        const words = data.split(/\s+/);

        // Generate a daily random number
        const dailyRandomNumber = generateDailyRandomNumber();
        const selectedWordIndex = dailyRandomNumber % words.length;
        const wordOfTheDay = words[selectedWordIndex];

        res.send(wordOfTheDay);
    });
})

// récupérer le score de l'utilisateur de la session courante
app.get('/getScore', async (req, res) => {

    const username = req.session.user;

    try {

        // Faire une requête au serveur de score
        const response = await axios.get(`http://score:3500/get/${username}`);
        res.send(response.data);

    } catch (error) {
        res.status(500).send('Erreur lors de la récupération du score');
    }
});

// metre à jour le score de l'utilisateur de la session courante
app.get('/setScore/:value', async (req, res) => {

    const { value } = req.params;
    const username = req.session.user;

    try {

        // Faire une requête au serveur de score
        const response = await axios.get(`http://score:3500/set/${username}/${value}`);
        res.send(response.data);

    } catch (error) {
        res.status(500).send('Erreur lors de la récupération du score');
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

/***********************************************LOKI****************************************************/
/*const loki_uri = process.env.LOKI || "http://127.0.0.1:3100";


const { createLogger, transports } = require("winston");
const LokiTransport = require("winston-loki");
const logger = createLogger({
    transports: [
      new LokiTransport({
        host: loki_uri
      })
    ]
  });


// Example usage in your application
// Assuming this code is part of your Express.js middleware or route handler
app.get("/loki", (req, res) => {
    const username = req.user ? req.user.username : "Anonymous";
    
    // Logging request URL and user information
    logger.info({ message: 'URL ' + req.url , labels: { 'url': req.url, 'user': username } });
  
    // Your route handling logic
    res.send("Hello World");
});*/

/*******************************************************************************************************/