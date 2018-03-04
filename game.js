"use strict";
var Board = (function () {
    function Board(height, width) {
        this.height = height;
        this.width = width;
    }
    Board.prototype.buildBoard = function () {
        var board = new Array(this.height * this.width);
        var i, j;
        for (i = 0; i < this.height; i++) {
            for (j = 0; j < this.width; j++) {
                board[this.boardIndex(i, j)] = new Square(i, j);
            }
        }
        return board;
    };
    Board.prototype.getNeighbors = function (row, col) {
        var neighbors = new Array(9);
        var i, j;
        for (i = -1; i <= 1; i++) {
            for (j = -1; j <= 1; j++) {
                if (!(i == 0 && j == 0)) {
                    var neighborRow = row + i;
                    var neighborCol = col + j;
                    if (neighborRow >= 0 && neighborCol >= 0 &&
                        neighborRow < this.height && neighborCol < this.width) {
                        neighbors.push(this.board[this.boardIndex(neighborRow, neighborCol)]);
                    }
                }
            }
        }
        return neighbors;
    };
    Board.prototype.boardIndex = function (row, col) {
        return row * this.width + col;
    };
    Board.prototype.get = function (row, col) {
        return this.board[this.boardIndex(row, col)];
    };
    Board.prototype.length = function () {
        return this.board.length;
    };
    Board.prototype.toString = function () {
        var res = "[";
        var i;
        for (i = 0; i < this.board.length - 1; i++) {
            res = res + this.board[i].surroundings + ", ";
        }
        res = res + this.board[this.board.length - 1].surroundings + "]";
        return res;
    };
    return Board;
}());
var Square = (function () {
    function Square(row, col) {
        this.row = row;
        this.col = col;
        this.isOpen = false;
        this.surroundings = 0;
    }
    Square.prototype.open = function () {
        this.isOpen = !this.isOpen;
    };
    return Square;
}());
