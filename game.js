/* Lucas Schaack
 * thanks to https://www.martinstoeckli.ch/fontmap/fontmap.html for the easy
 * 	character set lookup.
 * TODO:
 *	1. Create win state by counting number of flags
 *	2. Check win condition at end of reveal() and flag() methods
 *	3. Give falsely-flagged mines different symbol 
 *  ...?. It's becoming increasingly clear that I should just make a square
 			class with some easily-checkable boolean properties instead of
 			doing all this DOM wrangling. 
 		In fact it's becoming clear that none of the handler methods should
 			even be within the class structure, as the use of "this" becomes
 			a serious problem */

(function() {
	"use strict";

	const SQUARE_WIDTH_PX = 36; // 30 for square plus 6 for border on either side
	const MINE_CHAR = '✹'; // alternative: ✸
	const FLAG_CHAR = '⚐'; // alternative: ⚑
	var game; // seems unsafe, but I think I need this to replace 'this' for event handlers
	var timer;

	/* The manager for Board and Square, works with the DOM */
	class Minesweeper {
		constructor(body, width, height, numMines) {
			// begin conditionals which affect functionality
			/* as long as this.isPlaying is true, the board can be clicked and
			 * the game continued. false on win or explode */
			this.isPlaying = false; // togglePlaying() method to set this and dis/reenable clicking/timer?
			this.flagMode = false;
			// end conditionals

			// begin elements stored for quick access
			this.body = body; // maybe not necessary, could just pass to populate()
			this.timeCounter = document.getElementById('time-counter');
			// counts down based on flags, not correct flags
			this.mineCounter = document.getElementById('mine-counter');
			this.face = document.getElementById('face');
			face.onclick = this.reset;
			// end elements stored for quick access

			// begin meta game info
			this.width = width;
			this.height = height;
			this.numMines = numMines;
			this.minesFlagged = 0;
			// end meta game info

			// do setup
			this.populate(); // set up html representation
			this.board = new Board(this.height, this.width); // set up abstract representation
			this.layMines();

			// all ready
			this.isPlaying = true;
		}

		// TODO: make this not loop infinitely if there are more mines that squares
		layMines() {
			var i;
			
			for (i = 0; i < this.numMines; i++) { 
				var layed = false;

				while (!layed) { // keep trying until layed in empty spot, inefficient...
					var row = Math.floor(Math.random() * this.height);
					var col = Math.floor(Math.random() * this.width);
					var thisSquare = this.board.get(row, col);

					if (!thisSquare.isMine) {
						thisSquare.isMine = true;
						// increment square.surroundings for every surrounding square
						var neighbors = this.board.getNeighbors(row, col);

						neighbors.forEach(function(neighbor) {
							neighbor.surroundings++;
						});

						layed = true;
					}
				}
			}
		}

		// just creates the board dynamically on the DOM
		populate() {
			var i, j;

			for (i = 0; i < this.height; i++) {
				var row = document.createElement('div');
				row.className = 'row';

				for (j = 0; j < this.width; j++) {
					var square = document.createElement('div');
					square.onmousedown = function() {
						if (this.isPlaying && this.className == 'square default') {
							this.className = 'square pressed';
						}
					}
					square.onmouseup = function() {
						if (this.isPlaying && this.className == 'square pressed') {
							this.className = 'square default';
						}
					}
					square.onclick = reveal;
					square.oncontextmenu = flag;
					square.id = i + ',' + j;
					square.className = 'square default';
					row.appendChild(square);
				}

				this.body.appendChild(row);
			}

			// set style for everything to fit together nicely
			var nPix = this.width * SQUARE_WIDTH_PX;
			document.getElementById('game-area').style.width = nPix + "px";
		}

		/* just yields a string representing a color, given the number of mines
		 *	surrounding a square. */
		getColor(nearbyMines) {
			switch(nearbyMines) {
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
					return 'yellow'; // what.
			}
		}

		explode() {
			var i;
			for (i = 0; i < this.game.length; i++) {
				var id = this.idFromIndex(i);
				var element = document.getElementById(id);

				if (this.game[i]) { // if there's a bomb at this.game[i]
					if (element.innerHTML != this.flagChar) {
						element.innerHTML = this.mineChar;
					}
				} else if (element.innerHTML == this.flagChar) {
					element.innerHTML = this.mineChar;
					element.style.color = '#d00';
				}
			}

			this.isPlaying = false;
			console.log("~boom~");
		}

		/* given a board index, returns the number of flagged squares in the
		 * immediate surroundings. */
		getFlags(row, col) {
			var neighbors = this.board.getNeighbors(row, col);
			var nFlags = 0;

			neighbors.forEach(function(neighbor) {
				if (neighbor.isFlagged) {
					nFlags++;
				}
			});

			return nFlags;
		}

		openBlanks(row, col) {
			var toVisit = [this.board.get(row, col)]; // push() and shift() for FIFO behavior
			var visited = new Set();

			while (toVisit.length > 0) {
				var thisSquare = toVisit.shift();
				var id = this.idFromBoard(thisSquare.row, thisSquare.col);
				var squareElement = document.getElementById(id);
				// bind reveal w/doOpenBlanks set to false to avoid endless recursion
				var boundReveal = reveal.bind(squareElement, false, false);
				boundReveal(); // reveal single square

				var neighbors = this.board.getNeighbors(thisSquare.row, thisSquare.col);

				/* add all neighbors to visit, assuming curr is blank (stop at
				 * numbered "edges") */
				neighbors.forEach(function(neighbor) {
					if (!visited.has(neighbor) && // if not visited...
						thisSquare.surroundings == 0) { // if curr also blank

						toVisit.push(neighbor);
						visited.add(neighbor);
					}
				});
			}
		}

		openNumbered(row, col) {
			var square = this.board.get(row, col);

			// make sure that the number of nearby flags matches the number on the square
			if (this.getFlags(row, col) == square.surroundings) {
				var neighbors = this.board.getNeighbors(row, col);

				neighbors.forEach(function(neighbor) {
					// check if neighbor is unflagged and unopened
					if (!neighbor.isOpen && !neighbor.isFlagged) {
						var id = neighbor.row + ',' + neighbor.col;
						var neighborElement = document.getElementById(id);
						var boundReveal = reveal.bind(neighborElement, true, false);
						boundReveal();
					}
				});
			}
		}

		idFromBoard(row, col) {
			return row + ',' + col;
		}

		reset() {
			game.isPlaying = false;
			while(game.body.firstChild) {
				game.body.removeChild(game.body.firstChild);
			}

			var boxWidth = document.getElementById('width').value;
			var boxHeight = document.getElementById('height').value;
			var numMines = document.getElementById('mines').value;

			game.width = parseInt(boxWidth);
			game.height = parseInt(boxHeight);
			game.numMines = parseInt(numMines);
			// "erase" game board
			game.game = game.constructBoard();
			game.populate();
			game.isPlaying = true;
		}
	}

	/* A class through which to grab mines, mostly for better-abstracted indexing */
	class Board {
		constructor(height, width) {
			this.height = height;
			this.width = width;
			this.board = this.buildBoard();
		}

		buildBoard() {
			var board = new Array(this.height * this.width);
			var i, j;

			for (i = 0; i < this.height; i++) {
				for (j = 0; j < this.width; j++) {
					board[this.boardIndex(i, j)] = new Square(i, j);
				}
			}

			return board;
		}

		/* Given board index of a square, return an array of neighbors of that square. */
		getNeighbors(row, col) {
			var neighbors = new Array(9);
			var i, j;

			for (i = -1; i <= 1; i++) {
				for (j = -1; j <= 1; j++) {
					if (!(i == 0 && j == 0)) {
						var neighborRow = row + i;
						var neighborCol = col + j;

						// check for out-of-bounds indices
						if (neighborRow >= 0 && neighborCol >= 0 &&
							neighborRow < this.height && neighborCol < this.width) {
							neighbors.push(this.board[this.boardIndex(neighborRow, neighborCol)]);
						}
					}
				}
			}

			return neighbors;
		}

		/* given an abstract index (row, col), returns an index for this.board */
		boardIndex(row, col) {
			return row * this.width + col;
		}

		get(row, col) {
			return this.board[this.boardIndex(row, col)];
		}

		length() {
			return this.board.length;
		}

		toString() {
			var res = "[";
			var i;

			for (i = 0; i < this.board.length - 1; i++) {
				res = res + this.board[i].surroundings + ", ";
			}

			res = res + this.board[this.board.length - 1].surroundings + "]";
			return res;
		}
	}

	class Square {
		constructor(row, col) {
			this.row = row;
			this.col = col;
			this.isOpen = false;
			this.isMine = false;
			this.isFlagged = false;
			this.isQuestioned = false;
			this.surroundings = 0;
		}

		layMine() {
			this.isMine = true;
		}

		flag() {
			this.isFlag = true;
		}

		open() {
			if (!this.isFlagged && !this.isQuestioned) {
				if (this.isMine) {
					return 'explode';
				} else if (!this.surroundings) {
					if (!this.isOpen) {
						// clicking on an open blank square shouldn't do anything
						return 'blank';
					}
				} else if (this.surroundings) {
					return 'numbered';
				}
			}
		}
	}

	window.onload = function() {
		var gameBody = document.getElementById('game-body');
		var boxWidth = document.getElementById('width').value;
		var boxHeight = document.getElementById('height').value;
		var numMines = document.getElementById('mines').value;
		game = new Minesweeper(gameBody, boxHeight, boxWidth, numMines);
	};

	/* This functions has several behaviors dependent on case:
		1. If square is flagged, ignore outright 
		2. If square is a bomb, explode
		3. If square is numbered, just open
		4. If square is blank, open all surrounding blank squares */
	function reveal(doOpenBlanks = true, doOpenNumbered = true) {
		if (game.isPlaying) {
			var stringIndex = this.id.split(',');
			var row = parseInt(stringIndex[0]);
			var col = parseInt(stringIndex[1]);
			var id = game.idFromBoard(row, col);

			var square = game.board.get(row, col);
			var element = document.getElementById(id);
			var result = square.open();

			// set appropriate html classes etc.
			switch(result) {
				case 'blank':
					element.className = 'square revealed';
					// BFS
					if (doOpenBlanks) {
						game.openBlanks(row, col);
					}
					break;
				case 'numbered':
					if (!square.isOpen) {
						square.isOpen = true;
						element.className = 'square revealed';
						element.innerHTML = square.surroundings;
						element.style.color = game.getColor(square.surroundings);
					} else {
						if (doOpenNumbered) {
							game.openNumbered(row, col);
						}
					}
					break;
				case 'explode':
					element.className = 'square exploded';
					element.innerHTML = MINE_CHAR;
					game.explode();
					break;
			}
		}
	}

	function flag() {
		if (game.isPlaying) {
			var stringIndex = this.id.split(',');
			var row = parseInt(stringIndex[0]);
			var col = parseInt(stringIndex[1]);
			var id = game.idFromBoard(row, col);

			var squareOnBoard = game.board.get(row, col);
			var squareElement = document.getElementById(id);

			if (squareOnBoard.isFlagged) {
				squareOnBoard.isFlagged = false;
				squareOnBoard.isQuestioned = true;
				squareElement.className = 'square flagged';
				squareElement.innerHTML = '?';
			} else if (squareOnBoard.isQuestioned) {
				squareOnBoard.isQuestioned = false;
				squareOnBoard.isFlagged = true;
				squareElement.innerHTML = '';
			} else { // neither flagged nor questioned
				squareOnBoard.isFlagged = true;
				squareElement.className = 'square default';
				squareElement.innerHTML = FLAG_CHAR;
			}
		}

		return false; // to suppress context menu
	}
})();