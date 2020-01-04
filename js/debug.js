var debugEnabled = true;

function initDebug() {
    if (debugEnabled) {
        debugContainer = document.createElement('div');
        document.body.appendChild(debugContainer);
    }
}

function debug(message) {
    if (debugEnabled)
        debugContainer.innerHTML += '<p>' + message + '</p>';
}

function clearDebug() {
    if (debugEnabled)
        debugContainer.innerHTML = '';
}