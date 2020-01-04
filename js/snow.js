// ------- SNOW ----------------- //
  /// Adapteded by M.Buffa from http://stackoverflow.com/questions/13983764/creating-falling-snow-using-html-5-and-js
  // ctx = for drawing, a canvas context
  // ty = vertical translation value, in order to obtain a
  // parallax effect, when the bunny is jumping
  // width and height = zone where the snow is drawn
  function drawSnow(ctx, flakes, width, height, ty) {
      ctx.save();
  
      for (var i = 0; i < flakes.length; i++) {
            var mX = -100, mY = -100;

        var flake = flakes[i],
            x = mX,
            y = mY,
            minDist = 150,
            x2 = flake.x,
            y2 = flake.y;

        var dist = Math.sqrt((x2 - x) * (x2 - x) + (y2 - y) * (y2 - y)),
            dx = x2 - x,
            dy = y2 - y;

        if (dist < minDist) {
            var force = minDist / (dist * dist),
                xcomp = (x - x2) / dist,
                ycomp = (y - y2) / dist,
                deltaV = force / 2;

            flake.velX -= deltaV * xcomp;
            flake.velY -= deltaV * ycomp;

        } else {
            flake.velX *= 0.98;
            if (flake.velY <= flake.speed) {
                flake.velY = flake.speed;
            }
            flake.velX += Math.cos(flake.step += 0.05) * flake.stepSize;
        }

        ctx.fillStyle = "rgba(255,255,255," + flake.opacity + ")";
        flake.y += flake.velY;
        flake.x += flake.velX;
            
        if (flakeOutOfBounds(flake, width, height, ty)) {
            reset(flake, width, height, ty);
        }
        ctx.beginPath();
        ctx.arc(flake.x, (flake.y+ty)%height, flake.size, 0, Math.PI * 2);
        ctx.fill();
    }
  
  ctx.restore();
}
  
function flakeOutOfBounds(flake, width, height, ty) {
  if(flake.x > width*1.3 || 
    flake.x <= -width*0.3 || 
    flake.y > (-ty) + height*2 || 
    flake.y < (-ty) - height/2)
    return true;
}

function reset(flake, width, height, ty) {
    flake.x = Math.floor(Math.random() * width, height);
    flake.y = -ty - Math.floor(Math.random()*height/10);
    flake.size = (Math.random() * 2.5) + 1;
    flake.speed = (Math.random() * 0.5) + 0.5;
    flake.velY = flake.speed;
    flake.velX = 0;
    flake.opacity = (Math.random() * 0.5) + 0.3;
}

function createSnowFlakes(flakeCount, w, h) {
    var flakes = [];
      for (var i = 0; i < flakeCount; i++) {
        var x = Math.floor(Math.random() * w),
            y = Math.floor(Math.random() * h),
            size = (Math.random() * 2.5) + 1,
            speed = (Math.random() * 0.5) + 0.5,
            opacity = (Math.random() * 0.5) + 0.3;

        flakes.push({
            speed: speed,
            velY: speed,
            velX: 0,
            x: x,
            y: y,
            size: size,
            stepSize: (Math.random()) / 30,
            step: 0,
            angle: 180,
            opacity: opacity
        });
    }
    return flakes;
}
