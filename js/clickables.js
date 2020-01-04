function Clickables() {
    this.clickables = {};

    this.create = function (name, x, y, width, height, callback) {
        this.clickables[name] = new ClickableRegion(x, y, width, height, callback);
    }

    this.destroy = function (name) {
        if (name in this.clickables)
            delete this.clickables[name];
    }

    this.checkClick = function (mx, my) {
        var count = 0;
        for (c in this.clickables) {
            if (this.clickables[c].checkClick(mx, my))
                count++;
        }
        return count;
    }

    // debug
    this.getAllCoords = function () {
        var coords = {};
        for (c in this.clickables) {
            coords[c] = this.clickables[c].getCoords();
        }
        return coords;
    }
}

function ClickableRegion(x, y, width, height, callback) {
    this.x1 = x;
    this.y1 = y;
    this.x2 = x + width;
    this.y2 = y + height;
    this.handler = callback;

    this.checkClick = function (mx, my) {
        console.log("checking " + mx + ", " + my + " against " + this.x1 + ", " + this.y1 + ", " + this.x2 + ", " + this.y2);
        if (mx >= this.x1 && mx <= this.x2 && my >= this.y1 && my <= this.y2) {
            this.handler(mx, my);
            return true;
        }
        return false;
    }

    this.getCoords = function() {
        return [this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1];
    }
}