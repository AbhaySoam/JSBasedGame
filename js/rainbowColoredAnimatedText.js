   // retro gaming (atari  like) rainbow gradiant
    var rainbowColorStops = new Array(
      {color:"#FF0000", stopPercent:0},
      {color:"#FFFF00", stopPercent:0.125},
      {color:"#00FF00", stopPercent:0.375},
      {color:"#0000FF", stopPercent:0.625},
      {color:"#FF00FF", stopPercent:0.875},
      {color:"#FF0000", stopPercent:1});

  // adapted from http://www.8bitrocket.com/2012/07/02/html5-canvas-animating-gradients-to-create-a-retro-atari-style-color-cycle/
   function drawRainbowGradientTextCentered(ctx, message, w, h) {
        //Text
		ctx.font =  "90px impact";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		
		var xPosition = (w/2);
		var yPosition = (h/10);
		
		var rainbowGradient  = ctx.createLinearGradient(w/2,0, w/2, 90);
     
		for (var i=0; i < rainbowColorStops.length; i++) {
			var tempColorStop = rainbowColorStops[i];
			var tempColor = tempColorStop.color;
			var tempStopPercent = tempColorStop.stopPercent;
			   rainbowGradient.addColorStop(tempStopPercent,tempColor);
			tempStopPercent += 0.015;
			if (tempStopPercent > 1) {
				tempStopPercent = 0;
			}
			tempColorStop.stopPercent = tempStopPercent;
			rainbowColorStops[i] = tempColorStop;
		}
		
		ctx.fillStyle    = rainbowGradient;
		ctx.fillText  ( message,  xPosition ,yPosition);
   }
  