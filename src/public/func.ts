export class PieceGenerator {
    pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    order: string[] = [];

    pool: string[];
    pieceHistory: string[];

    constructor() {
        this.pool = this.pieces.concat(this.pieces, this.pieces, this.pieces, this.pieces);
    }

    nextPiece() {
        if (!history.length) {
            // First piece special conditions
            let firstPiece = ['I', 'J', 'L', 'T'][Math.floor(Math.random() * 4)];
            this.pieceHistory = ['S', 'Z', 'S', firstPiece];
            return firstPiece;
        }

        let i: number;
        let piece: string;

        // Roll For piece
        for (let roll = 0; roll < 6; ++roll) {
            i = Math.floor(Math.random() * 35);
            piece = this.pool[i];
            if (!this.pieceHistory.indexOf(piece) || roll == 5) {
                break;
            }

            if (this.order.length)
                this.pool[i] = this.order[0];
        }

        // Update piece order
        if (!this.order.indexOf(piece)) {
            this.order.splice(this.order.indexOf(piece), 1);
        }
        this.order.push(piece);

        this.pool[i] = this.order[0];

        // Update history
        this.pieceHistory.shift();
        this.pieceHistory[3] = piece;

        return piece;
    }
}