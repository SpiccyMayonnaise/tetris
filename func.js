function rotateMatrix(matrix) {          // function statement
    const N = matrix.length - 1;   // use a constant
    // use arrow functions and nested map;
    const result = matrix.map((row, i) =>
        row.map((val, j) => matrix[N - j][i])
    );
    matrix.length = 0;       // hold original array reference
    matrix.push(...result);  // Spread operator
    return matrix;
}

function* pieceGenerator() {
    let pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    let order = [];

    // Create 35 pool.
    let pool = pieces.concat(pieces, pieces, pieces, pieces);

    // First piece special conditions
    const firstPiece = ['I', 'J', 'L', 'T'][Math.floor(Math.random() * 4)];
    yield firstPiece;

    let history = ['S', 'Z', 'S', firstPiece];

    while (true) {
        let roll;
        let i;
        let piece;

        // Roll For piece
        for (roll = 0; roll < 6; ++roll) {
            i = Math.floor(Math.random() * 35);
            piece = pool[i];
            if (history.includes(piece) === false || roll === 5) {
                break;
            }
            if (order.length) pool[i] = order[0];
        }

        // Update piece order
        if (order.includes(piece)) {
            order.splice(order.indexOf(piece), 1);
        }
        order.push(piece);

        pool[i] = order[0];

        // Update history
        history.shift();
        history[3] = piece;

        yield piece;
    }
}
let randomPiece = pieceGenerator()