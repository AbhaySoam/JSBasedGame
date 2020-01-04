// --- Bells -------------- //
var bellColors = ['blue', 'red', 'green', 'yellow', 'white'];

// constructor function for balls
function Bell(x, y, w, h, angle, size, colorIndex, img) {
    this.x = x;
    this.y = y;
    this.bellWidth = w;
    this.bellHeight = h;
    this.angle = angle;
    this.size = size;
    this.width = w * size * 1.2;
    this.height = h * size * 1.2;
    this.colorIndex = colorIndex;
    this.color = bellColors[colorIndex];
    this.img = img;
    this.dead = false;

    this.draw = function (ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);
        ctx.drawImage(this.img, this.colorIndex * this.bellWidth, 0,
                      this.bellWidth, this.bellHeight,
                      0, -this.height, this.width, this.height);
        ctx.restore();
    };
}

