import * as func from "./func";
import * as $ from "jquery";
import { math } from "mathjs";
const SquareSize = 20;
const BoardRows = 20;
const BoardColumns = 10;
const weights = [
    //Smaller weight is better
    //Total gaps weight
    100,
    //Average height weights
    1,
    //Standard deviation of heights weight
    1,
    //Maximum consecutive difference in heights weight
    1,
    //Range of heights weight
    1,
    //Lines that would be cleared weight
    -1000
];
let dropSpeed = 1;
let botMoveSpeed = 100;
let startingLevel = 0;
export class TetrominoDef {
}
const tetrominos = {
    "T": {
        pattern: [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0]
        ],
        color: "#8030a0"
    },
    "L": {
        pattern: [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1]
        ],
        color: "#d06000"
    },
    "J": {
        pattern: [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0]
        ],
        color: "#0030c0"
    },
    "S": {
        pattern: [
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 0]
        ],
        color: "#50c040"
    },
    "Z": {
        pattern: [
            [0, 0, 1],
            [0, 1, 1],
            [0, 1, 0]
        ],
        color: "#d03030"
    },
    "I": {
        pattern: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ],
        color: "#20d0c0"
    },
    "O": {
        pattern: [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0]
        ],
        color: "#f0d000"
    },
    " ": {
        pattern: [],
        color: "transparent"
    }
};
export class Piece {
    constructor(type, x = 0, y = 0) {
        this.requiresRedraw = false;
        this.pattern = tetrominos[type].pattern;
        this.color = tetrominos[type].color;
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = 0;
    }
    copy() {
        return new Piece(this.type, this.x, this.y);
    }
}
export class Board {
    constructor(board = null) {
        this.gameOver = false;
        this.level = startingLevel;
        this.score = 0;
        this.lines = 0;
        if (board)
            this.tiles = board;
        else {
            this.tiles = [];
            for (let row = 0; row < BoardRows; row++) {
                this.tiles[row] = [];
                for (let column = 0; column < BoardColumns; column++) {
                    this.tiles[row][column] = " ";
                }
            }
        }
        this.dropStart = Date.now();
        this.pieceGenerator = new func.PieceGenerator();
        this.currentPiece = null;
        this.linesUntilNextLevel = this.level * 10 + 10;
    }
    // update is called every frame.
    update() {
        if (this.currentPiece != null) {
            this.drop(this.currentPiece);
        }
    }
    move(piece, x, y) {
        if (this.collision(piece, piece.x + x, piece.y + y)) {
            if (y > 0) {
                this.lock(piece);
            }
            return false;
        }
        piece.y += y;
        piece.x += x;
        this.requiresRedraw = true;
        piece.requiresRedraw = true;
        return true;
    }
    rotate(piece, targetRotation = 0) {
        let nextRotation = piece.copy();
        while (piece.rotation !== targetRotation) {
            nextRotation.pattern = math.rotateMatrix(nextRotation.pattern);
            while (this.collision(nextRotation)) {
                if (piece.x < 0)
                    this.move(piece, 1, 0);
                else if (piece.x > BoardColumns - 3)
                    this.move(piece, -1, 0);
                else
                    return;
            }
            piece.rotation++;
            if (piece.rotation === 4)
                piece.rotation = 0;
            if (targetRotation === null)
                break;
        }
        piece.pattern = nextRotation.pattern;
        piece.requiresRedraw = true;
    }
    drop(piece) {
        if (Date.now() - this.dropStart > 1000 * dropSpeed * Math.pow(0.9, this.level)) {
            this.move(piece, 0, 1);
            this.dropStart = Date.now();
        }
    }
    lock(piece) {
        this.placeTetromino(piece);
        //check to clear row
        this.clearLines();
        this.nextPiece();
    }
    copy() {
        return new Board(JSON.parse(JSON.stringify(this.tiles)));
    }
    placeTetromino(piece = this.currentPiece, column = null, row = null) {
        let x = column == null ? piece.x : column;
        let y = row == null ? piece.y : row;
        for (let row = 0; row < piece.pattern.length; row++) {
            for (let column = 0; column < piece.pattern.length; column++) {
                if (piece.pattern[row][column]) {
                    this.tiles[y + row][x + column] = piece.type;
                }
            }
        }
    }
    nextPiece() {
        this.deletePiece();
        let type = this.pieceGenerator.nextPiece();
        let piece = new Piece(type);
        piece.x = BoardColumns / 2 - 2;
        this.currentPiece = piece;
        this.requiresRedraw = true;
        if (this.collision(piece)) {
            this.placeTetromino();
            this.gameOver = true;
            return;
        }
        piece.requiresRedraw = true;
        if (!this.human) {
            let bestPosition = this.getBestDrop(piece);
            this.moveToCoords(piece, bestPosition.column, bestPosition.rotation);
        }
        piece.requiresRedraw = true;
    }
    deletePiece() {
        delete this.currentPiece;
    }
    clearLines(noScore = false) {
        let numRowsCleared = 0;
        for (let row = 0; row < BoardRows; row++) {
            let isRowFull = true;
            for (let column = 0; column < BoardColumns; column++) {
                if (this.tiles[row][column] === " ") {
                    isRowFull = false;
                }
            }
            if (isRowFull) {
                //move down rows
                this.tiles.splice(row, 1);
                this.tiles.unshift([]);
                for (let column = 0; column < BoardColumns; column++) {
                    this.tiles[0].push(" ");
                }
                numRowsCleared++;
            }
        }
        if (noScore)
            return numRowsCleared;
        this.lines += numRowsCleared;
        this.linesUntilNextLevel -= numRowsCleared;
        if (this.linesUntilNextLevel <= 0) {
            this.linesUntilNextLevel = 10;
            this.level++;
        }
        switch (numRowsCleared) {
            case 1:
                this.score += (this.level + 1) * 40;
                break;
            case 2:
                this.score += (this.level + 1) * 100;
                break;
            case 3:
                this.score += (this.level + 1) * 300;
                break;
            case 4:
                this.score += (this.level + 1) * 1200;
                break;
        }
        this.requiresRedraw = true;
    }
    collision(tetromino = this.currentPiece, column = null, row = null) {
        let x = column == null ? tetromino.x : column;
        let y = row == null ? tetromino.y : row;
        for (let row = 0; row < tetromino.pattern.length; row++) {
            for (let column = 0; column < tetromino.pattern.length; column++) {
                if (!tetromino.pattern[row][column])
                    continue;
                let newX = column + x;
                let newY = row + y;
                //console.log(column, x)
                //collision against wall
                if (newX < 0 || newX >= BoardColumns || newY >= BoardRows)
                    return true;
                //collision against other piece
                if (this.tiles[newY][newX] !== " ")
                    return true;
            }
        }
        return false;
    }
    getDropRow(tetromino, column = null) {
        let x = column === null ? tetromino.x : column;
        let collision = false;
        let y = tetromino.y;
        while (!collision) {
            y++;
            collision = this.collision(tetromino, x, y);
        }
        return y - 1;
    }
    hardDrop(tetromino, column = null) {
        let x = column === null ? tetromino.x : column;
        let row = this.getDropRow(tetromino, x);
        tetromino.x = x;
        tetromino.y = row;
        this.lock(tetromino);
    }
    getHeights() {
        let heights = [];
        for (let column = 0; column < BoardColumns; column++) {
            heights[column] = 0;
            for (let row = 0; row < BoardRows; row++) {
                if (this.tiles[row][column] !== " ") {
                    heights[column] = BoardRows - row;
                    break;
                }
            }
        }
        return heights;
    }
    countGaps() {
        let heights = this.getHeights();
        let gaps = [];
        for (let column = 0; column < BoardColumns; column++) {
            gaps[column] = 0;
            for (let row = BoardRows - heights[column]; row < BoardRows; row++) {
                if (this.tiles[row][column] === " ") {
                    gaps[column]++;
                }
            }
        }
        return gaps;
    }
    getScores(linesCleared) {
        let heights = this.getHeights();
        let diff = heights.slice(1).map(function (n, i) { return Math.abs(n - heights[i]); });
        let boardScores = [
            math.sum(this.countGaps()),
            math.mean(heights),
            math.std(heights),
            (math.max(heights) - math.min(heights)),
            math.max(diff),
            linesCleared //Lines that would be cleared by the piece
        ];
        return math.dot(boardScores, this.weights);
    }
    moveToCoords(tetromino, x, rotation) {
        let timeout = false;
        if (tetromino.rotation !== rotation) {
            this.rotate(tetromino);
            timeout = true;
        }
        if (tetromino.x !== x) {
            if (tetromino.x < x)
                this.move(tetromino, 1, 0);
            else
                this.move(tetromino, -1, 0);
            timeout = true;
        }
        if (timeout) {
            setTimeout(() => {
                console.log(this);
                this.moveToCoords(tetromino, x, rotation);
            }, botMoveSpeed);
            return;
        }
        this.hardDrop(tetromino);
    }
    getBestDrop(tetromino) {
        console.log(tetromino.type);
        let bestRotation = 0;
        let bestColumn = 0;
        let bestScore = Infinity;
        let piece = tetromino.copy();
        for (let rotation = 0; rotation < 4; rotation++) {
            for (let column = -2; column < BoardColumns - 1; column++) {
                if (this.collision(piece, column))
                    continue;
                let b = this.copy();
                let row = b.getDropRow(piece, column);
                b.placeTetromino(piece, column, row);
                let lines = b.clearLines(true);
                let score = b.getScores(lines);
                if (score < bestScore) {
                    bestScore = score;
                    bestRotation = rotation;
                    bestColumn = column;
                    console.log(b.tiles);
                }
            }
            if (piece.type === "O")
                break;
            this.rotate(piece);
        }
        return {
            column: bestColumn,
            rotation: bestRotation
        };
    }
}
// https://github.com/omgimanerd/tetris-bot/blob/genetic_algorithm/lib/field.py#L136
export class Tetris {
    constructor(human, boardScale, drawBoard) {
        this.isAlive = true;
        //Initialisation
        this.myTetris = $(`<div class="tetris">` +
            `<canvas id='tetris' width='${boardScale * SquareSize * BoardColumns}' height='${boardScale * SquareSize * BoardRows}'></canvas><br>` +
            `Level: <span class='level'>0</span><br>` +
            `Score: <span class='score'>0</span><br>` +
            `Lines: <span class='lines'>0</span>` +
            `</div>`).appendTo($("#tetrisContainer"));
        this.canvas = this.myTetris.find("canvas")[0];
        this.context = this.canvas.getContext("2d");
        this.levelText = this.myTetris.prepend();
        this.scoreText = this.myTetris.find(".score");
        this.linesText = this.myTetris.find(".lines");
        this.board = new Board();
        this.board.human = human;
        this.board.weights = weights;
        this.boardScale = boardScale;
        if (human)
            document.addEventListener("keydown", this.getInput);
        this.board.nextPiece();
        this.boundUpdate = this.update.bind(this);
        this.update();
    }
    // Called every frame
    update() {
        this.board.update();
        if (this.board.gameOver) {
            this.gameOver();
            return;
        }
        if (this.board.requiresRedraw) {
            this.drawBoard();
        }
        this.drawPiece(this.board.currentPiece);
        this.updateScores();
        requestAnimationFrame(this.boundUpdate);
    }
    getInput(event) {
        event.preventDefault();
        if (event.keyCode === 116)
            window.location.reload();
        switch (event.keyCode) {
            case 65:
            case 37:
                //Left
                this.board.move(this.board.currentPiece, -1, 0);
                break;
            case 87:
            case 38:
                //Up
                this.board.rotate(this.board.currentPiece);
                break;
            case 68:
            case 39:
                //Right
                this.board.move(this.board.currentPiece, 1, 0);
                break;
            case 83:
            case 40:
                //Down
                this.board.move(this.board.currentPiece, 0, 1);
                break;
            case 32:
                //Space
                this.board.hardDrop(this.board.currentPiece);
                break;
        }
    }
    updateScores() {
        this.levelText.html(this.board.level.toString());
        this.scoreText.html(this.board.score.toString());
        this.linesText.html(this.board.lines.toString());
    }
    drawBoard(force = false) {
        if (!this.draw && !force)
            return;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let row = 0; row < BoardRows; row++) {
            for (let column = 0; column < BoardColumns; column++) {
                this.drawSquare(column, row, tetrominos[this.board.tiles[row][column]].color);
            }
        }
        // if (this.currentPiece)
        //     this.currentPiece.draw()
    }
    drawPiece(piece, ghost = false) {
        let yPos = ghost ? this.board.getDropRow(piece) : piece.y;
        for (let row = 0; row < piece.pattern.length; row++) {
            for (let column = 0; column < piece.pattern.length; column++) {
                if (piece.pattern[row][column])
                    this.drawSquare(piece.x + column, yPos + row, piece.color + (ghost ? "30" : ""));
            }
        }
    }
    drawSquare(x, y, color) {
        let size = SquareSize * this.boardScale;
        this.context.fillStyle = color;
        this.context.fillRect(x * size, y * size, size, size);
        this.context.fillStyle = "#ffffff40";
        this.context.fillRect(x * size + size * 0.25, y * size + size * 0.25, size * 0.5, size * 0.5);
        this.context.strokeStyle = "black";
        this.context.lineWidth = 0.2;
        this.context.strokeRect(x * size, y * size, size, size);
    }
    gameOver() {
        this.isAlive = false;
        this.board.deletePiece();
        this.drawBoard(true);
        this.context.fillStyle = "#33333388";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.font = `${this.canvas.width / 6}px Arial`;
        this.context.textAlign = "center";
        this.context.fillStyle = "#fff";
        this.context.fillText("Game Over!", this.canvas.width / 2, this.canvas.height / 2);
        delete this.boundUpdate;
    }
}
