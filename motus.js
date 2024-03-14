const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const os = require('os');

/*** Chemin du fichier texte contenant les mots ***/
// Chemin du dossier contenant le fichier .txt
const dossier = 'data';

// Nom du fichier .txt à importer
const nomFichier = 'liste_francais_utf8.txt';

// Chemin complet du fichier
const cheminFichier = path.join(dossier, nomFichier);


/*** Fonction qui génère un nombre aléatoire selon la date ***/
function generateDailyRandomNumber() {
  	const date = new Date();
  	const seed = date.getFullYear() + (date.getMonth() + 1) + date.getDate();
  	const random = Math.abs(Math.sin(seed)) * 10000;
  	return Math.floor(random);
}

/*** Rendre les fichier du dossier "www" accessible***/
app.use(express.static('www'));

/*** API ***/
app.get('/', (req, res) => {
  	res.send('Hello World!')
})


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

app.get('/word', (req, res) => {
	fs.readFile(cheminFichier, 'utf8', (err, data) => {
    	if (err) {
      		console.error('Erreur lors de la lecture du fichier :', err);
      		res.status(500).send('Erreur lors de la lecture du fichier');
      		return;
    	}

   	const words = data.split(/\s+/);

    	res.send(words);
  	});
})

app.get('/port', (req, res) => {
	const hostname = os.hostname();
	const listeningPort = port;
	res.send(`MOTUS APP working on ${hostname} port ${listeningPort}`);
  });
  
app.listen(port, () => {
  	console.log(`Example app listening on port ${port}`)
})
