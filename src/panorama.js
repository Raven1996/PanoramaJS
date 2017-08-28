function Panorama(viewerId, img) {
	var gl = null;
	var myCanvas = document.getElementById(viewerId);
	var vertexShaderObject;
	var fragmentShaderObject = null;
	var programObject;
	var v4PositionIndex;
	var texObj;
	var vsh =
		'precision mediump float;\n' +
		'attribute vec4 position;\n' +
		'varying vec2 textureCoordinate;\n' +
		'void main() {\n' +
		'    gl_Position = position;\n' +
		'    textureCoordinate =  position.xy;\n' +
		'}';
	var fsh =
		'precision mediump float;\n' +
		'varying vec2 textureCoordinate;\n' +
		'uniform sampler2D inputImageTexture;\n' +
		'uniform float ratiox;\n' +
		'uniform float ratioy;\n' +
		'uniform mat3 rot;\n' +
		'uniform int type;\n' +
		'void main() {\n' +
		'    float x = textureCoordinate.x * ratiox;\n' +
		'    float y = textureCoordinate.y * ratioy;\n' +
		'    vec2 l = vec2(x, y);\n' +
		'    vec2 d = normalize(l);\n' +
		'    vec3 v;\n' +		
		'    if (type == 0) v = rot * vec3(0.7265425, y, x);\n' +
		'    else if (type == 1) {\n' +
		'        float n = 1.0-2.0*y*y-2.0*x*x;\n' +
		'        if (n < 0.0) discard;\n' +
		'        v = rot * vec3(sqrt(n) , 1.414214*y, 1.414214*x);\n' +
		'    }\n' +
		'    else if (type == 2) {\n' +
		'        float theta = 2.0 * asin(length(vec2(y, x))/1.000001);\n' +
		'        v = rot * vec3(cos(theta), d.y*sin(theta), d.x*sin(theta));\n' +
		'    }\n' +
		'    else if (type == 3) {\n' +
		'        float theta = length(l)*3.141593;\n' +
		'        v = rot * vec3(cos(theta), d.y*sin(theta), d.x*sin(theta));\n' +
		'    }\n' +
		'    else if (type == 4) {\n' +
		'        float theta = 2.0 * atan(length(vec2(y, x)), 0.5);\n' +
		'        v = rot * vec3(cos(theta), d.y*sin(theta), d.x*sin(theta));\n' +
		'    }\n' +
		'    else discard;\n' +
		'    vec2 coord = vec2(atan(v.z, v.x)*0.1591549+0.5, -atan(v.y, length(vec2(v.z, v.x)))*0.3183099+0.5);\n' +
		'    gl_FragColor = texture2D(inputImageTexture, coord);\n' +
		'}';
	var myObj = {};
	
	webglInit();
	shaderInit(vsh, fsh);
	programInit();
	texObj = createTexture(img);
	
	var type = 0;  // 0:108° rectilinear 1:180° orthographic 2:360° equisolid angle 3:360° equidistant 4:254° stereographic
	var alpha = 0;  // z rotate
	var beta = 0;  // y rotate
	var speedA = 0;  // alpha speed
	var speedB = 0;  // beta speed
	var hold = false;  // mouse down or touch
	var lastx = 0, lasty = 0, nowx = 0, nowy = 0;  // position
	var time = 0;  // timestamp
	
	var oldmousedown;
	var oldmousemove;
	var oldmouseup;
	
	function webglInit() {
		gl = myCanvas.getContext('webgl');
		if (gl == null) alert('Your browser does not support WebGL!');
	}
	
	function shaderInit(vsh, fsh) {
		vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
		fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(vertexShaderObject, vsh);
		gl.shaderSource(fragmentShaderObject, fsh);
		gl.compileShader(vertexShaderObject);
		gl.compileShader(fragmentShaderObject);
		if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
			var info = gl.getShaderInfoLog(vertexShaderObject);
			throw 'Could not compile vertex shader.\n' + info;
		}
		if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
			var info = gl.getShaderInfoLog(fragmentShaderObject);
			throw 'Could not compile fragment shader.\n' + info;
		}
	}
	
	function programInit() {
		programObject = gl.createProgram();
		gl.attachShader(programObject, vertexShaderObject);
		gl.attachShader(programObject, fragmentShaderObject);
		gl.bindAttribLocation(programObject, v4PositionIndex, 'position');
		gl.linkProgram(programObject);
		if (!gl.getProgramParameter(programObject, gl.LINK_STATUS)) {
			var info = gl.getProgramInfoLog(programObject);
			throw 'Could not link program.\n' + info;
		}
		gl.useProgram(programObject);
	}
	
	function createTexture(imgObj) {
		gl.activeTexture(gl.TEXTURE0);
		var textureObject = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, textureObject);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgObj);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return textureObject;
	}
	
	function draw(timestamp) {
		var diag = Math.sqrt(myCanvas.width*myCanvas.width + myCanvas.height*myCanvas.height)
		gl.viewport(0, 0, myCanvas.width, myCanvas.height);
		gl.uniform1f(myObj.ratiox, myCanvas.width/diag);
		gl.uniform1f(myObj.ratioy, myCanvas.height/diag);
		var dt = (timestamp-time) * 0.001;
		time = timestamp;
		if (hold) {
			beta += speedB = (lastx-nowx)/diag*3.141593;
			alpha += speedA = (nowy-lasty)/diag*3.141593;
			speedA /= dt;
			speedB /= dt;
			lastx = nowx;
			lasty = nowy;
		} else {
				alpha += speedA * dt;
				speedA *= Math.exp(-5*dt);
				beta += speedB * dt;
				speedB *= Math.exp(-5*dt);
		}
		alpha = alpha>1.570796 ? 1.570796 : alpha<-1.570796 ? -1.570796 : alpha;
		beta = beta>6.283185 ? beta-6.283185 : beta<0 ? beta+6.283185 : beta;
		var ca = Math.cos(alpha), sa = Math.sin(alpha), cb = Math.cos(beta), sb = Math.sin(beta);
		var rot =
			[ca*cb, sa, ca*sb,
			-sa*cb, ca,-sa*sb,
			-sb, 0, cb];
		gl.uniformMatrix3fv(myObj.matrix, false, rot);
		gl.uniform1i(myObj.texture, 0);
		gl.uniform1i(myObj.type, type);
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		myObj.animation = requestAnimationFrame(draw);
	}
	
	function renderWebGL() {
		var vertices = 
			[1.0, 1.0,
			1.0, -1.0,
			-1.0, 1.0,
			-1.0, -1.0];
		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		
		gl.enableVertexAttribArray(v4PositionIndex);
		gl.vertexAttribPointer(v4PositionIndex, 2, gl.FLOAT, false, 0, 0);
		
		myObj.ratiox = gl.getUniformLocation(programObject, "ratiox");
		myObj.ratioy = gl.getUniformLocation(programObject, "ratioy");
		myObj.matrix = gl.getUniformLocation(programObject, "rot");
		myObj.texture = gl.getUniformLocation(programObject, "inputImageTexture");
		myObj.type = gl.getUniformLocation(programObject, "type");
		myObj.animation = requestAnimationFrame(draw);
		oldmousedown = myCanvas.onmousedown;
		oldmousemove = document.oldmousemove;
		oldmouseup = document.oldmouseup;
		myCanvas.onmousedown = function(e) {
			if (oldmousedown) oldmousedown(e);
			if (e.button == 0) {
				hold = true;
				nowx = lastx = e.clientX;
				nowy = lasty = e.clientY;
			}
		}
		document.onmousemove = function(e) {
			if (oldmousemove) oldmousemove(e);
			if (hold) {
				nowx = e.clientX;
				nowy = e.clientY;
			}
		}
		document.onmouseup = function(e) {
			if (oldmouseup) oldmouseup(e);
			if (e.button == 0) hold = false;
		}
	}
	
	var my = {};
	my.start = function() {
		renderWebGL();
	}
	my.stop = function() {
		cancelAnimationFrame(myObj.animation);
		myCanvas.onmousedown = oldmousedown;
		document.onmousemove = oldmousemove;
		document.onmouseup = oldmouseup;
		gl.finish;
	}
	my.setType = function(num){
		type = num;
	}
	return my;
}