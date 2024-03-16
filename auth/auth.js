const express = require('express');
const redis = require('redis');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');


const app = express();
const port = process.env.PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

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

//Rendre les fichier du dossier "www" accessible
const dossierStatic = path.resolve(__dirname, 'www');
app.use(express.static(dossierStatic));

app.get('/', (req, res) => {
    res.send('Hello World!')
})

/***************************************************Authentification***************************************************/
app.use(bodyParser.urlencoded({ extended: true }));



// Verification des paramètres et page de login
app.get('/authorize', (req, res) => {
    const { clientid, scope, redirect_uri } = req.query;
    if (!clientid || clientid !== 'mymotusapp' || !scope || !redirect_uri) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="jquery-3.7.1.min.js"></script>
            <title>Projet - microservice</title>
        </head>
        <body style="background-color: #2b2b2b;color:white; text-align: center;">
            <h1>Login</h1>
            <form action="/login" method="post">
                <input type="hidden" name="redirect_uri" value="${redirect_uri}">
                <label for="username">Username:</label><br>
                <input type="text" id="username" name="username"><br>
                <label for="password">Password:</label><br>
                <input type="password" id="password" name="password"><br><br>
                <button type="submit">Login</button>
            </form>
            <p>Pas de compte ? <a href="/signUpPage">S'inscrire</a></p>
        </body>
        </html>
    `;

    res.send(htmlContent);
});

// Vérification dans la bdd auth que la combinaison username/password existe
app.post('/login', async (req, res) => {
    const { username, password, redirect_uri } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await client.get(username);
        if (result) {
            if (result === password) {
                // Génération d'un code
                const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                const setUrl = `http://localhost:4000/set/${code}/${username}`;
                await axios.get(setUrl);
                res.redirect(`${redirect_uri}?code=${code}`);
            } else {
                res.status(401).send('Mot de passe incorrect');
            }
        } else {
            res.status(401).send('Nom d\'utilisateur incorrect');
        }
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération du nom d\'utilisateur');
    }

});

// génération d'un jwt
app.get('/token', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: 'Missing code' });
    }
    try {
        const result = await client.get(code);
        if (result) {
            // Générer le jeton d'identité (id_token) avec les informations nécessaires
            const id_token = jwt.sign({ result }, 'motus-secret-key');

            // Envoyer le jeton d'identité dans la réponse
            res.json({ id_token });
        } else {
            res.status(401).send('ticket incorrect');
        }
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération du ticket');
    }
});

// page d'inscription
app.get('/signUpPage', (req, res) => {
    res.sendFile(path.join(dossierStatic, 'signup.html'));
});

// traitement de l'inscription
app.post('/signup', async (req, res) => {

    const { username, password, confirm_password } = req.body;
    
    // Vérifier si les mots de passe correspondent
    if (password !== confirm_password) {
        return res.status(400).send('Les mots de passe ne correspondent pas');
    }

    try {
        // Enregistrer l'utilisateur dans le service d'authentification
        await axios.get(`http://localhost:4000/set/${username}/${password}`);
        
        // Enregistrer l'utilisateur dans le service de score
        await axios.get(`http://score:3500/setUser/${username}/0`);

        // Rediriger l'utilisateur vers la page d'accueil après l'enregistrement réussi
        res.redirect(`http://localhost:3000`);
    } catch (error) {
        res.status(500).send('Erreur lors de l\'enregistrement de l\'utilisateur');
    }
});


/*************************************************Set/get/delete dans la bdd redis auth*****************************************************/

// Ajout d'un nouvelle utilisateur dans la bdd
app.get('/set/:key/:value', (req, res) => {
    const { key, value } = req.params;
    client.set(key, value)
        .then(() => {
            res.status(200).send('Clé définie avec succès dans la base de données Redis!');
        })
        .catch((err) => {
            res.status(500).send('Erreur lors de la définition de la clé dans Redis');
        });
});


// récupérer la valeur d'une clé
app.get('/get/:key', (req, res) => {
    const { key } = req.params; 

    
    client.get(key)
        .then((result) => {
            
            if (result !== null) {
                res.status(200).send(result);
            } else {
                res.status(404).send('La clé spécifiée n\'existe pas');
            }
        })
        .catch((err) => {
            res.status(500).send('Erreur lors de la récupération de la valeur de la clé');
        });
});

// supprimer le ticket d'un user
/*
app.get('/delete/:username', (req, res) => {

    const { username } = req.params;
    
    // récupération de toutes les clés de la bdd
    client.keys('*')
        .then((keys) => {
            // Utiliser Promise.all pour attendre toutes les suppressions
            // Parcours de la valeur de chaque clé
            Promise.all(keys.map(key => client.get(key)
                .then((value) => {
                    // Si on trouve une valeur qui est le nom de l'utilisateur "username", on supprimer le ticket
                    if (value == username) {
                        return client.del(key)
                            .then(() => {
                                return key;
                            })
                            .catch((err) => {
                                throw err;
                            });
                    } else {
                        return null;
                    }
                })
                .catch((err) => {
                    throw err;
                })
            ))
            .then((deletedKeys) => {
                // Filtrer les clés supprimées pour éviter les valeurs nulles
                deletedKeys = deletedKeys.filter(key => key !== null);
                if (deletedKeys.length > 0) {
                    // Si des clés ont été supprimées, répondre avec succès
                    res.status(200).send(`Clés supprimées avec succès: ${deletedKeys.join(', ')}`);
                } else {
                    // Si aucune clé n'a été supprimée, répondre avec un message approprié
                    res.status(404).send('Aucune clé correspondante trouvée');
                }
            })
            .catch((err) => {
                res.status(500).send('Erreur lors de la suppression des clés');
            });
        })
        .catch((err) => {
            res.status(500).json({ error: 'Erreur lors de la recherche des clés' });
        });
});*/

app.get('/delete/:username', async (req, res) => {
    const { username } = req.params;

    try {
        // Récupérer toutes les clés de la base de données
        const keys = await client.keys('*');

        const deletedKeys = [];

        // Parcourir chaque clé pour vérifier si elle correspond à l'utilisateur et la supprimer le cas échéant
        for (const key of keys) {
            const value = await client.get(key);
            if (value === username) {
                await client.del(key);
                deletedKeys.push(key);
            }
        }

        if (deletedKeys.length > 0) {
            // Si des clés ont été supprimées, répondre avec succès
            res.status(200).send(`Clés supprimées avec succès: ${deletedKeys.join(', ')}`);
        } else {
            // Si aucune clé n'a été supprimée, répondre avec un message approprié
            res.status(404).send('Aucune clé correspondante trouvée');
        }
    } catch (err) {
        // En cas d'erreur, envoyer une réponse d'erreur
        res.status(500).send('Erreur lors de la suppression des clés');
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})