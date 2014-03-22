function runGame() {

	var myCanvas = document.getElementById('myCanvas');
	myCanvas.width = 480;
	myCanvas.height = 320;
	myCanvas.style.cursor = "none";
	var context = myCanvas.getContext('2d');
	//Imágenes
	var img = new Image();
	var txt = new Image();
	var lettering = new Image();
	//Sonido
	var cheer = new Audio();
	var crash = new Audio();
	var scream = new Audio();
	var servo = new Audio();
	var teleport = new Audio();
	var walk = new Audio();
	//Estado
	var state = null;
	var status = null;
	//Número de elementos externos a cargar
	var load = 9;
	var fullLoad = load;
	//Vector de pasos
	var stepvector = [2, 6, 12, 20, 26, 30, 32];
	//Bloquear la entrada
	var blockInput = false;
	//Bandera del sonido
	var soundSwitch = true;
	//Nivel
	var level = 0;
	//Puntero del ratón
	var mx = myCanvas.width;
	var my = myCanvas.height;
	var msx = mx;
	var msy = my;
	var mhover = false;

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function getRandomPos() {
		var m = getRandomInt(0, board.m);
		var n = getRandomInt(0, board.n);
		return {x:m, y:n};
	}

	function clickMatch (x, y, piece) {
		var inix = piece.offsetx + Math.floor((myCanvas.width - piece.width)/2) - 2;
		var iniy = piece.offsety + Math.floor((myCanvas.height - piece.height)/2) - 2;
		var finx = inix + piece.width + 4;
		var finy = iniy + piece.height + 4;
		if (((x >= inix) && (x <= finx)) && ((y >= iniy) && (y <= finy))) {
			return true;
		} else {
			return false;
		}
	}

	//Input
	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: Math.floor(evt.clientX - rect.left),
			y: Math.floor(evt.clientY - rect.top)
		};
	}

	myCanvas.addEventListener('click', function(evt) {
		mhover = false;
		var pos = getMousePos(myCanvas, evt);
		if (status.id == 'playing') {
			clickX = Math.floor(pos.x / board.square);
			clickY = Math.floor(pos.y / board.square);
			if (legalMove(clickX, clickY)) {
				if (man.x != clickX || man.y != clickY) {
					man.move(clickX, clickY);
					if (blockInput == false) {
						blockInput = true;
						status = stateMoving.init();
					} else {
						console.warn("Input blocked");
					}
				} else {
					man.teleport();
					if (blockInput == false) {
						blockInput = true;
						status = stateTeleporting.init();
					} else {
						console.warn("Input blocked");
					}
				}
			}
		} else if (status.id = 'menu') {
			if (status.page == 'main') {
				if (clickMatch(pos.x, pos.y, options)) {
					status.setPage('options');
				} else if (clickMatch(pos.x, pos.y, play)) {
					level = 0;
					status = stateBegin.init();
				}
			} else {
				if (soundSwitch) {
					var option = on;
				} else {
					var option = off
				}
				if (clickMatch(pos.x, pos.y, back)) {
					status.setPage('main');
				} else if (clickMatch(pos.x, pos.y, sound) || clickMatch(pos.x, pos.y, option)) {
					if (soundSwitch) {
						soundSwitch = false;
					} else {
						soundSwitch = true;
					}
				}
			} 
		}
	}, false);

	//Tablero
	var board = {
		m: myCanvas.width/32 - 1,
		n: myCanvas.height/32 - 1,
		color1: '#68A',//'#68A',
		color2: '#79B',//'#79B',
		square: 32,
		draw: function() {
			for (var i = 0; i <= this.m; i++) {
				for (var j = 0; j <= this.n; j++) {
					if ((i + j) % 2 == 0) {
						context.fillStyle = this.color1;
					} else {
						context.fillStyle = this.color2;
					}
					context.fillRect(this.square * i, this.square * j, this.square, this.square);
				}
			}
		},
		adjust: function() {
			this.m = myCanvas.width/32 - 1;
			this.n = myCanvas.height/32 - 1;
		},
		collisions: function() {
			var collisions = {};
			var survivors = new Array();
			var tag = '';
			for (var i in robots.list) {
				tag = 'x' + robots.list[i].x + 'y' + robots.list[i].y;
				if (collisions[tag] == undefined) {
					collisions[tag] = 1;
					survivors.push(robots.list[i]);
				} else {
					collisions[tag] = collisions[tag] + 1;
				}
			}
			robots.list = survivors;
			survivors = new Array();
			for (var i in robots.list) {
				tag = 'x' + robots.list[i].x + 'y' + robots.list[i].y;
				if (collisions[tag] == 1) {
					fire = false;
					for (var j in crashes.list) {
						if (robots.list[i].x == crashes.list[j].x && robots.list[i].y == crashes.list[j].y) {
							fire = true;
						}
					}
					if (!fire) {
						survivors.push(robots.list[i]);
					}
				} else {
					crashes.list.push(robots.list[i]);
				}
				if (man.x == robots.list[i].x && man.y == robots.list[i].y ) {
					state = 'DEAD';
					console.info('YOU ARE DEAD');
					if (soundSwitch) scream.play();
					for (var j = i; j < robots.list.length; j++) {
						survivors.push(robots.list[j]);
					}
					break;
				}
			}
			robots.list = survivors;
			if (robots.list.length == 0 && state != 'DEAD') {
				state = 'VICTORY';
				console.info('YOU WON');
				if (soundSwitch) cheer.play();
			}
		}
	}

	//Piezas
	var man = {
		readx: 24,
		ready: 0,
		width: 20,
		height: 24,
		offsetx: 6,
		offsety: 4,
		src: img,
		move: function(x, y) {
			this.old = {x:this.x, y:this.y};
			this.x = x;
			this.y = y;
		},
		teleport: function() {
			this.old = {x:this.x, y:this.y};
			var rndpos = getRandomPos();
			this.x = rndpos.x;
			this.y = rndpos.y;
		},
		x: board.m,
		y: board.n,
		old: null,
	}

	var robots = {
		readx: 0,
		ready: 0,
		width: 24,
		height: 24,
		offsetx: 4,
		offsety: 4,
		src: img,
		draw: function() {

		},
		ai: function() {
			var steps = new Array();
			for (var i in this.list) {
				var dist = (board.m * board.m) + (board.n * board.n);
				var step = null;
				for (var j in movements) {
					var jdistx = this.list[i].x + movements[j].x - man.x;
					var jdisty = this.list[i].y + movements[j].y - man.y;
					var jdist = (jdistx * jdistx) + (jdisty * jdisty);
					if (dist > jdist) {
						dist = jdist;
						step = {x: movements[j].x, y: movements[j].y}
					}
				}
				steps.push({
					x: this.list[i].x + step.x,
					y: this.list[i].y + step.y
				});
			}
			return steps;
		},
		move: function() {
			this.old = this.list;
			this.list = robots.ai();
		},
		list: [],
		old: null
	}

	var crashes = {
		readx: [244, 268],
		ready: 0,
		width: 24,
		height: 24,
		offsetx: 4,
		offsety: 4,
		src: img,
		list: []
	}

	function drawArrows() {
		for (var i in movements) {
			var shiftX = movements[i].x;
			var shiftY = movements[i].y;
			if (emptySquare(man.x + shiftX, man.y + shiftY)) {
				if (movements[i].piece != null) {
					if (man.x + shiftX == msx && man.y + shiftY == msy) {
						painter.piecePos(man.x + shiftX, man.y + shiftY, movements[i].piece);
						painter.piecePos(msx, msy, sqareFrame);
						mhover = true;
					} else {
						painter.piecePosShift(man.x + shiftX, man.y + shiftY, movements[i].piece, 248);
					}
				}
			}
		}
		if (man.x == msx && man.y == msy) {
			painter.piecePos(msx, msy, sqareFrame);
			mhover = true;
		}
	}

	myCanvas.addEventListener('mousemove', function(evt) {
		mousePos = getMousePos(myCanvas, evt);
		mx = mousePos.x;
		my = mousePos.y;
		msx = Math.floor(mousePos.x / board.square);
		msy = Math.floor(mousePos.y / board.square);
		if (status.id == 'playing') {
			clickX = Math.floor(mx / board.square);
			clickY = Math.floor(my / board.square);
			if (legalMove(clickX, clickY)) {
				mhover = true;
			} else {
				mhover = false;
			}
		} else if (status.id = 'menu') {
			if (status.page == 'main') {
				if (clickMatch(mx, my, options) || clickMatch(mx, my, play)) {
					mhover = true;
				} else {
					mhover = false;
				}
			} else {
				if (soundSwitch) {
					var option = on;
				} else {
					var option = off
				}
				if (clickMatch(mx, my, back) || clickMatch(mx, my, sound) || clickMatch(mx, my, option)) {
					mhover = true;
				} else {
					mhover = false;
				}
			} 
		}

	}, false);

	function drawCursor() {
		console.log(mx+"|"+my);
		if (mhover == false) {
			painter.pieceCart(mx, my, cursor);
		} else {
			painter.pieceCartShift(mx, my, cursor, 12);
		}	
	}

	var pixelrobot = {
		readx: 0,
		ready: 0,
		width: 220,
		height: 96,
		offsetx: 0,
		offsety: 0,
		src: lettering
	}

	var presents = {
		readx: 0,
		ready: 96,
		width: 94,
		height: 10,
		offsetx: 0,
		offsety: 65,
		src: lettering
	}

	var title = {
		readx: 0,
		ready: 106,
		width: 264,
		height: 173,
		offsetx: 0,
		offsety: -40,
		src: lettering
	}

	var play = {
		readx: 0,
		ready: 279,
		width: 46,
		height: 10,
		offsetx: 0,
		offsety: 70,
		src: lettering
	}

	var options = {
		readx: 0,
		ready: 289,
		width: 82,
		height: 10,
		offsetx: 0,
		offsety: 100,
		src: lettering
	}

	var back = {
		readx: 0,
		ready: 299,
		width: 58,
		height: 10,
		offsetx: 0,
		offsety: 30,
		src: lettering
	}

	var sound = {
		readx: 0,
		ready: 309,
		width: 58,
		height: 10,
		offsetx: 0,
		offsety: 0,
		src: lettering
	}

	var on = {
		readx: 60,
		ready: 309,
		width: 22,
		height: 10,
		offsetx: 54,
		offsety: 0,
		src: lettering
	}

	var off = {
		readx: 84,
		ready: 309,
		width: 34,
		height: 10,
		offsetx: 60,
		offsety: 0,
		src: lettering
	}

	var version = {
		readx: 246,
		ready: 309,
		width: 18,
		height: 10,
		offsetx: 145,
		offsety: 35,
		src: lettering
	}

	var up = {
		readx: 44,
		ready: 0,
		width: 24,
		height: 24,
		offsetx: 4,
		offsety: 4,
		src: img
	}

	var right = {
		readx: 68,
		ready: 0,
		width: 24,
		height: 24,
		offsetx: 4,
		offsety: 4,
		src: img
	}

	var down = {
		readx: 92,
		ready: 0,
		width: 24,
		height: 24,
		offsetx: 4,
		offsety: 4,
		src: img
	}

	var left = {
		readx: 116,
		ready: 0,
		width: 24,
		height: 24,
		offsetx: 4,
		offsety: 4,
		src: img
	}

	var upleft = {
		readx: 140,
		ready: 0,
		width: 20,
		height: 20,
		offsetx: 6,
		offsety: 6,
		src: img
	}

	var upright = {
		readx: 160,
		ready: 0,
		width: 20,
		height: 20,
		offsetx: 6,
		offsety: 6,
		src: img
	}

	var downright = {
		readx: 180,
		ready: 0,
		width: 20,
		height: 20,
		offsetx: 6,
		offsety: 6,
		src: img
	}

	var downleft = {
		readx: 200,
		ready: 0,
		width: 20,
		height: 20,
		offsetx: 6,
		offsety: 6,
		src: img
	}

	var skull = {
		readx: 220,
		ready: 0,
		width: 24,
		height: 24,
		offsetx: 4,
		offsety: 4,
		src: img
	}

	var win = {
		readx: 0,
		ready: 0,
		width: 168,
		height: 14,
		offsetx: 0,
		offsety: 0,
		src: txt
	}

	var fail = {
		readx: 0,
		ready: 14,
		width: 250,
		height: 14,
		offsetx: 0,
		offsety: 0,
		src: txt
	}

	var levelN = {
		readx: 0,
		ready: 28,
		width: 76,
		height: 14,
		offsetx: 0,
		offsety: 0,
		src: txt
	}

	var N0 = {
		readx: 94,
		ready: 28,
		width: 14,
		height: 14,
		offsetx: 64,
		offsety: 0,
		src: txt
	}

	var cursor = {
		readx: 468,
		ready: 0,
		width: 12,
		height: 16,
		offsetx: 0,
		offsety: 0,
		x: 0,
		y: 0,
		src: img
	}

	var sqareFrame = {
		readx: 492,
		ready: 0,
		width: 32,
		height: 32,
		offsetx: 0,
		offsety: 0,
		src: img
	}
	//Estados

	var statePostLoad = {
		id: "loaded",
		frame: 0,
		init: function() {
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			if (this.frame % 2 == 0) {
				drawLoader();
			} else {
				context.fillStyle = '#000';
				context.fillRect(0, 0, myCanvas.width, myCanvas.height);
			}
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 5) {
				status = stateLogo.init();
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	var stateLogo = {
		id: "logo",
		frame: 0,
		init: function() {
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			context.fillStyle = '#FFFFFF';
			context.fillRect(0, 0, myCanvas.width, myCanvas.height);
			if (this.frame < 20) {
				context.globalAlpha = 0.05 * this.frame;
			}
			painter.pieceCenter(pixelrobot);
			context.globalAlpha = 1;
			if (this.frame > 25) {
				painter.pieceCenter(presents);
			}
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 50) {
				status = stateMenu.init();
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	var stateMenu = {
		id: "menu",
		page: "main",
		setPage: function(page) {
			this.page = page;
		},
		init: function() {
			this.page = "main";
			if (clickMatch(mx, my, options) || clickMatch(mx, my, play)) {
				mhover = true;
			} else {
				mhover = false;
			}
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			context.fillStyle = '#000000';
			context.fillRect(0, 0, myCanvas.width, myCanvas.height);
			if (this.page == "main") {
				painter.pieceCenter(title);
				painter.pieceCenter(play);
				painter.pieceCenter(options);
				painter.pieceCenter(version);
			} else {
				painter.pieceCenter(sound);
				if (soundSwitch) {
					painter.pieceCenter(on);
				} else {
					painter.pieceCenter(off);
				}
				painter.pieceCenter(back);
			}
			drawCursor();
		},
		postprocess: function() {

		}, 
		transit: function() {

		},
		run: function() {
			this.draw();
		}
	}

	var stateBegin = {
		id: "begin",
		frame: 0,
		init: function() {
			level++;
			this.frame = 1;
			newGame(level + 4);
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			board.draw();
			//Level
			if (this.frame < 7) {
				painter.piecePartialCenter(levelN, this.frame * 2, "up");
				painter.numberPartialCenter(level, this.frame * 2, "up");
			} else if (this.frame >= 7 && this.frame <= 20) {
				painter.pieceCenter(levelN);
				painter.numberCenter(level);
			} else {
				var showFrame = this.frame - 20;
				for (var i in robots.list) {
					painter.piecePartial(robots, robots.list[i].x, robots.list[i].y, showFrame * 2, "up");
				}
				painter.piecePartial(man, man.x, man.y, showFrame * 2, "up");
			}
			if (this.frame == 20) {
				if (soundSwitch) teleport.play();
			}
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 32) {
				status = statePlaying.init();
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	var statePlaying = {
		id: "playing",
		init: function() {
			blockInput = false;
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			board.draw();
			painter.piece(man);
			for (var i in robots.list) {
				painter.piecePos(robots.list[i].x, robots.list[i].y, robots);
			}
			drawArrows();
			stasis.run();
			drawCursor();
		},
		postprocess: function() {

		}, 
		transit: function() {

		},
		run: function() {
			this.draw();
		}
	}

	var stateMoving = {
		id: "moving",
		frame: 0,
		init: function() {
			if (soundSwitch) walk.play();
			this.frame = 0;
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			board.draw();
			for (var i in robots.list) {
				painter.piecePos(robots.list[i].x, robots.list[i].y, robots);
			}
			stasis.run();
			var leap = stepvector[this.frame];
			painter.pieceShift(man, man.x, man.y, man.old.x, man.old.y, leap);
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 6) {
				status = stateTheirTurn.init();
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	// Preparar para que use temporizador
	var stateTeleporting = {
		id: "teleporting",
		frame: 0,
		init: function() {
			if (soundSwitch) teleport.play();
			this.frame = 1;
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			board.draw();
			for (var i in robots.list) {
				painter.piecePos(robots.list[i].x, robots.list[i].y, robots);
			}
			var leap = 2 * this.frame;
			painter.piecePartial(man, man.x, man.y, leap, "up");
			painter.piecePartial(man, man.old.x, man.old.y, leap, "down");
			stasis.run();
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 11) {
				if (!emptySquare(man.x, man.y)) {
					status = stateDead.init();
				} else {
					status = stateTheirTurn.init();
				}
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	var stateTheirTurn = {
		id: "theirturn",
		frame: 0,
		init: function() {
			robots.old = robots.list;
			robots.list = robots.ai();
			if (soundSwitch) servo.play();
			this.frame = 0;
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			board.draw();
			painter.piece(man);
			stasis.run();
			for (var i in robots.list) {
				var leap = stepvector[this.frame];
				painter.pieceShift (robots, robots.list[i].x, robots.list[i].y, robots.old[i].x, robots.old[i].y, leap);
			}
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 6) {
				var crshl = crashes.list.length;
				board.collisions();
				if (crshl != crashes.list.length) {
					if (soundSwitch) crash.play();
				}
				if (!emptySquare(man.x, man.y)) {
					status = stateDead.init();
				} else if (robots.list.length == 0) {
					status = stateVictory.init();
				} else {
					status = statePlaying.init();
				}
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	var stateDead = {
		id: "dead",
		frame: 1,
		init: function() {
			console.warn("YOU ARE DEAD");
			if (soundSwitch) scream.play();
			this.frame = 1;
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			board.draw();
			for (var i in robots.list) {
				if (robots.list[i].x != man.x || robots.list[i].y != man.y) {
					painter.piecePos(robots.list[i].x, robots.list[i].y, robots);
				}
			}
			stasis.run();
			painter.piecePos(man.x, man.y, skull);
			if (this.frame < 7) {
				painter.piecePartialCenter(fail, this.frame * 2, "up");
			} else {
				painter.pieceCenter(fail);
			}
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 20) {
				status = stateMenu.init();
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	var stateVictory = {
		id: "victory",
		frame: 1,
		init: function() {
			this.frame = 1;
			return this;
		},
		preprocess: function() {

		},
		draw: function() {
			board.draw();
			for (var i in robots.list) {
				if (robots.list[i].x != man.x || robots.list[i].y != man.y) {
					painter.piecePos(robots.list[i].x, robots.list[i].y, robots);
				}
			}
			stasis.run();
			painter.piece(man);
			if (this.frame < 7) {
				painter.piecePartialCenter(win, this.frame * 2, "up");
			} else {
				painter.pieceCenter(win);
			}
		},
		postprocess: function() {
			this.frame++;
		}, 
		transit: function() {
			if (this.frame > 20) {
				status = stateBegin.init();
			}
		},
		run: function() {
			this.draw();
			this.postprocess();
			this.transit();
		}
	}

	var stasis = {
		frame: 0,
		index: 0,
		init: function() {
			return this;
		},
		preprocess: function() {
			if (this.frame < 2) {
				this.index = 0;
			} else {
				this.index = 1;
			}
		},
		draw: function() {
			for (var i in crashes.list) {
				if (crashes.list[i].x != man.x || crashes.list[i].y != man.y) {
					painter.pieceFramePos(crashes.list[i].x, crashes.list[i].y, crashes, this.index);
				}
			}
		},
		postprocess: function() {
			this.frame = (this.frame + 1) % 4;
		}, 
		transit: function() {

		},
		run: function() {
			this.preprocess();
			this.draw();
			this.postprocess();
		}

	}

	//Movimientos
	var movements = new Array(
		{x: 0, y:-1, piece:up},
		{x: 1, y:-1, piece:upright},
		{x: 1, y: 0, piece:right},
		{x: 1, y: 1, piece:downright},
		{x: 0, y: 1, piece:down},
		{x:-1, y: 1, piece:downleft},
		{x:-1, y: 0, piece:left},
		{x:-1, y:-1, piece:upleft},
		{x: 0, y: 0, piece:null}
	);

	//Casilla vacía?
	function emptySquare(x, y) {
		for (var i in robots.list) {
			if (robots.list[i].x == x && robots.list[i].y == y) {
				return false;
			}
		}
		for (var i in crashes.list) {
			if (crashes.list[i].x == x && crashes.list[i].y == y) {
				return false;
			}
		}
		return true;
	}

	//Dibujo de bitmaps
	var painter = {
		piecePos: function (x, y, piece) {
			context.drawImage(piece.src, piece.readx, piece.ready, piece.width, piece.height, piece.offsetx + (board.square * x), piece.offsety + (board.square * y), piece.width, piece.height);
		},
		piecePosShift: function (x, y, piece, shift) {
			context.drawImage(piece.src, piece.readx + shift, piece.ready, piece.width, piece.height, piece.offsetx + (board.square * x), piece.offsety + (board.square * y), piece.width, piece.height);
		},
		pieceCart: function (x, y, piece) {
			context.drawImage(piece.src, piece.readx, piece.ready, piece.width, piece.height, piece.offsetx + x, piece.offsety + y, piece.width, piece.height);
		},
		pieceCartShift: function (x, y, piece, shift) {
			context.drawImage(piece.src, piece.readx + shift, piece.ready, piece.width, piece.height, piece.offsetx + x, piece.offsety + y, piece.width, piece.height);
		},
		piece: function (piece) {
			painter.piecePos(piece.x, piece.y, piece);
		},
		pieceFramePos: function (x, y, piece, frame) {
			context.drawImage(piece.src, piece.readx[frame], piece.ready, piece.width, piece.height, piece.offsetx + (board.square * x), piece.offsety + (board.square * y), piece.width, piece.height);
		},
		pieceCenter: function(piece) {
			context.drawImage(piece.src, piece.readx, piece.ready, piece.width, piece.height, piece.offsetx + Math.floor((myCanvas.width - piece.width)/2), piece.offsety + Math.floor((myCanvas.height - piece.height)/2), piece.width, piece.height);
		},
		pieceShift: function(piece, dirx, diry, oldx, oldy, leap) {
			var shftx = leap * (dirx - oldx);
			var shfty = leap * (diry - oldy);
			context.drawImage(piece.src, piece.readx, piece.ready, piece.width, piece.height, (board.square * oldx) + shftx + piece.offsetx, (board.square * oldy) + shfty + piece.offsety, piece.width, piece.height);
		},
		piecePartial: function(piece, x, y, leap, type) {
			switch(type) {
				case 'up':
					var pxlshft = piece.height - leap;
					context.drawImage(piece.src, piece.readx, piece.ready + pxlshft, piece.width, leap, (board.square * x) + piece.offsetx, (board.square * y) + piece.offsety + pxlshft, piece.width, leap);
					break;
				case 'down':
					context.drawImage(piece.src, piece.readx, piece.ready, piece.width, piece.height - leap, (board.square * x) + piece.offsetx, (board.square * y) + piece.offsety, piece.width, piece.height - leap);
					break;
			}
		},
		piecePartialCenter: function(piece, leap, type) {
			switch(type) {
				case 'up':
					var pxlshft = piece.height - leap;
					context.drawImage(piece.src, piece.readx, piece.ready + pxlshft, piece.width, leap, piece.offsetx + Math.floor((myCanvas.width - piece.width)/2), piece.offsety + Math.floor((myCanvas.height - piece.height)/2) + pxlshft, piece.width, leap);
					break;
				case 'down':
					context.drawImage(piece.src, piece.readx, piece.ready, piece.width, piece.height - leap, piece.offsetx + Math.floor((myCanvas.width - piece.width)/2), piece.offsety + Math.floor((myCanvas.height - piece.height)/2), piece.width, piece.height - leap);
					break;
			}
		},
		numberCenter: function(number) {
			var strnum = number.toString();
			for (i in strnum) {
				context.drawImage(N0.src, N0.readx + 16 * strnum[i], N0.ready, N0.width, N0.height, N0.offsetx + Math.floor((myCanvas.width - N0.width)/2) + (16 * i), N0.offsety + Math.floor((myCanvas.height - N0.height)/2), N0.width, N0.height);
			}
		},
		numberPartialCenter: function(number, leap, type) {
			var strnum = number.toString();
			switch(type) {
				case 'up':
					var pxlshft = N0.height - leap;
					for (i in strnum) {
						context.drawImage(N0.src, N0.readx + 16 * strnum[i], N0.ready + pxlshft, N0.width, leap, N0.offsetx + Math.floor((myCanvas.width - N0.width)/2) + (16 * i), N0.offsety + Math.floor((myCanvas.height - N0.height)/2) + pxlshft, N0.width, leap);
					}
					break;
				case 'down':
					for (i in strnum) {
						context.drawImage(N0.src, N0.readx + 16 * strnum[i], N0.ready, N0.width, N0.height - leap, N0.offsetx + Math.floor((myCanvas.width - N0.width)/2) + (16 * i), N0.offsety + Math.floor((myCanvas.height - N0.height)/2), N0.width, N0.height - leap);
					}
					break;
			}
		}
	}

	var adjust = {
		out: function(x, y) {
			return {x:x, y:y};
		},
		in: function(x, y) {
			return {x:y, y:y};
		}

	}

	function legalMove(x, y) {
		if (Math.abs(man.x - x) <= 1 && Math.abs(man.y - y) <= 1 && emptySquare(x, y)) {
			return true;
		} else {
			return false;
		}
	}

	function start() {
		img.onload = function() {loader()}; 
		txt.onload = function() {loader()};
		lettering.onload = function() {loader()};
		cheer.onloadeddata = function() {loader()};
		crash.onloadeddata = function() {loader()};
		scream.onloadeddata = function() {loader()};
		servo.onloadeddata = function() {loader()};
		teleport.onloadeddata = function() {loader()};
		walk.onloadeddata = function() {loader()};
		img.src = 'sprites.png';
		txt.src = 'text.png';
		lettering.src = 'lettering.png';
		cheer.src = 'cheer.mp3';
		crash.src = 'crash.mp3'; 
		scream.src = 'scream.mp3';
		servo.src = 'servo.mp3';
		teleport.src = 'teleport.mp3';
		walk.src = 'walk.mp3';
		state = 'PLAYING';
	}

	function drawLoader() {
		var w = Math.floor(myCanvas.width/2);
		var h = Math.floor(myCanvas.height/2);
		context.fillStyle = '#000';
		context.fillRect(0, 0, myCanvas.width, myCanvas.height);
		context.fillStyle = '#FFF';
		context.fillRect(w - 50, h - 10, 100, 10);
		context.fillStyle = '#000';
		context.fillRect(w - 48, h - 8, 96, 6);
		if (load > 0) {  
			context.fillStyle = '#C00';
			context.fillRect(w - 46, h - 6, Math.floor((92 / fullLoad) * (fullLoad - load)), 2);
		} else {
			context.fillStyle = '#0C0';
			context.fillRect(w - 46, h - 6, 92, 2);
		}
	}

	function loader() {
		load--;
		console.info("LOADED FILE. Load: " + load);
		drawLoader();
		if (load == 0) {
			console.info("ALL FILES LOEADED");
			status = statePostLoad;
			update();
		}
	}

	function newGame(n) {
		var rndpos = getRandomPos();
		man.x = rndpos.x;
		man.y = rndpos.y;
		robots.list = [];
		crashes.list = [];
		for (var i = 0; i < n; i++) {
			do {
				rndpos = getRandomPos();
				var pos = {x: rndpos.x, y: rndpos.y};
			} while(!emptySquare(pos.x, pos.y) || (pos.x == man.x && pos.y == man.y));
			robots.list.push(pos);
		}
	}

	//Animate

	var lastUpdateTime = 0;
	var acDelta = 0;
	var msPerFrame = 50;

	window.requestAnimFrame = (function() {
		return  window.requestAnimationFrame		||
				window.webkitRequestAnimationFrame	||
				window.mozRequestAnimationFrame		||
				window.oRequestAnimationFrame		||
				window.msRequestAnimationFrame		||
				function(callback) {
					 window.setTimeout(callback, 1000 / 60);
				};
	})();

	function update() {
		requestAnimFrame(update);
		var delta = Date.now() - lastUpdateTime;
		if (acDelta > msPerFrame) {
			acDelta = 0;
			status.run();
			console.info(status.id);
		} else {
			acDelta += delta;
		}
		lastUpdateTime = Date.now();
	}

	start();
}
