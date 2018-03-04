"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var SQUARE_WIDTH_PX = 36;
var MINE_CHAR = '✹';
var FLAG_CHAR = '⚐';
var FLAG_CHAR_SOLID = '⚑';
var DEFAULT_MESSAGE = 'You win!';
var isPlaying = false;
var game;
var counter;
var timer;
var startTime;
var MinesweeperBoard = (function (_super) {
    __extends(MinesweeperBoard, _super);
    function MinesweeperBoard(height, width) {
        var _this = _super.call(this, height, width) || this;
        _this.board = _this.buildBoard();
        return _this;
    }
    MinesweeperBoard.prototype.buildBoard = function () {
        var board = new Array(this.height * this.width);
        var i, j;
        for (i = 0; i < this.height; i++) {
            for (j = 0; j < this.width; j++) {
                board[this.boardIndex(i, j)] = new MinesweeperSquare(i, j);
            }
        }
        return board;
    };
    return MinesweeperBoard;
}(Board));
var MinesweeperSquare = (function (_super) {
    __extends(MinesweeperSquare, _super);
    function MinesweeperSquare(row, col) {
        var _this = _super.call(this, row, col) || this;
        _this.isMine = false;
        _this.isFlagged = false;
        _this.isQuestioned = false;
        return _this;
    }
    MinesweeperSquare.prototype.layMine = function () {
        this.isMine = true;
    };
    MinesweeperSquare.prototype.setFlag = function () {
        this.isFlagged = true;
    };
    MinesweeperSquare.prototype.open = function () {
        if (!this.isFlagged && !this.isQuestioned) {
            if (this.isMine) {
                return 'explode';
            }
            else if (!this.surroundings) {
                if (!this.isOpen) {
                    return 'blank';
                }
            }
            else if (this.surroundings) {
                return 'numbered';
            }
        }
    };
    MinesweeperSquare.prototype.flag = function () {
        if (this.isMine) {
            if (!this.isFlagged && !this.isQuestioned) {
                return 'increment';
            }
            else if (this.isFlagged) {
                return 'decrement';
            }
        }
        else {
            return 'nop';
        }
    };
    return MinesweeperSquare;
}(Square));
var Minesweeper = (function () {
    function Minesweeper(body, height, width, numMines) {
        this.flagMode = false;
        this.reset(body, height, width, numMines);
    }
    Minesweeper.prototype.reset = function (body, height, width, numMines) {
        hideMessage();
        isPlaying = false;
        document.getElementById('time-counter').innerHTML = '000';
        if (this.flagMode) {
            var flagModeElement = document.getElementById('flag-mode');
            flagModeElement.click();
        }
        this.gameBody = body;
        this.mineCounter = document.getElementById('mine-counter');
        this.width = width;
        this.height = height;
        this.numMines = numMines;
        this.numFlags = 0;
        this.minesFlagged = 0;
        while (this.gameBody.firstChild) {
            this.gameBody.removeChild(this.gameBody.firstChild);
        }
        updateMineCounter(this.numMines);
        this.populate();
        this.board = new MinesweeperBoard(this.height, this.width);
        this.layMines();
        this.gameBody.style.pointerEvents = "auto";
    };
    Minesweeper.prototype.layMines = function () {
        var area = this.height * this.width;
        console.assert(this.numMines <= area, "Number of mines greater than board area. Please take it easy on the mines.");
        var minesToLay = Math.min(this.numMines, area);
        var i;
        for (i = 0; i < minesToLay; i++) {
            var layed = false;
            while (!layed) {
                var row = Math.floor(Math.random() * this.height);
                var col = Math.floor(Math.random() * this.width);
                var thisSquare = this.board.get(row, col);
                if (!thisSquare.isMine) {
                    thisSquare.isMine = true;
                    var neighbors = this.board.getNeighbors(row, col);
                    neighbors.forEach(function (neighbor) {
                        neighbor.surroundings++;
                    });
                    layed = true;
                }
            }
        }
    };
    Minesweeper.prototype.populate = function () {
        var i, j;
        for (i = 0; i < this.height; i++) {
            var row = document.createElement('div');
            row.className = 'row';
            for (j = 0; j < this.width; j++) {
                var square = document.createElement('div');
                square.onmousedown = function () { setFace('o:'); };
                square.onmouseup = function () { setFace('|:'); };
                square.onclick = reveal;
                square.oncontextmenu = flag;
                square.id = i + ',' + j;
                square.className = 'square';
                row.appendChild(square);
            }
            this.gameBody.appendChild(row);
        }
        var flagMode = document.getElementById('flag-mode');
        flagMode.onclick = function () {
            game.flagMode = !game.flagMode;
            var child = this.firstChild;
            if (game.flagMode) {
                child.innerHTML = FLAG_CHAR_SOLID;
            }
            else {
                child.innerHTML = FLAG_CHAR;
            }
        };
        var nPix = this.width * SQUARE_WIDTH_PX;
        var gameArea = document.getElementById('game-area');
        gameArea.style.width = nPix + "px";
        var message = document.getElementById('message').firstChild;
        message.style.fontSize = 1 + 0.005 * nPix + 'em';
        setFace('|:');
    };
    Minesweeper.prototype.getColor = function (nearbyMines) {
        switch (nearbyMines) {
            case 1:
                return '#0000dd';
            case 2:
                return 'green';
            case 3:
                return 'red';
            case 4:
                return 'purple';
            case 5:
                return 'maroon';
            case 6:
                return 'turquoise';
            case 7:
                return 'black';
            case 8:
                return 'gray';
            default:
                return 'yellow';
        }
    };
    Minesweeper.prototype.explode = function () {
        this.gameBody.style.pointerEvents = "none";
        isPlaying = false;
        var i, j;
        for (i = 0; i < this.height; i++) {
            for (j = 0; j < this.width; j++) {
                var square = this.board.get(i, j);
                if (square.isMine && !square.isFlagged) {
                    var id = this.idFromBoard(i, j);
                    document.getElementById(id).innerHTML = MINE_CHAR;
                }
                else if (!square.isMine && square.isFlagged) {
                    var id = this.idFromBoard(i, j);
                    var element = document.getElementById(id);
                    element.innerHTML = FLAG_CHAR_SOLID;
                    element.style.color = '#d00';
                }
            }
        }
        setFace('D:');
        showMessage("~*boom*~");
        console.log("~boom~");
    };
    Minesweeper.prototype.checkWin = function () {
        if (this.minesFlagged == this.numMines && this.minesFlagged == this.numFlags) {
            var i = void 0, j = void 0;
            for (i = 0; i < this.height; i++) {
                for (j = 0; j < this.width; j++) {
                    var square = this.board.get(i, j);
                    if (!square.isOpen && !square.isFlagged) {
                        return false;
                    }
                }
            }
            this.win(DEFAULT_MESSAGE);
            return true;
        }
    };
    Minesweeper.prototype.win = function (message) {
        this.gameBody.style.pointerEvents = "none";
        isPlaying = false;
        setFace('C:');
        showMessage(message);
        console.log("~hooray~");
    };
    Minesweeper.prototype.getFlags = function (row, col) {
        var neighbors = this.board.getNeighbors(row, col);
        var nFlags = 0;
        neighbors.forEach(function (neighbor) {
            if (neighbor.isFlagged) {
                nFlags++;
            }
        });
        return nFlags;
    };
    Minesweeper.prototype.openBlanks = function (row, col) {
        var toVisit = [this.board.get(row, col)];
        var visited = new Set();
        var _loop_1 = function () {
            var thisSquare = toVisit.shift();
            var id = this_1.idFromBoard(thisSquare.row, thisSquare.col);
            var squareElement = document.getElementById(id);
            this_1.reveal(squareElement);
            var neighbors = this_1.board.getNeighbors(thisSquare.row, thisSquare.col);
            neighbors.forEach(function (neighbor) {
                if (!visited.has(neighbor) &&
                    thisSquare.surroundings == 0) {
                    toVisit.push(neighbor);
                    visited.add(neighbor);
                }
            });
        };
        var this_1 = this;
        while (toVisit.length > 0) {
            _loop_1();
        }
    };
    Minesweeper.prototype.openNumbered = function (row, col) {
        var square = this.board.get(row, col);
        if (this.getFlags(row, col) == square.surroundings) {
            var neighbors = this.board.getNeighbors(row, col);
            neighbors.forEach(function (neighbor) {
                if (!neighbor.isOpen && !neighbor.isFlagged) {
                    var id = neighbor.row + ',' + neighbor.col;
                    var neighborElement = document.getElementById(id);
                    var prevFlagMode = game.flagMode;
                    game.flagMode = false;
                    neighborElement.click();
                    game.flagMode = prevFlagMode;
                }
            });
        }
    };
    Minesweeper.prototype.reveal = function (element) {
        var stringIndex = element.id.split(',');
        var row = parseInt(stringIndex[0]);
        var col = parseInt(stringIndex[1]);
        var id = game.idFromBoard(row, col);
        var square = game.board.get(row, col);
        var result = square.open();
        switch (result) {
            case 'blank':
                square.isOpen = true;
                element.className = 'square revealed';
                break;
            case 'numbered':
                if (!square.isOpen) {
                    square.isOpen = true;
                    element.className = 'square revealed';
                    element.innerHTML = String(square.surroundings);
                    element.style.color = game.getColor(square.surroundings);
                }
                break;
            case 'explode':
                element.className = 'square exploded';
                element.innerHTML = MINE_CHAR;
                game.explode();
                break;
        }
        game.checkWin();
    };
    Minesweeper.prototype.idFromBoard = function (row, col) {
        return row + ',' + col;
    };
    return Minesweeper;
}());
function reveal() {
    var stringIndex = this.id.split(',');
    var row = parseInt(stringIndex[0]);
    var col = parseInt(stringIndex[1]);
    var id = game.idFromBoard(row, col);
    var square = game.board.get(row, col);
    var element = document.getElementById(id);
    if (!isPlaying) {
        isPlaying = true;
        updateTime(true);
    }
    if (game.flagMode && !square.isOpen) {
        var boundFlag = flag.bind(this);
        boundFlag();
    }
    else {
        var result = square.open();
        switch (result) {
            case 'blank':
                square.isOpen = true;
                element.className = 'square revealed';
                game.openBlanks(row, col);
                break;
            case 'numbered':
                if (!square.isOpen) {
                    square.isOpen = true;
                    element.className = 'square revealed';
                    element.innerHTML = String(square.surroundings);
                    element.style.color = game.getColor(square.surroundings);
                }
                else {
                    var boundOpenNumbered = game.openNumbered.bind(game, row, col);
                    boundOpenNumbered();
                }
                break;
            case 'explode':
                element.className = 'square exploded';
                element.innerHTML = MINE_CHAR;
                game.explode();
                break;
        }
    }
    game.checkWin();
}
function flag() {
    var stringIndex = this.id.split(',');
    var row = parseInt(stringIndex[0]);
    var col = parseInt(stringIndex[1]);
    var id = game.idFromBoard(row, col);
    var squareOnBoard = game.board.get(row, col);
    var squareElement = document.getElementById(id);
    var result = squareOnBoard.flag();
    if (!isPlaying) {
        isPlaying = true;
        updateTime(true);
    }
    switch (result) {
        case 'increment':
            game.minesFlagged++;
            break;
        case 'decrement':
            game.minesFlagged--;
            break;
    }
    if (!squareOnBoard.isOpen) {
        if (squareOnBoard.isFlagged) {
            game.numFlags--;
            squareOnBoard.isFlagged = false;
            squareOnBoard.isQuestioned = true;
            squareElement.innerHTML = '?';
            updateMineCounter(game.numMines - game.numFlags);
        }
        else if (squareOnBoard.isQuestioned) {
            squareOnBoard.isQuestioned = false;
            squareOnBoard.isFlagged = false;
            squareElement.innerHTML = '';
        }
        else {
            game.numFlags++;
            squareOnBoard.isFlagged = true;
            squareElement.innerHTML = FLAG_CHAR;
            updateMineCounter(game.numMines - game.numFlags);
        }
    }
    if (game.minesFlagged == game.numMines) {
        game.checkWin();
    }
    return false;
}
function reset() {
    var gameBody = document.getElementById('game-body');
    var boxHeight = document.getElementById('height');
    var boxWidth = document.getElementById('width');
    var numMines = document.getElementById('mines');
    game.reset(gameBody, parseInt(boxHeight.value), parseInt(boxWidth.value), parseInt(numMines.value));
}
function buttonPress() {
    if (this.classList.contains('default')) {
        this.classList.remove('default');
        this.classList.add('pressed');
    }
    else if (this.classList.contains('pressed')) {
        this.classList.remove('pressed');
        this.classList.add('default');
    }
}
function updateMineCounter(currCount) {
    var mineCount = currCount.toString();
    var update = "0";
    counter.innerHTML = update.repeat(3 - mineCount.length) + mineCount;
}
function updateTime(start) {
    if (start === void 0) { start = false; }
    if (start) {
        startTime = Date.now();
    }
    if (isPlaying) {
        var secsPassed = ((Date.now() - startTime) / 1000).toString();
        var update = secsPassed.substring(0, secsPassed.indexOf('.'));
        if (update.length < 4) {
            timer.innerHTML = '0'.repeat(3 - update.length) + update;
        }
    }
}
function setFace(face) {
    document.getElementById('face').innerHTML = face;
}
function showMessage(message) {
    var messageElement = document.getElementById('message');
    messageElement.firstChild.innerHTML = message;
    messageElement.style.display = 'block';
}
function hideMessage() {
    var messageElement = document.getElementById('message');
    messageElement.style.display = 'none';
}
window.onload = function () {
    counter = document.getElementById('mine-counter');
    timer = document.getElementById('time-counter');
    setInterval(updateTime, 1000);
    var resetButton = document.getElementById('minesweeper-face');
    resetButton.onclick = reset;
    resetButton.onmousedown = function () { setFace('D8'); };
    resetButton.onmouseup = function () { setFace('|:'); };
    var gameBody = document.getElementById('game-body');
    var boxWidth = document.getElementById('width');
    var boxHeight = document.getElementById('height');
    var numMines = document.getElementById('mines');
    game = new Minesweeper(gameBody, parseInt(boxHeight.value), parseInt(boxWidth.value), parseInt(numMines.value));
};
