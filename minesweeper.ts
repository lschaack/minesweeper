/* Lucas Schaack
 * thanks to https: https://www.martinstoeckli.ch/fontmap/fontmap.html for the easy
 * 	character set lookup. */

const SQUARE_WIDTH_PX: number = 36; // 30 for square plus 6 for border on either side
const MINE_CHAR: string = '✹'; // alternative: ✸
const FLAG_CHAR: string = '⚐';
const FLAG_CHAR_SOLID: string = '⚑';
const DEFAULT_MESSAGE: string = 'You win!';
let isPlaying: boolean = false;	// Says whether to update time
let game: Minesweeper; 			// Holds the Minesweeper class
let counter: HTMLElement; 		// DOM element storage for quick access (flag counter)
let timer: HTMLElement; 		// DOM element storage for quick access (timer, obviously)
let startTime: number;			// Holds the time of the first board click

/* ###################################################################### */
/* ############################### Classes ############################## */
/* ###################################################################### */

class MinesweeperBoard extends Board {
	constructor(height: number, width: number) {
		super(height, width);
		this.board = this.buildBoard();
	}

	buildBoard() {
		let board: Array<MinesweeperSquare> = new Array(this.height * this.width);
		let i: number, j: number;

		for (i = 0; i < this.height; i++) {
			for (j = 0; j < this.width; j++) {
				board[this.boardIndex(i, j)] = new MinesweeperSquare(i, j);
			}
		}

		return board;
	}
}

/* Represents all the information contained in a single square on the board */
class MinesweeperSquare extends Square {
	isMine: boolean;
	isFlagged: boolean;
	isQuestioned: boolean;

	constructor(row: number, col: number) {
		super(row, col);
		this.isMine = false;
		this.isFlagged = false;
		this.isQuestioned = false;
	}


	/* Named purely for abstraction purposes */
	layMine() {
		this.isMine = true;
	}

	/* Named purely for abstraction purposes */
	setFlag() {
		this.isFlagged = true;
	}

	/* Returns a string representing which operation to perform based on the
	 * actual contents of the square */
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

	/* Returns a string representing which operation to perform based on the
	 * actual contents of the square */
	flag() {
		if (this.isMine) {
			if (!this.isFlagged && !this.isQuestioned) {
				return 'increment'; // increment mineCounter if correct
			} else if (this.isFlagged) {
				return 'decrement'; // decrement if correct but de-flagged
			}
		} else { // I don't really do anything with this right now
			return 'nop';
		}
	}
}

/* The manager for Board and Square, works with the DOM */
class Minesweeper {
	board: Board;
	// meta game info
	height: number;			// number of rows
	width: number;			// number of Square()s per row
	numMines: number;		// number of mines on the board
	numFlags: number; 		// number of flags layed down
	minesFlagged: number; 	// true number of mines flagged
	// conditionals which affect functionality
	flagMode: boolean;		// whether or not the game is in flag mode
	// elements stored for quick access
	gameBody: HTMLElement;
	mineCounter: HTMLElement;


	constructor(body: HTMLElement, height: number, width: number, numMines: number) {
		this.flagMode = false;

		this.reset(body, height, width, numMines);
	}

	/* Resets the game */
	reset(body: HTMLElement, height: number, width: number, numMines: number) {
		hideMessage();
		// begin conditionals which affect game functionality
		// reset timer if set
		isPlaying = false;
		document.getElementById('time-counter').innerHTML = '000';

		// resets flagmode it if starting from reset button click
		if (this.flagMode) {
			let flagModeElement: HTMLElement = document.getElementById('flag-mode');
			flagModeElement.click();
		}
		// end conditionals

		// begin elements stored for quick access
		this.gameBody = body; // maybe not necessary, could just pass to populate()
		this.mineCounter = document.getElementById('mine-counter');
		// end elements stored for quick access

		// begin meta game info
		this.width = width;
		this.height = height;
		this.numMines = numMines;
		this.numFlags = 0;
		this.minesFlagged = 0;
		// end meta game info

		// remove nodes if there are any
		while(this.gameBody.firstChild) {
			this.gameBody.removeChild(this.gameBody.firstChild);
		}

		// do setup
		updateMineCounter(this.numMines);
		this.populate(); // set up html representation
		this.board = new MinesweeperBoard(this.height, this.width); // set up abstract representation
		this.layMines();

		// all ready
		this.gameBody.style.pointerEvents = "auto"; // enable clicking if disabled
	}

	/* Lays mines and increments the surroundings property of each surrounding
	 * square for every mine layed */
	layMines() {
		let area = this.height * this.width;
		console.assert(this.numMines <= area,
			"Number of mines greater than board area. Please take it easy on the mines.");

		let minesToLay = Math.min(this.numMines, area);
		let i;
		
		for (i = 0; i < minesToLay; i++) { 
			let layed = false;

			while (!layed) { // keep trying until layed in empty spot, inefficient...
				let row = Math.floor(Math.random() * this.height);
				let col = Math.floor(Math.random() * this.width);
				let thisSquare = <MinesweeperSquare> this.board.get(row, col);

				if (!thisSquare.isMine) {
					thisSquare.isMine = true;
					// increment square.surroundings for every surrounding square
					let neighbors = <Array<MinesweeperSquare>> this.board.getNeighbors(row, col);

					neighbors.forEach(function(neighbor) {
						neighbor.surroundings++;
					});

					layed = true;
				}
			}
		}
	}

	/* Creates the board dynamically on the DOM */
	populate() {
		let i: number, j: number;

		for (i = 0; i < this.height; i++) {
			let row = document.createElement('div');
			row.className = 'row';

			for (j = 0; j < this.width; j++) {
				let square = <HTMLElement> document.createElement('div');

				square.onmousedown = function() { setFace('o:') }; // buttonPress;
				square.onmouseup = function() { setFace('|:') }; // buttonPress;
				square.onclick = reveal;
				square.oncontextmenu = flag; 
				square.id = i + ',' + j;
				square.className = 'square';
				row.appendChild(square);
			}

			this.gameBody.appendChild(row);
		}

		// this doesn't really fit nicely anywhere, so it goes here
		let flagMode: HTMLElement = document.getElementById('flag-mode');
		flagMode.onclick = function() {
			game.flagMode = !game.flagMode; // toggle
			let child = <HTMLElement> this.firstChild;

			if (game.flagMode) {
				child.innerHTML = FLAG_CHAR_SOLID;
			} else {
				child.innerHTML = FLAG_CHAR;
			}
		}

		// set style for everything to fit together nicely
		let nPix = this.width * SQUARE_WIDTH_PX;
		let gameArea = <HTMLElement> document.getElementById('game-area');
		gameArea.style.width = nPix + "px";
		let message = <HTMLElement> document.getElementById('message').firstChild;
		// Start pretty big, get bigger but not by that much much
		message.style.fontSize = 1 + 0.005 * nPix + 'em';
		setFace('|:');
	}

	/* just yields a string representing a color, given the number of mines
	 *	surrounding a square. */
	getColor(nearbyMines: number) {
		switch(nearbyMines) {
			case 1:
				return '#0000dd';
			case 2:
				return 'green';
			case 3:
				return 'red';
			case 4:
				return 'purple';
			case 5: // 4 and 5 are almost identical on my screen...
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

	/* Makes board unclickable, sets appropriate flags, and shows the player
	 * false negative squares as black mines and false positive squares as
	 * red solid flags */
	explode() {
		// make everything unclickable
		this.gameBody.style.pointerEvents = "none";
		isPlaying = false;

		let i: number, j: number;

		// length method instead of property to ensure correct behavior
		for (i = 0; i < this.height; i++) {
			for (j = 0; j < this.width; j++) {
				let square = <MinesweeperSquare> this.board.get(i, j);

				if (square.isMine && !square.isFlagged) { // false negative
					let id = this.idFromBoard(i, j);
					document.getElementById(id).innerHTML = MINE_CHAR;
				} else if (!square.isMine && square.isFlagged) { // false positive
					let id = this.idFromBoard(i, j);
					let element = <HTMLElement> document.getElementById(id);
					element.innerHTML = FLAG_CHAR_SOLID;
					// set flag color to slightly darker than standard red
					element.style.color = '#d00';
				}
			}
		}

		setFace('D:');
		showMessage("~*boom*~");
		console.log("~boom~");
	}

	/* Checks the win condition, returning whether or not the conditions are
	 * met and also setting the game to the win state if they are */
	checkWin() {
		if (this.minesFlagged == this.numMines && this.minesFlagged == this.numFlags) {
			let i: number, j: number;
			// loop through and check every square is either flagged or opened
			for (i = 0; i < this.height; i++) {
				for (j = 0; j < this.width; j++) {
					let square = <MinesweeperSquare> this.board.get(i, j);

					if (!square.isOpen && !square.isFlagged) {
						return false;
					}
				}
			}

			this.win(DEFAULT_MESSAGE);
			return true;
		}
	}

	/* Makes board unclickable, sets appropriate flags, and prints the
	 * given message underneath the game header */
	win(message: string) {
		// make everything unclickable
		this.gameBody.style.pointerEvents = "none";
		isPlaying = false;

		setFace('C:');
		showMessage(message);
		console.log("~hooray~");
	}

	/* given a board index, returns the number of flagged squares in the
	 * immediate surroundings. */
	getFlags(row: number, col: number) {
		let neighbors = <Array<MinesweeperSquare>> this.board.getNeighbors(row, col);
		let nFlags = 0;

		neighbors.forEach(function(neighbor) {
			if (neighbor.isFlagged) {
				nFlags++;
			}
		});

		return nFlags;
	}

	/* Performs BFS to open all contiguous blanks surrounding an initial
	 * mine given by row and column index on the board, stopping whenever
	 * it encounters a numbered edge. */
	openBlanks(row: number, col: number) {
		let toVisit = [this.board.get(row, col)]; // push() and shift() for FIFO behavior
		let visited = new Set();

		while (toVisit.length > 0) {
			let thisSquare = toVisit.shift();
			let id = this.idFromBoard(thisSquare.row, thisSquare.col);
			let squareElement = <HTMLElement> document.getElementById(id);

			this.reveal(squareElement); // this.reveal to avoid endless recursion

			let neighbors = this.board.getNeighbors(thisSquare.row, thisSquare.col);

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

	/* Clicks on all squares surrounding the square at [row, col] */
	openNumbered(row: number, col: number) {
		let square = this.board.get(row, col);

		// make sure that the number of nearby flags matches the number on the square
		if (this.getFlags(row, col) == square.surroundings) {
			let neighbors = <Array<MinesweeperSquare>> this.board.getNeighbors(row, col);

			neighbors.forEach(function(neighbor) {
				// check if neighbor is unflagged and unopened
				if (!neighbor.isOpen && !neighbor.isFlagged) {
					let id = neighbor.row + ',' + neighbor.col;
					let neighborElement = <HTMLElement> document.getElementById(id);
					/* make sure that flag mode isn't enabled when clicking
					 * surrounding squares, otherwise just flags everything.
					 * also I don't like calling this object without this, but
					 * it's not bound for some reason, even with .bind(game) */
					let prevFlagMode = game.flagMode;
					game.flagMode = false;
					neighborElement.click();
					game.flagMode = prevFlagMode;
				}
			});
		}
	}

	/* Trimmed-down version of the global method called from openBlanks. doesn't
	 * make any calls to either openBlanks or openNumbered, because it would
	 * infinitely recurse. Also never follows flag mode and never starts timer
	 * (because that only happens on the first click, which has certainly happened
	 * when this method gets called) */
	reveal(element: HTMLElement) {
		let stringIndex: Array<string> = element.id.split(',');
		let row: number = parseInt(stringIndex[0]);
		let col: number = parseInt(stringIndex[1]);
		let id: string = game.idFromBoard(row, col);

		let square = <MinesweeperSquare> game.board.get(row, col);

		let result: string = square.open();

		// set appropriate html classes etc.
		switch(result) {
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
				} // don't ever need to doOpenNumbered in this context
				break;
			case 'explode':
				element.className = 'square exploded';
				element.innerHTML = MINE_CHAR;
				game.explode();
				break;
		}

		game.checkWin();
	}

	/* Returns a string containing the id of the square at [row, col] */
	idFromBoard(row: number, col: number) {
		return row + ',' + col;
	}
}

/* ###################################################################### */
/* ########################### Global Methods ########################### */
/* ###################################################################### */

/* Several behaviors dependent on case:
	1. If square is flagged, ignore outright 
	2. If square is a bomb, explode
	3. If square is numbered, just open
	4. If square is blank, open all surrounding blank squares */
function reveal() {
	let stringIndex: string = this.id.split(',');
	let row: number = parseInt(stringIndex[0]);
	let col: number = parseInt(stringIndex[1]);
	let id: string = game.idFromBoard(row, col);

	let square = <MinesweeperSquare> game.board.get(row, col);
	let element = <HTMLElement> document.getElementById(id);

	if (!isPlaying) {
		isPlaying = true
		updateTime(true);
	}

	/* sort of a weird conditional...if I just checked for flag mode and whether
	 * the square is open, then doOpenBlanks and doOpenNumbered would click
	 * surrounding squares as usual, which would flag them. this is a slightly
	 * hack-y but I think pretty nice workaround which implicitly checks whether
	 * the call is coming from one of those methods. */
	 /* need some way to check whether flag mode is on through call from openNumbered, which just does a .click() */
	if (game.flagMode && !square.isOpen) {
		let boundFlag = flag.bind(this);
		boundFlag();
	} else {
		let result: string = square.open();

		// set appropriate html classes etc.
		switch(result) {
			case 'blank':
				square.isOpen = true;
				element.className = 'square revealed';
				// BFS
				game.openBlanks(row, col);
				break;
			case 'numbered':
				if (!square.isOpen) {
					square.isOpen = true;
					element.className = 'square revealed';
					element.innerHTML = String(square.surroundings);
					element.style.color = game.getColor(square.surroundings);
				} else {
					let boundOpenNumbered = game.openNumbered.bind(game, row, col);
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

/* Rotates square between default, flagged, and questioned, setting html and
 * counters appropriately */
function flag() {
	let stringIndex = this.id.split(',');
	let row = parseInt(stringIndex[0]);
	let col = parseInt(stringIndex[1]);
	let id = game.idFromBoard(row, col);

	let squareOnBoard = <MinesweeperSquare> game.board.get(row, col);
	let squareElement = document.getElementById(id);
	let result = squareOnBoard.flag();

	if (!isPlaying) {
		isPlaying = true
		updateTime(true);
	}

	/* Update game.minesFlagged first--separate b/c minesFlagged counts the
	 * number of mines correctly flagged for easy win checking, vs. the HTML
	 * counter which just decrements based on the number of flags on the board */
	switch(result) {
		case 'increment':
			game.minesFlagged++;
			break;
		case 'decrement':
			game.minesFlagged--;
			break;
	}

	// Rotate between FLAG_CHAR, ?, and blank, and toggle corresponding bools
	if (!squareOnBoard.isOpen) {
		if (squareOnBoard.isFlagged) { 				// if flag, become question
			game.numFlags--;
			squareOnBoard.isFlagged = false;
			squareOnBoard.isQuestioned = true;

			squareElement.innerHTML = '?';
			updateMineCounter(game.numMines - game.numFlags);
		} else if (squareOnBoard.isQuestioned) { 	// if question, become default
			squareOnBoard.isQuestioned = false;
			squareOnBoard.isFlagged = false;

			squareElement.innerHTML = ''; 
		} else { 									// if default, become flag
			game.numFlags++;
			squareOnBoard.isFlagged = true;

			squareElement.innerHTML = FLAG_CHAR;
			updateMineCounter(game.numMines - game.numFlags);
		}
	}

	if (game.minesFlagged == game.numMines) {
		game.checkWin();
	}

	return false; // to suppress context menu
}

/* Resets the game... */
function reset() {
	let gameBody = <HTMLElement> document.getElementById('game-body');
	let boxHeight = <HTMLInputElement> document.getElementById('height');
	let boxWidth = <HTMLInputElement> document.getElementById('width');
	let numMines = <HTMLInputElement> document.getElementById('mines');
	game.reset(gameBody, parseInt(boxHeight.value), parseInt(boxWidth.value), parseInt(numMines.value));
}

/* Deprecated by simpler and more functional css square:active */
function buttonPress() {
	if (this.classList.contains('default')) {
		this.classList.remove('default')
		this.classList.add('pressed');
	} else if (this.classList.contains('pressed')) {
		this.classList.remove('pressed')
		this.classList.add('default');
	}
}

/* Transforms and updates number on mineCounter */
function updateMineCounter(currCount: number) {
	let mineCount: string = currCount.toString();
	let update: string = "0";
	counter.innerHTML = update.repeat(3 - mineCount.length) + mineCount;
}

/* Called every 1 second, prints the time since the first reveal or flag to
 * the timer until the game is won or lost */
function updateTime(start = false) {
	if (start) {
		startTime = Date.now();
	}

	if (isPlaying) {
		// time in seconds to string
		let secsPassed = ((Date.now() - startTime) / 1000).toString();
		let update = secsPassed.substring(0, secsPassed.indexOf('.'));

		if (update.length < 4) {
			timer.innerHTML = '0'.repeat(3 - update.length) + update;
		}
	}
}

/* Sets the reset button face */
function setFace(face: string) {
	document.getElementById('face').innerHTML = face;
}

/* Shows given message directly underneath game header */
function showMessage(message: string) {
	let messageElement = <HTMLElement> document.getElementById('message');
	(messageElement.firstChild as HTMLElement).innerHTML = message;
	messageElement.style.display = 'block';
}

/* Hides the win or lose message */
function hideMessage() {
	let messageElement = <HTMLElement> document.getElementById('message');
	messageElement.style.display = 'none';
}

window.onload = function() {
	counter = document.getElementById('mine-counter');
	timer = document.getElementById('time-counter');
	setInterval(updateTime, 1000); // doesn't need a variable, cause it always runs

	let resetButton = document.getElementById('minesweeper-face');
	resetButton.onclick = reset;
	// These prevent onclick unless clicked outside the face for some reason...
	resetButton.onmousedown = function() { setFace('D8') };
	resetButton.onmouseup = function() { setFace('|:') };

	let gameBody = <HTMLElement> document.getElementById('game-body');
	let boxWidth = <HTMLInputElement> document.getElementById('width');
	let boxHeight = <HTMLInputElement> document.getElementById('height');
	let numMines = <HTMLInputElement> document.getElementById('mines');
	game = new Minesweeper(gameBody, parseInt(boxHeight.value), parseInt(boxWidth.value), parseInt(numMines.value));
};