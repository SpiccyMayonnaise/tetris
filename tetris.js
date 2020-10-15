const SquareSize = 20;

const BoardRows = 20;
const BoardColumns = 10;

const weights = [
  //Smaller weight is better

  //Total gaps weight
  1,

  //Average height weights
  1,

  //Standard deviation of heights weight
  1,

  //Range of heights weight
  1,

  //Lines that would be cleared weight
  -1000
]

let dropSpeed = 1;
let botMoveSpeed = 100;

let startingLevel = 0;

class TetrominoDef {

}

tetrominos = {
    "T" : {
        pattern: [
            [0,0,0],
            [1,1,1],
            [0,1,0]
        ],
        color: "#8030a0"
    },
    "L" : {
        pattern: [
            [0,1,0],
            [0,1,0],
            [0,1,1]
        ],
        color: "#d06000"
    },
    "J" : {
        pattern: [
            [0,1,0],
            [0,1,0],
            [1,1,0]
        ],
        color: "#0030c0"
    },
    "S" : {
        pattern: [
            [1,0,0],
            [1,1,0],
            [0,1,0]
        ],
        color: "#50c040"
    },
    "Z" : {
        pattern: [
            [0,0,1],
            [0,1,1],
            [0,1,0]
        ],
        color: "#d03030"
    },
    "I" : {
        pattern: [
            [0,1,0,0],
            [0,1,0,0],
            [0,1,0,0],
            [0,1,0,0]
        ],
        color: "#20d0c0"
    },
    "O" : {
        pattern: [
            [0,0,0,0],
            [0,1,1,0],
            [0,1,1,0],
            [0,0,0,0]
        ],
        color: "#f0d000"
    },
    " " : {
        pattern: [],
        color: "transparent"
    }
};

// https://github.com/omgimanerd/tetris-bot/blob/genetic_algorithm/lib/field.py#L136

function tetris(human, boardScale, drawBoard) {

    class Piece {
        constructor(type, tetrisBoard, x = 0, y = 0) {
            this.pattern = tetrominos[type].pattern;
            this.color = tetrominos[type].color;
            this.type = type;
            this.board = tetrisBoard;

            this.x = x;
            this.y = y;
            this.rotation = 0;

            this.dropStart = Date.now();
            this.boundDrop = this.drop.bind(this)
        }
        draw(ghost = false) {
            if (!drawBoard || drawBoard === 2)
                return

            for (let row = 0; row < this.pattern.length; row++) {
                for (let column = 0; column < this.pattern.length; column++) {
                    if (this.pattern[row][column])
                        drawSquare(this.x + column, this.y + row, this.color + (ghost ? "30" : ""))
                }
            }
        }
        copy() {
            return new Piece(this.type, this.board, this.x, this.y)
        }
        rotate(target = null) {
            let nextRotation = this.copy()
            while (this.rotation !== target) {
                nextRotation.pattern = rotateMatrix(nextRotation.pattern)
                while (this.board.collision(nextRotation)) {
                    if (this.x < 0)
                        this.move(1, 0)
                    else if (this.x > BoardColumns - 3)
                        this.move(-1, 0)
                    else
                        return
                }

                this.rotation++
                if (this.rotation === 4)
                    this.rotation = 0

                if (target === null)
                    break
            }
            this.pattern = nextRotation.pattern
            board.draw();
            this.ghost()
        }
        move(x, y) {
            if (this.board.collision(this, this.x + x, this.y + y)) {
                if (y > 0) {
                    this.lock();
                }
                return false
            }
            this.y += y;
            this.x += x;

            board.draw();
            this.ghost()
            return true
        }
        ghost() {
            let ghost = this.copy()
            ghost.y = board.getDropRow(ghost)
            ghost.draw(true)
        }
        drop() {
            if (!this.boundDrop)
                return

            if (Date.now() - this.dropStart > 1000 * dropSpeed * Math.pow(0.9, level)) {
                this.move(0, 1)
                this.dropStart = Date.now();
            }
            requestAnimationFrame(this.boundDrop)
        }
        lock() {
            this.board.placeTetromino(this)
            delete this.boundDrop

            //check to clear row
            this.board.clearLines()
            this.board.nextPiece()
        }
    }

    class Board {
        constructor(board = false) {
            if (board)
                this.board = board
            else {
                this.board = []
                for (let row = 0; row < BoardRows; row++) {
                    this.board[row] = [];
                    for (let column = 0; column < BoardColumns; column++) {
                        this.board[row][column] = " ";
                    }
                }
            }
            this.draw()

            this.currentPiece = false
        }
        draw(force = false) {
            if (!drawBoard && !force)
                return

            Context.clearRect(0, 0, Canvas.width, Canvas.height);
            for (let row = 0; row < BoardRows; row++) {
                for (let column = 0; column < BoardColumns; column++) {
                    drawSquare(column, row, tetrominos[this.board[row][column]].color)
                }
            }
            if (this.currentPiece)
                this.currentPiece.draw()
        }
        copy() {
            return new Board(JSON.parse(JSON.stringify(this.board)))
        }
        placeTetromino(piece = this.currentPiece, column = null, row = null) {
			let x = column == null ? piece.x : column
			let y = row == null ? piece.y : row
            for (let row = 0; row < piece.pattern.length; row++) {
                for (let column = 0; column < piece.pattern.length; column++) {
                    if (piece.pattern[row][column]) {
                        this.board[y + row][x + column] = piece.type;
                    }
                }
            }
        }
        nextPiece() {
            this.deletePiece()
            let type = randomPiece.next().value
            let piece = new Piece(type, this);
            piece.x = BoardColumns / 2 - 2
            this.currentPiece = piece
            if (this.collision(piece)) {
                this.placeTetromino()
                this.draw()
                gameOver()
                return
            }
            this.draw()
			piece.drop()
            piece.ghost()

			let bestPosition = this.getBestDrop(piece)

            if (!human)
                this.moveToCoords(piece, bestPosition.column, bestPosition.rotation)

            piece.draw()
        }
        deletePiece() {
            delete this.currentPiece.boundDrop;
            delete this.currentPiece;
        }
        clearLines(noScore = false) {
            let numRowsCleared = 0
            for (let row = 0; row < BoardRows; row++) {
                let isRowFull = true
                for (let column = 0; column < BoardColumns; column++) {
                    if (this.board[row][column] === " ") {
                        isRowFull = false
                    }
                }
                if (isRowFull) {
                    //move down rows
                    this.board.splice(row, 1)
                    this.board.unshift([])
                    for (let column = 0; column < BoardColumns; column++) {
                        this.board[0].push(" ");
                    }
                    numRowsCleared++
                }
            }
            if (noScore)
                return numRowsCleared

            lines += numRowsCleared
            linesUntilNextLevel -= numRowsCleared
            if (linesUntilNextLevel <= 0) {
                linesUntilNextLevel = 10;
                level++
            }
            switch (numRowsCleared) {
                case 1:
                    score += (level + 1) * 40
                    break
                case 2:
                    score += (level + 1) * 100
                    break
                case 3:
                    score += (level + 1) * 300
                    break
                case 4:
                    score += (level + 1) * 1200
                    break
            }
            updateScores()
            this.draw()
        }
        collision(tetromino = this.currentPiece, column = null, row = null) {
            let x = column == null ? tetromino.x : column
            let y = row == null ? tetromino.y : row

            for (let row = 0; row < tetromino.pattern.length; row++) {
                for (let column = 0; column < tetromino.pattern.length; column++) {
                    if (!tetromino.pattern[row][column])
                        continue

                    let newX = column + x;
                    let newY = row + y;

                    //console.log(column, x)

                    //collision against wall
                    if (newX < 0 || newX >= BoardColumns || newY >= BoardRows)
                        return true
                    //collision against other piece
                    if (this.board[newY][newX] !== " ")
                        return true;

                }
            }
            return false
        }
		getDropRow(tetromino, column = null) {
			let x = column === null ? tetromino.x : column;
            let collision = false;
            let y = tetromino.y;
            while (!collision) {
                y++
                collision = this.collision(tetromino, x, y)
            }
            return y - 1;
		}
        hardDrop(tetromino, column = null) {
			let x = column === null ? tetromino.x : column
            let row = this.getDropRow(tetromino, x)
            tetromino.x = x;
            tetromino.y = row;
            tetromino.lock();
        }
        getHeights() {
            let heights = [];
            for (let column = 0; column < BoardColumns; column++) {
                heights[column] = 0
                for (let row = 0; row < BoardRows; row++) {
                    if (this.board[row][column] !== " ") {
                        heights[column] = BoardRows - row
                        break
                    }
                }
            }
            return heights
        }
        countGaps() {
            let heights = this.getHeights();
            let gaps = []
            for (let column = 0; column < BoardColumns; column++) {
                gaps[column] = 0
                for (let row = BoardRows - heights[column]; row < BoardRows; row++) {
                    if (this.board[row][column] === " ") {
                        gaps[column]++
                    }
                }
            }
            return gaps
        }
        getScores(linesCleared) {
            let heights = this.getHeights();
            let diff = heights.slice(1).map(function(n, i) { return Math.abs(n - heights[i]); });

            return([ //Lower scores are better than higher scores
                math.sum(this.countGaps()) * weights[0], //Total gaps
                math.mean(heights) * weights[1], //Average of heights
                math.std(heights) * weights[2], //Standard deviation of heights
                (math.max(heights) - math.min(heights)) * weights[3], //Range of heights
                math.max(diff) * weights[4], //Maximum consecutive difference in heights
                linesCleared * weights[5] //Lines that would be cleared by the piece
            ])
        }
        moveToCoords(tetromino, x, rotation) {
            let timeout = false;
            if (tetromino.rotation !== rotation) {
                tetromino.rotate()
                timeout = true
            }
            if (tetromino.x !== x) {
                if (tetromino.x < x)
                    tetromino.move(1,0)
                else
                    tetromino.move(-1,0)
                timeout = true
            }
            if (timeout) {
                setTimeout(() => {
                    console.log(this)
                    this.moveToCoords(tetromino, x, rotation)
                }, botMoveSpeed)
                return
            }

            this.hardDrop(tetromino)
        }
		getBestDrop(tetromino, weighting = null) {
            console.log(tetromino.type)
			let bestRotation = 0;
			let bestColumn = 0;
			let bestScore = Infinity;
            let piece = tetromino.copy();
			for (let rotation = 0; rotation < 4; rotation++) {
				for (let column = -2; column < BoardColumns - 1; column++) {
				    if (this.collision(piece, column))
				        continue

					let b = this.copy()
					let row = b.getDropRow(piece, column)
					b.placeTetromino(piece, column, row)
                    let lines = b.clearLines(true)
                    let score = math.sum(b.getScores(lines));

				    if (score < bestScore) {
				        bestScore = score
				        bestRotation = rotation
                        bestColumn = column
                        console.log(b.board)
                    }
				}
                if (piece.type === "O")
                    break
                piece.rotate()
			}
			return {
				column: bestColumn,
				rotation: bestRotation
			}
		}
    }

    //Initialisation
    let myTetris = $(
        `<div class="tetris">` +
        `<canvas id='tetris' width='${boardScale * SquareSize * BoardColumns}' height='${boardScale * SquareSize * BoardRows}'></canvas><br>` +
        `Level: <span class='level'>0</span><br>` +
        `Score: <span class='score'>0</span><br>` +
        `Lines: <span class='lines'>0</span>` +
        `</div>`
    ).appendTo($("#tetrisContainer"))

    const Canvas = myTetris.find("canvas")[0]
    const Context = Canvas.getContext("2d");

    let isAlive = true
    let level = startingLevel;
    let score = 0;
    let lines = 0;
    let linesUntilNextLevel = level * 10 + 10;
    updateScores()

    let board = new Board()

    if (human)
        document.addEventListener("keydown", getInput);

    board.nextPiece()

    function drawSquare(x, y, color) {
        let size = SquareSize * boardScale
        Context.fillStyle = color;
        Context.fillRect(x * size, y * size, size, size);
        Context.fillStyle = "#ffffff40";
        Context.fillRect(x * size + size * 0.25, y * size + size * 0.25, size * 0.5, size * 0.5);
        Context.strokeStyle = "black";
        Context.lineWidth = 0.2;
        Context.strokeRect(x * size, y * size, size, size)
    }

    function getInput(event) {
        event.preventDefault()

        if (event.keyCode === 116)
            window.location.reload()

        switch (event.keyCode) {
            case 65:
            case 37:
                //Left
                board.currentPiece.move(-1, 0)
                break
            case 87:
            case 38:
                //Up
                board.currentPiece.rotate()
                break
            case 68:
            case 39:
                //Right
                board.currentPiece.move(1, 0)
                break
            case 83:
            case 40:
                //Down
                board.currentPiece.move(0, 1)
                break
            case 32:
                //Space
                board.hardDrop(board.currentPiece)
                break
        }
    }

    function updateScores() {
        myTetris.find(".level").html(level)
        myTetris.find(".score").html(score)
        myTetris.find(".lines").html(lines)
    }

    function gameOver() {
        isAlive = false
        board.deletePiece()
		board.draw(true)
        Context.fillStyle = "#33333388"
        Context.fillRect(0, 0, Canvas.width, Canvas.height)
        Context.font = `${Canvas.width / 6}px Arial`
        Context.textAlign = "center";
        Context.fillStyle = "#fff"
        Context.fillText("Game Over!", Canvas.width/2, Canvas.height/2);
    }
}
