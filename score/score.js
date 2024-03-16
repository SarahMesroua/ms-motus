const express = require('express');
const redis = require('redis');
const app = express();

const port = process.env.PORT || 3500;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const client = redis.createClient({
    url: REDIS_URL
});

const connectToRedis = async () => {
    try {
        await client.connect();
        console.log('Connected to Redis');
    } catch (error) {
        console.error('Failed to connect to Redis:', error.message);
    }
};

connectToRedis();

/*** API ***/

app.get('/', (req, res) => {
    res.send('Hello world');
});


// mettre à jour le score de l'utilisateur qui a trouvé le mot
app.get('/set/:key/:value', (req, res) => {

    let { key, value } = req.params;
    let currentScore = 0;

    client.get(key)
        .then((result) => {
            if (result !== null) {

                currentScore = parseInt(result);

                // Calculer le nouveau score
                let newScore = currentScore + parseInt(value);

                // Définir la nouvelle valeur dans Redis
                return client.set(key, newScore);

            } else {
                res.status(404).send(`L'utilisateur ${key} n'existe pas.`);
            }
        })
        .then((result) => {
            res.status(200).send('Nouveau score défini avec succès');
        })
        .catch((err) => {
            res.status(500).send('Erreur lors de la récupération ou de la définition de la valeur');
        });
});

// créer un utilisateur avec un score de 0 lors de l'inscription
app.get('/setUser/:key/:value', (req, res) => {

    const { key, value } = req.params;
    
    client.set(key, value)
        .then(() => {
            res.status(200).send(`Utilisateur ${key} défini avec succès avec la valeur ${value}`);
        })
        .catch((err) => {
            return res.status(500).send(`Erreur lors de la définition de l\'utilisateur`);
        });
});

// récupération du score de l'utilisateur
app.get('/get/:key', (req, res) => {

    const { key } = req.params; // Récupérer la clé de l'URL

    client.get(key)
        .then((value) => {
            if (value !== null) {
                res.status(200).send(`${key} votre score est de : ${value}`);
            } else {
                res.status(404).send(`L'uilisateur ${key} n'existe pas.`);
            }
        })
        .catch((err) => {
            res.status(500).send('Erreur lors de la récupération de la valeur');
        });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
