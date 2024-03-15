# Motus Project :computer:
Repository for the MicroServices course : MOTUS project


Authors : Benoit BOUAPHAKEO, Benjamin BEWEKEDI, Sarah MESROUA (ING3 IA 1)


# Architecture

## Diagramme de workflow
```mermaid

flowchart TD
    A[Motus<br>port:3000]
    A --> |/logout| B[Auth<br>port:4000]
    A --> |isLoggedin| B
    A --> |/setScore/:value| C[Score<br>port:3500]

    B --> |/callback?code=XXX| A
    B --> |set/:key/:value| id1(REDIS<br>Database<br>USER)
    B --> |/signup| id1
    B --> |/signup| C

    C --> |/setUser/:key/:value| id2(REDIS<br>Database<br>SCORE)
    C --> |/getScore| A
    id2 --> |/get/:key| C
    id1 --> |/get/:key| B

    D[Auth<br>port:4000] --> |/authorize| A
    D --> |/login| id1
    D --> |/token| C
    D --> |/signUpPage| B
    id1 --> |/login| A
    id1 --> |/signup| B
```

## Diagramme de Séquence

```mermaid
sequenceDiagram
    participant User
    participant Motus App
    participant Authentication Microservice
    participant Motus Microservice
    participant Score Microservice
    participant Database Redis Auth
    participant Database Redis Score


    User->>Motus App: Open Motus App
    Motus App->>Authentication Microservice: Request user authentication
    Authentication Microservice->>Database Redis Auth: Check user existence
    Database Redis Auth-->>Authentication Microservice: User existence response
    Authentication Microservice-->>Motus App: User authentication response
    Motus App->>Motus Microservice: Request game data (= today's word)
    Motus Microservice-->>Motus App: Game data response
    loop Game play
        Motus App->>Motus Microservice: Submit user input
        Motus Microservice-->>Motus App: Submit result response
        alt Game won
            Motus App-->>Motus Microservice: Submit user input with the right word => Game won
            Motus Microservice-->>Motus App: Game result response
        end
    end
    Motus App->>Score Microservice: Request user score
    Score Microservice-->>Motus App: User score response
    Motus App->>Motus App: Display game results and leaderboard
```
## 1.Informations Générales
Utilisation de Express pour créer un serveur pour chaque microservice :
```
const express = require('express');
const app = express();
```


Utilisation de Redis pour la base de données de score et d'utilisateur : 
```
// Créer un client Redis
const client = redis.createClient({
    url : REDIS_URL
});

(async () => {
    client.on('connect', function () {
        console.log('Connected to score / to auth ');       
    })
    await client.connect();
})();
```



## 2. Motus Microservice (`motus.js`)
Ce service est responsable de la gestion du système de score de l'application Motus.

- Création du server Node.js ‘motus.js’.
- Port spécifié : port 3000 (par défaut)
- Définitions des APIs :
  - Middleware  `isLoggedIn` :  vérifie si l'utilisateur est authentifié afin de permettre l'accès au routes de l'application. Si l'utilisateur n'est pas authentifié et que la route demandée n'est pas "/callback", l'utilisateur est redirigé vers un serveur d'authentification pour effectuer la connexion.
  - Route `/callback` gère la réponse après une authentification réussie. Lorsqu'un utilisateur est redirigé vers cette route après s'être authentifié, elle récupère le code d'autorisation, effectue une requête vers un serveur d'authentification pour échanger le code contre un jeton d'accès. Le ticket d'accès est ensuite vérifié et le nom d'utilisateur est extrait à partir de celui-ci. Enfin, le nom d'utilisateur est stocké dans la session de l'utilisateur et l'utilisateur est redirigé vers la page d'accueil.
  -  Route `/logout` gère la déconnexion de l'utilisateur. Supprime le ticket et la session et redirige l'utilisateur vers la page d'accueil.
  - Route racine `'/'` renvoie le fichier "motus.html" situé dans le dossier "www".
  - Route `/wordOfTheDay` permet de génerer le mot du jour à partir de la liste des mots (fichier txt) et de la fonction ‘generateDailyRandomNumber` qui génère un nombre aléatoire quotidien basé sur la date actuelle.
  - Routes  `/getScore` et  `/setScore/:value` récupère et définit (respectivement) le score de l'utilisateur en effectuant une requête vers un serveur de score.
  - Route `/port` renvoie un message indiquant l'hôte et le port sur lesquels l'application "Motus" est en cours d'exécution.


## 3. Score Microservice (`score.js`)
Ce service est responsable de la gestion du système de score de l'application Motus.
- Création du server Node.js ‘score.js’ qui interagit avec une base de données Redis. 
- Port spécifié : port 3500
- Définitions des APIs :
  - Route ‘/set/:key/:value’, qui prend une clé et une valeur en tant que paramètres. Il récupère la valeur actuelle associée à la clé fournie depuis la base de données Redis en utilisant `client.get(key)`. Si la clé existe, il calcule un nouveau score en ajoutant la valeur fournie au score actuel, puis définit le nouveau score dans la base de données Redis en utilisant `client.set(key, newScore)`. Si la clé n'existe pas, il renvoie une réponse 404. Les opérations réussies renvoient une réponse 200, tandis que les erreurs renvoient une réponse 500.
  - Route ‘/setUser/:key/:value’ et définit la paire clé-valeur fournie directement dans la base de données Redis sans aucun calcul. Il répond avec un statut 200 en cas de définition réussie de la clé et un statut 500 en cas d'erreur.
  - Route ‘/get/:key’ et récupère la valeur associée à la clé fournie depuis la base de données Redis en utilisant `client.get(key)`. Si la clé existe, il renvoie la valeur avec un message personnalisé. Sinon, il renvoie une réponse indiquant que la clé n'existe pas.


## 4. Authentification Motus Microservice (`auth.js`)
Ce service gère l'authentification des utilisateurs de l'application Motus.

- Création du server Node.js ‘auth.js’.
- Port spécifié : port 4000 (par défaut)
- Définitions des APIs :
   - Route `/` : renvoie une réponse "Hello World!" pour tester le serveur.
   - Route `/authorize` : gère la demande d'autorisation. Vérifie les paramètres de la requête (clientid, scope, redirect_uri) et renvoie un formulaire de connexion HTML si les paramètres sont valides.
   - Route `/login` : gère la soumission du formulaire de connexion. Vérifie le nom d'utilisateur et le mot de passe dans la base de données Redis. Si les informations sont valides, génère un code aléatoire, stocke le code dans Redis et redirige l'utilisateur vers l'URL de redirection avec le code.
   - Route `/token` : gère la demande de jeton d'authentification. Vérifie le code dans Redis, génère un jeton d'identité JWT avec les informations nécessaires, et renvoie le jeton dans la réponse.
   - `/signUpPage` : renvoie une page HTML pour l'inscription d'un nouvel utilisateur.
   - `/signup` : gère la soumission du formulaire d'inscription. Vérifie les informations d'inscription, enregistre l'utilisateur dans le service d'authentification et le service de score, puis redirige l'utilisateur vers la page d'accueil.
   - Route `/session` : renvoie les informations de session actuelles.
   - Route `/set/:key/:value` : définit une clé et sa valeur correspondante dans Redis.
   - Route `/get/:key` : récupère la valeur d'une clé spécifique dans Redis.
   - Route `/delete/:username` : supprime toutes les clés correspondant à la valeur de l'utilisateur spécifié dans Redis.

## 5. Page HTML
Les pages HTML ```login.html```, ```motus.html``` et ```signup.html``` définisse les pages qui contiennent le jeux de MOTUS, la page de connexion si l'utilisateur à un compte et la page d'inscription si l'utilisateur n'a pas de compte. 

## 6. `Dockerfile` et Docker Compose (`docker-compose.yml`)

# Configuration et Utilisation :wrench:
1. Installer :
    - Node.js : 
    - Redis
    - 
      
2. Clonez ce répertoire sur votre machine locale :  ```git clone <url du repo> ```

3. Vous pouvez maintenant accéder à l'application Motus en lancant la commande ```git clone <url du repo> ``` et en ouvrant le navigateur l'URL appropriée.

# Travail Bonus : Flask
installer les dépendances flask:
dans le terminal:
``ip install flask flask_sqlalchemy flask_login flask_bcrypt flask_wtf wtforms email_validator`
avec flask : le localhost a le port 5000 par défaut (python3 app.py)
donc https://localhost:5000

installer sqlite3 : ```sudo apt install sqlite3```

database.db dans le folder flask-auth/instance/

contient les données utilisateurs
pour y accéder dans le terminal : se placer dans le folder instance:
sqlite3 database.db
