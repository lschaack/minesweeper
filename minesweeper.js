/* Lucas Schaack
 * thanks to https://www.martinstoeckli.ch/fontmap/fontmap.html for the easy
 * 	character set lookup.
 * TODO:
 *	1. Create win state by counting number of flags
 *	2. Check win condition at end of reveal() and flag() methods
 *	3. Give falsely-flagged mines different symbol 
 *  ...?. It's becoming increasingly clear that I should just make a square
 			class with some easily-checkable boolean properties instead of
 			doing all this DOM wrangling. */

(function() {
	"use strict";

	const SQUARE_WIDTH_PX = 36; // 30 for square plus 6 for border on either side
	var game; // seems unsafe, but I think I need this to replace 'this' for event handlers
	var timer;

	class Minesweeper {
		constructor(body, width, height, numMines) {
			// begin conditionals which affect functionality
			/* as long as this.isPlaying is true, the board can be clicked and
			 * the game continued. false on win or explode */
			this.isPlaying = true;
			this.flagMode = false;
			// end conditionals

			// begin elements stored for quick access
			this.body = body; // maybe not necessary, could just pass to populate()
			this.timeCounter = document.getElementById('time-counter');
			// counts down based on flags, not correct flags
			this.mineCounter = document.getElementById('mine-counter');
			this.face = document.getElementById('face');
			// end elements stored for quick access

			// begin meta game info
			this.width = width;
			this.height = height;
			/* this.game is an array of 0s in all spaces except those with
			 * mines, whose value is 1. It is, by convention, in row-major
			 * order, where the value at the 'i'th row and 'j'th column is
			 * accessed as: this.game[(i * this.width) + j] */
			this.game = new Uint8Array(this.width * this.height);
			this.numMines = numMines;
			this.minesFlagged = 0;
			this.flagChar = '⚐'; // alternative: ⚑
			this.mineChar = '✹'; // alternative: ✸
			// end meta game info

			// very broken...
			// var timer = setInterval(function() {
			// 	if (game.isPlaying) {
			// 		var time = game.timeCounter.innerHTML;
			// 		time = (parseInt(time) + 1).toString();
			// 		if (time.length < 4) {
			// 			game.timeCounter.innerHTML = '0'.repeat(3 - time.length) + time;
			// 		}
			// 	}
			// }, 1000);

			// set up game and abstract board representation
			this.layMines(this.numMines);
			this.populate();
		}

		/* only affects this.game, populates board with mines represented
		 * as integer ones in random locations. */
		// TODO: make this not loop infinitely if there are more mines that squares
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

			for (i = 0; i < this.width; i++) {
				var row = document.createElement('div');
				row.className = 'row';

				for (j = 0; j < this.height; j++) {
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
					square.onclick = this.reveal;
					square.oncontextmenu = this.flag;
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
			if (game.isPlaying) { // feels hack-y...
				var stringIndex = this.id.split(',');
				var i = parseInt(stringIndex[0]);
				var j = parseInt(stringIndex[1]);
				var thisIndex = game.gameIndex(i, j);
				// 'i' is the row number, 'j' the column number
				var squareClass = this.className
				// TODO: rearrange so most common conditional is on top
				if (squareClass == 'square revealed') {
					// reveal surrounding mines if every mine is flagged
					// first, check if num nearby flags equal to num nearby mines
					var numFlags = game.getFlags(thisIndex);
					var surroundings = game.getSurroundings(thisIndex);
					// click on nearby unflagged squares
					if (numFlags == surroundings) {
						game.openNumbered(thisIndex);
					}
				} else if (squareClass != 'square flagged') { // "ignore outright"
					this.className = 'square revealed';
					var isMine = game.game[thisIndex];

					if (isMine) { // "explode"
						this.innerHTML = game.mineChar;
						this.style.backgroundColor = '#dd0000';
						game.explode();
					} else {
						// surroundings sets innerHTML, but also returns mine count
						var surroundings = game.revealNumbered(thisIndex); // "just open"

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
		revealNumbered(index) {
			var surroundings = this.getSurroundings(index);
			var id = game.idFromIndex(index);
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
			if (game.isPlaying) { // feels hack-y
				// check if player has won here eventually...
				if (this.className == 'square default') {
					this.className = 'square flagged';
					this.innerHTML = game.flagChar; 
				} else if (this.className == 'square flagged') {
					if (this.innerHTML == game.flagChar) {
						this.innerHTML = '?';
					} else {
						this.className = 'square default';
						this.innerHTML = '';
					}
				}
			}

			return false; // to suppress the actual context menu
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
			}

			return surroundings;
		}

		/* given a game index, returns the number of flagged squares in the
		 * immediate surroundings. */
		getFlags(index) {
			var neighbors = game.getNeighborIndices(index);
			var nFlags = 0;

			for (let ii in neighbors) {
				var neighbor = neighbors[ii];
				var id = this.idFromIndex(neighbor);
				if (document.getElementById(id).className == 'square flagged') {
					nFlags++;
				}
			}

			return nFlags;
		}

		// run BFS and open all blanks and numbered squares
		openBlanks(startIndex) {
			var toVisit = [startIndex]; // push() and shift() for FIFO behavior
			var visited = new Set();

			while (toVisit.length > 0) {
				var currIndex = toVisit.shift();
				if (!game.game[currIndex]) { // if no bomb at neighbor index
					var id = game.idFromIndex(currIndex);
					game.revealSquare(currIndex);
				}

				var neighbors = game.getNeighborIndices(currIndex);

				/* add all neighbors to visit, assuming curr is blank (stop at
				 * numbered "edges") */
				for (let ii in neighbors) {
					var neighbor = neighbors[ii]; // game index of each neighbor

					if (!visited.has(neighbor) && // if not visited...
						this.getSurroundings(currIndex) == 0) { // if curr also blank

						toVisit.push(neighbor);
						visited.add(neighbor);
					}
				}
			}
		}

		openNumbered(squareIndex) {
			var neighbors = game.getNeighborIndices(squareIndex);

			/* maybe make function to apply a function to each neighbor in an
			 *	array of neighbor indices? seems like I use this loop a lot */
			for (let ii in neighbors) {
				var neighbor = neighbors[ii];
				var neighborElement = document.getElementById(game.idFromIndex(neighbor));
				// check if neighbor is unflagged
				if (neighborElement.className == 'square default') {
					neighborElement.click();
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

		/* helper method for openBlanks, essentially a narrower version of
		 *	reveal() with no call to openBlanks so that it doesn't infinitely
		 *	recurse. */
		revealSquare(index) {
			var element = document.getElementById(this.idFromIndex(index));
			element.className = 'square revealed';
			var isMine = game.game[index];

			if (isMine) { // "explode"
				element.innerHTML = game.mineChar;
				element.style.backgroundColor = '#d00';
				game.explode();
			} else {
				// surroundings sets innerHTML, but also returns mine count
				game.revealNumbered(index); // "just open"
			}
		}

		/* given a board index (row, col), returns an index for this.game */
		gameIndex(row, col) {
			return (row) * this.width +(col);
		}

		idFromIndex(gameIndex) {
			var row = Math.floor(gameIndex / this.width);
			var col = gameIndex % this.width;
			return row + ',' + col;
		}
	}

	window.onload = function() {
		document.getElementById('minesweeper-face').onclick = resetGame;
		game = resetGame();
	};

	/* Seems preferrable to do this based on a return statement but not sure how
	 *	to reset global game in the context of an event listener. Might require
	 *	a pretty serious reworking of how this all works? Who knows. */
	function resetGame() {
		var gameBody = document.getElementById('game-body');
		// remove existing game if there
		while(gameBody.firstChild) {
			gameBody.removeChild(gameBody.firstChild);
		}
		var boxWidth = document.getElementById('width').value;
		var boxHeight = document.getElementById('height').value;
		var numMines = document.getElementById('mines').value;
		boxWidth = parseInt(boxWidth);
		boxHeight = parseInt(boxHeight);
		numMines = parseInt(numMines);
		game = new Minesweeper(gameBody, boxWidth, boxHeight, numMines);

		return game;
	}
})();