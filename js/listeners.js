// vars for handling inputs
var inputStates = {};

function addListeners(canvas, mouseEventFn, keyEventFn) {
    //add the listener to the main, window object, and update the states
    window.addEventListener('keydown', function (event) {
        if (event.keyCode === 37) {
            inputStates.left = true;
        } else if (event.keyCode === 38) {
            inputStates.up = true;
        } else if (event.keyCode === 39) {
            inputStates.right = true;
        } else if (event.keyCode === 40) {
            inputStates.down = true;
        } else if ((event.keyCode >= 65 && event.keyCode <= 90) || event.keyCode === 32) {
            keyEventFn(event.keyCode);
        }
    }, false);

    //if the key will be released, change the states object 
    window.addEventListener('keyup', function (event) {
        if (event.keyCode === 37) {
            inputStates.left = false;
        } else if (event.keyCode === 38) {
            inputStates.up = false;
        } else if (event.keyCode === 39) {
            inputStates.right = false;
        } else if (event.keyCode === 40) {
            inputStates.down = false;
        } else if (event.keyCode === 32) {
            inputStates.space = false;
        }
    }, false);

    // Mouse event listeners
    canvas.addEventListener('mousemove', function (evt) {
        inputStates.mousePos = getMousePos(evt, canvas);
    }, false);

    canvas.addEventListener('mousedown', function (evt) {
        inputStates.mousedown = true;
        mouseEventFn(evt.button);
    }, false);

    canvas.addEventListener('mouseup', function (evt) {
        inputStates.mousedown = false;
    }, false);

    // emulate mouse with touch events
    canvas.addEventListener('touchstart', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        inputStates.mousedown = true;
        inputStates.mousePos = getTouchPos(evt, canvas);
        mouseEventFn(0); // simulate left mouse button
    }, false);
    canvas.addEventListener('touchend', function (evt) {
        inputStates.mousedown = false;

        // mobile specific
        if(!mh.initialized) {
            console.log("Playing music for mobiles, on touchend, only once!");
            mh.play("humbug");
            mh.initialized = true; 
        }
    }, false);

    canvas.addEventListener('touchmove', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        inputStates.mousePos = getTouchPos(evt, canvas);
    }, false);
}

function getMousePos(evt, canvas) {
    // necessary to take into account CSS boudaries
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}
function getTouchPos(evt, canvas) {
    // necessary to take into account CSS boudaries
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.touches[0].clientX - rect.left,
        y: evt.touches[0].clientY - rect.top
    };
}