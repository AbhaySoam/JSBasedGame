

// GAME FRAMEWORK STARTS HERE
var GF = function () {
    var gameTitle = "Skyward Bound";

    var assets = {};

    // On mobile devices, IOS needs special care with
    // autoplay music and WebAudio
    var isIOS;

    // Vars relative to the canvas
    var canvas, ctx, w, h;
    var effectiveW = 800;       // treat game as if it's this width, then scale to actual width
    var effectiveH;             // height of the screen in game coordinates, used for internal stuff
    var scaleFactor;            // scale input and output by this. all internal stuff (collisions, etc.) can ignore it
    var groundy = -20;          // distance of game ground from bottom of background image
    var clickables;             // clickable areas on the canvas

    // audio
    var currentGameTrack = 0;

    // for time based animation
    var delta, oldTime = 0;

    var overlayFadeTime = 500; // ms

    // RESOURCES

    // Background color
    var backgroundRGB = [14, 163, 255];

    // Bunny object and sprites
    // sprite index corresponding to posture
    var bunnySprites = [];
    var BUNNY_DIR_RIGHT = 2;
    var BUNNY_DIR_LEFT = 1;
    var BUNNY_DIR_FRONT = 0;
    var BUNNY_DIR_BACK = 3;


    // The bell sprite
    var bellWidth = 32;
    var bellHeight = 43;

    // snow 
    var flakes = [];
    var flakeCount = 100;
    var snowParallax = 0.3;

    // GAMEPLAY
    var bellsMinHeight = 160;
    var bellsYInterval = 120;
    var difficultyRate = 100000; // essentially # of pixels per increase in difficulty multiplier

    // Bunny physics!
    var jumpVelocity = 800;
    var bounceVelocity = 500;
    var gravityAccel = 12.5 * 60;
    var terminalVelocity = 400;
    var maxUpwardVelocity = 550;
    var maxXVelocity = 1800; // max horizontal speed, as a fraction of total canvas width per ms

    // game states
    var gameStates = {
        gameRunning: 1,
        gameOver: 2
    };

    var currentGameState = gameStates.gameRunning;

    // game substates during gameRunning
    var paused;             // game timer does not increment
    var allowInput;         // not used
    var displayingCredits;  // enable credits overlay (pauses game)
    var showHighScore;      // display high score instead of current score



    // FOR GAMER OVER SCREEN
    // Bunnies for game over screen
    var bunnies = [];
    var nbBunnies = 30;
    // time between explosions game over screen, in ms
    var timeBetweenExplosionsGameOverScreen = 200;


    // CURRENT GAME
    var bunny;
    var jumpQueued;
    var camera;

    // stats for current run
    var gameStartTime;
    var currentScore;
    var currentMultiplier;
    var peakHeight;
    var gameStarted;

    var bellArray;
    var highestBell;

    var currentHighScore;
    var highScoreSet;

    function startNewGame() {
        bunny = {
            x: effectiveW / 8,
            y: groundy,
            width: 48,
            height: 48,
            vx: 0, // x velocity
            vy: 0, // y velocity
            direction: BUNNY_DIR_FRONT,
        };
        camera = {
            y: bunny.y,
        };
        jumpQueued = false;
        gameStartTime = 0;
        currentScore = 0;
        currentMultiplier = 1;
        gameStarted = 0; // start on first input
        peakHeight = bunny.y;
        bellArray = [];
        highestBell = bunny.y - (bellsMinHeight - bellsYInterval);

        // need to recreate snow at ground level
        flakes = [];
        flakes = createSnowFlakes(flakeCount, effectiveW, effectiveH);

        // remove particles from game over screen
        wipeParticles();

        paused = 0;
        allowInput = 1;
        displayingCredits = false;
        showHighScore = false;

        currentHighScore = getHighScore();
        highScoreSet = false;

        currentGameState = gameStates.gameRunning;
        createStartOverlayClickables();
    }

    function gameOver() {
        currentHighScore = getHighScore(); // in case it somehow changed
        //console.log("current score: " + currentScore + ", currentHighScore: " + currentHighScore);
        if (currentScore > currentHighScore) {
            setHighScore(currentScore);
            currentHighScore = currentScore;
            highScoreSet = true;
        }
        playMainMusic(assets.concertino);
        //mh.play("concertino");
        currentGameState = gameStates.gameOver;

        bunnies = [];
        createBunniesForGameOverScreen();
    }



    // We want the object to move at speed pixels/s (there are 60 frames in a second)
    // If we are really running at 60 frames/s, the delay between frames should be 1/60
    // = 16.66 ms, so the number of pixels to move = (speed * del)/1000. If the delay is twice
    // longer, the formula works : let's move the rectangle twice longer!
    var calcDistanceToMove = function (delta, speed) {
        //console.log("#delta = " + delta + " speed = " + speed);
        return (speed * delta) / 1000;
    };


    function timer(currentTime) {
        var delta = currentTime - oldTime;
        oldTime = currentTime;
        return delta;

    }

    // MAIN LOOP

    var mainLoop = function (time) {
        //main function, called each frame 
        measureFPS(time);

        if (displayingCredits)
            paused = 1; // just to be sure

        // number of ms since last frame draw
        delta = timer(time);
        if (paused)
            delta = 0;

        clearDebug();

        // Clear the canvas
        clearCanvas();
        //debug("scaleFactor: " + w/effectiveW);

        switch (currentGameState) {
            case gameStates.gameRunning:
                // update game state based on delta
                updateWorld(delta);

                // has to be after updateBunny so gameStart can occur on first jump
                if (gameStarted && gameStartTime === 0) {
                    gameStartTime = time;
                    destroyStartOverlayClickables();
                }


                // RENDER FRAME

                // indendent of camera, res, aspect ratio, etc. only depends on canvas size
                drawBackgroundColor(bunny.y);

                ctx.save();
                ctx.scale(scaleFactor, scaleFactor); // scale everything else

                // set up camera and draw the game world
                ctx.save();
                ctx.translate(0, -camera.y);
                drawWorld(ctx);
                ctx.restore();

                drawOverlays(time);

                drawSnowParallax();
                displayScore();

                // For debugging, display canvas size
                //displayCanvasSize();

                ctx.restore();
                clickablesDebug();

                if (paused && !displayingCredits) {
                    drawPauseScreen();
                }

                break;
            case gameStates.gameOver:
                gameOverScreen(delta);
                break;
        }

        // call the animation loop every 1/60th of second
        requestAnimationFrame(mainLoop);
    };


    // ----- USER INPUT FUNCTIONS ----- //

    function callMouseEvent(button) {
        // our lovely weird coordinate system:
        // since the game is scaled from 800px to the actual canvas width,
        //   mouse inputs have to divide by this factor to convert from canvas coords
        //   to our internal (800px based) UI coordinates
        // for the y axis, it gets even more complicated
        // in order to accommodate any aspect ratio without warping the UI,
        //   we extend the canvas in both directions from the middle
        // so UI y coordinates are relative to the middle of the screen
        //   (down is positive, up is negative)
        // TODO: functions to translate between coordinate systems
        var mx = inputStates.mousePos.x / scaleFactor;
        var my = (inputStates.mousePos.y / scaleFactor) - effectiveH / 2;

        switch (button) {
            case 0: // left button
                var numEvents = clickables.checkClick(mx, my);

                if (numEvents == 0) {
                    if (currentGameState == gameStates.gameRunning) {
                        if (!paused && allowInput) {
                            jumpQueued = true;
                        }
                        else if (displayingCredits) {
                            setCreditStatus(false);
                        }
                    }
                    else if (currentGameState == gameStates.gameOver) {
                        startNewGame();
                    }
                }
                break;
        }
    }

    function callKeyEvent(key) {
        switch (key) {
            case 32: // space: simulate left mouse button click
                callMouseEvent(0);
                break;
            case 67: // c: toggle credits
                if (currentGameState == gameStates.gameRunning) {
                    setCreditStatus(!displayingCredits);
                }
                break;
            case 72: // h: toggle displaying high score
                if (currentGameState == gameStates.gameRunning) {
                    showHighScore = !showHighScore;
                }
                break;
            case 80: // p: toggle pause
                if (currentGameState == gameStates.gameRunning) {
                    paused = !paused;
                }
                break;
        }
    }

    function onBlur() {
        //console.log("lost focus");
        if (currentGameState == gameStates.gameRunning) {
            paused = true;
        }
    }

    function onFocus() {
        //console.log("gained focus");
        if (paused)
            paused = false;
    }


    function setCreditStatus(enableCredits) {
        displayingCredits = enableCredits;
        paused = enableCredits;
        if (enableCredits) {
            destroyStartOverlayClickables();
            playMainMusic(assets.xmas);
            //mh.play("xmas");
        }
        else {
            if (!gameStarted) { // awkward way of handling this
                createStartOverlayClickables();
            }
            playMainMusic(assets.humbug);
            //mh.play("humbug");
        }
    }

    // --------------------------------
    // Game over screen
    var totalTimeGameOver = 0;

    function gameOverScreen(delta) {

        ctx.save();

        drawBackgroundColor(groundy); // background color at ground, to match bg image

        ctx.scale(scaleFactor, scaleFactor); // scale everything to current res
        drawBackground();

        // Flying bunnies
        drawPlentyOfBunniesGameOverScreen();

        // particles
        updateParticles(delta);
        drawParticles(ctx);

        // Text
        ctx.translate(0, 50);
        ctx.font = 'bold 40pt Verdana';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        var textX = effectiveW / 2;
        var textCurrY = effectiveH / 4;
        var maxHeight = Math.round(groundy - peakHeight);
        textWithOutline(ctx, "Score: " + currentScore, textX, textCurrY, 1, "Purple", "White");
        textCurrY += 50;
        textWithOutline(ctx, "Max Height: " + maxHeight, textX, textCurrY, 1, "Purple", "White");
        textCurrY += 100;
        if (!highScoreSet) {
            textWithOutline(ctx, "High Score: " + currentHighScore, textX, textCurrY, 1, "Purple", "White");
            textCurrY += 100;
        }

        ctx.font = 'bold 20pt Verdana';
        textWithOutline(ctx, "Click or hit space to play again...", textX, textCurrY, 0.3, "Purple", "White");

        var gameOverText = "GAME OVER";
        if (highScoreSet)
            gameOverText = "NEW HIGH SCORE"; // encouragement :)
        drawRainbowGradientTextCentered(ctx, gameOverText, effectiveW, effectiveH);



        bunny.y = groundy;
        drawSnowParallax();

        // for creating explosions every x ms
        totalTimeGameOver += delta;
        if (totalTimeGameOver > timeBetweenExplosionsGameOverScreen) {
            createExplosion(Math.random() * effectiveW, Math.random() * effectiveH, "#fff", "Merry Christmas");
            totalTimeGameOver = 0;
        }

        ctx.restore();
    }

    function drawPlentyOfBunniesGameOverScreen() {
        for (var i = 0; i < nbBunnies; i++) {
            var b = bunnies[i];
            if ((b.direction === BUNNY_DIR_RIGHT) || (b.direction === BUNNY_DIR_LEFT))
                b.x += calcDistanceToMove(delta, b.speed);
            else {
                b.y += calcDistanceToMove(delta, b.speed);
            }
            b.x %= effectiveW; b.y %= effectiveH;

            bunnySprites[b.direction].draw(ctx, b.x, b.y, b.width / 32);

        }
    }
    function createBunniesForGameOverScreen() {
        for (var i = 0; i < nbBunnies; i++) {
            var oneBunny = {};
            oneBunny.x = Math.random() * effectiveW;
            oneBunny.y = Math.random() * effectiveH;
            oneBunny.width = 48;
            oneBunny.height = 48;
            oneBunny.direction = Math.floor(Math.random() * 4);
            oneBunny.speed = Math.round(40 + Math.random() * 100);

            if ((oneBunny.direction === BUNNY_DIR_LEFT) ||
               (oneBunny.direction === BUNNY_DIR_BACK))
                oneBunny.speed = -oneBunny.speed;

            bunnies.push(oneBunny);

        }
    }


    function getDifficultyAtHeight(height, rate) {
        return 1 + (groundy - height) / rate;
    }

    // UPDATE FUNCTIONS

    function updateWorld(delta) {
        // update and draw the bunny
        updateBunny(delta);
        updateCamera(delta);
        updateBells();
        updateParticles(delta);
    }

    function addNextBell() {
        var y = highestBell - bellsYInterval;
        var difficultyFactor = getDifficultyAtHeight(y, difficultyRate); // 1 at ground, +1 per difficultyRate pixels upwards
        var xrange = effectiveW * 0.4 * difficultyFactor; // start out using only the middle 40% of the screen
        if (xrange > effectiveW * 0.96) // 2% padding on either side
            xrange = effectiveW * 0.96;
        var xmin = (effectiveW * 0.98 - xrange) / 2;
        var x = xmin + xrange * Math.random();
        var size = 1 / difficultyFactor;
        if (size < 0.2) // min bell size
            size = 0.2;
        var colorIndex = Math.floor(Math.random() * 5);
        var angle = Math.round(Math.random() * 30 - 15);
        var bell = new Bell(x, y, bellWidth, bellHeight, angle, size, colorIndex, assets.bell);
        bellArray.push(bell);
        highestBell = y;
    }

    function updateBells() {
        var bellBuffer = effectiveH; // create bells at least this many pixels above current bunny height
        while (highestBell > bunny.y - bellBuffer) { // reverse y coords are going to drive me crazy
            addNextBell();
        }
        testCollisionWithBells(); // collision text with bells
        for (var i = 0; i < bellArray.length; i++) {
            var bell = bellArray[i];
            if (bell.y > bunny.y + effectiveH) // kill bells that are too far below player
                bell.dead = true;
        }
        // TODO: remove dead bells from list
    }

    function testCollisionWithBells() {
        for (var i = 0; i < bellArray.length; i++) {
            var bell = bellArray[i];
            // do not test with dead bells 
            if (bell.dead) continue;

            if (rectsOverlap(bunny.x, bunny.y, bunny.width, bunny.height,
							bell.x, bell.y, bell.width, bell.height)) {
                playerHitsBell(bell);
            }
        }
    }


    function playerHitsBell(bell) {
        var scoreAdd = 10 * currentMultiplier;
        currentScore += scoreAdd;
        currentMultiplier++;
        explodeBell(bell, "+" + scoreAdd);
        bunnyBounce();
    }


    function explodeBell(bell, text) {
        bell.dead = true;
        // create explosion at center of ball
        var x = bell.x + bell.width / 2;
        var y = bell.y - bell.height / 2;
        createExplosion(x, y, bell.color, text);
        playSoundOnce(assets.plop, 1.0);
    }


    function updateBunny(delta) {
        // check inputStates
        if (allowInput) {
            if (inputStates.mousePos) {
                x = inputStates.mousePos.x / scaleFactor;
                cursorDistance = x - (bunny.x + bunny.width / 2);
                if (cursorDistance < -1) { // cursor is left of center of sprite
                    bunny.vx = cursorDistance * maxXVelocity / effectiveW; // TODO: smoother curve?
                    bunny.direction = BUNNY_DIR_LEFT;
                }
                else if (cursorDistance > 1) { // cursor is right of center of sprite
                    bunny.vx = cursorDistance * maxXVelocity / effectiveW;
                    bunny.direction = BUNNY_DIR_RIGHT;
                }
                else {
                    bunny.vx = 0;
                    bunny.direction = BUNNY_DIR_FRONT;
                }
            }
            if (jumpQueued) {
                jumpQueued = false;
                if (bunnyOnGround()) {
                    bunnyJump();
                    gameStarted = 1;
                }
            }
        }
        // Compute the incX and inY in pixels depending
        // on the time elasped since last redraw
        bunny.x += calcDistanceToMove(delta, bunny.vx);

        // don't go off the screen
        var bunnyxbuffer = 0; // percent of buffer to either side of screen
        var minx = effectiveW * bunnyxbuffer;
        var maxx = effectiveW * (1 - bunnyxbuffer);
        if (bunny.x < minx) {
            bunny.x = minx;
            bunny.vx = 0;
            bunny.direction = BUNNY_DIR_FRONT;
        }
        if (bunny.x + bunny.width > maxx) {
            bunny.x = maxx - bunny.width;
            bunny.vx = 0;
            bunny.direction = BUNNY_DIR_FRONT;
        }

        // same function works for accel, to modify velocity
        bunny.vy -= calcDistanceToMove(delta, gravityAccel);
        if (bunny.vy < -terminalVelocity)
            bunny.vy = -terminalVelocity;

        var yToMove = calcDistanceToMove(delta, -bunny.vy);

        if ((bunny.y + yToMove) >= groundy) {
            // We are on the ground, we can't go to higher y
            bunny.y = groundy;
            bunny.vy = 0;
        } else {
            bunny.y += yToMove;
        }
        if (bunny.y < peakHeight)
            peakHeight = bunny.y;
        else if (bunny.y > peakHeight + 0.75 * effectiveW || (bunnyOnGround() && peakHeight < groundy - bellsMinHeight - bellsYInterval * 0.5)) // dropped too far, we lost
            // has to be based on (default) width because height can vary with aspect ratio
            gameOver();

        //debug('vy: ' + bunny.vy + ", bunny y: " + Math.round(bunny.y) + ", camera y: " + Math.round(camera.y));
    }

    function bunnyOnGround() {
        return bunny.y >= groundy;
    }

    function bunnyJump() {
        bunny.vy += jumpVelocity;
        if (bunny.vy > maxUpwardVelocity)
            bunny.vy = maxUpwardVelocity;
    }

    function bunnyBounce() {
        bunny.vy += bounceVelocity;
        if (bunny.vy < bounceVelocity)
            bunny.vy = bounceVelocity;
        else if (bunny.vy > maxUpwardVelocity)
            bunny.vy = maxUpwardVelocity;
    }

    function updateCamera(delta) {
        var bunnyLevel = 0.625; // how far down the screen bunny will be
        distFromBunny = bunny.y - camera.y - effectiveH * bunnyLevel; // negative if camera is below bunny
        cameraSpeedY = (distFromBunny * 3) ^ 4; // TODO: find a decent formula for this
        cameraMoveY = calcDistanceToMove(delta, cameraSpeedY);
        camera.y += cameraMoveY;
        var cameraMaxY = -effectiveH;
        //debug('moving camera by ' + cameraMoveY);
        if (camera.y + cameraMoveY > cameraMaxY) {
            camera.y = cameraMaxY;
        }
    }

    // Delta = time between two consecutive frames,
    // for time-based animation
    function updateParticles(delta) {
        for (var i = 0; i < particles.length; i++) {
            var particle = particles[i];
            particle.update(delta);
        }
    }


    // DRAWING FUNCTIONS

    // clears the canvas content
    function clearCanvas() {
        ctx.clearRect(0, 0, w, h);
    }

    // draw everything "inside" the game world
    //  (based on game coordinates)
    function drawWorld(ctx) {
        drawBackground();
        drawBells();
        drawBunny();
        drawParticles(ctx);
    }

    function drawOverlays(time) {
        if (displayingCredits) {
            drawCredits();
        }
        else if (!gameStarted || time - gameStartTime < overlayFadeTime) {
            var opacity = 1;
            if (gameStarted)
                opacity = (overlayFadeTime - (time - gameStartTime)) / overlayFadeTime;
            drawStartText(opacity);
        }
    }

    function drawParticles(ctx) {
        for (var i = 0; i < particles.length; i++) {
            var particle = particles[i];
            particle.draw(ctx);
        }
    }

    function drawSnowParallax() {
        // draw snow, With small parallax effect
        var ty = -camera.y * snowParallax;
        drawSnow(ctx, flakes, effectiveW, effectiveH, ty);
    }

    function drawBells() {
        for (var i = 0; i < bellArray.length; i++) {
            var bell = bellArray[i];
            if (!bell.dead) {
                bell.draw(ctx);
            }
        }
    }

    function drawBunny() {
        if (bunnyOnGround() && bunny.vx === 0) {
            bunnySprites[bunny.direction].drawStopped(ctx, bunny.x, bunny.y - bunny.height, bunny.width / 32);
        } else {
            bunnySprites[bunny.direction].draw(ctx, bunny.x, bunny.y - bunny.height, bunny.width / 32);
        }
    }

    function drawBackgroundColor(bunnyHeight) {
        var diff = getDifficultyAtHeight(bunnyHeight, difficultyRate / 2); // darken at a reasonable rate
        var mult = 1 / (diff * diff);
        //debug(mult);
        var r = Math.round(backgroundRGB[0] * mult);
        var g = Math.round(backgroundRGB[1] * mult);
        var b = Math.round(backgroundRGB[2] * mult);
        //debug('background: rgb('+r+', '+g+', '+b+')');
        ctx.save();
        ctx.fillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ')';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    function drawBackground() {
        var bgHeight = assets.backgroundImage.height;
        ctx.drawImage(assets.backgroundImage, 0, -bgHeight, effectiveW, bgHeight);
    }

    function drawPauseScreen() {
        ctx.save();
        ctx.fillStyle = 'rgba(80, 80, 80, 0.4)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    function displayScore() {
        var text;
        var color;
        if (showHighScore) {
            // TODO: show current score if higher?
            text = "High: " + currentHighScore;
            color = 'yellow';
        }
        else {
            text = "Score: " + currentScore;
            if (currentScore >= 0 && currentScore >= currentHighScore)
                color = 'yellow';
            else
                color = 'white';
        }
        ctx.save();
        ctx.font = '24pt Arial';
        textWithShadow(ctx, text, 5, 29, 1, color, 'Black');
        ctx.restore();
    }


    function displayCanvasSize() {
        ctx.save();
        ctx.fillStyle = 'White';
        ctx.fillText("w=" + w + " h=" + h + " orientation: " + window.orientation, 5, 50);
        ctx.restore();
    }

    // draws box at current origin
    function drawPopupBox(boxWidth, boxHeight, boxPadding) {
        ctx.save();
        ctx.globalAlpha /= 8; // allow alpha to already be reduced
        ctx.fillStyle = 'white';
        ctx.fillRect(boxPadding, 0, boxWidth - 2 * boxPadding, boxHeight);
        ctx.fillRect(0, boxPadding, boxWidth, boxHeight - 2 * boxPadding);
        ctx.restore(); // reset alpha
        ctx.save();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'green';
        ctx.strokeRect(boxPadding, 0, boxWidth - 2 * boxPadding, boxHeight);
        ctx.strokeStyle = 'red';
        ctx.strokeRect(0, boxPadding, boxWidth, boxHeight - 2 * boxPadding);
        ctx.restore();
    }

    function drawStartText(opacity) {
        // will be drawn during the gameRunning loop, so base sizes on effectiveW
        var boxWidth = effectiveW / 1.4;
        var boxHeight = boxWidth / 1.6;
        var boxLeft = effectiveW / 2 - boxWidth / 2;
        var boxTop = effectiveH / 2 - boxHeight / 2;
        var boxPadding = 5;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(boxLeft, boxTop);
        drawPopupBox(boxWidth, boxHeight, boxPadding);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        var textX = boxWidth / 2;
        //textWithShadow(ctx,gameTitle, textX, 85, 2.5, 'red', 'white');
        ctx.drawImage(assets.logo1, 50, 20, 250, 100);
        ctx.drawImage(assets.logo2, 310, 70, 190, 100);

        ctx.font = '30pt Arial';
        textWithShadow(ctx, "Click or press space to jump!", textX, 200, 1.6, 'green', 'white');
        ctx.font = '24pt Arial';
        textWithShadow(ctx, "(P)ause  (H)igh Score  (C)redits", textX, 280, 1.4, 'green', 'white');
        //textWithShadow(ctx, "(P)ause             (C)redits", textX, 252, 1.4, 'green', 'white');
        ctx.restore();
    }

    function createStartOverlayClickables() {
        // this isn't ideal. ok, it's terrible.
        // we'll redo the overlay boxes eventually
        var boxWidth = effectiveW / 1.4; // 571.43
        var boxHeight = boxWidth / 1.6; // 357.14
        var boxLeft = effectiveW / 2 - boxWidth / 2; // 114.29
        var boxTop = effectiveH / 2 - boxHeight / 2; // effectiveH / 2 - 178.57
        var textX = boxWidth / 2; // 285.71
        // clickables.create(name, x, y, width, height, callback)
        //  - x value is the distance between the start of the text line and the left side of "(C)redits"
        //  - y value is the distance from the center of the screen to the top of "(C)redits"
        clickables.create("start-credits-link", textX + 214, 102, 132, 40, function () { setCreditStatus(true); });
    }

    function clickablesDebug() {
        var coords = clickables.getAllCoords();
        ctx.save();
        ctx.strokeStyle = "red";
        for (c in coords) {
            r = coords[c];
            // we have to convert from UI to canvas coordinates
            // (if we called this inside the scale() section of the render, we could leave out scaleFactor)
            // for an explanation of the weird y adjustment, see the comments in callMouseEvent()
            ctx.strokeRect(r[0] * scaleFactor, (r[1] + effectiveH / 2) * scaleFactor, r[2] * scaleFactor, r[3] * scaleFactor);
        }
        ctx.restore();
    }

    function destroyStartOverlayClickables() {
        clickables.destroy("start-credits-link");
    }


    function drawCredits() {
        var boxWidth = effectiveW / 1.6;
        var boxHeight = boxWidth / 1.1;
        var boxLeft = effectiveW / 2 - boxWidth / 2;
        var boxTop = effectiveH / 2 - boxHeight / 2;
        var boxPadding = 5;
        ctx.save();
        ctx.translate(boxLeft, boxTop);
        drawPopupBox(boxWidth, boxHeight, boxPadding);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        var textX = boxWidth / 2;
        ctx.font = '26pt Arial';
        var textY = 40;
        textWithShadow(ctx, "CREDITS", textX, textY, 2.5, 'red', 'white');
        textY += 50;
        ctx.font = '18pt Arial';
        textWithShadow(ctx, "bensaccount - Programming/Design", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        textWithShadow(ctx, "Michel Buffa - Programming", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        textWithShadow(ctx, "William Graham - Music:", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        ctx.font = '16pt Arial';
        textWithShadow(ctx, "\"Humbug\", \"Christmas Concertino\"", textX, textY, 1.5, 'red', 'white');
        textY += 28;
        ctx.font = '18pt Arial';
        textWithShadow(ctx, "clmasse - Music:", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        ctx.font = '16pt Arial';
        textWithShadow(ctx, "\"Xmas\"", textX, textY, 1.5, 'red', 'white');
        textY += 28;
        ctx.font = '18pt Arial';
        textWithShadow(ctx, "With thanks to lxdnz34", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        textWithShadow(ctx, "Game logo by Clémentine Buffa", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        textWithShadow(ctx, "Flying Mint Bunny sprite by JpopKitty", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        textY += 30;
        textWithShadow(ctx, "Inspired by Winter Bells", textX, textY, 1.5, 'green', 'white');
        textY += 30;
        ctx.font = '16pt Arial';
        textWithShadow(ctx, "by Ferry Halim", textX, textY, 1.5, 'green', 'white');
        ctx.font = '14pt Arial';
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        textWithShadow(ctx, "Hit (c) to close", boxWidth - 12, boxHeight - 12, 1, 'red', 'white');
        ctx.restore();
    }

    function createCreditsClickables() {

    }

    function destroyCreditsClickables() {

    }


    // -------------- AUDIO ---------------------

    // loop music playlist
    function playMainMusic(track) { // track #, see array gameMusic[] for track list


        if (currentGameTrack) currentGameTrack.pause();

        currentGameTrack = track;
        currentGameTrack.play();
        /*musicSource = playSoundOnce(assets[gameMusic[track]], 1.0);
     
        musicSource.onended = function() {
            currentGameTrack++;
            if(currentGameTrack >= gameMusic.length)
                currentGameTrack = 0;
            playMainMusic(currentGameTrack);
        };*/
    }

    function playSoundOnce(sound, playbackRate) {
        sound.play();
    }

    function initMusic() {
        playMainMusic(assets.humbug);
    }
    //---------- LOADING ASSETS -------------------//


    function createLoadScreen(assetsLoaded) {
        for (var asset in assetsLoaded) {
            //console.log("assets[" + asset + "] = " + assetsLoaded[asset]);
            assets[asset] = assetsLoaded[asset];
        }

        // don't bother with load screen if we're done loading the other stuff too
        if (assets.length > assetsLoaded.length)
            return;

        console.log("draw load screen");
        ctx.save();

        drawBackgroundColor(groundy); // background color at ground, to match bg image
        ctx.scale(scaleFactor, scaleFactor); // scale everything to current res
        drawBackground();
        ctx.font = '32pt Arial';
        var loadText = "Loading...";
        var textMetrics = ctx.measureText(loadText);
        textWithShadow(ctx, loadText, effectiveW / 2 - textMetrics.width / 2, effectiveH / 2, 1.2, "green", "white");
        ctx.restore();
    }

    function allAssetsLoaded(assetsLoaded) {
        console.log("all samples loaded and decoded");
        for (var asset in assetsLoaded) {
            //console.log("assets[" + asset + "] = " + assetsLoaded[asset]);
            assets[asset] = assetsLoaded[asset];
        }

        // builds the sprites
        var SPRITE_WIDTH = 32;
        var SPRITE_HEIGHT = 32;
        var NB_POSTURES = 4;
        var NB_FRAMES_PER_POSTURE = 6;

        // Create woman sprites
        for (var i = 0; i < NB_POSTURES; i++) {
            var sprite = new Sprite();

            sprite.extractSprites(assetsLoaded.spriteSheetBunny,
                                  NB_POSTURES,
                                  i,
                                  NB_FRAMES_PER_POSTURE,
                                  SPRITE_WIDTH, SPRITE_HEIGHT);
            sprite.setNbImagesPerSecond(10);
            bunnySprites[i] = sprite;
        }
    }



    // --- SET RESOLUTION
    function setResolution(width, height) {
        canvas.width = w = width;
        canvas.height = h = height;

        scaleFactor = w / effectiveW;
        effectiveH = h / scaleFactor;
    }

    // ----- START METHOD OF THE GAME FRAMEWORK ----------//
    var start = function () {
       // check if on ios
        isIOS = /iPad|iPhone|iPod/.test(navigator.platform);

        // Music handler
        //mh.add("humbug", "http://sophiapolis.net/music/humbug.mp3");
        //mh.add("concertino", "http://mainline.i3s.unice.fr/mooc/christmas_concertino.mp3");
        //mh.add("xmas", "http://mainline.i3s.unice.fr/mooc/Xmas.mp3");

 
        initFPSCounter();
        initDebug();

        // Canvas, context etc.
        canvas = document.querySelector("#myCanvas");

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        setResolution(canvas.width, canvas.height);

        // important, we will draw with this object
        ctx = canvas.getContext('2d');
        // default policy for text
        ctx.font = "20px Arial";

        addListeners(canvas, callMouseEvent, callKeyEvent);

        // these require that the <canvas> element has a tabindex set
        canvas.onblur = onBlur;
        canvas.onfocus = onFocus;

        clickables = new Clickables();

        // --------------
        // mobile devices
        // --------------       
        // Scroll window to top
        window.scrollTo(0, 1);

        // Check size and orientation
        var previousOrientation = window.orientation;
        var checkOrientation = function () {

            //if(window.orientation === undefined) return;
            if (w != window.innerWidth || h != window.innerHeight) {
                setResolution(window.innerWidth, window.innerHeight);
                w = canvas.width; h = canvas.height;
            }
            if (window.orientation !== previousOrientation) {
                previousOrientation = window.orientation;
                // orientation changed, do your magic here

                // play a sound for debugging the orientation change
                assets.humbug.play();
            }
        };
        window.addEventListener("resize", checkOrientation, false);
        window.addEventListener("orientationchange", checkOrientation, false);

        // (optional) Android doesn't always fire orientationChange 
        // on 180 degree turns
        //if(!isIOS)
        setInterval(checkOrientation, 2000);


        //setResolution(320, 568);
        // --------------
        // -- end of mobile devices
        // --------------

        loadAssets(function (assets) {
            // all assets (images, sounds) loaded, we can start the animation
            allAssetsLoaded(assets);
            initMusic();
            startNewGame();
            requestAnimationFrame(mainLoop);
        });
    };

    //our GameFramework returns a public API visible from outside its scope
    return {
        start: start, 
        initMusic: initMusic
    };
};

