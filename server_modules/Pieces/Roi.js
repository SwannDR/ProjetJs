class Roi{

    constructor(x, y, player){
        this.x = x;
        this.y = y;
        this.player = player;
    }

    verifier(pieceName,sens){
        
        for(let i = 0; i < sens.length; i++){
            let x = this.x + 1*sens[i][0];
            let y = this.y + 1*sensy[i][1];
            if (isInBoard(x,y)) while(board[x][y].piece.couleur != this.couleur){
                if (isInBoard(x,y)) for (let j = 0; j < pieceName.length; j++) if (board[x][y].piece.name == pieceName1) return 1;
            }

        }
    }

    verifier2(pieceName,sens){

        for(let i = 1; i <= sens.length; i++){
            let x = this.x + 1*sens[i][0];
            let y = this.y + 1*sensy[i][1];
            if (isInBoard(x,y)) if(board[x][y].piece.couleur != this.couleur){
                for (let i = 0; i < pieceName.length; i++) if (board[x][y].piece.name == pieceName1) return 1;
            }
        }
    }

    isEnEcheque(){
        if (verifier(["reine","fou"],[[1,1],[1,-1],[-1,1],[-1,-1]]) ||
            verifier(["reine","tour"],[[1,0],[-1,0],[0,1],[0,-1]]) ||
            verifier2(["pion"],[[1*Math.pow(-1,this.couleur + 1),1*Math.pow(-1,this.couleur + 1)],[1*Math.pow(-1,this.couleur + 1),-1*Math.pow(-1,this.couleur + 1)]]) ||
            verifier2(["cavalier"],[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]])) return 1;
        
        return 0;
    }

    playable(){

        let X = this.x - 1;
        let Y = this.y - 1;

        let isPlayable = [];

        for (let i = 0; i < 3; i++){
            for (let j = 0; j < 3; j++){
                if(isInBoard(X + i, Y + i)){
                    
                }
            }
        }
    }

    move(x,y){
        
    }

};

module.exports = Roi;