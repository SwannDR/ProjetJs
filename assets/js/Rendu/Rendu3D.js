// reprise avec modifications du plateau: https://github.com/SuperiorJT/Threejs-Chess

class RenduThreeJs{
    constructor(couleur){
        //Pour appel du raycast des variables
        let Rendu = this;
        //Initialisation de la scène
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight);
        this.camera.up.set( 0, 0, 1 ); // pour que orbitcontrols 'suive' la caméra
    
        //Ajout du rendu
        let renderer = new THREE.WebGLRenderer({
            alpha: true,
          });
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.domElement.id = 'RenduThreeJs';
        document.body.appendChild( renderer.domElement );
        // Redimensionnement du jeu auto
        window.addEventListener( 'resize', function() {
            let width = window.innerWidth;
            let height = window.innerHeight;
            renderer.setSize( width, height );
            Rendu.camera.aspect = width / height;
            Rendu.camera.updateProjectionMatrix();
        });

        //Gestion des objets
        let objLoader = new THREE.OBJLoader(); // Chargement des modèles
        this.raycaster = new THREE.Raycaster(); //Gestion de la détection des clicks (Events)

        this.controls = new THREE.OrbitControls( this.camera, renderer.domElement );
        
        this.controls.enablePan = false; // translation
        this.controls.enableDamping = true; // inertie

        this.controls.enableZoom = false; // paramètres du zoom

        this.controls.maxPolarAngle = Math.PI/3 // pour laisser la caméra au dessus du plateau
        this.controls.rotateSpeed = 0.4
        this.controls.dampingFactor = 0.1 // on réduit l'inertie pour qu'elle reste cohérente avec la vitesse de rotation réduite

        this.controls.mouseButtons = { // on touche pas au click gauche pour éviter les conflits avec le raycast
            RIGHT: THREE.MOUSE.ROTATE // rotation
        }
        this.PositionCamera(couleur); // On positionne la caméra en fonction de la couleur

        // Cases jouables
        this.materialCases = [
            new THREE.MeshBasicMaterial( {color: 0x000000, opacity: 0, transparent: true} ),   // transparent
            new THREE.MeshBasicMaterial( {color: 0x4ca3dd, opacity: 0.8, transparent: true} ), // select (bleu)
            new THREE.MeshBasicMaterial( {color: 0x00ff00, opacity: 0.5, transparent: true} ), // vert
            new THREE.MeshBasicMaterial( {color: 0xff0000, opacity: 0.5, transparent: true} )  // rouge
        ]
        this.playableCases = [];
        this.playableCase = new THREE.Mesh( new THREE.BoxGeometry( 0.5, 0.5, 0.02 ), this.materialCases[0]);
        
        // Pièces
        this.models = [ // définition des nom de modèles en dur
            {nom:"Pion", obj:undefined},
            {nom:"Fou", obj:undefined},
            {nom:"Cavalier", obj:undefined},
            {nom:"Tour", obj:undefined},
            {nom:"Reine", obj:undefined},
            {nom:"Roi", obj:undefined}
        ];
        //Récupération du type de modèles utilisé :
        let ModelType = getParams(window.location.href).affichage;
        if(ModelType == "" || ModelType == undefined) ModelType = "Classic"; // on redéfinit par sécurité si l'argument est manquant
        console.log("Affichage : " + ModelType)
        document.body.style.backgroundImage = "url('../../img/"+ModelType+".png')";
        document.body.style.backgroundSize = "cover"

        $.getJSON("../../JSON/"+ModelType+".json", function(json) {
            Rendu.info = json;
            if(Rendu.info.couleur){ // si on a un modèle différent pour les blancs et les noirs
                for(let i=0; i<6; i++){// on vient doubler le nombre de modèle à charger et on change les noms
                    Rendu.models.push({nom:Rendu.models[i].nom+"Noir", obj:undefined});
                    Rendu.models[i].nom += "Blanc";
                }
            }
            for(let i=0; i<Rendu.models.length; i++){
                objLoader.load("../models/"+ Rendu.info.chemin + "/" + Rendu.models[i].nom + ".obj", function(object) {
                    Rendu.models[i].obj = (object);
                });
            }
        });
        
        //Stockages des pièces de la scène
        this.piecesId = [];
        this.piecesObj = [];
        // Pièces mangées (blanc, noir)
        this.piecesOut = [[], []];

        //Board
        this.GenerateBoard();
        //Gestion des lumières
        this.GenerateLight();
        //Gestion des animations
        function render() {
            requestAnimationFrame( render );
            TWEEN.update();
            Rendu.controls.update() // pour l'inertie
            renderer.render( Rendu.scene, Rendu.camera );
        }
        render();
    }

    //Méthode commune d'utilisation de Tween pour déplacer une pièce
    Tween(piece, targets, delai) {
        let position = piece.position;
        let target = new Object;
        for(let i=0; i<targets.length; i++) target[targets[i].Axis] = position[targets[i].Axis] + targets[i].Offset;
        let tween = new TWEEN.Tween(piece.position).to(target, delai);

        tween.onUpdate(function() { // fonction d'update (lié à la cible)
            for(let i=0; i<targets.length; i++) piece.position[targets[i].Axis] = position[targets[i].Axis];
        });

        return tween;
    };
    //animation mouvement vers le haut/bas et en diagonal
    animatePiece(piece, X, Y) {
        let tweenUp = this.Tween(piece, [{Axis:'z', Offset:1}], 200)
        let tweenMove = this.Tween(piece, [{Axis:'x', Offset:0.5*X}, 
                                           {Axis:'y', Offset:0.5*Y}], 100*Math.max(Math.abs(X),Math.abs(Y)))
        let tweenDown = this.Tween(piece, [{Axis:'z', Offset:0}], 200)
        tweenUp.chain(tweenMove);
        tweenMove.chain(tweenDown);
        tweenUp.start();
    }

    //Utilisée lors des tests pour déplacer une pièce au click directement
    /*animateSelectedPiece(piece, X, Y) {
        let tweenUp = this.Tween(piece, [{Axis:'y', Offset:40}], 1000)
        let tweenMove = this.Tween(piece, [{Axis:'x', Offset:20*X}, 
                                            {Axis:'z', Offset:20*Y}], 3000)
        let tweenDown = this.Tween(piece, [{Axis:'y', Offset:0}], 1000)
        tweenUp.chain(tweenMove);
        tweenMove.chain(tweenDown);
        tweenUp.start();
    }*/

    //Méthodes de déplacement de pièces
    movePieces(deplacements) {
        let Rendu = this;
        let loadCheck = setInterval(function() { // On attend que toutes nos pièces soient 
            if (Rendu.checkLoadModels()) {  // chargées avant de commencer à les déplacer afin 
                clearInterval(loadCheck);   // d'éviter les bugs liés à la synchronisation

                if(deplacements.length == 1) Rendu.movePiece(deplacements[0]); // si pas de roque
                else Rendu.moveRoque(deplacements);
            }
        }, 100);
    }
    movePiece(deplacement) {
        let pieceIdx = this.getPieceIdx(deplacement.piece)

        if(pieceIdx>-1){
            this.animatePiece(this.piecesObj[pieceIdx], deplacement.y-deplacement.piece.y, deplacement.x-deplacement.piece.x);
        }
    }
    moveOut(piece) {    //déplacement des pièces mangées à l'extérieur du plateau
        let pieceIdx = this.getPieceIdx(piece)
        if(pieceIdx>-1){
            let tweenUp = this.Tween(this.piecesObj[pieceIdx], [{Axis:'z', Offset:3}], 600); 
            tweenUp.start();            // on lève la pièce

            let Rendu = this;

            setTimeout(function(){
                Rendu.removePiece(pieceIdx);    // on supprime la piece mangé du plateau
                setTimeout(function(){
                    Rendu.LoadPieceOut(piece, 3);   // on la recharge dans la scene en hauteur pour faire croire qu'on l'a juste déplacée
                    setTimeout(function(){ // on laisse le temps au modèle d'apparaitre
                        let tweenDown = Rendu.Tween(Rendu.piecesOut[piece.couleur][Rendu.piecesOut[piece.couleur].length-1], [{Axis:'z', Offset:-3}],600);
                        tweenDown.start();           // on la fait redescendre sur le coté du plateau*/
                    }, 100);
                }, 100);
            }, 650);
        }
    }
    //animation du Roque
    moveRoque(deplacements) {
        let Rendu = this;
        // ROI
        Rendu.movePiece(deplacements[0]);
        // TOUR
        setTimeout(function(){
            Rendu.movePiece(deplacements[1]);
        }, 800); // on prend le temps de déplacement du roi moins le temps de descente
    }
    //animation de la promotion
    switchPawn(piece) {
        let Rendu = this;
        setTimeout(function() {
            let idx = Rendu.getPieceIdx(piece);
            let tweenUp = Rendu.Tween(Rendu.piecesObj[idx], [{Axis:'z', Offset:3}], 800); 
            tweenUp.start();// on lève la pièce
            setTimeout(function() {
                Rendu.removePiece(idx); // indice du pion
                setTimeout(function() {
                    Rendu.LoadPieces([piece]);
                }, 100)//On attend légèrement après que la pièce soit supprimée pour éviter de supprimer la nouvelle car elles ont le même id
            }, 800) // on attend que la pièce soit levée
        }, 1500) // On attend la fin de tout les autres mouvements avant 
    }

    //Méthodes de suppression de pièce
    removePiecesOut() {     //pour les pièces mangées
        for(let i=0; i<2; i++){
            for(let j=0; j<this.piecesOut[i].length; j++){
                this.removeObject(this.piecesOut[i][j]);
            }
            this.piecesOut[i].length = 0;
        }
    }
    removePieces() {    //supprime toutes les pièces
        for(let i=0; i<this.piecesObj.length; i++){
            this.removePiece(0); // pas i mais 0 car on le retire du tableau au fur et a mesure
        }
    }
    removePiece(idx){   //supprime une seule pièce
        if(idx!=-1){    //idx = emplacement de l'objet dans piecesId et piecesObj
            this.removeObject(this.piecesObj[idx]);
            this.piecesObj.splice(idx, 1);
            this.piecesId.splice(idx, 1);
        }
    }
    removeObject(piece) {   //supprime le modèle
        this.scene.remove(piece);
    }

    //Gestion des Cases
    removePlayable() {  // suppressions de l'affichage des cases jouables
        for (let i = 0; i < this.playableCases.length; i++) this.playableCases[i].material = this.materialCases[0]
    }
    setPlayables(board, CooSelect) {    //affichage des cases jouables
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                if (board[i][j].playable) {
                    this.setPlayable(i,j,(board[i][j].piece == 0));
                }
            }
        }
        if(board[CooSelect.x][CooSelect.y].piece.nom == "Pion"){//On gère la prise en passant
            for(let i=-1; i<2; i+=2) {
                if(CooSelect.x+i>-1&&CooSelect.x+i<8&&CooSelect.y+(Math.pow(-1,board[CooSelect.x][CooSelect.y].piece.couleur))>-1&&CooSelect.y+(Math.pow(-1,board[CooSelect.x][CooSelect.y].piece.couleur))<8){
                    if(board[CooSelect.x+i][CooSelect.y+(Math.pow(-1,board[CooSelect.x][CooSelect.y].piece.couleur))].piece == 0 && board[CooSelect.x+i][CooSelect.y+(Math.pow(-1,board[CooSelect.x][CooSelect.y].piece.couleur))].playable){
                        this.setPlayable(CooSelect.x+i,CooSelect.y+(Math.pow(-1,board[CooSelect.x][CooSelect.y].piece.couleur)), false);
                    }
                }
            }
        }
        this.setSelect(CooSelect.x, CooSelect.y);
    };
    setPlayable(X, Y, playableType) {   //affichage d'une case jouable avec gestion de sa couleur
        let materiel;
        if (playableType) { materiel = this.materialCases[2]/*.color.setHex(0x00ff00);*/ }
        else { materiel = this.materialCases[3]/*.color.setHex(0xff0000);*/ }
        this.setCase(X, Y, materiel)
    };
    setSelect(X, Y) {   //affichage en vert de la case de la pièce sélectionnnée
        this.setCase(X, Y, this.materialCases[1]);
    };
    setTransparent(X, Y){   //texture transparente
        this.setCase(X, Y, this.materialCases[0]);
    }
    setCase(X, Y, materiel){
        let CooCheck = (this.getCooObject(this.playableCases[(8*X) + Y]))
        if(CooCheck.x != X || CooCheck.y != Y) this.ResetCases()//reset playables

        this.playableCases[(8*X)+Y].material = materiel;
    }
    createCase(X, Y){
        let tmpPlayableCase = this.playableCase.clone();

        tmpPlayableCase.material = this.materialCases[0]
        tmpPlayableCase.position.set( (Y-4)/2 + 0.25, (X-4)/2 + 0.25, 0 );

        this.playableCases.push(tmpPlayableCase) // on enregistre pour pouvoir les retirer
        this.scene.add( tmpPlayableCase );
    }

    //Méthodes de sélection d'objets
    getPieceIdx(piece){     //récupération de l'indice d'une pièce
        for(let i=0; i<this.piecesId.length; i++){ // on parcours toutes les pièces pour trouver la bonne à défault d'une meilleure méthode
            if(this.piecesId[i] == piece.id){
                return i;
            }
        }
        return -1;
    }
    getCooObject(Objet){    //récupération des coordonnées d'un modèle
        return this.getCoo(Objet.position);
    }
    getCooSelected(selectedObject){  //récupération des coordonnées de la pièce sélectionnée
        return this.getCoo(selectedObject.point);
    }
    getCoo(position){   //calcul de la position de la pièce sur le plateau à partir des coordonnées "brutes" de la scene
        let Coo = new THREE.Vector2();
        Coo.x = Math.trunc(2*(position.y + 2)); // Calcul coo
        Coo.y = Math.trunc(2*(position.x + 2));
        return Coo;
    }
    //Méthode du RayCast
    getClickModels(event, TabModels) {
        let mouse = new THREE.Vector2();
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.camera);
        return this.raycaster.intersectObjects(TabModels, true); //array avec objets
    }

    //Génération du terrain de jeu (Board+Light+Camera)
    GenerateBoard(){
        let boardTexture = new THREE.ImageUtils.loadTexture("../../img/board-pattern.png");
        boardTexture.repeat.set(4,4);
        boardTexture.wrapS = THREE.RepeatWrapping;
        boardTexture.wrapT = THREE.RepeatWrapping;
        let board = new THREE.Mesh(
            new THREE.BoxGeometry( 4, 4, 0.01),
            new THREE.MeshFaceMaterial([
                new THREE.MeshLambertMaterial({color: 0x555555}),
                new THREE.MeshLambertMaterial({color: 0x555555}),
                new THREE.MeshLambertMaterial({color: 0x555555}),
                new THREE.MeshLambertMaterial({color: 0x555555}),
                new THREE.MeshLambertMaterial({ map: boardTexture }),
                new THREE.MeshLambertMaterial({color: 0x555555})
            ])
        );
        this.scene.add( board );
    }
    GenerateLight(){
        let light = new THREE.AmbientLight( 0x555555 ); // soft white light
        this.scene.add( light );
 
        let spotLight = new THREE.SpotLight( 0xffffff, 0.8 );
        spotLight.position.set( 0, 0, 50 );
        spotLight.castShadow = true;
        spotLight.shadowMapWidth = 1024;
        spotLight.shadowMapHeight = 1024;
        spotLight.shadowCameraNear = 10;
        spotLight.shadowCameraFar = 4000;
        spotLight.shadowCameraFov = 30;
        this.scene.add( spotLight );
    }
    PositionCamera(couleur){
        
        if(couleur){ // Caméra basse
            this.camera.position.x = 3.5;
            this.camera.position.z = 3;
            this.camera.rotation.y = ( 50* (Math.PI / 180));
            this.camera.rotation.z = ( 90* (Math.PI / 180));
        }
        else{
            this.camera.position.x = -3.5;
            this.camera.position.z = 3;
            this.camera.rotation.y = ( 310* (Math.PI / 180));
            this.camera.rotation.z = ( 270* (Math.PI / 180));
        }
        this.controls.update();
    }

    //Méthodes de gestion d'erreurs des cases
    ResetCases(){ // Suppression + Regénération des cases pour garder l'ordre des indices
        for (let i = 0; i < this.playableCases.length; i++) this.removeObject(this.playableCases[i])
        this.playableCases.length = 0;
        this.GenerateCases();
    }
    GenerateCases(){
        for(let i=0; i<8; i++){
            for(let j=0; j<8; j++){
                this.createCase(i,j);
            }
        }
        //On récupère donc les coo des case avec 8*x + y selon l'ordre de génération
    }

    //Méthodes de génération du board (coté modèle)
    loadBoardPieces(board){
        this.LoadPieces(this.getBoardPieces(board))
        this.GenerateCases();
    }
    getBoardPieces(board){
        let tmpPieces = [];
        for(let i=0; i<8; i++){
            for(let j=0; j<8; j++){
                if(board[i][j].piece!=0){
                    tmpPieces.push(board[i][j].piece);
                }
            }
        }
        return tmpPieces
    }

    checkLoadModels(){ // fonction de vérification de l'état de chargement des modèles
        for(let i=0; i<this.models.length; i++) if(this.models[i].obj == undefined) return false;
        return true;
    }

    //Méthode de génération des pièces du board
    LoadPieces(Pieces){
        for(let i=0; i<6; i++){
            for(let couleur=0; couleur<2; couleur++){


                //On rajoute un décallage de 6 en fonction de la couleur si nécessaire
                let obj = (this.models[i + (this.info.couleur * couleur * 6)].obj).clone()
                obj.traverse( function ( child ) {
                    if (child instanceof THREE.Mesh) {
                        // on définit la couleur ( avec un effet metalisé)
                        
                        if(couleur) child.material = new THREE.MeshStandardMaterial({color: 0x808080, metalness: 0.5, roughness: 0.4});
                        else child.material = new THREE.MeshStandardMaterial({color: 0xFFFFFF, metalness: 0.4, roughness: 0.4});
                    }
                });
                //On récupère le bon nom si nécessaire
                let NomPiece = this.models[i].nom;
                if(this.info.couleur) NomPiece = NomPiece.slice(0, NomPiece.length-5); 
                
                for(let j=0; j<Pieces.length; j++){
                    // si on gère les couleurs on retire le 'blanc' à la fin du nom de la pièce pour comparer au nom original

                    if(Pieces[j].nom == NomPiece && Pieces[j].couleur == couleur) {
                        let tmpobj = (obj).clone();
 
                        // la position / taille / orientation
                        tmpobj.position.set(-1.75 + (0.5 * Pieces[j].y),
                                            -1.75 + (0.5 * Pieces[j].x)
                                            ,0);
                        tmpobj.scale.set(this.info.scale, this.info.scale, this.info.scale);
                        tmpobj.rotation.x = 1.57;
                        if (couleur != 0) {tmpobj.rotation.y = 3.1}
 
                        //On enregistre pour la détection de click
                        this.piecesId.push(Pieces[j].id)
                        this.piecesObj.push(tmpobj)
                        //Puis on l'affiche
                        this.scene.add(tmpobj);
                    }
 
                }
            }
        }
    }

    //Méthodes de génération des pièces supprimées
    LoadPiecesOut(plateau) {
        for(let i=0; i<2; i++){
            for(let j=0; j<plateau.Joueurs[i].pieces_prises.length; j++){
                this.LoadPieceOut(plateau.Joueurs[i].pieces_prises[j].piece, 0)
            }
        }
    }
    //Méthodes de génération d'une seule pièce supprimé
    LoadPieceOut(piece, hauteur){
        let idx = -1;
        for(let i=0; i<this.models.length; i++) {
            let NomPiece = this.models[i].nom;
            if(this.info.couleur) NomPiece = NomPiece.slice(0, NomPiece.length-5); 
            if(NomPiece == piece.nom) idx = i;
        }

        let obj = (this.models[idx + (this.info.couleur * piece.couleur * 6)].obj).clone()
        obj.traverse( function ( child ) {
            if (child instanceof THREE.Mesh) {
                // on définit la couleur
                if(piece.couleur) child.material = new THREE.MeshStandardMaterial({color: 0x808080, metalness: 0.5, roughness: 0.4});
                else child.material = new THREE.MeshStandardMaterial({color: 0xFFFFFF, metalness: 0.4, roughness: 0.4});
            }
        });        
        obj.position.set((Math.pow(-1, piece.couleur) * (-1.7 + (0.4 * (this.piecesOut[piece.couleur].length/2)))),
                        (Math.pow(-1, piece.couleur+1)*(2.6 + (0.4 * (this.piecesOut[piece.couleur].length%2)))),
                        hauteur);
        obj.scale.set(this.info.scale*0.6, this.info.scale*0.6, this.info.scale*0.6);
        
        // taille / orientation
        obj.rotation.x = 1.57;

        // add tableau
        this.piecesOut[piece.couleur].push(obj);
        // on l'affiche
        this.scene.add(obj);
    }

    //Méthode de reset entier du coté graphique
    reloadAll(plateau) {
        this.removePieces();
        this.removePiecesOut();
        this.ResetCases();
        this.LoadPieces(this.getBoardPieces(plateau.board))
        this.LoadPiecesOut(plateau); 
    }

    //replay d'une partie précédente
    replay() {
        console.log("replay1");
        let Rendu = this;
        $( document ).ready(function() {
            $.ajax({//Reprise avec modification de : https://grokonez.com/node-js/integrate-nodejs-express-jquery-ajax-post-get-bootstrap-view
            type : "GET",
            url : window.location.origin+window.location.pathname+"/replay", // on reconstitue l'url car on a des arguments dans l'url actuelle
            success: function(result){
                console.log(result)
                let board = result.board;
                let coups = JSON.parse(result.data[0].coups)
                let pieces_prises = [JSON.parse(result.data[0].pieces_prises_blanc), JSON.parse(result.data[0].pieces_prises_noir)]
                
                let indiceSuppr = [0,0];//Indice utilisé pour la fonction play
                
                console.log("replay2");

                console.log(board)
                console.log(coups)
                console.log(pieces_prises)

                let pieces_deplaces = []
                
                let GetDeplacementId = id => {
                    let compteur = 0;
                    for(let i=0; i<pieces_deplaces.length; i++){
                        if (pieces_deplaces[i] == id) {
                            compteur++;
                        }
                    }
                    return compteur;
                }

                let Play = (i, delai) => {
                    if(coups.length>i){
                        Hud.Affichage_AquiDejouer(i)
                        setTimeout(function(){
                            Hud.Affichage_coups(coups[i], i)
                            let d = 2000;
                            if (typeof coups[i] != 'string') { // si le coup n'est pas un Roque
                                console.log("replay4");
                                console.log(coups[i].nom + ": "+String(coups[i].id))
                                let tmpPiece = JSON.parse(JSON.stringify(coups[i]));
                                let delta = GetDeplacementId(coups[i].id);
                                tmpPiece.x = coups[i].deplacements[delta].x
                                tmpPiece.y = coups[i].deplacements[delta].y

                                let deplacement = {
                                    x:coups[i].deplacements[1+delta].x,
                                    y:coups[i].deplacements[1+delta].y,
                                    piece:tmpPiece
                                }
                                pieces_deplaces.push(coups[i].id);
                                Rendu.movePiece(deplacement);

                                // + de delai si déplacement long
                            }
                            else{ //cas du Roque
                                console.log("replay5");
                                let decalage;
                                if(coups[i] == "G.R") decalage = 2; 
                                else decalage = -2;

                                let Roi = board[3][i%2*7].piece;
                                let deplacement = ({
                                    x:Roi.x+decalage,
                                    y:Roi.y,
                                    piece:Roi
                                })
                                
                                let deplacements = (Roque.getDeplacements(deplacement, board))
                                Rendu.moveRoque(JSON.parse(JSON.stringify(deplacements)));
                                d+=800
                                
                                pieces_deplaces.push(Roi.id);
                                pieces_deplaces.push(deplacements[1].piece.id);
                            }


                            if(pieces_prises[i%2].length>indiceSuppr[i%2]) if (pieces_prises[i%2][indiceSuppr[i%2]].Nbtour == i+1) {
                                console.log('moveOUT')
                                console.log(pieces_prises[i%2][indiceSuppr[i%2]].piece)
                                setTimeout(function(){
                                    Rendu.moveOut(pieces_prises[i%2][indiceSuppr[i%2]].piece);
                                    indiceSuppr[i%2]++;
                                }, 1000);

                                d+=900;
                            }
                            
                            //si promotion
                            if(coups[i].choix != undefined){
                                d+=2500
                                
                                let tmpPiecePromotion = coups[i]
                                tmpPiecePromotion.nom = coups[i].choix
                                Rendu.switchPawn(tmpPiecePromotion);
                            }

                            Play(i+1, d);



                        }, delai );
                    }
                    else{
                        setTimeout(function(){
                            Hud.OpenMenu('Partie terminée !')
                        }, 7000);
                    }
                }



                let loadCheck = setInterval(function() { // On attend que toutes nos pièces soient 
                    if (Rendu.checkLoadModels()) {  // chargées avant de commencer à les afficher
                        clearInterval(loadCheck);
                        Rendu.loadBoardPieces(board);
                        
                        SetInt()
                        Play(0, 1800)
                    }
                }, 300);
            },
            error : function(e) {
                //Afficher erreur et redirection au menu
                $("#popup").modal({
                    fadeDuration: 100,
                    showClose: false
                });
                $('#popup').on($.modal.BEFORE_CLOSE, function(event, modal) {
                    window.location.href = "./"
                });

                console.log("ERROR: ", e);
            }
            });  
        })
    }
    
    //Méthode de suppression du rendu
    remove() {
        document.body.removeChild(document.body.lastChild)//on supprime le rendu
        document.getElementById('infos').parentNode.removeChild(document.getElementById('infos'));//on supprime l'import des infos sur les modèles
    }
}