// HIGH SCORES

function getHighScore() {
    hs = localStorage.bunnyHighScore;
    if (hs !== undefined)
        return hs;
    else
        return 0;
}

function setHighScore(score) {
    localStorage.bunnyHighScore = score;
}

function resetHighScore() {
    localStorage.removeItem('bunnyHighScore');
}
