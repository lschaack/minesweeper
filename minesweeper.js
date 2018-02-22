// Lucas Schaack

(function() {
	"use strict";

	// make these dynamic, read from page body once more fleshed out
	const boxWidth = 9;
	const boxHeight = 9;
	const numMines = 10;
	var game;

	class Minesweeper {
		constructor(body, width, height, numMines) {
			this.body = body;
			this.width = width;
			this.height = height;
			/* this.game is an array of 0s in all spaces except those with
			 * mines, whose value is 1. It is, by convention, in row-major
			 * order, where the value at the 'i'th row and 'j'th column is
			 * accessed as: this.game[(i * this.width) + j] */
			this.game = new Uint8Array(this.width * this.height);
			this.numMines = numMines;
			this.playing = true;
			
			this.layMines(this.numMines);
			this.populate();
		}

		/* only affects this.game, populates board with mines represented
		 * as integer ones in random locations. */
		layMines(nMines) { // keepgeneral for unfair game modes later :D
			var i;
			for (i = 0; i < nMines; i++) {
				var layed = false;
				// range of mineIndex = [0, gameArea)
				while (!layed) { // keep trying until layed in empty spot, inefficient...
					var mineIndex = Math.floor(Math.random() * this.game.length);
					if (!this.game[mineIndex]) {
						this.game[mineIndex] = 1;
						layed = true;
					}
				}
			}
		}

		// just creates the board dynamically on the DOM
		populate() {
			var i, j;
			var me = this;

			for (i = 0; i < boxWidth; i++) {
				var row = document.createElement('div');
				row.className = 'row';

				for (j = 0; j < boxHeight; j++) {
					var square = document.createElement('div');
					square.onclick = this.reveal;
					square.oncontextmenu = this.flag;
					square.id = i + ',' + j;
					square.className = 'square default';
					row.appendChild(square);
				}

				this.body.appendChild(row);
			}
		}

		/* This functions has several behaviors dependent on case:
			1. If square is flagged, ignore outright 
			2. If square is a bomb, explode
			3. If square is numbered, just open
			4. If square is blank, open all surrounding blank squares */
		reveal() {
			/* should:
			 * 	1. get the id of this
			 *	2. use that id to index into the data structure which stores
			 		the game state
			 *	3. use the internal game state and surroundings to either
			 		reveal or explode */
			if (game.playing) { // feels hack-y...
				var stringIndex = this.id.split(',');
				var i = parseInt(stringIndex[0]);
				var j = parseInt(stringIndex[1]);
				var thisIndex = game.gameIndex(i, j);
				// console.log('i = ' + i + ', j = ' + j);
				// 'i' is the row number, 'j' the column number
				var squareClass = this.className

				if (squareClass == 'square revealed') {
					// reveal surrounding mines if every mine is flagged
					// check if number of surrounding flags is equal to surroundings
					getFlags(thisIndex);
				} else if (squareClass != 'square flagged') { // "ignore outright"
					this.className = 'square revealed';
					var isMine = game.game[thisIndex];

					if (isMine) { // "explode"
						this.innerHTML = '*';
						this.style.backgroundColor = '#dd0000';
						game.explode();
					} else {
						// surroundings sets innerHTML, but also returns mine count
						var surroundings = game.revealEmpty(thisIndex); // "just open"

						if (!surroundings) { // "open neighboring blanks"
							game.openBlanks(thisIndex);
						}
	 				}
				}
			}
		}

		/* for revealing a known bomb-less square, sets innerHTML to number of
		 * immediately surrounding mines, colors according to that number, and
		 * then returns that number. */
		revealEmpty(index) {
			var surroundings = game.getSurroundings(index);
			var id = game.getIDfromGameIndex(index);
			var element = document.getElementById(id);
			// set appropriate color
			switch(surroundings) {
				case 1:
					element.style.color = '#0000dd';
					break;
				case 2:
					element.style.color = 'green';
					break;
				case 3:
					element.style.color = 'red';
					break;
				case 4:
					element.style.color = 'purple';
					break;
				case 5:
					element.style.color = 'maroon';
					break;
				case 6:
					element.style.color = 'turquoise';
					break;
				case 7:
					element.style.color = 'black';
					break;
				case 8:
					element.style.color = 'gray';
					break;
				default:
					element.style.color = 'yellow'; // what.
					break;
			}
			// fill in the innerHTML
			surroundings = surroundings > 0 ? surroundings.toString() : ''; // stringify
			element.innerHTML = surroundings;
			return surroundings;
		}

		flag() {
			if (game.playing) { // feels hack-y
				// check if player has won here eventually...
				if (this.className != 'square revealed') {
					this.className = 'square flagged';
					this.innerHTML = '⚐'; // ⚑
				} else if (this.className == 'square flagged') { // reset
					this.className = 'square default';
					this.innerHTML = '';
				}
			}

			return false; // to suppress the actual context menu
		}

		explode() {
			var i;
			for (i = 0; i < game.game.length; i++) {
				if (game.game[i]) { // if there's a bomb at game.game[i]
					var id = game.getIDfromGameIndex(i);
					document.getElementById(id).innerHTML = '✹'; // ✸
				}
			}

			game.playing = false;
			console.log("~boom~");
		}

		/* used to fill out the numbers in each revealed square; given a
		 * member of the DOM representing a square, returns an integer of the
		 * count of immediately surrounding bombs. */
		getSurroundings(squareIndex) {
			var neighbors = this.getNeighborIndices(squareIndex);
			var surroundings = 0; // count of surrounding bombs

			/* values are only 1 where a bomb is found, so will only increase
			 * surroundings if a surrounding value is found to be a bomb. */
			for (let ii in neighbors) {
				surroundings += this.game[neighbors[ii]];
				// console.log("neighbor " + neighbor + " with value " + this.game[neighbor]);
			}

			return surroundings;
		}

		/* given a game index, returns the number of flagged squares in the
		 * immediate surroundings. */
		getFlags(squareIndex) {
			neighbors = getNeighborIndices(squareIndex);
			nFlags = 0;

			for (let ii in neighbors) {
				neighbor = neighbor[ii];
				id = getIDfromGameIndex(neighbor);
				if (document.getElementById(id).innerHTML == 'F') { // if it's a flag
					// ####################################################################################################
				}
			}
		}

		// run BFS and open all blanks and numbered squares
		openBlanks(startIndex) {
			var toVisit = [startIndex]; // push() and shift() for FIFO behavior
			var visited = new Set();

			while (toVisit.length > 0) {
				var currIndex = toVisit.shift();
				if (!game.game[currIndex]) { // if no bomb at neighbor index
					var id = game.getIDfromGameIndex(currIndex);
					document.getElementById(id).click();
				}

				var neighbors = game.getNeighborIndices(currIndex);

				/* add all neighbors to visit, assuming curr is blank (stop at
				 * numbered "edges") */
				for (let ii in neighbors) {
					var neighbor = neighbors[ii]; // game index of each neighbor
					if (!visited.has(neighbor) && // if not visited...
						game.getSurroundings(currIndex) == 0) { // if curr also blank
						toVisit.push(neighbor);
						visited.add(neighbor);
					}
				}
			}
		}

		/* given a game index, returns an array of the indices of all
		 * immediately surrounding neighbors of that square. */
		getNeighborIndices(startIndex) {
			// potentially change to explicitly work with game indices
			// retrofitted from former way of doing things...
			var neighbors = [];
			var row = Math.floor(startIndex / this.width);
			var col = startIndex % this.width;
			var i, j;

			for (i = -1; i <= 1; i++) { // surrounding rows
				for (j = -1; j <= 1; j++) { // surroundings cols
					var checkRow = row + i;
					var checkCol = col + j;
					// ensure indices are within proper bounds (no wrapping)
					if (checkRow >= 0 && checkRow < this.height &&
						checkCol >= 0 && checkCol < this.width) {
						// game index calculation from row/col
						neighbors.push(this.gameIndex(checkRow, checkCol));
					}
				}
			}

			return neighbors;
		}

		/* given a board index (row, col), returns an index for this.game */
		gameIndex(row, col) {
			return (row) * this.width +(col);
		}

		getIDfromGameIndex(gameIndex) {
			var row = Math.floor(gameIndex / this.width);
			var col = gameIndex % this.width;
			return row + ',' + col;
		}
	}

	window.onload = function() {
		var gameBody = document.getElementById('game-body');
		game = new Minesweeper(gameBody, boxWidth, boxHeight, numMines);
	};
})();