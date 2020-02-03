/**
 * ---------References---------
	https://github.com/sicKitchen/SuperQuadric
	https://github.com/baonguyen84/SuperQuadric-Webgl
	Lecture example codes
	My old projects for some helper codes
 */
let canvas;
let gl;
let program;
let shape_type = 0;
let selectedTexture = 0;
const cameraSpeed = 2;
let wireMode = 0;
let magnitude = 1;

const line_count = 50;

let radius = 160;
let xRot = 110;
let yRot = 180;
let zRot = 0;
let R = 2.5;

let viewMatrix;
let projectionMatrix;

let rotationMode = true;
let rotAngle = 0;

let epsilon1 = 1;
let epsilon2 = 1;

let tempPoint_1 = [];
let tempPoint_2 = [];

for (let i = 0; i < 3; i++){
	tempPoint_1.push(0);
	tempPoint_2.push(0);
}
// scale in MV does not work
function scale4(a, b, c) {
	const result = mat4();
	result[0][0] = a;
	result[1][1] = b;
	result[2][2] = c;
	return result;
}
// Checks if the given value is power of 2
function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}
// Keeps the sign fixed on power operations
function signPow(value, p) {
	let sign = value / Math.abs(value);
	return sign * Math.pow(Math.abs(value), p);
}
//Functions of superquadrics
function hyperboloid_x(u, v) {
	return 1 / signPow(Math.cos(v), epsilon2) * signPow(Math.cos(u), epsilon1);
}

function hyperboloid_y(u, v) {
	return 1 / signPow(Math.cos(v), epsilon2) * signPow(Math.sin(u), epsilon1);
}

function hyperboloid_z(v) {
	return signPow(Math.sin(v), epsilon2) / signPow(Math.cos(v), epsilon2);
}

function hyperboloid_x_normal(u, v) {
	return signPow(Math.cos(v), 2 - epsilon2) * signPow(Math.cos(u), 2 - epsilon1);
}

function hyperboloid_y_normal(u, v) {
	return signPow(Math.cos(v), 2 - epsilon2) * signPow(Math.sin(u), 2 - epsilon1);
}

function hyperboloid_z_normal(v) {
	return signPow(Math.sin(v), 2 - epsilon2);
}

function toroid_x(u, v) {
	return (R + signPow(Math.cos(v), epsilon2)) * signPow(Math.cos(u), epsilon1);
}

function toroid_y(u, v) {
	return (R + signPow(Math.cos(v), epsilon2)) * signPow(Math.sin(u), epsilon1);
}

function toroid_z(v) {
	return signPow(Math.sin(v), epsilon2);
}

function toroid_x_normal(u, v) {
	return (R + signPow(Math.cos(v), 2 - epsilon2)) * signPow(Math.cos(u), 2 - epsilon1);
}

function toroid_y_normal(u, v) {
	return (R + signPow(Math.cos(v), 2 - epsilon2)) * signPow(Math.sin(u), 2 - epsilon1);
}

function toroid_z_normal(v) {
	return signPow(Math.sin(v), 2 - epsilon2);
}
// Calculation of distance between two point
function distance(p1, p2) {
	return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) + Math.pow(p1[2] - p2[2], 2));
}

window.onload = function() {
	canvas = document.getElementById('render-surface');
	gl = canvas.getContext('webgl');

	if (!gl) gl = canvas.getContext('experimental-webgl');
	if (!gl) return alert("Your browser does not support WEBGL");

	program = initShaders(gl, 'vertexShader', 'fragmentShader');
	gl.useProgram(program);

	gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'erdem'));
	gl.activeTexture(gl.TEXTURE0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0, 0, 0, 1.0);

	//Camera controls
	document.onkeydown = function(event) {
		switch (event.keyCode) {
			// W
			case 87:
				xRot += cameraSpeed;
				break;
			// S
			case 83:
				xRot -= cameraSpeed;
				break;
			// UP
			case 38:
				event.preventDefault();
				radius -= cameraSpeed;
				break;
			// DOWN
			case 40:
				event.preventDefault();
				radius += cameraSpeed;
				break;
		}
	};
	//Checkbox for Texture Mode
    let checkbox = document.getElementById("checkbox");
    checkbox.addEventListener( 'change', function() {
		if(this.checked) 
		{
			wireMode = 1;
		} 
		else 
		{
			wireMode = 0;
		}
	});
	
	//Texture selector
    let textureSelector = document.getElementById("textureSelector");
    textureSelector.addEventListener("click", function() {
		selectedTexture = textureSelector.selectedIndex;
		if (selectedTexture == 0){
			gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'erdem'));
			gl.activeTexture(gl.TEXTURE0);
		}
		else if (selectedTexture == 1){
			gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'aytek'));
			gl.activeTexture(gl.TEXTURE0);
		}
		else if (selectedTexture == 2){
			gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'mustafa'));
			gl.activeTexture(gl.TEXTURE0);
		}
        });

	//Controls rotation
	document.getElementById('toggleRotation').onclick = function() {
		rotationMode = !rotationMode;
	};

	//Controls shape
	document.getElementById('changeShape').onclick = function() {
		shape_type++;
		if (shape_type == 100)
		{
			shape_type = 1;
		}
	};

	//Controls epsilon1
	document.getElementById('epsilon1').oninput = function() {
		epsilon1 = document.getElementById('epsilon1').value;
	};

	//Controls epsilon2
	document.getElementById('epsilon2').oninput = function() {
		epsilon2 = document.getElementById('epsilon2').value;
	};	
	//Controls magnitude
	document.getElementById('magnitude').oninput = function() {
		magnitude = document.getElementById('magnitude').value;
	};

	render();
};

function render() {
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
	viewMatrix = createViewMatrix(radius, xRot, yRot, zRot);
	projectionMatrix = perspective(radians(110), canvas.width / canvas.height, 0.1, 1000000.0);
	let shape;

	// Create and render selected shape with selected parameters
	if (shape_type % 2 == 0){
		shape = new Mesh(SuperQuadric(line_count + 1, line_count + 1, "toroid"));
		shape.setScale(magnitude / 2);
	}
	else{
		shape = new Mesh(SuperQuadric(line_count, line_count, "hyperboloid"));
		shape.setScale(magnitude);
	}

	shape.setRotation(0, 180, rotAngle);

	shape.setWireMode(wireMode);

	shape.render(gl, program, viewMatrix, projectionMatrix);

	if (rotationMode) rotAngle += 0.5;
	requestAnimationFrame(render);
}

function createViewMatrix(radius, xRot, yRot, zRot) {
	let viewMatrix = mat4();
	viewMatrix = lookAt(vec3(0, 0, radius), vec3(0, 0, 0), vec3(0, 1, 0));
	viewMatrix = mult(viewMatrix, rotate(xRot, vec3(1, 0, 0)));
	viewMatrix = mult(viewMatrix, rotate(yRot, vec3(0, 1, 0)));
	viewMatrix = mult(viewMatrix, rotate(zRot, vec3(0, 0, 1)));
	return viewMatrix;
}

// Setups texture
function texture(gl, name) {
	let ext = gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
	if (!ext) ext = gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
	if (!ext) alert('Please use google chrome or mozilla');

	const image = document.getElementById(name);
	const t = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, t);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	if (isPowerOf2(image.width) && isPowerOf2(image.height)) gl.generateMipmap(gl.TEXTURE_2D);
	else {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	}
	gl.bindTexture(gl.TEXTURE_2D, null);

	return t;
}


/*
	Creates given superquadric 
*/
function SuperQuadric(N, M, type){
	let vertices = [];
	let normals = [];
	for (let i = 0; i < (N + 1) * (M + 1); i++){
		vertices.push(vec3(undefined, undefined, undefined));
		normals.push(vec3(undefined, undefined, undefined));
	}
	let textureCoords = new Float32Array(2 * (N + 1) * (M + 1));
	let longitude = new Float32Array(N + 1);
	let latitude = new Float32Array(M + 1);

	if (type == "hyperboloid"){
		for (let i = 0; i <= N; i++) {
			for (let j = 0; j <= M; j++) {
				let u = ((2 * Math.PI) / M) * j - Math.PI;
				let v = (Math.PI / N / 2) * i - Math.PI / 4;
				// Remain undefined values when the Math.PI / 4 values since its not included
				if (v == - Math.PI / 4){
					continue;
				}
				vertices[3 * (i * (M + 1) + j)] = hyperboloid_x(u, v);
				vertices[3 * (i * (M + 1) + j) + 1] = hyperboloid_y(u, v);
				vertices[3 * (i * (M + 1) + j) + 2] = hyperboloid_z(v);
				normals[3 * (i * (M + 1) + j)] = hyperboloid_x_normal(u, v);
				normals[3 * (i * (M + 1) + j) + 1] = hyperboloid_y_normal(u, v);
				normals[3 * (i * (M + 1) + j) + 2] = hyperboloid_z_normal(v);
				
				
	
				if (i > 1) {
					tempPoint_1[0] = vertices[3 * ((i - 1) * (M + 1) + j)];
					tempPoint_1[1] = vertices[3 * ((i - 1) * (M + 1) + j) + 1];
					tempPoint_1[2] = vertices[3 * ((i - 1) * (M + 1) + j) + 2];
					tempPoint_2[0] = vertices[3 * (i * (M + 1) + j)];
					tempPoint_2[1] = vertices[3 * (i * (M + 1) + j) + 1];
					tempPoint_2[2] = vertices[3 * (i * (M + 1) + j) + 2];

					latitude[j] += distance(tempPoint_1, tempPoint_2);
				}
	
				if (j > 0) {
					tempPoint_1[0] = vertices[3 * (i * (M + 1) + j - 1)];
					tempPoint_1[1] = vertices[3 * (i * (M + 1) + j - 1) + 1];
					tempPoint_1[2] = vertices[3 * (i * (M + 1) + j - 1) + 2];
					tempPoint_2[0] = vertices[3 * (i * (M + 1) + j)];
					tempPoint_2[1] = vertices[3 * (i * (M + 1) + j) + 1];
					tempPoint_2[2] = vertices[3 * (i * (M + 1) + j) + 2];

					longitude[i] += distance(tempPoint_1, tempPoint_2);
				}
			}
		}
	}
	else if ( type == "toroid"){
		for (let i = 0; i <= N; i++) {
			for (let j = 0; j <= M; j++) {
				let u = ((2 * Math.PI) / M) * j - Math.PI;
				let v = ((2 * Math.PI) / N) * i - Math.PI;
				vertices[3 * (i * (M + 1) + j)] = toroid_x(u, v);
				vertices[3 * (i * (M + 1) + j) + 1] = toroid_y(u, v);
				vertices[3 * (i * (M + 1) + j) + 2] = toroid_z(v);
				normals[3 * (i * (M + 1) + j)] = toroid_x_normal(u, v);
				normals[3 * (i * (M + 1) + j) + 1] = toroid_y_normal(u, v);
				normals[3 * (i * (M + 1) + j) + 2] = toroid_z_normal(v);
	
				if (i > 0) {
					tempPoint_1[0] = vertices[3 * ((i - 1) * (M + 1) + j)];
					tempPoint_1[1] = vertices[3 * ((i - 1) * (M + 1) + j) + 1];
					tempPoint_1[2] = vertices[3 * ((i - 1) * (M + 1) + j) + 2];
					tempPoint_2[0] = vertices[3 * (i * (M + 1) + j)];
					tempPoint_2[1] = vertices[3 * (i * (M + 1) + j) + 1];
					tempPoint_2[2] = vertices[3 * (i * (M + 1) + j) + 2];
	
					latitude[j] += distance(tempPoint_1, tempPoint_2);
				}
	
				if (j > 0) {
					tempPoint_1[0] = vertices[3 * (i * (M + 1) + j - 1)];
					tempPoint_1[1] = vertices[3 * (i * (M + 1) + j - 1) + 1];
					tempPoint_1[2] = vertices[3 * (i * (M + 1) + j - 1) + 2];
					tempPoint_2[0] = vertices[3 * (i * (M + 1) + j)];
					tempPoint_2[1] = vertices[3 * (i * (M + 1) + j) + 1];
					tempPoint_2[2] = vertices[3 * (i * (M + 1) + j) + 2];
	
					longitude[i] += distance(tempPoint_1, tempPoint_2);
				}
			}
		}
	}

	for (let i = 1; i <= N; i++) {
		let d = 0;
		for (let j = 0; j <= M; j++) {
			tempPoint_1[0] = vertices[3 * (i * (M + 1) + j - 1)];
			tempPoint_1[1] = vertices[3 * (i * (M + 1) + j - 1) + 1];
			tempPoint_1[2] = vertices[3 * (i * (M + 1) + j - 1) + 2];
			tempPoint_2[0] = vertices[3 * (i * (M + 1) + j)];
			tempPoint_2[1] = vertices[3 * (i * (M + 1) + j) + 1];
			tempPoint_2[2] = vertices[3 * (i * (M + 1) + j) + 2];
			d += distance(tempPoint_1, tempPoint_2);
			textureCoords[2 * (i * (M + 1) + j)] = d / longitude[i];
		}
	}

	for (let j = 0; j <= M; j++) {
		let d = 0;
		for (let i = 1; i <= N; i++) {
			if (i == 1) {
				textureCoords[2 * (i * (M + 1) + j) + 1] = textureCoords[2 * (M + 1 + j) + 1];
			}  
			else {
				tempPoint_1[0] = vertices[3 * ((i - 1) * (M + 1) + j)];
				tempPoint_1[1] = vertices[3 * ((i - 1) * (M + 1) + j) + 1];
				tempPoint_1[2] = vertices[3 * ((i - 1) * (M + 1) + j) + 2];
				tempPoint_2[0] = vertices[3 * (i * (M + 1) + j)];
				tempPoint_2[1] = vertices[3 * (i * (M + 1) + j) + 1];
				tempPoint_2[2] = vertices[3 * (i * (M + 1) + j) + 2];
				d += distance(tempPoint_1, tempPoint_2);
				textureCoords[2 * (i * (M + 1) + j) + 1] = d / latitude[j];
			}
		}
	}

	for (let j = 0; j <= M; j++) {
		textureCoords[2 * j] = textureCoords[2 * (M + 1 + j)];
		textureCoords[2 * (N * (M + 1) + j)] = textureCoords[2 * ((N - 1) * (M + 1) + j)];
	}

	return [vertices, textureCoords, normals];


}

// Mesh object
class Mesh {
	constructor(data) {
		this.vertices = data[0];
		this.texCoords = data[1];
		this.normals = data[2];

		this.translation = vec3(0, 0, 0);
		this.rotation = vec3(0, 0, 0);
		this.scale = 1;

		this.wireMode = 0;
	}

	prepareModel(gl, program, viewMatrix, projectionMatrix) {
		gl.useProgram(program);

		let positionAttribLocation = gl.getAttribLocation(program, 'vPosition');
		let texCoordAttribLocation = gl.getAttribLocation(program, 'vTexCoord');
		let normalAttribLocation = gl.getAttribLocation(program, 'vNormal');

		this.vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

		this.tBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoords), gl.STATIC_DRAW);

		this.nBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
		gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
		gl.enableVertexAttribArray(positionAttribLocation);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
		gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, gl.FALSE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
		gl.enableVertexAttribArray(texCoordAttribLocation);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
		gl.vertexAttribPointer(normalAttribLocation, 3, gl.FLOAT, gl.TRUE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
		gl.enableVertexAttribArray(normalAttribLocation);

		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelMatrix'), gl.FALSE, flatten(this.createTranformationMatrix()));
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewMatrix'), gl.FALSE, flatten(viewMatrix));
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projectionMatrix'), gl.FALSE, flatten(projectionMatrix));

		gl.uniform1f(gl.getUniformLocation(program, 'wireMode'), this.wireMode);

		// Organize cordinates for texture drawing
		this.triangleStrip = null;
		this.triangleStrip = new Uint16Array(line_count * (2 * (line_count + 1) + 2) - 2);
		let n = 0;
		for (let i = 0; i < line_count; i++) {
			for (let j = 0; j <= line_count; j++) {
				this.triangleStrip[n++] = (i + 1) * (line_count + 1) + j;
				this.triangleStrip[n++] = i * (line_count + 1) + j;
			}
		}

		// Organize cordinates for wireframe
		if (this.wireMode == 0){
			let lines = [];
			lines.push(this.triangleStrip[0], this.triangleStrip[1]);
			let numStripIndices = this.triangleStrip.length;
			
			for (let i = 2; i < numStripIndices; i++) {
				let a = this.triangleStrip[i - 2];
				let b = this.triangleStrip[i - 1];
				let c = this.triangleStrip[i];
	
				if (a != b && b != c && c != a) lines.push(a, c, b, c);
			}
	
			this.wireframe = new Uint16Array(lines);
		}
		

		this.triangleStripBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleStripBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.triangleStrip, gl.STATIC_DRAW);

		this.linebuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.wireframe, gl.STATIC_DRAW);
	}

	createTranformationMatrix() {
		let matrix = mat4();
		matrix = mult(matrix, translate(this.translation[0], this.translation[1], this.translation[2]));
		matrix = mult(matrix, rotate(this.rotation[0], vec3(1, 0, 0)));
		matrix = mult(matrix, rotate(this.rotation[1], vec3(0, 1, 0)));
		matrix = mult(matrix, rotate(this.rotation[2], vec3(0, 0, 1)));

		matrix = mult(matrix, scale4(this.scale, this.scale, this.scale));
		return matrix;
	}
	//Render function of the mesh object
	render(gl, program, viewMatrix, projectionMatrix) {
		this.prepareModel(gl, program, viewMatrix, projectionMatrix);

		if (this.wireMode == 0) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
			gl.drawElements(gl.LINES, this.wireframe.length, gl.UNSIGNED_SHORT, 0);
		} 
		else 
		{
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleStripBuffer);
			gl.drawElements(gl.TRIANGLE_STRIP, this.triangleStrip.length, gl.UNSIGNED_SHORT, 0);
		}
	}

	setRotation(x, y, z) {
		this.rotation = vec3(x, y, z);
	}

	setScale(s) {
		this.scale = s;
	}

	setWireMode(mode) {
		this.wireMode = mode;
	}
}


