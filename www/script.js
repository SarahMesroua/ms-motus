function strNoAccent(a) {
    return a.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function point() {
    let cellules = $('tr[selected="selected"] td');
    cellules.addClass('cellule-lettre-pas-curseur');
    cellules.text('.');
}

function lettre() {
    let premiereCellule = $('tr[selected="selected"] td:first');
    premiereCellule.removeClass('cellule-lettre-pas-curseur');
    premiereCellule.text("");
    premiereCellule.append(motDuJour[0]);
}

/***********************************************************/
function sontIdentiques(liste1, liste2) {
    if (liste1.length !== liste2.length) {
        return false;
    }
    
    return liste1.every((element, index) => element === liste2[index]);
}

let lignesGrille = $('tr');
let motDuJour = ""
let tailleMotDuJour = 0;

$.get("/wordOfTheDay", (data) => {

    /*** récupérer le mot du jour***/
    console.log(data);
    motDuJour = strNoAccent(data).toUpperCase();
    console.log(motDuJour);
    tailleMotDuJour = motDuJour.length;
    lettresTrouvees = [motDuJour[0]]
    listeMotDuJour = motDuJour.split('');

    /*** Initialisation du tableau ***/

    lignesGrille.each(function () {
        for (let j = 0; j < tailleMotDuJour; j++) {
            $(this).append('<td></td>');
        }
    });

    /*** préremplir par des points ***/
    point();

    /*** remplir la première cellule***/
    lettre();

    /*** remplir les cellules avec les lettres ***/
    $(document).on('keypress', function (event) {
        let codeTouche = event.which;

        if ((codeTouche >= 65 && codeTouche <= 90) || (codeTouche >= 97 && codeTouche <= 122)) {
            let lettreClavier = String.fromCharCode(codeTouche);
            /*console.log(lettreClavier);*/
            let celluleARemplir = $('td.cellule-lettre-pas-curseur:first');
            celluleARemplir.text(lettreClavier);
            celluleARemplir.removeClass('cellule-lettre-pas-curseur');
        }
    });

    /*** touche entrée ***/
    $(document).on('keypress', function (event) {
        if (event.which === 13) {
            if ($('td.cellule-lettre-pas-curseur').length === 0) {

                /***  traitement des lettres  ***/
                let ligneTR = document.querySelector('tr[selected="selected"]');

                let cellulesTD = ligneTR.querySelectorAll('td');

                let listeLettres = [];

                cellulesTD.forEach(function (cellule) {
                    let lettre = cellule.textContent.trim().toUpperCase();
                    listeLettres.push(lettre);
                });



                /** attribution des classes au cellules selon les lettres proposées**/
                /*function traitementAvecDelai(i) {
                    setTimeout(function() {
                        if (listeMotDuJour[i] == listeLettres[i]) {
                            cellulesTD[i].classList.add("bien-place", "resultat");
                        } else if (listeLettres.includes(listeMotDuJour[i])) {
                            cellulesTD[i].classList.add("mal-place", "resultat");
                        } else {
                            cellulesTD[i].classList.add("non-trouve", "resultat");
                        }
                    }, i * 300);
                }
                
                for (let i = 0; i < listeMotDuJour.length; i++) {
                    traitementAvecDelai(i);
                }*/


                /*** le mot n'est pas trouvé, on passe à la ligne suivante ***/
                /*let ligneSuivante = $('tr[selected="selected"]').next('tr');

                if (ligneSuivante.length > 0) {
                    $('tr[selected="selected"]').removeAttr('selected');
                    ligneSuivante.attr('selected', '');
                    point();
                    lettre();
                }*/

                /** attribution des classes au cellules selon les lettres proposées**/
                function traitementAvecDelai(i, callback) {
                    if (i >= listeMotDuJour.length) {
                        // Si nous avons traité tous les éléments, appeler le callback
                        callback();
                        return; // Sortie de la fonction
                    }
                
                    setTimeout(function() {
                        if (listeMotDuJour[i] == listeLettres[i]) {
                            cellulesTD[i].classList.add("bien-place", "resultat");
                        } else if (listeMotDuJour.includes(listeLettres[i])) {
                            cellulesTD[i].classList.add("mal-place", "resultat");
                            console.log(i + listeMotDuJour[i]);
                        } else {
                            cellulesTD[i].classList.add("non-trouve", "resultat");
                        }
                
                        // Appel récursif pour traiter le prochain élément après le délai
                        traitementAvecDelai(i + 1, callback);
                    }, 300); // Attendre 0.3 seconde pour chaque itération
                }
                
                /*** passer à la ligne suivante une fois que le traitement est terminé ***/
                function passerALaLigneSuivante() {
                    let ligneSuivante = $('tr[selected="selected"]').next('tr');
                    if (ligneSuivante.length > 0) {
                        $('tr[selected="selected"]').removeAttr('selected');
                        ligneSuivante.attr('selected', '');
                        point();
                        lettre();
                    }else{
                        alert("Dommage");
                    }
                    console.log(listeMotDuJour);
                    console.log(listeLettres);
                }
                
                // Commencer le traitement avec délai, et passer à la ligne suivante une fois que c'est terminé
                // "Felicitaion" si le mot est trouvé
                // "Dommage" si il n'y a plus de ligne disponible pour deviner le mot du jour
                if (sontIdentiques(listeMotDuJour, listeLettres)) {
                    traitementAvecDelai(0, function() {
                        alert("Félicitation");
                    });
                } else {
                    traitementAvecDelai(0, passerALaLigneSuivante);
                }
            }


            /*** mot trop court ***/
            else {
                alert("Le mot proposé est trop court");
            }
        }
    });

    /*** touche effacer ***/
    $(document).on('keydown', function (event) {
        if (event.which === 8) {
            let cells = $('tr[selected="selected"] td:not(.cellule-lettre-pas-curseur)').get().reverse();
            if (cells.length > 1 && cells[0] !== "") {
                $(cells[0]).text(".").addClass("cellule-lettre-pas-curseur");
            }
        }
    });


});