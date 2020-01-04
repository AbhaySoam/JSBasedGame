// ---------      Particles ----------------- //
  	var particles = [];
	
	function randomFloat (min, max)
	{
		return min + Math.random()*(max-min);
	}

function removeFromArray(array, object) {
    var idx = array.indexOf(object);
    if (idx !== -1) {
        array.splice(idx, 1);
    }
    return array;
}
	
	function wipeParticles() {
		particles = [];
	}
	

	/*
	 * A single explosion particle
	 */
	function Particle ()
	{
		this.scale = 1.0;
		this.x = 0;
		this.y = 0;
		this.radius = 20;
		this.color = "#000";
		this.velocityX = 0;
		this.velocityY = 0;
		this.scaleSpeed = 0.5;
		this.useGravity = false;
		this.text = ''; // hello ugly hack!
      
		this.update = function(ms)
		{
			// shrinking
          
			this.scale -= this.scaleSpeed * ms / 1000.0;
          
			if (this.scale <= 0)
			{
              // particle is dead, remove it
              removeFromArray(particles, this);
              
			}
			
			// moving away from explosion center
			this.x += this.velocityX * ms/1000.0;
			this.y += this.velocityY * ms/1000.0;
          
          // and then later come downwards when our
		  // gravity is added to it. We should add parameters 
          // for the values that fake the gravity
          if(this.useGravity) {
              this.velocityY += Math.random()*4 +4;
          }
		};
		
		this.draw = function(ctx)
		{
			if (this.scale <= 0)
				return;
			if(this.text) {
				ctx.save();
				ctx.globalAlpha = this.scale;
				ctx.font = '10pt Arial';
				textWithShadow(ctx, this.text, this.x, this.y, 1.0, 'White', 'Black');
				ctx.restore();
			}
			else {
				// from http://stackoverflow.com/questions/25837158/how-to-draw-a-star-by-using-canvas-html5
				var spikes = 5;
				var outerRadius = 4+4*this.scale;
				var innerRadius = 2+2*this.scale;
				var rot=Math.PI/2*3;
				var cx = this.x;
				var cy = this.y;
				var px=cx;
				var py=cy;
				var step=Math.PI/spikes;

				ctx.save();
				ctx.globalAlpha = this.scale*2;
				ctx.strokeStyle=this.color;
				ctx.beginPath();
				ctx.moveTo(cx,cy-outerRadius);
				for(i=0;i<spikes;i++){
				    px=cx+Math.cos(rot)*outerRadius;
				    py=cy+Math.sin(rot)*outerRadius;
				    ctx.lineTo(px,py);
				    rot+=step;

				    px=cx+Math.cos(rot)*innerRadius;
				    py=cy+Math.sin(rot)*innerRadius;
				    ctx.lineTo(px,py);
				    rot+=step;
				}
				ctx.lineTo(cx,cy-outerRadius);
				ctx.stroke();
				ctx.closePath();
				ctx.restore();
			}
		};
	}
	
	/*
	 * Advanced Explosion effect
	 * Each particle has a different size, move speed and scale speed.
	 * 
	 * Parameters:
	 * 	x, y - explosion center
	 * 	color - particles' color
	 */
	function createExplosion(x, y, color, text)
	{
		var count = 8;
		
		for (var i=0; i<count; i++)
		{
            var angle = i*360/count;
			var particle = new Particle();
			
			particle.x = x;
			particle.y = y;
			
            // size of particle
			particle.radius = 5;
			
			particle.color = color;
			
            // life time, the higher the value the faster particle 
            // will die
			particle.scaleSpeed = 1.5;//randomFloat(0.3, 0.5);
          
            // use gravity
          particle.useGravity = false;
			
			var speed = 100;
			
			particle.velocityX = speed * Math.cos(angle * Math.PI / 180.0);
			particle.velocityY = speed * Math.sin(angle * Math.PI / 180.0);
			
			particles.push(particle);
		}
		// text 'particle'
		// because it was easier than creating a whole new system ;)
    	var ptext = new Particle();
		ptext.x = x;
		ptext.y = y;
		ptext.color = color;
		ptext.text = text;
		ptext.velocityX = 0;
		ptext.velocityY = -50;
		ptext.scaleSpeed = 1.5;
		ptext.useGravity = false;
		particles.push(ptext);
	}
