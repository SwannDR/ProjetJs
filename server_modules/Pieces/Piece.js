class Piece{
    constructor(couleur, x, y){
        //Coté client
        this.x = x;
        this.y = y;
        this.couleur = couleur; // couleur de la pièce
        
        this.nom = this.constructor.name;

        //Coté serveur
        this.deplacements = new Array()
        this.deplacements.push({x:x,
                                y:y,
                                })
    }
    // méthode générale
    move(x,y, plateau){ 
        if(plateau.isInBoard(x,y)){
            if(plateau.board[x][y].playable){
                plateau.jouer(x, y, this);
            }
        }
    }
    clone(){
        //On peut pas le mettre en haut car il s'agit de classe enfant
        const P = eval("require('./"+this.nom+"')")
        let tmp = new P(this.couleur, this.x, this.y)
        tmp.deplacements = JSON.parse(JSON.stringify(this.deplacements));
        return tmp;
        
        /* Première méthode de clone, trop long car trop d'import
           à chaque création de pièce

        const Pion = require('./Pion');
        const Fou = require('./Fou');
        const Cavalier = require('./Cavalier');
        const Reine = require('./Reine');
        const Tour = require('./Tour');

        let tmp = eval("new " 
                       + this.nom 
                       + "(" 
                       + String(this.couleur) 
                       + ", "
                       + String(this.x)
                       + ", "
                       + String(this.y)
                       +  ")");
        */
    }
}

module.exports = Piece;
