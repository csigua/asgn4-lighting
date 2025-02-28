// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal,1)));
    // v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  uniform vec3 u_LightPos;
  uniform vec3 u_cameraPos;
  uniform bool u_LightOn;

  // spotlight stuff
  uniform vec3 u_SpotlightPos;
  uniform vec3 u_SpotlightDir;
  uniform float u_SpotlightCutoff;
  uniform float u_SpotlightExponent;

  void main() {
    if (u_whichTexture == -3) {
      gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);                // use normal color
    }
    else if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;              // use frag color
    }
    else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);       // use UV debug color
    }
    else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);    // use texture0
    }
    else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV);    // use texture1
    }
    else if (u_whichTexture == 2) {
      gl_FragColor = texture2D(u_Sampler2, v_UV);    // use texture2
    }
    else {
      gl_FragColor = vec4(1,0.2,0.2,1);          // error, put a red-ish color
    }

    vec3 lightVector = u_LightPos - vec3(v_VertPos);
    float r = length(lightVector);

    // N dot L
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N,L), 0.0);

    // reflection vector
    vec3 R = reflect(-L, N);

    // eye
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

    // Specular
    float specular = pow(max(dot(E, R), 0.0), 100.0);

    // vec3 diffuse = vec3(gl_FragColor) * nDotL * 0.7;
    // vec3 ambient = vec3(gl_FragColor) * 0.1;

    float spotFactor = 1.0;  // multiplier to account for spotlight
    if (length(u_SpotlightPos) == 0.0) {
        L = normalize(u_SpotlightPos); 
    } else {
        L = normalize(u_SpotlightPos - vec3(v_VertPos));
        if (u_SpotlightCutoff > 0.0) { // the light is a spotlight
            vec3 D = -normalize(u_SpotlightDir);
            float spotCosine = dot(D, L);
            if (spotCosine >= cos(radians(u_SpotlightCutoff))) { 
                spotFactor = pow(spotCosine, u_SpotlightExponent);
            } else {
                spotFactor = 0.0; // The light will add no color to the point.
            }
        }
    }

    // Update the existing lighting calculations with spotFactor
    vec3 diffuse = vec3(gl_FragColor) * nDotL * 0.7 + spotFactor;
    vec3 ambient = vec3(gl_FragColor) * 0.1 + spotFactor;

    if (u_LightOn) {
        if (u_whichTexture == -2) {
            gl_FragColor = vec4(specular + diffuse + ambient, 1.0);
        } else {
            gl_FragColor = vec4(diffuse + ambient, 1.0);
        }
    }
  }`

// Global variables
let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_NormalMatrix;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_whichTexture;
let u_LightPos;
let u_cameraPos;
let u_LightOn;
let u_SpotlightPos;
let u_SpotlightDir;
let u_SpotlightCutoff;
let u_SpotlightExponent;

let ROBOT = 0;
let V1_PLATE_COLOR = RGB(60,77,124);

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext('webgl', {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler2) {
    console.log('Failed to get the storage location of u_Sampler2');
    return;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }

  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  if (!u_LightPos) {
    console.log('Failed to get the storage location of u_LightPos');
    return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return;
  }

  u_LightOn = gl.getUniformLocation(gl.program, 'u_LightOn');
  if (!u_LightOn) {
    console.log('Failed to get the storage location of u_LightOn');
    return;
  }

  u_SpotlightPos = gl.getUniformLocation(gl.program, 'u_SpotlightPos');
  if (!u_SpotlightPos) {
    console.log('Failed to get the storage location of u_SpotlightPos');
    return;
  }

  u_SpotlightDir = gl.getUniformLocation(gl.program, 'u_SpotlightDir');
  if (!u_SpotlightDir) {
    console.log('Failed to get the storage location of u_SpotlightDir');
    return;
  }

  u_SpotlightCutoff = gl.getUniformLocation(gl.program, 'u_SpotlightCutoff');
  if (!u_SpotlightCutoff) {
    console.log('Failed to get the storage location of u_SpotlightCutoff');
    return;
  }

  u_SpotlightExponent = gl.getUniformLocation(gl.program, 'u_SpotlightExponent');
  if (!u_SpotlightExponent) {
    console.log('Failed to get the storage location of u_SpotlightExponent');
    return;
  }

  // set an initial value for this matrix to identity
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Globals related to UI elements

let g_globalAngle = 0;
let g_globalAngles = [0,0];
let g_yellowAngle = 0;
let g_magentaAngle = 45;
let g_yellowAnimation = false;
let g_mouseOrigin = [0,0];
let stored_color = [0.0, 0.0, 0.0, 0.0];
let g_normalOn = false;
let g_lightPos = [0,1.5,0.5];
let g_lightOn = true;
let g_spotlightOn = true;
let g_spotlightPos = [0,1,0.5];
let g_spotlightDir = [0,-1,0];
let g_spotlightCutoff = 50;
let g_spotlightExponent = 10;

// other globals
let g_camera = new Camera();

// head variables
let g_headRotX = 3;
let g_headRotY = 0;

// body variables
let g_bodyX = 0.4;
let g_bodyY = 0;
let g_bodyZ = 1;

// arm variables
let g_leftShoulderRotX = 0;
let g_leftShoulderRotY = 0;
let g_leftShoulderRotZ = 0;
let g_leftElbowRot = 8;
let g_leftWristRotX = 0;
let g_leftWristRotY = 0;
let g_leftWristRotZ = 0;

let g_rightShoulderRotX = 0;
let g_rightShoulderRotY = 0;
let g_rightShoulderRotZ = 0;
let g_rightElbowRot = 8;
let g_rightWristRotX = 0;
let g_rightWristRotY = 0;
let g_rightWristRotZ = 0;

// leg variables
let g_leftTopLegRotX = 0;
let g_leftTopLegRotY = 0;
let g_leftTopLegRotZ = 0;
let g_leftKneeRot = 0;
let g_leftAnkleRot = 0;

let g_rightTopLegRotX = 0;
let g_rightTopLegRotY = 0;
let g_rightTopLegRotZ = 0;
let g_rightKneeRot = 0;
let g_rightAnkleRot = 0;

// wing spread variable
let g_wingCurl = 0;

let tagScore = 0;
let hitboxSize = 1;

// animation global variables
let idle = true;

function lockVars() {
  g_headRotX = 3;
  g_headRotY = 0;
  g_bodyX = 0.4;
  g_bodyY = 0;
  g_bodyZ = 1;
  g_leftShoulderRotX = 0;
  g_leftShoulderRotY = 0;
  g_leftShoulderRotZ = 0;
  g_leftElbowRot = 8;
  g_leftWristRotX = 0;
  g_leftWristRotY = 0;
  g_leftWristRotZ = 0;
  g_rightShoulderRotX = 0;
  g_rightShoulderRotY = 0;
  g_rightShoulderRotZ = 0;
  g_rightElbowRot = 8;
  g_rightWristRotX = 0;
  g_rightWristRotY = 0;
  g_rightWristRotZ = 0;
  g_leftTopLegRotX = 0;
  g_leftTopLegRotY = 0;
  g_leftTopLegRotZ = 0;
  g_leftKneeRot = 0;
  g_leftAnkleRot = 0;
  g_rightTopLegRotX = 0;
  g_rightTopLegRotY = 0;
  g_rightTopLegRotZ = 0;
  g_rightKneeRot = 0;
  g_rightAnkleRot = 0;
  g_wingCurl = 0;
}

function addActionsForHtmlUI() {
  // Clear button event
  document.getElementById('normalOn').onclick = function() {g_normalOn = true};
  document.getElementById('normalOff').onclick = function() {g_normalOn = false};

  document.getElementById('lightOn').onclick = function() {g_lightOn = true};
  document.getElementById('lightOff').onclick = function() {g_lightOn = false};

  // document.getElementById('yellowSlide').addEventListener('mousemove', function() {g_yellowAngle = this.value; renderAllShapes()});
  // document.getElementById('magentaSlide').addEventListener('mousemove', function() {g_magentaAngle = this.value; renderAllShapes()});

  document.getElementById('lightSlideX').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[0] = this.value/100; renderAllShapes(); }});
  document.getElementById('lightSlideY').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[1] = this.value/100; renderAllShapes(); }});
  document.getElementById('lightSlideZ').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[2] = this.value/100; renderAllShapes()}; });

  // // Property Slider events
  document.getElementById('angleSlide').addEventListener('mousemove', function() { g_globalAngle = this.value; renderAllShapes(); });
}

let imageLoaded = false;
let image2Loaded = false;
let image3Loaded = false;
let image, image2, image3;

function initTextures() {
  // First image
  image = new Image();
  image.onload = function() {
    imageLoaded = true;
    checkBothLoaded();
  };
  image.src = './img/outerspace.jpg';

  // Second image
  image2 = new Image();
  image2.onload = function() {
    image2Loaded = true;
    checkBothLoaded();
  };
  image2.src = './img/sigmafloor.jpg';

  // Third image
  image3 = new Image();
  image3.onload = function() {
    image3Loaded = true;
    checkBothLoaded();
  };
  image3.src = './img/darkgreyblock.jpg';
}

// When both images are loaded, call sendTextureToGLSL exactly once
function checkBothLoaded() {
  if (imageLoaded && image2Loaded && image3Loaded) {
    sendTextureToGLSL();
  }
}

function sendTextureToGLSL() {
  var texture = gl.createTexture();
  if (!texture) {
    console.log("failed to return the texture object");
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // flip the image's y axis
  
  // enable texture unit0
  gl.activeTexture(gl.TEXTURE0);

  // bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler0, 0);

  var texture1 = gl.createTexture();
  if (!texture1) {
    console.log("failed to return the texture object");
    return false;
  }

  // enable texture unit0
  gl.activeTexture(gl.TEXTURE1);

  // bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture1);

  // set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image2);

  // set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler1, 1);

  var texture2 = gl.createTexture();
  if (!texture2) {
    console.log("failed to return the texture object");
    return false;
  }

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, texture2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image3);
  gl.uniform1i(u_Sampler2, 2);

  console.log("finished loadTexture");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("failed to get " + htmlID + "from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function main() {

  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  // Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  initTextures();

  // // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  // gl.clear(gl.COLOR_BUFFER_BIT);
  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = function(ev) {
    g_mouseOrigin = convertCoordinatesEventToGL(ev);
  };
  canvas.onmousemove = function(ev) { if(ev.buttons == 1) { click(ev) }}

  // // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  requestAnimationFrame(tick);
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

function tick() {
  g_seconds = performance.now()/1000.0 - g_startTime;

  if (keysPressed[81]) {  // Q: left rotate
    g_camera.rotate_left();
  }
  if (keysPressed[69]) {  // E: right rotate
    g_camera.rotate_right();
  }
  if (keysPressed[87]) {  // W: move forward
    g_camera.forward();
  }
  if (keysPressed[65]) {  // A: move back
    g_camera.left();
  }
  if (keysPressed[83]) {  // S: move left
    g_camera.back();
  }
  if (keysPressed[68]) {  // D: move right
    g_camera.right();
  }
  if (keysPressed[16]) {  // Shift: move up
    g_camera.move_up();
  }
  if (keysPressed[17]) {  // Ctrl: move down
    g_camera.move_down();
  }
  if (keysPressed[70]) {  // F: place block
    placeBlock();
  }
  if (keysPressed[82]) {  // R: remove block
    deleteBlock();
  }

  // update animation angles
  updateAnimationAngles();

  // draw everything
  renderAllShapes();

  // tell the browser to update again when it has time
  requestAnimationFrame(tick);
}

function click(ev) {
  // Extract event click and return it in WebGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev);

  g_camera.mouse_pan_horizontal((g_mouseOrigin[0] - x)*80);
  g_camera.mouse_pan_vertical((g_mouseOrigin[1] - y)*50);

  g_mouseOrigin = [x,y]

  // Draw every shape that is supposed to be in the canvas
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

function updateAnimationAngles() {
  // if (g_yellowAnimation) {
  //   g_yellowAngle = (45*Math.sin(g_seconds));
  // }
  if (idle) {
    // move wings
    g_wingCurl = -4 * Math.abs(Math.sin(-g_seconds * 2)) + 30;

    // move body up and down
    g_bodyY = 0.01 * Math.abs(Math.sin(g_seconds * 2)) + 0.12;
  }

  g_lightPos[0] = Math.cos(g_seconds) * 3;
  g_lightPos[2] = Math.sin(g_seconds) * 3;

  g_spotlightPos[0] = Math.cos(g_seconds);
}

const keysPressed = {};

document.addEventListener('keydown', (ev) => {
  ev.preventDefault();
  keysPressed[ev.keyCode] = true;
});

document.addEventListener('keyup', (ev) => {
  ev.preventDefault();
  keysPressed[ev.keyCode] = false;
});

function RGB(r, g, b) {
  // helper function because i don't want to think about colors in decimals
  return [r/255, g/255, b/255, 1];
}

const V1_BODY_COLOR = RGB(57, 57, 66);
const V1_BODY2_COLOR = RGB(72, 72, 80);
const V1_BODY3_COLOR = RGB(44, 44, 54);
const V1_YELLOW = RGB(255, 220, 13);
const V1_WIRES = RGB(72, 15, 18);

function renderAllShapes() {

  // check the time at the start of this function
  var startTime = performance.now();

  // pass the projection matrix
  var projMat = new Matrix4();
  projMat.setPerspective(100, canvas.width/canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  // pass the view matrix
  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0],  g_camera.at.elements[1],  g_camera.at.elements[2],
    g_camera.up.elements[0],  g_camera.up.elements[1],  g_camera.up.elements[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var globalRotMat = new Matrix4()
  globalRotMat.rotate(g_globalAngle, 0,1,0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // pass light position to GLSL
  gl.uniform3f(u_LightPos, -g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  // pass camera position to GLSL
  gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);

  // pass the light status to GLSL
  gl.uniform1i(u_LightOn, g_lightOn);

  // pass spotlight variables to GLSL
  gl.uniform3f(u_SpotlightPos, g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
  gl.uniform3f(u_SpotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);
  gl.uniform1f(u_SpotlightCutoff, g_spotlightCutoff);
  gl.uniform1i(u_SpotlightExponent, g_spotlightExponent);

  // draw the light
  var worldLight = new Cube2();
  worldLight.color = [20,20,20,1];
  worldLight.matrix.translate(-g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  worldLight.matrix.scale(0.04,0.04,0.04);
  worldLight.renderFast();

  // draw sphere
  var sphere = new Sphere();
  sphere.matrix.scale(0.5, 0.5, 0.5);
  sphere.matrix.translate(-2,-0.5,2);
  if (g_normalOn) sphere.textureNum = -3;
  sphere.render();

  // draw the floor
  var floor = new Cube2();
  floor.color = [0.5,0,0,1];
  floor.textureNum = -2;
  floor.matrix.translate(-2.5,-1,0);
  floor.matrix.scale(4,0,4);
  if (g_normalOn) floor.textureNum = -3;
  floor.renderFast();

  //   ______   __    __  _______   ________   ______  
  //  /      \ /  |  /  |/       \ /        | /      \ 
  // /$$$$$$  |$$ |  $$ |$$$$$$$  |$$$$$$$$/ /$$$$$$  |
  // $$ |  $$/ $$ |  $$ |$$ |__$$ |$$ |__    $$ \__$$/ 
  // $$ |      $$ |  $$ |$$    $$< $$    |   $$      \ 
  // $$ |   __ $$ |  $$ |$$$$$$$  |$$$$$/     $$$$$$  |
  // $$ \__/  |$$ \__$$ |$$ |__$$ |$$ |_____ /  \__$$ |
  // $$    $$/ $$    $$/ $$    $$/ $$       |$$    $$/ 
  //  $$$$$$/   $$$$$$/  $$$$$$$/  $$$$$$$$/  $$$$$$/  

  // ==================================================
      

  //  __                        __           
  // /  |                      /  |          
  // $$ |____    ______    ____$$ | __    __ 
  // $$      \  /      \  /    $$ |/  |  /  |
  // $$$$$$$  |/$$$$$$  |/$$$$$$$ |$$ |  $$ |
  // $$ |  $$ |$$ |  $$ |$$ |  $$ |$$ |  $$ |
  // $$ |__$$ |$$ \__$$ |$$ \__$$ |$$ \__$$ |
  // $$    $$/ $$    $$/ $$    $$ |$$    $$ |
  // $$$$$$$/   $$$$$$/   $$$$$$$/  $$$$$$$ |
  //                               /  \__$$ |
  //                               $$    $$/ 
  //                                $$$$$$/  

  var body = new Cube2();
  body.color = V1_PLATE_COLOR;
  if (g_normalOn) body.textureNum = -3;
  body.matrix.translate(-.125, 0.3, 0);
  body.matrix.translate(g_bodyX, g_bodyY, g_bodyZ);
  var bodyCoords = new Matrix4(body.matrix);
  body.matrix.rotate(-10,1,0,0);
  body.matrix.scale(0.25, 0.19, 0.25);
  var bodyRef = new Matrix4(body.matrix);
  body.normalMatrix.setInverseOf(body.matrix).transpose();
  body.renderFast();

  var bodyBottom = new Cube2();
  bodyBottom.color = V1_PLATE_COLOR;
  if (g_normalOn) bodyBottom.textureNum = -3;
  bodyBottom.matrix = new Matrix4(bodyRef);
  bodyBottom.matrix.translate(-0.15,-0.1,-0.05);
  bodyBottom.matrix.scale(1.3,0.8,1.2);
  bodyBottom.normalMatrix.setInverseOf(bodyBottom.matrix).transpose();
  bodyBottom.renderFast();

  var torso = new Cube();
  torso.color = V1_BODY2_COLOR;
  if (g_normalOn) torso.textureNum = -3;
  torso.matrix.translate(0,0.3,0.1);
  torso.matrix.translate(g_bodyX, g_bodyY, g_bodyZ);
  torsoCoords = torso.matrix;
  torso.matrix.scale(0.25,0.2,0.18);
  torso.normalMatrix.setInverseOf(torso.matrix).transpose();
  torso.renderFast();

  var torsoBottom = new Cube();
  torsoBottom.color = V1_BODY_COLOR;
  if (g_normalOn) torsoBottom.textureNum = -3;
  torsoBottom.matrix = new Matrix4(torsoCoords);
  torsoBottom.matrix.translate(0,-0.5,0);
  torsoBottom.matrix.scale(0.9,0.7,0.7);
  torsoBottom.normalMatrix.setInverseOf(torsoBottom.matrix).transpose();
  torsoBottom.renderFast();

  var letter;

  if (ROBOT == 0) {
    letter = new V1_Brand();
  } else {
    letter = new V2_Brand();
  }

  letter.color = [0,0,0,1];
  letter.matrix = new Matrix4(bodyRef);
  letter.matrix.translate(0.55,0.3,-0.06);
  letter.matrix.scale(0.5,0.5,0.5);
  letter.matrix.rotate(180,0,1,0);
  letter.render();

  //                __                               
  //               /  |                              
  //  __   __   __ $$/  _______    ______    _______ 
  // /  | /  | /  |/  |/       \  /      \  /       |
  // $$ | $$ | $$ |$$ |$$$$$$$  |/$$$$$$  |/$$$$$$$/ 
  // $$ | $$ | $$ |$$ |$$ |  $$ |$$ |  $$ |$$      \ 
  // $$ \_$$ \_$$ |$$ |$$ |  $$ |$$ \__$$ | $$$$$$  |
  // $$   $$   $$/ $$ |$$ |  $$ |$$    $$ |/     $$/ 
  //  $$$$$/$$$$/  $$/ $$/   $$/  $$$$$$$ |$$$$$$$/  
  //                             /  \__$$ |          
  //                             $$    $$/           
  //                              $$$$$$/            

  var wingPack = new Cube();
  wingPack.color = V1_PLATE_COLOR;
  if (g_normalOn) wingPack.textureNum = -3;
  wingPack.matrix = new Matrix4(torsoCoords);
  wingPack.matrix.translate(0,0.3,0.8);
  wingPack.matrix.scale(0.6,0.8,0.9);
  var wingPackRef = new Matrix4(wingPack.matrix);
  wingPack.normalMatrix.setInverseOf(wingPack.matrix).transpose();
  wingPack.renderFast();

  // left wing 1
  var wingJoint1 = new Cube();
  wingJoint1.matrix = new Matrix4(wingPackRef);
  wingJoint1.matrix.rotate(-g_wingCurl*1.05 - 5,0,0,1);

  var upperLeftWingConnector = new Cube();
  upperLeftWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) upperLeftWingConnector.textureNum = -3;
  upperLeftWingConnector.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  upperLeftWingConnector.matrix.rotate(-30,0,0,1);
  upperLeftWingConnector.matrix.scale(0.2,1,0.2);
  upperLeftWingConnector.normalMatrix.setInverseOf(upperLeftWingConnector.matrix).transpose();
  upperLeftWingConnector.renderFast();

  var upperLeftWingSheath = new Cube();
  upperLeftWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) upperLeftWingSheath.textureNum = -3;
  upperLeftWingSheath.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWingSheath.matrix.translate(0.8,1.3,0.35);
  upperLeftWingSheath.matrix.scale(0.3,1.4,0.4);
  upperLeftWingSheath.matrix.rotate(20,0,0,1);
  upperLeftWingSheath.normalMatrix.setInverseOf(upperLeftWingSheath.matrix).transpose();
  upperLeftWingSheath.renderFast();

  var upperLeftWing1 = new Cube();
  upperLeftWing1.color = V1_YELLOW;
  if (g_normalOn) upperLeftWing1.textureNum = -3;
  upperLeftWing1.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWing1.matrix.translate(1.9,3,.35);
  upperLeftWing1.matrix.rotate(-35,0,0,1);
  upperLeftWing1.matrix.scale(0.4,4,0.2);
  upperLeftWing1.matrix.rotate(-7,0,0,1);
  upperLeftWing1.normalMatrix.setInverseOf(upperLeftWing1.matrix).transpose();
  upperLeftWing1.renderFast();

  var upperLeftWing2 = new Cube();
  upperLeftWing2.color = V1_YELLOW;
  if (g_normalOn) upperLeftWing2.textureNum = -3;
  upperLeftWing2.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWing2.matrix.translate(1.8,2.5,.35);
  upperLeftWing2.matrix.rotate(-30,0,0,1);
  upperLeftWing2.matrix.scale(0.4,4.1,0.2);
  upperLeftWing2.matrix.rotate(-7,0,0,1);
  upperLeftWing2.normalMatrix.setInverseOf(upperLeftWing2.matrix).transpose();
  upperLeftWing2.renderFast();

  // left wing 2

  var wingJoint2 = new Cube();
  wingJoint2.matrix = new Matrix4(wingPackRef);
  wingJoint2.matrix.rotate(-5,0,1,0);
  wingJoint2.matrix.rotate(-g_wingCurl/1.3 - 35,0,0,1);

  var upperMiddleLeftWingConnector = new Cube();
  upperMiddleLeftWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) upperMiddleLeftWingConnector.textureNum = -3;
  upperMiddleLeftWingConnector.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  upperMiddleLeftWingConnector.matrix.rotate(-60,0,0,1);
  upperMiddleLeftWingConnector.matrix.scale(0.2,1,0.2);
  upperMiddleLeftWingConnector.normalMatrix.setInverseOf(upperMiddleLeftWingConnector.matrix).transpose();
  upperMiddleLeftWingConnector.renderFast();

  var upperMiddleLeftWingSheath = new Cube();
  upperMiddleLeftWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) upperMiddleLeftWingSheath.textureNum = -3;
  upperMiddleLeftWingSheath.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWingSheath.matrix.translate(0.8,1,0.35);
  upperMiddleLeftWingSheath.matrix.scale(0.3,1.3,0.4);
  upperMiddleLeftWingSheath.matrix.rotate(20,0,0,1);
  upperMiddleLeftWingSheath.normalMatrix.setInverseOf(upperMiddleLeftWingSheath.matrix).transpose();
  upperMiddleLeftWingSheath.renderFast();

  var upperMiddleLeftWing1 = new Cube();
  upperMiddleLeftWing1.color = V1_YELLOW;
  if (g_normalOn) upperMiddleLeftWing1.textureNum = -3;
  upperMiddleLeftWing1.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWing1.matrix.translate(1.9,2.8,.35);
  upperMiddleLeftWing1.matrix.rotate(-35,0,0,1);
  upperMiddleLeftWing1.matrix.scale(0.4,4,0.2);
  upperMiddleLeftWing1.matrix.rotate(-7,0,0,1);
  upperMiddleLeftWing1.normalMatrix.setInverseOf(upperMiddleLeftWing1.matrix).transpose();
  upperMiddleLeftWing1.renderFast();

  var upperMiddleLeftWing2 = new Cube();
  upperMiddleLeftWing2.color = V1_YELLOW;
  if (g_normalOn) upperMiddleLeftWing2.textureNum = -3;
  upperMiddleLeftWing2.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWing2.matrix.translate(1.8,2.3,.35);
  upperMiddleLeftWing2.matrix.rotate(-30,0,0,1);
  upperMiddleLeftWing2.matrix.scale(0.4,4.1,0.2);
  upperMiddleLeftWing2.matrix.rotate(-7,0,0,1);
  upperMiddleLeftWing2.normalMatrix.setInverseOf(upperMiddleLeftWing2.matrix).transpose();
  upperMiddleLeftWing2.renderFast();

  // left wing 3

  var wingJoint3 = new Cube();
  wingJoint3.matrix = new Matrix4(wingPackRef);
  wingJoint3.matrix.rotate(-g_wingCurl/2 - 70,0,0,1);
  wingJoint3.matrix.rotate(-10,0,1,0);

  var lowerMiddleLeftWingConnector = new Cube();
  lowerMiddleLeftWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) lowerMiddleLeftWingConnector.textureNum = -3;
  lowerMiddleLeftWingConnector.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  lowerMiddleLeftWingConnector.matrix.rotate(-60,0,0,1);
  lowerMiddleLeftWingConnector.matrix.scale(0.2,1,0.2);
  lowerMiddleLeftWingConnector.normalMatrix.setInverseOf(lowerMiddleLeftWingConnector.matrix).transpose();
  lowerMiddleLeftWingConnector.renderFast();

  var lowerMiddleLeftWingSheath = new Cube();
  lowerMiddleLeftWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) lowerMiddleLeftWingSheath.textureNum = -3;
  lowerMiddleLeftWingSheath.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWingSheath.matrix.translate(0.8,1,0.35);
  lowerMiddleLeftWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerMiddleLeftWingSheath.matrix.rotate(20,0,0,1);
  lowerMiddleLeftWingSheath.normalMatrix.setInverseOf(lowerMiddleLeftWingSheath.matrix).transpose();
  lowerMiddleLeftWingSheath.renderFast();

  var lowerMiddleLeftWing1 = new Cube();
  lowerMiddleLeftWing1.color = V1_YELLOW;
  if (g_normalOn) lowerMiddleLeftWing1.textureNum = -3;
  lowerMiddleLeftWing1.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWing1.matrix.translate(1.9,2.8,.35);
  lowerMiddleLeftWing1.matrix.rotate(-35,0,0,1);
  lowerMiddleLeftWing1.matrix.scale(0.4,4,0.2);
  lowerMiddleLeftWing1.matrix.rotate(-7,0,0,1);
  lowerMiddleLeftWing1.normalMatrix.setInverseOf(lowerMiddleLeftWing1.matrix).transpose();
  lowerMiddleLeftWing1.renderFast();

  var lowerMiddleLeftWing2 = new Cube();
  lowerMiddleLeftWing2.color = V1_YELLOW;
  if (g_normalOn) lowerMiddleLeftWing2.textureNum = -3;
  lowerMiddleLeftWing2.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWing2.matrix.translate(1.8,2.3,.35);
  lowerMiddleLeftWing2.matrix.rotate(-30,0,0,1);
  lowerMiddleLeftWing2.matrix.scale(0.4,4.1,0.2);
  lowerMiddleLeftWing2.matrix.rotate(-7,0,0,1);
  lowerMiddleLeftWing2.normalMatrix.setInverseOf(lowerMiddleLeftWing2.matrix).transpose();
  lowerMiddleLeftWing2.renderFast();

  // left wing 4

  var wingJoint4 = new Cube();
  wingJoint4.matrix = new Matrix4(wingPackRef);
  wingJoint4.matrix.rotate(-g_wingCurl/3.3 - 100,0,0,1);
  wingJoint4.matrix.rotate(-15,0,1,0);

  var lowerLeftWingConnector = new Cube();
  lowerLeftWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) lowerLeftWingConnector.textureNum = -3;
  lowerLeftWingConnector.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  lowerLeftWingConnector.matrix.rotate(-60,0,0,1);
  lowerLeftWingConnector.matrix.scale(0.2,1,0.2);
  lowerLeftWingConnector.normalMatrix.setInverseOf(lowerLeftWingConnector.matrix).transpose();
  lowerLeftWingConnector.renderFast();

  var lowerLeftWingSheath = new Cube();
  lowerLeftWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) lowerLeftWingSheath.textureNum = -3;
  lowerLeftWingSheath.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWingSheath.matrix.translate(0.8,1,0.35);
  lowerLeftWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerLeftWingSheath.matrix.rotate(20,0,0,1);
  lowerLeftWingSheath.normalMatrix.setInverseOf(lowerLeftWingSheath.matrix).transpose();
  lowerLeftWingSheath.renderFast();

  var lowerLeftWing1 = new Cube();
  lowerLeftWing1.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWing1.color = V1_YELLOW;
  if (g_normalOn) lowerLeftWing1.textureNum = -3;
  lowerLeftWing1.matrix.translate(1.9,2.8,.35);
  lowerLeftWing1.matrix.rotate(-35,0,0,1);
  lowerLeftWing1.matrix.scale(0.4,4,0.2);
  lowerLeftWing1.matrix.rotate(-7,0,0,1);
  lowerLeftWing1.normalMatrix.setInverseOf(lowerLeftWing1.matrix).transpose();
  lowerLeftWing1.renderFast();

  var lowerLeftWing2 = new Cube();
  lowerLeftWing2.color = V1_YELLOW;
  if (g_normalOn) lowerLeftWing2.textureNum = -3;
  lowerLeftWing2.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWing2.matrix.translate(1.8,2.3,.35);
  lowerLeftWing2.matrix.rotate(-30,0,0,1);
  lowerLeftWing2.matrix.scale(0.4,4.1,0.2);
  lowerLeftWing2.matrix.rotate(-7,0,0,1);
  lowerLeftWing2.normalMatrix.setInverseOf(lowerLeftWing2.matrix).transpose();
  lowerLeftWing2.renderFast();

  // Right wing 1
  var wingJoint5 = new Cube();
  wingJoint5.matrix = new Matrix4(wingPackRef);
  wingJoint5.matrix.rotate(g_wingCurl*1.05 + 5,0,0,1);

  var upperRightWingConnector = new Cube();
  upperRightWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) upperRightWingConnector.textureNum = -3;
  upperRightWingConnector.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  upperRightWingConnector.matrix.rotate(30,0,0,1);
  upperRightWingConnector.matrix.scale(0.2,1,0.2);
  upperRightWingConnector.normalMatrix.setInverseOf(upperRightWingConnector.matrix).transpose();
  upperRightWingConnector.renderFast();

  var upperRightWingSheath = new Cube();
  upperRightWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) upperRightWingSheath.textureNum = -3;
  upperRightWingSheath.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWingSheath.matrix.translate(-0.8,1.3,0.35);
  upperRightWingSheath.matrix.scale(0.3,1.4,0.4);
  upperRightWingSheath.matrix.rotate(-20,0,0,1);
  upperRightWingSheath.normalMatrix.setInverseOf(upperRightWingSheath.matrix).transpose();
  upperRightWingSheath.renderFast();

  var upperRightWing1 = new Cube();
  upperRightWing1.color = V1_YELLOW;
  if (g_normalOn) upperRightWing1.textureNum = -3;
  upperRightWing1.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWing1.matrix.translate(-1.9,3,.35);
  upperRightWing1.matrix.rotate(35,0,0,1);
  upperRightWing1.matrix.scale(0.4,4,0.2);
  upperRightWing1.matrix.rotate(7,0,0,1);
  upperRightWing1.normalMatrix.setInverseOf(upperRightWing1.matrix).transpose();
  upperRightWing1.renderFast();

  var upperRightWing2 = new Cube();
  upperRightWing2.color = V1_YELLOW;
  if (g_normalOn) upperRightWing2.textureNum = -3;
  upperRightWing2.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWing2.matrix.translate(-1.8,2.5,.35);
  upperRightWing2.matrix.rotate(30,0,0,1);
  upperRightWing2.matrix.scale(0.4,4.1,0.2);
  upperRightWing2.matrix.rotate(7,0,0,1);
  upperRightWing2.normalMatrix.setInverseOf(upperRightWing2.matrix).transpose();
  upperRightWing2.renderFast();

  // Right wing 2

  var wingJoint6 = new Cube();
  wingJoint6.matrix = new Matrix4(wingPackRef);
  wingJoint6.matrix.rotate(g_wingCurl/1.3 + 35,0,0,1);
  wingJoint6.matrix.rotate(5,0,1,0);

  var upperMiddleRightWingConnector = new Cube();
  upperMiddleRightWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) upperMiddleRightWingConnector.textureNum = -3;
  upperMiddleRightWingConnector.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  upperMiddleRightWingConnector.matrix.rotate(60,0,0,1);
  upperMiddleRightWingConnector.matrix.scale(0.2,1,0.2);
  upperMiddleRightWingConnector.normalMatrix.setInverseOf(upperMiddleRightWingConnector.matrix).transpose();
  upperMiddleRightWingConnector.renderFast();

  var upperMiddleRightWingSheath = new Cube();
  upperMiddleRightWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) upperMiddleRightWingSheath.textureNum = -3;
  upperMiddleRightWingSheath.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWingSheath.matrix.translate(-0.8,1,0.35);
  upperMiddleRightWingSheath.matrix.scale(0.3,1.3,0.4);
  upperMiddleRightWingSheath.matrix.rotate(-20,0,0,1);
  upperMiddleRightWingSheath.normalMatrix.setInverseOf(upperMiddleRightWingSheath.matrix).transpose();
  upperMiddleRightWingSheath.renderFast();

  var upperMiddleRightWing1 = new Cube();
  upperMiddleRightWing1.color = V1_YELLOW;
  if (g_normalOn) upperMiddleRightWing1.textureNum = -3;
  upperMiddleRightWing1.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWing1.matrix.translate(-1.9,2.8,.35);
  upperMiddleRightWing1.matrix.rotate(35,0,0,1);
  upperMiddleRightWing1.matrix.scale(0.4,4,0.2);
  upperMiddleRightWing1.matrix.rotate(7,0,0,1);
  upperMiddleRightWing1.normalMatrix.setInverseOf(upperMiddleRightWing1.matrix).transpose();
  upperMiddleRightWing1.renderFast();

  var upperMiddleRightWing2 = new Cube();
  upperMiddleRightWing2.color = V1_YELLOW;
  if (g_normalOn) upperMiddleRightWing2.textureNum = -3;
  upperMiddleRightWing2.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWing2.matrix.translate(-1.8,2.3,.35);
  upperMiddleRightWing2.matrix.rotate(30,0,0,1);
  upperMiddleRightWing2.matrix.scale(0.4,4.1,0.2);
  upperMiddleRightWing2.matrix.rotate(7,0,0,1);
  upperMiddleRightWing2.normalMatrix.setInverseOf(upperMiddleRightWing2.matrix).transpose();
  upperMiddleRightWing2.renderFast();

  // Right wing 3

  var wingJoint7 = new Cube();
  wingJoint7.matrix = new Matrix4(wingPackRef);
  wingJoint7.matrix.rotate(g_wingCurl/2 + 70,0,0,1);
  wingJoint7.matrix.rotate(10,0,1,0);

  var lowerMiddleRightWingConnector = new Cube();
  lowerMiddleRightWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) lowerMiddleRightWingConnector.textureNum = -3;
  lowerMiddleRightWingConnector.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  lowerMiddleRightWingConnector.matrix.rotate(60,0,0,1);
  lowerMiddleRightWingConnector.matrix.scale(0.2,1,0.2);
  lowerMiddleRightWingConnector.normalMatrix.setInverseOf(lowerMiddleRightWingConnector.matrix).transpose();
  lowerMiddleRightWingConnector.renderFast();

  var lowerMiddleRightWingSheath = new Cube();
  lowerMiddleRightWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) lowerMiddleRightWingSheath.textureNum = -3;
  lowerMiddleRightWingSheath.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWingSheath.matrix.translate(-0.8,1,0.35);
  lowerMiddleRightWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerMiddleRightWingSheath.matrix.rotate(-20,0,0,1);
  lowerMiddleRightWingSheath.normalMatrix.setInverseOf(lowerMiddleRightWingSheath.matrix).transpose();
  lowerMiddleRightWingSheath.renderFast();

  var lowerMiddleRightWing1 = new Cube();
  lowerMiddleRightWing1.color = V1_YELLOW;
  if (g_normalOn) lowerMiddleRightWing1.textureNum = -3;
  lowerMiddleRightWing1.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWing1.matrix.translate(-1.9,2.8,.35);
  lowerMiddleRightWing1.matrix.rotate(35,0,0,1);
  lowerMiddleRightWing1.matrix.scale(0.4,4,0.2);
  lowerMiddleRightWing1.matrix.rotate(7,0,0,1);
  lowerMiddleRightWing1.normalMatrix.setInverseOf(lowerMiddleRightWing1.matrix).transpose();
  lowerMiddleRightWing1.renderFast();

  var lowerMiddleRightWing2 = new Cube();
  lowerMiddleRightWing2.color = V1_YELLOW;
  if (g_normalOn) lowerMiddleRightWing2.textureNum = -3;
  lowerMiddleRightWing2.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWing2.matrix.translate(-1.8,2.3,.35);
  lowerMiddleRightWing2.matrix.rotate(30,0,0,1);
  lowerMiddleRightWing2.matrix.scale(0.4,4.1,0.2);
  lowerMiddleRightWing2.matrix.rotate(7,0,0,1);
  lowerMiddleRightWing2.normalMatrix.setInverseOf(lowerMiddleRightWing2.matrix).transpose();
  lowerMiddleRightWing2.renderFast();

  // Right wing 4

  var wingJoint8 = new Cube();
  wingJoint8.matrix = new Matrix4(wingPackRef);
  wingJoint8.matrix.rotate(g_wingCurl/3.3 + 100,0,0,1);
  wingJoint8.matrix.rotate(15,0,1,0);

  var lowerRightWingConnector = new Cube();
  lowerRightWingConnector.color = V1_BODY3_COLOR;
  if (g_normalOn) lowerRightWingConnector.textureNum = -3;
  lowerRightWingConnector.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  lowerRightWingConnector.matrix.rotate(60,0,0,1);
  lowerRightWingConnector.matrix.scale(0.2,1,0.2);
  lowerRightWingConnector.normalMatrix.setInverseOf(lowerRightWingConnector.matrix).transpose();
  lowerRightWingConnector.renderFast();

  var lowerRightWingSheath = new Cube();
  lowerRightWingSheath.color = V1_PLATE_COLOR;
  if (g_normalOn) lowerRightWingSheath.textureNum = -3;
  lowerRightWingSheath.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWingSheath.matrix.translate(-0.8,1,0.35);
  lowerRightWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerRightWingSheath.matrix.rotate(-20,0,0,1);
  lowerRightWingSheath.normalMatrix.setInverseOf(lowerRightWingSheath.matrix).transpose();
  lowerRightWingSheath.renderFast();

  var lowerRightWing1 = new Cube();
  lowerRightWing1.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWing1.color = V1_YELLOW;
  if (g_normalOn) lowerRightWing1.textureNum = -3;
  lowerRightWing1.matrix.translate(-1.9,2.8,.35);
  lowerRightWing1.matrix.rotate(35,0,0,1);
  lowerRightWing1.matrix.scale(0.4,4,0.2);
  lowerRightWing1.matrix.rotate(7,0,0,1);
  lowerRightWing1.normalMatrix.setInverseOf(lowerRightWing1.matrix).transpose();
  lowerRightWing1.renderFast();

  var lowerRightWing2 = new Cube();
  lowerRightWing2.color = V1_YELLOW;
  if (g_normalOn) lowerRightWing2.textureNum = -3;
  lowerRightWing2.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWing2.matrix.translate(-1.8,2.3,.35);
  lowerRightWing2.matrix.rotate(30,0,0,1);
  lowerRightWing2.matrix.scale(0.4,4.1,0.2);
  lowerRightWing2.matrix.rotate(7,0,0,1);
  lowerRightWing2.normalMatrix.setInverseOf(lowerRightWing2.matrix).transpose();
  lowerRightWing2.renderFast();

  //  __             ______    __                                             
  // /  |           /      \  /  |                                            
  // $$ |  ______  /$$$$$$  |_$$ |_           ______    ______   _____  ____  
  // $$ | /      \ $$ |_ $$// $$   |         /      \  /      \ /     \/    \ 
  // $$ |/$$$$$$  |$$   |   $$$$$$/          $$$$$$  |/$$$$$$  |$$$$$$ $$$$  |
  // $$ |$$    $$ |$$$$/      $$ | __        /    $$ |$$ |  $$/ $$ | $$ | $$ |
  // $$ |$$$$$$$$/ $$ |       $$ |/  |      /$$$$$$$ |$$ |      $$ | $$ | $$ |
  // $$ |$$       |$$ |       $$  $$/       $$    $$ |$$ |      $$ | $$ | $$ |
  // $$/  $$$$$$$/ $$/         $$$$/         $$$$$$$/ $$/       $$/  $$/  $$/ 
                                                                        
  var leftShoulder = new Cube();
  leftShoulder.matrix = new Matrix4(bodyCoords);      
  leftShoulder.color = V1_BODY3_COLOR;
  if (g_normalOn) leftShoulder.textureNum = -3;
  leftShoulder.matrix.translate(0.35,0.12,0.1);
  leftShoulder.matrix.rotate(g_leftShoulderRotX,1,0,0);
  leftShoulder.matrix.rotate(g_leftShoulderRotY,0,1,0);
  leftShoulder.matrix.rotate(g_leftShoulderRotZ,0,0,1);
  var leftShoulderCoords = new Matrix4(leftShoulder.matrix);
  leftShoulder.matrix.scale(0.12,0.13,0.16);
  leftShoulder.normalMatrix.setInverseOf(leftShoulder.matrix).transpose();
  leftShoulder.renderFast();

  var leftBicep = new Cube();
  leftBicep.matrix = new Matrix4(leftShoulderCoords);
  leftBicep.color = V1_BODY_COLOR;
  if (g_normalOn) leftBicep.textureNum = -3;
  leftBicep.matrix.translate(0,-0.12,0);
  leftBicep.matrix.rotate(-3,1,0,0);
  leftBicep.matrix.scale(0.08,0.2,0.12);
  leftBicep.normalMatrix.setInverseOf(leftBicep.matrix).transpose();
  leftBicep.renderFast();

  var leftElbow = new Cube();
  leftElbow.matrix = new Matrix4(leftShoulderCoords);
  leftElbow.color = V1_PLATE_COLOR;
  if (g_normalOn) leftElbow.textureNum = -3;
  leftElbow.matrix.translate(0.0,-0.26,0);
  leftElbow.matrix.rotate(g_leftElbowRot,1,0,0);
  leftElbow.matrix.scale(0.1,0.12,0.1);
  var leftElbowRef = new Matrix4(leftElbow.matrix);
  leftElbow.normalMatrix.setInverseOf(leftElbow.matrix).transpose();
  leftElbow.renderFast();

  var leftForearm = new Cube();
  leftForearm.color = V1_PLATE_COLOR;
  if (g_normalOn) leftForearm.textureNum = -3;
  leftForearm.matrix = new Matrix4(leftElbowRef);
  leftForearm.matrix.translate(0,-0.6,0);
  leftForearm.matrix.scale(0.7,2,0.8);
  leftForearm.normalMatrix.setInverseOf(leftForearm.matrix).transpose();
  leftForearm.renderFast();

  var leftWrist = new Cube();
  leftWrist.color = V1_BODY3_COLOR;
  if (g_normalOn) leftWrist.textureNum = -3;
  leftWrist.matrix = new Matrix4(leftElbowRef);
  leftWrist.matrix.translate(0,-1.5,0);
  leftWrist.matrix.rotate(g_leftWristRotX,1,0,0);
  leftWrist.matrix.rotate(g_leftWristRotY,0,1,0);
  leftWrist.matrix.rotate(g_leftWristRotZ,0,0,1);
  leftWrist.matrix.scale(0.3,0.6,0.6);
  var leftWristRef = new Matrix4(leftWrist.matrix);
  leftWrist.normalMatrix.setInverseOf(leftWrist.matrix).transpose();
  leftWrist.renderFast();

  var leftPalm = new Cube();
  leftPalm.color = V1_PLATE_COLOR;
  if (g_normalOn) leftPalm.textureNum = -3;
  leftPalm.matrix = new Matrix4(leftWristRef);
  leftPalm.matrix.translate(0,-1,0);
  leftPalm.matrix.scale(1.4,1.4,1.4);
  var leftPalmRef = new Matrix4(leftPalm.matrix);
  leftPalm.normalMatrix.setInverseOf(leftPalm.matrix).transpose();
  leftPalm.renderFast();

  var leftFingers = new Cube();
  leftFingers.color = V1_BODY_COLOR;
  if (g_normalOn) leftFingers.textureNum = -3;
  leftFingers.matrix = new Matrix4(leftPalmRef);
  leftFingers.matrix.translate(0,-0.7,0);
  leftFingers.matrix.scale(0.9,0.8,0.9);
  leftFingers.normalMatrix.setInverseOf(leftFingers.matrix).transpose();
  leftFingers.renderFast();

  var leftThumb = new Cube();
  leftThumb.color = V1_BODY_COLOR;
  if (g_normalOn) leftThumb.textureNum = -3;
  leftThumb.matrix = new Matrix4(leftPalmRef);
  leftThumb.matrix.translate(0,0,-0.55);
  leftThumb.matrix.rotate(45,1,0,0);
  leftThumb.matrix.scale(0.9,0.8,0.4);
  leftThumb.normalMatrix.setInverseOf(leftThumb.matrix).transpose();
  leftThumb.renderFast();

  //            __            __          __                                             
  //           /  |          /  |        /  |                                            
  //   ______  $$/   ______  $$ |____   _$$ |_           ______    ______   _____  ____  
  //  /      \ /  | /      \ $$      \ / $$   |         /      \  /      \ /     \/    \ 
  // /$$$$$$  |$$ |/$$$$$$  |$$$$$$$  |$$$$$$/          $$$$$$  |/$$$$$$  |$$$$$$ $$$$  |
  // $$ |  $$/ $$ |$$ |  $$ |$$ |  $$ |  $$ | __        /    $$ |$$ |  $$/ $$ | $$ | $$ |
  // $$ |      $$ |$$ \__$$ |$$ |  $$ |  $$ |/  |      /$$$$$$$ |$$ |      $$ | $$ | $$ |
  // $$ |      $$ |$$    $$ |$$ |  $$ |  $$  $$/       $$    $$ |$$ |      $$ | $$ | $$ |
  // $$/       $$/  $$$$$$$ |$$/   $$/    $$$$/         $$$$$$$/ $$/       $$/  $$/  $$/ 
  //               /  \__$$ |                                                            
  //               $$    $$/                                                             
  //                $$$$$$/           

  var rightShoulder = new Cube();
  rightShoulder.matrix = new Matrix4(bodyCoords);      
  rightShoulder.color = V1_BODY3_COLOR;
  if (g_normalOn) rightShoulder.textureNum = -3;
  rightShoulder.matrix.translate(-0.1,0.12,0.1);
  rightShoulder.matrix.rotate(g_rightShoulderRotX,1,0,0);
  rightShoulder.matrix.rotate(-g_rightShoulderRotY,0,1,0);
  rightShoulder.matrix.rotate(-g_rightShoulderRotZ,0,0,1);
  var rightShoulderCoords = new Matrix4(rightShoulder.matrix);
  rightShoulder.matrix.scale(0.12,0.13,0.16);
  rightShoulder.normalMatrix.setInverseOf(rightShoulder.matrix).transpose();
  rightShoulder.renderFast();

  var rightBicep = new Cube();
  rightBicep.matrix = new Matrix4(rightShoulderCoords);
  rightBicep.color = V1_BODY_COLOR;
  if (g_normalOn) rightBicep.textureNum = -3;
  rightBicep.matrix.translate(0,-0.12,0);
  rightBicep.matrix.rotate(-3,1,0,0);
  rightBicep.matrix.scale(0.08,0.2,0.12);
  rightBicep.normalMatrix.setInverseOf(rightBicep.matrix).transpose();
  rightBicep.renderFast();

  var rightElbow = new Cube();
  rightElbow.matrix = new Matrix4(rightShoulderCoords);
  rightElbow.color = V1_PLATE_COLOR;
  if (g_normalOn) rightElbow.textureNum = -3;
  rightElbow.matrix.translate(0.0,-0.26,0);
  rightElbow.matrix.rotate(g_rightElbowRot,1,0,0);
  rightElbow.matrix.scale(0.1,0.12,0.1);
  var rightElbowRef = new Matrix4(rightElbow.matrix);
  rightElbow.normalMatrix.setInverseOf(rightElbow.matrix).transpose();
  rightElbow.renderFast();

  var rightForearm = new Cube();
  rightForearm.color = V1_PLATE_COLOR;
  if (g_normalOn) rightForearm.textureNum = -3;
  rightForearm.matrix = new Matrix4(rightElbowRef);
  rightForearm.matrix.translate(0,-0.6,0);
  rightForearm.matrix.scale(0.7,2,0.8);
  rightForearm.normalMatrix.setInverseOf(rightForearm.matrix).transpose();
  rightForearm.renderFast();

  var rightWrist = new Cube();
  rightWrist.color = V1_BODY3_COLOR;
  if (g_normalOn) rightWrist.textureNum = -3;
  rightWrist.matrix = new Matrix4(rightElbowRef);
  rightWrist.matrix.translate(0,-1.5,0);
  rightWrist.matrix.rotate(-g_rightWristRotX,1,0,0);
  rightWrist.matrix.rotate(-g_rightWristRotY,0,1,0);
  rightWrist.matrix.rotate(-g_rightWristRotZ,0,0,1);
  rightWrist.matrix.scale(0.3,0.6,0.6);
  var rightWristRef = new Matrix4(rightWrist.matrix);
  rightWrist.normalMatrix.setInverseOf(rightWrist.matrix).transpose();
  rightWrist.renderFast();

  var rightPalm = new Cube();
  rightPalm.color = V1_PLATE_COLOR;
  if (g_normalOn) rightPalm.textureNum = -3;
  rightPalm.matrix = new Matrix4(rightWristRef);
  rightPalm.matrix.translate(0,-1,0);
  rightPalm.matrix.scale(1.4,1.4,1.4);
  var rightPalmRef = new Matrix4(rightPalm.matrix);
  rightPalm.normalMatrix.setInverseOf(rightPalm.matrix).transpose();
  rightPalm.renderFast();

  var rightFingers = new Cube();
  rightFingers.color = V1_BODY_COLOR;
  if (g_normalOn) rightFingers.textureNum = -3;
  rightFingers.matrix = new Matrix4(rightPalmRef);
  rightFingers.matrix.translate(0,-0.7,0);
  rightFingers.matrix.scale(0.9,0.8,0.9);
  rightFingers.normalMatrix.setInverseOf(rightFingers.matrix).transpose();
  rightFingers.renderFast();

  var rightThumb = new Cube();
  rightThumb.color = V1_BODY_COLOR;
  if (g_normalOn) rightThumb.textureNum = -3;
  rightThumb.matrix = new Matrix4(rightPalmRef);
  rightThumb.matrix.translate(0,0,-0.55);
  rightThumb.matrix.rotate(45,1,0,0);
  rightThumb.matrix.scale(0.9,0.8,0.4);
  rightThumb.normalMatrix.setInverseOf(rightThumb.matrix).transpose();
  rightThumb.renderFast();

  //                       __             __           
  //                     /  |           /  |          
  //   ______    ______  $$ | __     __ $$/   _______ 
  //  /      \  /      \ $$ |/  \   /  |/  | /       |
  // /$$$$$$  |/$$$$$$  |$$ |$$  \ /$$/ $$ |/$$$$$$$/ 
  // $$ |  $$ |$$    $$ |$$ | $$  /$$/  $$ |$$      \ 
  // $$ |__$$ |$$$$$$$$/ $$ |  $$ $$/   $$ | $$$$$$  |
  // $$    $$/ $$       |$$ |   $$$/    $$ |/     $$/ 
  // $$$$$$$/   $$$$$$$/ $$/     $/     $$/ $$$$$$$/  
  // $$ |                                             
  // $$ |                                             
  // $$/                  

  var pelvis = new Cube();
  pelvis.color = V1_PLATE_COLOR;
  if (g_normalOn) pelvis.textureNum = -3;
  pelvis.matrix = new Matrix4(torsoCoords);
  pelvis.matrix.translate(0,-1.1,0);
  pelvis.matrix.scale(1,0.6,1);
  pelvis.normalMatrix.setInverseOf(pelvis.matrix).transpose();
  pelvis.renderFast();

  var pelvisLower = new Cube();
  pelvisLower.color = V1_PLATE_COLOR;
  if (g_normalOn) pelvisLower.textureNum = -3;
  pelvisLower.matrix = new Matrix4(torsoCoords);
  pelvisLower.matrix.translate(0,-1.4,0);
  pelvisLower.matrix.scale(0.5,0.6,0.7);
  var pelvisRef = new Matrix4(pelvisLower.matrix);
  pelvisLower.normalMatrix.setInverseOf(pelvisLower.matrix).transpose();
  pelvisLower.renderFast();

  //   __             ______    __            __                     
  // /  |           /      \  /  |          /  |                    
  // $$ |  ______  /$$$$$$  |_$$ |_         $$ |  ______    ______  
  // $$ | /      \ $$ |_ $$// $$   |        $$ | /      \  /      \ 
  // $$ |/$$$$$$  |$$   |   $$$$$$/         $$ |/$$$$$$  |/$$$$$$  |
  // $$ |$$    $$ |$$$$/      $$ | __       $$ |$$    $$ |$$ |  $$ |
  // $$ |$$$$$$$$/ $$ |       $$ |/  |      $$ |$$$$$$$$/ $$ \__$$ |
  // $$ |$$       |$$ |       $$  $$/       $$ |$$       |$$    $$ |
  // $$/  $$$$$$$/ $$/         $$$$/        $$/  $$$$$$$/  $$$$$$$ |
  //                                                      /  \__$$ |
  //                                                      $$    $$/ 
  //                                                       $$$$$$/  

  var leftLegTopJoint = new Cube();
  leftLegTopJoint.color = V1_BODY_COLOR;
  if (g_normalOn) leftLegTopJoint.textureNum = -3;
  leftLegTopJoint.matrix = new Matrix4(pelvisRef);
  leftLegTopJoint.matrix.translate(0.7,-0.3,0);
  leftLegTopJoint.matrix.rotate(g_leftTopLegRotX,1,0,0);
  leftLegTopJoint.matrix.rotate(g_leftTopLegRotY,0,1,0);
  leftLegTopJoint.matrix.rotate(g_leftTopLegRotZ,0,0,1);
  var legJointL1 = leftLegTopJoint.matrix;
  leftLegTopJoint.matrix.scale(0.8,0.8,0.8);
  leftLegTopJoint.normalMatrix.setInverseOf(leftLegTopJoint.matrix).transpose();
  leftLegTopJoint.renderFast();

  var upperLeftThigh = new Cube();
  upperLeftThigh.color = V1_PLATE_COLOR;
  if (g_normalOn) upperLeftThigh.textureNum = -3;
  upperLeftThigh.matrix = new Matrix4(legJointL1);
  upperLeftThigh.matrix.translate(0.2,-1.1,0);
  upperLeftThigh.matrix.rotate(-4,0,0,1);
  upperLeftThigh.matrix.scale(1.3,3,1.5);
  upperLeftThigh.normalMatrix.setInverseOf(upperLeftThigh.matrix).transpose();
  upperLeftThigh.renderFast();

  var lowerLeftThigh = new Cube();
  lowerLeftThigh.color = V1_PLATE_COLOR;
  if (g_normalOn) lowerLeftThigh.textureNum = -3;
  lowerLeftThigh.matrix = new Matrix4(legJointL1);
  lowerLeftThigh.matrix.translate(0.1,-2.5,0);
  var thighLRef = lowerLeftThigh.matrix;
  lowerLeftThigh.matrix.scale(1,2.5,1.2);
  leftLegTopJoint.normalMatrix.setInverseOf(leftLegTopJoint.matrix).transpose();
  lowerLeftThigh.renderFast();

  var leftKneeJoint = new Cube();
  leftKneeJoint.color = V1_BODY_COLOR;
  if (g_normalOn) leftKneeJoint.textureNum = -3;
  leftKneeJoint.matrix = new Matrix4(thighLRef);
  leftKneeJoint.matrix.translate(-0.1,-0.6,0.1);
  leftKneeJoint.matrix.scale(0.6,0.5,1);
  leftKneeJoint.matrix.rotate(g_leftKneeRot,1,0,0);
  var legJointL2 = leftKneeJoint.matrix;
  leftKneeJoint.normalMatrix.setInverseOf(leftKneeJoint.matrix).transpose();
  leftKneeJoint.renderFast();

  var leftShin = new Cube();
  leftShin.color = V1_PLATE_COLOR;
  if (g_normalOn) leftShin.textureNum = -3;
  leftShin.matrix = new Matrix4(legJointL2);
  leftShin.matrix.translate(0.1,-2,-0.21);
  var leftShinRef = new Matrix4(leftShin.matrix);
  leftShin.matrix.scale(1.5,3.4,0.6);
  leftShin.normalMatrix.setInverseOf(leftShin.matrix).transpose();
  leftShin.renderFast();

  var leftCalf = new Cube();
  leftCalf.color = V1_BODY_COLOR;
  if (g_normalOn) leftCalf.textureNum = -3;
  leftCalf.matrix = new Matrix4(leftShinRef);
  leftCalf.matrix.translate(0,0.4,0.3);
  leftCalf.matrix.rotate(10,1,0,0);
  leftCalf.matrix.scale(1.2,2,0.8);
  leftCalf.normalMatrix.setInverseOf(leftCalf.matrix).transpose();
  leftCalf.renderFast();

  var leftKneeCap = new Cube();
  leftKneeCap.color = V1_PLATE_COLOR;
  if (g_normalOn) leftKneeCap.textureNum = -3;
  leftKneeCap.matrix = new Matrix4(legJointL2);
  leftKneeCap.matrix.translate(0.1,-0.4,-0.65);
  leftKneeCap.matrix.rotate(-25,1,0,0);
  leftKneeCap.matrix.scale(1.2,1,0.3);
  leftKneeCap.normalMatrix.setInverseOf(leftKneeCap.matrix).transpose();
  leftKneeCap.renderFast();

  var leftAnkle = new Cube();
  leftAnkle.color = V1_BODY_COLOR;
  if (g_normalOn) leftAnkle.textureNum = -3;
  leftAnkle.matrix = new Matrix4(legJointL2);
  leftAnkle.matrix.translate(0.1,-3.8,-0.2);
  leftAnkle.matrix.rotate(g_leftAnkleRot,1,0,0);
  var legJointL3 = leftAnkle.matrix;
  leftAnkle.matrix.scale(1,0.6,0.6);
  leftAnkle.normalMatrix.setInverseOf(leftAnkle.matrix).transpose();
  leftAnkle.renderFast();

  var leftFoot = new Cube();
  leftFoot.color = V1_PLATE_COLOR;
  if (g_normalOn) leftFoot.textureNum = -3;
  leftFoot.matrix = new Matrix4(legJointL3);
  leftFoot.matrix.translate(0,-0.2,-1.4);
  leftFoot.matrix.scale(2,0.8,2.5);
  leftFoot.normalMatrix.setInverseOf(leftFoot.matrix).transpose();
  leftFoot.renderFast();

  //            __            __          __            __                     
  //           /  |          /  |        /  |          /  |                    
  //   ______  $$/   ______  $$ |____   _$$ |_         $$ |  ______    ______  
  //  /      \ /  | /      \ $$      \ / $$   |        $$ | /      \  /      \ 
  // /$$$$$$  |$$ |/$$$$$$  |$$$$$$$  |$$$$$$/         $$ |/$$$$$$  |/$$$$$$  |
  // $$ |  $$/ $$ |$$ |  $$ |$$ |  $$ |  $$ | __       $$ |$$    $$ |$$ |  $$ |
  // $$ |      $$ |$$ \__$$ |$$ |  $$ |  $$ |/  |      $$ |$$$$$$$$/ $$ \__$$ |
  // $$ |      $$ |$$    $$ |$$ |  $$ |  $$  $$/       $$ |$$       |$$    $$ |
  // $$/       $$/  $$$$$$$ |$$/   $$/    $$$$/        $$/  $$$$$$$/  $$$$$$$ |
  //               /  \__$$ |                                        /  \__$$ |
  //               $$    $$/                                         $$    $$/ 
  //                $$$$$$/                                           $$$$$$/  

  var rightLegTopJoint = new Cube();
  rightLegTopJoint.color = V1_BODY_COLOR;
  if (g_normalOn) rightLegTopJoint.textureNum = -3;
  rightLegTopJoint.matrix = new Matrix4(pelvisRef);
  rightLegTopJoint.matrix.translate(-0.7,-0.3,0);
  rightLegTopJoint.matrix.rotate(g_rightTopLegRotX,1,0,0);
  rightLegTopJoint.matrix.rotate(-g_rightTopLegRotY,0,1,0);
  rightLegTopJoint.matrix.rotate(-g_rightTopLegRotZ,0,0,1);
  var legJointR1 = rightLegTopJoint.matrix;
  rightLegTopJoint.matrix.scale(0.8,0.8,0.8);
  rightLegTopJoint.normalMatrix.setInverseOf(rightLegTopJoint.matrix).transpose();
  rightLegTopJoint.renderFast();

  var upperrightThigh = new Cube();
  upperrightThigh.color = V1_PLATE_COLOR;
  if (g_normalOn) upperrightThigh.textureNum = -3;
  upperrightThigh.matrix = new Matrix4(legJointR1);
  upperrightThigh.matrix.translate(-0.2,-1.1,0);
  upperrightThigh.matrix.rotate(4,0,0,1);
  upperrightThigh.matrix.scale(1.3,3,1.5);
  upperLeftThigh.normalMatrix.setInverseOf(upperLeftThigh.matrix).transpose();
  upperrightThigh.renderFast();

  var lowerrightThigh = new Cube();
  lowerrightThigh.color = V1_PLATE_COLOR;
  if (g_normalOn) lowerrightThigh.textureNum = -3;
  lowerrightThigh.matrix = new Matrix4(legJointR1);
  lowerrightThigh.matrix.translate(-0.1,-2.5,0);
  var thighLRef = lowerrightThigh.matrix;
  lowerrightThigh.matrix.rotate(-0,0,0,1);
  lowerrightThigh.matrix.scale(1,2.5,1.2);
  lowerLeftThigh.normalMatrix.setInverseOf(lowerLeftThigh.matrix).transpose();
  lowerrightThigh.renderFast();

  var rightKneeJoint = new Cube();
  rightKneeJoint.color = V1_BODY_COLOR;
  if (g_normalOn) rightKneeJoint.textureNum = -3;
  rightKneeJoint.matrix = new Matrix4(thighLRef);
  rightKneeJoint.matrix.translate(0.1,-0.6,0.1);
  rightKneeJoint.matrix.scale(0.6,0.5,1);
  rightKneeJoint.matrix.rotate(g_rightKneeRot,1,0,0);
  var legJointR2 = rightKneeJoint.matrix;
  rightKneeJoint.normalMatrix.setInverseOf(rightKneeJoint.matrix).transpose();
  rightKneeJoint.renderFast();

  var rightShin = new Cube();
  rightShin.color = V1_PLATE_COLOR;
  if (g_normalOn) rightShin.textureNum = -3;
  rightShin.matrix = new Matrix4(legJointR2);
  rightShin.matrix.translate(-0.1,-2,-0.21);
  var rightShinRef = new Matrix4(rightShin.matrix);
  rightShin.matrix.scale(1.5,3.4,0.6);
  rightShin.normalMatrix.setInverseOf(rightShin.matrix).transpose();
  rightShin.renderFast();

  var rightCalf = new Cube();
  rightCalf.color = V1_BODY_COLOR;
  if (g_normalOn) rightCalf.textureNum = -3;
  rightCalf.matrix = new Matrix4(rightShinRef);
  rightCalf.matrix.translate(0,0.4,0.3);
  rightCalf.matrix.rotate(10,1,0,0);
  rightCalf.matrix.scale(1.2,2,0.8);
  rightCalf.normalMatrix.setInverseOf(rightCalf.matrix).transpose();
  rightCalf.renderFast();

  var rightKneeCap = new Cube();
  rightKneeCap.color = V1_PLATE_COLOR;
  if (g_normalOn) rightKneeCap.textureNum = -3;
  rightKneeCap.matrix = new Matrix4(legJointR2);
  rightKneeCap.matrix.translate(-0.1,-0.4,-0.65);
  rightKneeCap.matrix.rotate(-25,1,0,0);
  rightKneeCap.matrix.scale(1.2,1,0.3);
  rightKneeCap.normalMatrix.setInverseOf(rightKneeCap.matrix).transpose();
  rightKneeCap.renderFast();

  var rightAnkle = new Cube();
  rightAnkle.color = V1_BODY_COLOR;
  if (g_normalOn) rightAnkle.textureNum = -3;
  rightAnkle.matrix = new Matrix4(legJointR2);
  rightAnkle.matrix.translate(-0.1,-3.8,-0.2);
  rightAnkle.matrix.rotate(g_rightAnkleRot,1,0,0);
  var legJointR3 = rightAnkle.matrix;
  rightAnkle.matrix.scale(1,0.6,0.6);
  rightAnkle.normalMatrix.setInverseOf(rightAnkle.matrix).transpose();
  rightAnkle.renderFast();

  var rightFoot = new Cube();
  rightFoot.color = V1_PLATE_COLOR;
  if (g_normalOn) rightFoot.textureNum = -3;
  rightFoot.matrix = new Matrix4(legJointR3);
  rightFoot.matrix.translate(0,-0.2,-1.4);
  rightFoot.matrix.scale(2,0.8,2.5);
  rightFoot.normalMatrix.setInverseOf(rightFoot.matrix).transpose();
  rightFoot.renderFast();

  // __                                  __ 
  // /  |                                /  |
  // $$ |____    ______    ______    ____$$ |
  // $$      \  /      \  /      \  /    $$ |
  // $$$$$$$  |/$$$$$$  | $$$$$$  |/$$$$$$$ |
  // $$ |  $$ |$$    $$ | /    $$ |$$ |  $$ |
  // $$ |  $$ |$$$$$$$$/ /$$$$$$$ |$$ \__$$ |
  // $$ |  $$ |$$       |$$    $$ |$$    $$ |
  // $$/   $$/  $$$$$$$/  $$$$$$$/  $$$$$$$/ 

  var headWire = new Cube2();
  headWire.color = V1_BODY_COLOR;
  if (g_normalOn) headWire.textureNum = -3;
  headWire.matrix = bodyCoords;
  headWire.matrix.translate(0.105,0.34,0.13);
  var headWireCoords = new Matrix4(headWire.matrix);
  headWire.matrix.rotate(130,1,0,0);
  headWire.matrix.scale(0.04,0.04,0.23);
  headWire.normalMatrix.setInverseOf(headWire.matrix).transpose();
  headWire.renderFast();

  // head
  var head = new Cube();
  head.color = V1_BODY_COLOR;
  if (g_normalOn) head.textureNum = -3;
  head.matrix = headWireCoords;
  head.matrix.translate(0.02, 0.02, -0.07);
  head.matrix.rotate(g_headRotX,1,0,0);
  head.matrix.rotate(g_headRotY,0,1,0);
  head.matrix.scale(0.17,0.17,0.23);
  var headRef = new Matrix4(head.matrix);
  head.normalMatrix.setInverseOf(head.matrix).transpose();
  head.renderFast();

  // head trims
  var headTopRight = new Cube();
  headTopRight.color = V1_PLATE_COLOR;
  if (g_normalOn) headTopRight.textureNum = -3;
  headTopRight.matrix = new Matrix4(headRef);
  headTopRight.matrix.translate(0.6,0.2,0);
  headTopRight.matrix.rotate(10,0,0,1);
  headTopRight.matrix.scale(0.3,0.8,1.4);
  headTopRight.normalMatrix.setInverseOf(headTopRight.matrix).transpose();
  headTopRight.renderFast();

  var headTopLeft = new Cube();
  headTopLeft.color = V1_PLATE_COLOR;
  if (g_normalOn) headTopLeft.textureNum = -3;
  headTopLeft.matrix = new Matrix4(headRef);
  headTopLeft.matrix.translate(-0.6,0.2,0);
  headTopLeft.matrix.rotate(-10,0,0,1);
  headTopLeft.matrix.scale(0.3,0.8,1.4);
  headTopLeft.normalMatrix.setInverseOf(headTopLeft.matrix).transpose();
  headTopLeft.renderFast();

  var headBottomRight = new Cube();
  headBottomRight.color = V1_PLATE_COLOR;
  if (g_normalOn) headBottomRight.textureNum = -3;
  headBottomRight.matrix = new Matrix4(headRef);
  headBottomRight.matrix.translate(0.6,-0.2,0);
  headBottomRight.matrix.rotate(-10,0,0,1);
  headBottomRight.matrix.scale(0.3,0.8,1.2);
  headBottomRight.normalMatrix.setInverseOf(headBottomRight.matrix).transpose();
  headBottomRight.renderFast();

  var headBottomLeft = new Cube();
  headBottomLeft.color = V1_PLATE_COLOR;
  if (g_normalOn) headBottomLeft.textureNum = -3;
  headBottomLeft.matrix = new Matrix4(headRef);
  headBottomLeft.matrix.translate(-0.6,-0.2,0);
  headBottomLeft.matrix.rotate(10,0,0,1);
  headBottomLeft.matrix.scale(0.3,0.8,1.2);
  headBottomLeft.normalMatrix.setInverseOf(headBottomLeft.matrix).transpose();
  headBottomLeft.renderFast();

  // head light
  var light = new Cube();
  light.color = V1_YELLOW;
  if (g_normalOn) light.textureNum = -3;
  light.matrix = new Matrix4(headRef);
  light.matrix.translate(0,0,-0.3);
  light.matrix.scale(0.6,0.6,0.6);
  light.normalMatrix.setInverseOf(light.matrix).transpose();
  light.renderFast();

  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration)/10, "performance");
}