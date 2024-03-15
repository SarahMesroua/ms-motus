# ms-motus
Repository for the MicroServices course : MOTUS project

Authors : Benoit BOUAPHAKEO, Benjamin BEWEKEDI, Sarah MESROUA (ING3 IA 1)
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
