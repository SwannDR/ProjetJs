const Piece = require('./Piece');

class Roi extends Piece{
    constructor(couleur, x, y, id){
        super(couleur, x, y, id)
    }

    verifierboucle(pieceName,sens, plateau){
        for(let i = 0; i < sens.length; i++){
            let x = this.x + sens[i][0];
            let y = this.y + sens[i][1];
            let boucle = true;

            if (plateau.isInBoard(x,y)) while(boucle){
                if(plateau.check_piece(x,y)){
                    if(plateau.board[x][y].piece.couleur == this.couleur) boucle = false;
                    else for (let j = 0; j < pieceName.length; j++) if (plateau.board[x][y].piece.nom == pieceName[j]) return true;
                }
                x += sens[i][0]
                y += sens[i][1]
                if(!plateau.isInBoard(x,y)) boucle = false;
            }
        }
        return false;
    }

    verifiercote(pieceName,sens, plateau){
        for(let i = 0; i < sens.length; i++){
            let x = this.x + sens[i][0];
            let y = this.y + sens[i][1];

            if(plateau.check_piece(x,y)){
                 if(plateau.board[x][y].piece.couleur != this.couleur){
                    for (let j = 0; j < pieceName.length; j++) if (plateau.board[x][y].piece.nom == pieceName[j]) return true;
                }
            }
            
        }
        return false;
    }

    echec(plateau){

//Voir pour changer piecename par une condition avec des |

        if (this.verifierboucle(["Reine","Fou"],[[1,1],[1,-1],[-1,1],[-1,-1]], plateau)) return true;
        if (this.verifierboucle(["Reine","Tour"],[[1,0],[-1,0],[0,1],[0,-1]], plateau)) return true;
        if (this.verifiercote(["Pion"],[[1*Math.pow(-1,this.couleur + 1),1*Math.pow(-1,this.couleur + 1)],[1*Math.pow(-1,this.couleur + 1),-1*Math.pow(-1,this.couleur + 1)]], plateau)) return true;
        if (this.verifiercote(["Cavalier"],[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]], plateau)) return true;

        return false;
    }

    playable(plateau){
        for (let i = -1; i < 2; i++){
            for (let j = -1; j < 2; j++){
                if(plateau.isInBoard(this.x + i, this.y + j)){
                    if(plateau.board[this.x + i][this.y + j].piece == 0){
                        if(!(i == 0 && j == 0)) plateau.playable(this.x + i, this.y + j, this);
                    }
                    else if (plateau.board[this.x + i][this.y + j].piece.couleur != this.couleur){
                        if(!(i == 0 && j == 0)) plateau.playable(this.x + i, this.y + j, this);
                    }
                }
            }
        }
        let roque = this.roquePlayable(plateau);
        for (let k = 0; k < roque.length; k++){
            if (roque[k]) plateau.playable(this.x + (4*k-2), this.y, this);
        }
    }

    roquePlayable(plateau){
        let renvoi = [0,0];
        let valeurs = [-3,4];
        
        let tempX = this.x;
        
        if(this.deplacements.length == 1){
            for (let j = 0; j < valeurs.length; j++){
                if(plateau.board[this.x + valeurs[j]][this.y].piece.nom == 'Tour' && plateau.board[this.x + valeurs[j]][this.y].piece.deplacements.length == 1){
                    let i = 1;
                    let indiceR = 1;
                    while (i < Math.abs(valeurs[j]) && (plateau.board[tempX - i][this.y].piece == 0 && indiceR)){
                        this.x = this.x + (valeurs[j]/Math.abs(valeurs[j]));
                        if(i < 3){
                            if(this.echec(plateau)){
                                indiceR = 0;
                            }
                        }
                        i++;
                    }
                    this.x = tempX;
                    if (indiceR){
                        renvoi[j] = 1;
                    }
                }
            }
        }
        return renvoi;
    }

    move(x,y, plateau){ 
        if(plateau.isInBoard(x,y)){
            if(plateau.board[x][y].playable){
                let diff = x - this.x;
                if(Math.abs(diff) == 2){
                    
                    if (diff == -2) plateau.jouer(x + 1,y,plateau.board[this.x - 3][this.y].piece);
                    else plateau.jouer(x - 1,y,plateau.board[this.x + 4][this.y].piece);
                    plateau.jouer(x,y,this);

                    plateau.Nbtour--;

                    plateau.couts.splice(plateau.couts.length - 2, 2);

                    if(diff == 2)  plateau.couts.push("G.R");
                    else plateau.couts.push("P.R");
                }
                else{ //Déplacement normal
                    plateau.jouer(x, y, this);

                }
                //On enregistre les coo dans joueur pour pouvoir regarder echec depuis le plateau
                plateau.Joueurs[this.couleur].roi.x = x;
                plateau.Joueurs[this.couleur].roi.y = y;
            }
        }
    }
};


module.exports = Roi;