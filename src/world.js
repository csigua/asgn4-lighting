// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;

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
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_whichTexture;

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

const MAP_SIZE = 4;

let g_map = [
  [0,0,0,0],
  [0,0,0,0],
  [0,0,0,0],
  [0,0,0,0]
];

function drawMap() {
  // var wall = new Cube2(); // if needed, left as-is
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      const height = g_map[x][y];
      if (height > 0) {
        for (let i = 0; i < height; i++) {
          // Create a unique key (string) for this coordinate
          const coordKey = [
            x - (MAP_SIZE / 2),
            -0.75 + i,
            y - (MAP_SIZE / 2)
          ].join(',');

          // Only add it if it's not already in the set
          if (!placedBlocks.has(coordKey)) {
            placedBlocks.add(coordKey);
            console.log(placedBlocks.size);
          }
        }
      }
    }
  }
}

function drawCubes() {
  var cube = new Cube2();
  for (const blockCoordStr of placedBlocks) {
    // Convert the comma-separated string back to numbers
    const [x, y, z] = blockCoordStr.split(',').map(Number);

    cube.textureNum = 2;
    cube.matrix.setTranslate(x, y, z);
    cube.renderFast();
  }
}

function flipMap(x,y) {
  g_map[x][y] += 1;
}

function deleteBlock() {
  let blockCoords = new Vector3();
  blockCoords.add(g_camera.at);
  blockCoords.normalize();
  blockCoords.mul(3);
  blockCoords.add(g_camera.eye);

  x = Math.round(blockCoords.elements[0] - 0.5);
  y = Math.round(blockCoords.elements[1] - 0.75) + 0.25;
  z = Math.round(blockCoords.elements[2] - 0.5);

  const coordKey = [x,y,z].join(',');
  
  let toRemove = null;
  for (const block of placedBlocks) {
    if (coordKey === block) {
      toRemove = block;
      break;
    }
  }
  if (toRemove) {
    placedBlocks.delete(coordKey);
  }
}

let placedBlocks = new Set();

function placeBlock() {
  let block = new Cube2();
  let blockCoords = new Vector3();
  blockCoords.add(g_camera.at);
  blockCoords.normalize();
  blockCoords.mul(3);
  blockCoords.add(g_camera.eye);

  block.textureNum = 1;

  x = Math.round(blockCoords.elements[0] - 0.5);
  y = Math.round(blockCoords.elements[1] - 0.75) + 0.25;
  z = Math.round(blockCoords.elements[2] - 0.5);

  const coordKey = [x,y,z].join(',');

  placedBlocks.add(coordKey);
}

function drawCursor() {
  let cursorVec = new Vector3();
  cursorVec.add(g_camera.at);
  cursorVec.normalize();
  cursorVec.mul(3);
  cursorVec.add(g_camera.eye);

  let cursorX = new Cube();
  cursorX.matrix.setTranslate(
    cursorVec.elements[0],
    cursorVec.elements[1],
    cursorVec.elements[2]
  )
  cursorX.color = RGB(255, 0, 0);
  cursorX.matrix.scale(0.1,0.01,0.01);
  cursorX.renderFast();

  let cursorY = new Cube();
  cursorY.matrix.setTranslate(
    cursorVec.elements[0],
    cursorVec.elements[1],
    cursorVec.elements[2]
  )
  cursorY.color = RGB(0, 255, 0);
  cursorY.matrix.scale(0.01,0.1,0.01);
  cursorY.renderFast();

  let cursorZ = new Cube();
  cursorZ.matrix.setTranslate(
    cursorVec.elements[0],
    cursorVec.elements[1],
    cursorVec.elements[2]
  )
  cursorZ.color = RGB(0, 0, 255);
  cursorZ.matrix.scale(0.01,0.01,0.1);
  cursorZ.renderFast();
}

function addActionsForHtmlUI() {
  // Clear button event
  document.getElementById('normalOn').onclick = function() {g_normalOn = true};
  document.getElementById('normalOff').onclick = function() {g_normalOn = false};

  // document.getElementById('yellowSlide').addEventListener('mousemove', function() {g_yellowAngle = this.value; renderAllShapes()});
  // document.getElementById('magentaSlide').addEventListener('mousemove', function() {g_magentaAngle = this.value; renderAllShapes()});

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
const V1_YELLOW = RGB(190, 152, 13);
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

  // draw placed cubes
  drawCubes();

  // draw cursor
  drawCursor();

  // draw the floor
  var floor = new Cube2();
  floor.color = [1.0, 0.0, 0.0, 1.0];
  floor.textureNum = 1;
  floor.matrix.translate(0, -0.75, 0.0);
  floor.matrix.scale(3, 0, 3);
  floor.matrix.translate(-0.5, 0, -0.5);
  floor.renderFast();

  // draw the sky box
  var sky = new Cube2();
  sky.color = [1.0,0.0,0.0,1.0];
  sky.textureNum = -1;
  if (g_normalOn) sky.textureNum = -3;
  sky.matrix.scale(2.9,3.1,2.9);
  sky.matrix.translate(-0.5, -0.25, -0.5);
  sky.renderFast();

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
  body.renderFast();

  var bodyBottom = new Cube2();
  bodyBottom.color = V1_PLATE_COLOR;
  if (g_normalOn) bodyBottom.textureNum = -3;
  bodyBottom.matrix = new Matrix4(bodyRef);
  bodyBottom.matrix.translate(-0.15,-0.1,-0.05);
  bodyBottom.matrix.scale(1.3,0.8,1.2);
  bodyBottom.renderFast();

  var torso = new Cube();
  torso.color = V1_BODY2_COLOR;
  if (g_normalOn) torso.textureNum = -3;
  torso.matrix.translate(0,0.3,0.1);
  torso.matrix.translate(g_bodyX, g_bodyY, g_bodyZ);
  torsoCoords = torso.matrix;
  torso.matrix.scale(0.25,0.2,0.18);
  torso.renderFast();

  var torsoBottom = new Cube();
  torsoBottom.color = V1_BODY_COLOR;
  torsoBottom.matrix = new Matrix4(torsoCoords);
  torsoBottom.matrix.translate(0,-0.5,0);
  torsoBottom.matrix.scale(0.9,0.7,0.7);
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
  wingPack.matrix = new Matrix4(torsoCoords);
  wingPack.matrix.translate(0,0.3,0.8);
  wingPack.matrix.scale(0.6,0.8,0.9);
  var wingPackRef = new Matrix4(wingPack.matrix);
  wingPack.renderFast();

  // left wing 1
  var wingJoint1 = new Cube();
  wingJoint1.matrix = new Matrix4(wingPackRef);
  wingJoint1.matrix.rotate(-g_wingCurl*1.05 - 5,0,0,1);

  var upperLeftWingConnector = new Cube();
  upperLeftWingConnector.color = V1_BODY3_COLOR;
  upperLeftWingConnector.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  upperLeftWingConnector.matrix.rotate(-30,0,0,1);
  upperLeftWingConnector.matrix.scale(0.2,1,0.2);
  upperLeftWingConnector.renderFast();

  var upperLeftWingSheath = new Cube();
  upperLeftWingSheath.color = V1_PLATE_COLOR;
  upperLeftWingSheath.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWingSheath.matrix.translate(0.8,1.3,0.35);
  upperLeftWingSheath.matrix.scale(0.3,1.4,0.4);
  upperLeftWingSheath.matrix.rotate(20,0,0,1);
  upperLeftWingSheath.renderFast();

  var upperLeftWing1 = new Cube();
  upperLeftWing1.color = V1_YELLOW;
  upperLeftWing1.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWing1.matrix.translate(1.9,3,.35);
  upperLeftWing1.matrix.rotate(-35,0,0,1);
  upperLeftWing1.matrix.scale(0.4,4,0.2);
  upperLeftWing1.matrix.rotate(-7,0,0,1);
  upperLeftWing1.renderFast();

  var upperLeftWing2 = new Cube();
  upperLeftWing2.color = V1_YELLOW;
  upperLeftWing2.matrix = new Matrix4(wingJoint1.matrix);
  upperLeftWing2.matrix.translate(1.8,2.5,.35);
  upperLeftWing2.matrix.rotate(-30,0,0,1);
  upperLeftWing2.matrix.scale(0.4,4.1,0.2);
  upperLeftWing2.matrix.rotate(-7,0,0,1);
  upperLeftWing2.renderFast();

  // left wing 2

  var wingJoint2 = new Cube();
  wingJoint2.matrix = new Matrix4(wingPackRef);
  wingJoint2.matrix.rotate(-5,0,1,0);
  wingJoint2.matrix.rotate(-g_wingCurl/1.3 - 35,0,0,1);

  var upperMiddleLeftWingConnector = new Cube();
  upperMiddleLeftWingConnector.color = V1_BODY3_COLOR;
  upperMiddleLeftWingConnector.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  upperMiddleLeftWingConnector.matrix.rotate(-60,0,0,1);
  upperMiddleLeftWingConnector.matrix.scale(0.2,1,0.2);
  upperMiddleLeftWingConnector.renderFast();

  var upperMiddleLeftWingSheath = new Cube();
  upperMiddleLeftWingSheath.color = V1_PLATE_COLOR;
  upperMiddleLeftWingSheath.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWingSheath.matrix.translate(0.8,1,0.35);
  upperMiddleLeftWingSheath.matrix.scale(0.3,1.3,0.4);
  upperMiddleLeftWingSheath.matrix.rotate(20,0,0,1);
  upperMiddleLeftWingSheath.renderFast();

  var upperMiddleLeftWing1 = new Cube();
  upperMiddleLeftWing1.color = V1_YELLOW;
  upperMiddleLeftWing1.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWing1.matrix.translate(1.9,2.8,.35);
  upperMiddleLeftWing1.matrix.rotate(-35,0,0,1);
  upperMiddleLeftWing1.matrix.scale(0.4,4,0.2);
  upperMiddleLeftWing1.matrix.rotate(-7,0,0,1);
  upperMiddleLeftWing1.renderFast();

  var upperMiddleLeftWing2 = new Cube();
  upperMiddleLeftWing2.color = V1_YELLOW;
  upperMiddleLeftWing2.matrix = new Matrix4(wingJoint2.matrix);
  upperMiddleLeftWing2.matrix.translate(1.8,2.3,.35);
  upperMiddleLeftWing2.matrix.rotate(-30,0,0,1);
  upperMiddleLeftWing2.matrix.scale(0.4,4.1,0.2);
  upperMiddleLeftWing2.matrix.rotate(-7,0,0,1);
  upperMiddleLeftWing2.renderFast();

  // left wing 3

  var wingJoint3 = new Cube();
  wingJoint3.matrix = new Matrix4(wingPackRef);
  wingJoint3.matrix.rotate(-g_wingCurl/2 - 70,0,0,1);
  wingJoint3.matrix.rotate(-10,0,1,0);

  var lowerMiddleLeftWingConnector = new Cube();
  lowerMiddleLeftWingConnector.color = V1_BODY3_COLOR;
  lowerMiddleLeftWingConnector.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  lowerMiddleLeftWingConnector.matrix.rotate(-60,0,0,1);
  lowerMiddleLeftWingConnector.matrix.scale(0.2,1,0.2);
  lowerMiddleLeftWingConnector.renderFast();

  var lowerMiddleLeftWingSheath = new Cube();
  lowerMiddleLeftWingSheath.color = V1_PLATE_COLOR;
  lowerMiddleLeftWingSheath.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWingSheath.matrix.translate(0.8,1,0.35);
  lowerMiddleLeftWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerMiddleLeftWingSheath.matrix.rotate(20,0,0,1);
  lowerMiddleLeftWingSheath.renderFast();

  var lowerMiddleLeftWing1 = new Cube();
  lowerMiddleLeftWing1.color = V1_YELLOW;
  lowerMiddleLeftWing1.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWing1.matrix.translate(1.9,2.8,.35);
  lowerMiddleLeftWing1.matrix.rotate(-35,0,0,1);
  lowerMiddleLeftWing1.matrix.scale(0.4,4,0.2);
  lowerMiddleLeftWing1.matrix.rotate(-7,0,0,1);
  lowerMiddleLeftWing1.renderFast();

  var lowerMiddleLeftWing2 = new Cube();
  lowerMiddleLeftWing2.color = V1_YELLOW;
  lowerMiddleLeftWing2.matrix = new Matrix4(wingJoint3.matrix);
  lowerMiddleLeftWing2.matrix.translate(1.8,2.3,.35);
  lowerMiddleLeftWing2.matrix.rotate(-30,0,0,1);
  lowerMiddleLeftWing2.matrix.scale(0.4,4.1,0.2);
  lowerMiddleLeftWing2.matrix.rotate(-7,0,0,1);
  lowerMiddleLeftWing2.renderFast();

  // left wing 4

  var wingJoint4 = new Cube();
  wingJoint4.matrix = new Matrix4(wingPackRef);
  wingJoint4.matrix.rotate(-g_wingCurl/3.3 - 100,0,0,1);
  wingJoint4.matrix.rotate(-15,0,1,0);

  var lowerLeftWingConnector = new Cube();
  lowerLeftWingConnector.color = V1_BODY3_COLOR;
  lowerLeftWingConnector.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWingConnector.matrix.translate(0.5,0.4,0.35);
  lowerLeftWingConnector.matrix.rotate(-60,0,0,1);
  lowerLeftWingConnector.matrix.scale(0.2,1,0.2);
  lowerLeftWingConnector.renderFast();

  var lowerLeftWingSheath = new Cube();
  lowerLeftWingSheath.color = V1_PLATE_COLOR;
  lowerLeftWingSheath.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWingSheath.matrix.translate(0.8,1,0.35);
  lowerLeftWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerLeftWingSheath.matrix.rotate(20,0,0,1);
  lowerLeftWingSheath.renderFast();

  var lowerLeftWing1 = new Cube();
  lowerLeftWing1.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWing1.color = V1_YELLOW;
  lowerLeftWing1.matrix.translate(1.9,2.8,.35);
  lowerLeftWing1.matrix.rotate(-35,0,0,1);
  lowerLeftWing1.matrix.scale(0.4,4,0.2);
  lowerLeftWing1.matrix.rotate(-7,0,0,1);
  lowerLeftWing1.renderFast();

  var lowerLeftWing2 = new Cube();
  lowerLeftWing2.color = V1_YELLOW;
  lowerLeftWing2.matrix = new Matrix4(wingJoint4.matrix);
  lowerLeftWing2.matrix.translate(1.8,2.3,.35);
  lowerLeftWing2.matrix.rotate(-30,0,0,1);
  lowerLeftWing2.matrix.scale(0.4,4.1,0.2);
  lowerLeftWing2.matrix.rotate(-7,0,0,1);
  lowerLeftWing2.renderFast();

  // Right wing 1
  var wingJoint5 = new Cube();
  wingJoint5.matrix = new Matrix4(wingPackRef);
  wingJoint5.matrix.rotate(g_wingCurl*1.05 + 5,0,0,1);

  var upperRightWingConnector = new Cube();
  upperRightWingConnector.color = V1_BODY3_COLOR;
  upperRightWingConnector.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  upperRightWingConnector.matrix.rotate(30,0,0,1);
  upperRightWingConnector.matrix.scale(0.2,1,0.2);
  upperRightWingConnector.renderFast();

  var upperRightWingSheath = new Cube();
  upperRightWingSheath.color = V1_PLATE_COLOR;
  upperRightWingSheath.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWingSheath.matrix.translate(-0.8,1.3,0.35);
  upperRightWingSheath.matrix.scale(0.3,1.4,0.4);
  upperRightWingSheath.matrix.rotate(-20,0,0,1);
  upperRightWingSheath.renderFast();

  var upperRightWing1 = new Cube();
  upperRightWing1.color = V1_YELLOW;
  upperRightWing1.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWing1.matrix.translate(-1.9,3,.35);
  upperRightWing1.matrix.rotate(35,0,0,1);
  upperRightWing1.matrix.scale(0.4,4,0.2);
  upperRightWing1.matrix.rotate(7,0,0,1);
  upperRightWing1.renderFast();

  var upperRightWing2 = new Cube();
  upperRightWing2.color = V1_YELLOW;
  upperRightWing2.matrix = new Matrix4(wingJoint5.matrix);
  upperRightWing2.matrix.translate(-1.8,2.5,.35);
  upperRightWing2.matrix.rotate(30,0,0,1);
  upperRightWing2.matrix.scale(0.4,4.1,0.2);
  upperRightWing2.matrix.rotate(7,0,0,1);
  upperRightWing2.renderFast();

  // Right wing 2

  var wingJoint6 = new Cube();
  wingJoint6.matrix = new Matrix4(wingPackRef);
  wingJoint6.matrix.rotate(g_wingCurl/1.3 + 35,0,0,1);
  wingJoint6.matrix.rotate(5,0,1,0);

  var upperMiddleRightWingConnector = new Cube();
  upperMiddleRightWingConnector.color = V1_BODY3_COLOR;
  upperMiddleRightWingConnector.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  upperMiddleRightWingConnector.matrix.rotate(60,0,0,1);
  upperMiddleRightWingConnector.matrix.scale(0.2,1,0.2);
  upperMiddleRightWingConnector.renderFast();

  var upperMiddleRightWingSheath = new Cube();
  upperMiddleRightWingSheath.color = V1_PLATE_COLOR;
  upperMiddleRightWingSheath.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWingSheath.matrix.translate(-0.8,1,0.35);
  upperMiddleRightWingSheath.matrix.scale(0.3,1.3,0.4);
  upperMiddleRightWingSheath.matrix.rotate(-20,0,0,1);
  upperMiddleRightWingSheath.renderFast();

  var upperMiddleRightWing1 = new Cube();
  upperMiddleRightWing1.color = V1_YELLOW;
  upperMiddleRightWing1.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWing1.matrix.translate(-1.9,2.8,.35);
  upperMiddleRightWing1.matrix.rotate(35,0,0,1);
  upperMiddleRightWing1.matrix.scale(0.4,4,0.2);
  upperMiddleRightWing1.matrix.rotate(7,0,0,1);
  upperMiddleRightWing1.renderFast();

  var upperMiddleRightWing2 = new Cube();
  upperMiddleRightWing2.color = V1_YELLOW;
  upperMiddleRightWing2.matrix = new Matrix4(wingJoint6.matrix);
  upperMiddleRightWing2.matrix.translate(-1.8,2.3,.35);
  upperMiddleRightWing2.matrix.rotate(30,0,0,1);
  upperMiddleRightWing2.matrix.scale(0.4,4.1,0.2);
  upperMiddleRightWing2.matrix.rotate(7,0,0,1);
  upperMiddleRightWing2.renderFast();

  // Right wing 3

  var wingJoint7 = new Cube();
  wingJoint7.matrix = new Matrix4(wingPackRef);
  wingJoint7.matrix.rotate(g_wingCurl/2 + 70,0,0,1);
  wingJoint7.matrix.rotate(10,0,1,0);

  var lowerMiddleRightWingConnector = new Cube();
  lowerMiddleRightWingConnector.color = V1_BODY3_COLOR;
  lowerMiddleRightWingConnector.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  lowerMiddleRightWingConnector.matrix.rotate(60,0,0,1);
  lowerMiddleRightWingConnector.matrix.scale(0.2,1,0.2);
  lowerMiddleRightWingConnector.renderFast();

  var lowerMiddleRightWingSheath = new Cube();
  lowerMiddleRightWingSheath.color = V1_PLATE_COLOR;
  lowerMiddleRightWingSheath.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWingSheath.matrix.translate(-0.8,1,0.35);
  lowerMiddleRightWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerMiddleRightWingSheath.matrix.rotate(-20,0,0,1);
  lowerMiddleRightWingSheath.renderFast();

  var lowerMiddleRightWing1 = new Cube();
  lowerMiddleRightWing1.color = V1_YELLOW;
  lowerMiddleRightWing1.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWing1.matrix.translate(-1.9,2.8,.35);
  lowerMiddleRightWing1.matrix.rotate(35,0,0,1);
  lowerMiddleRightWing1.matrix.scale(0.4,4,0.2);
  lowerMiddleRightWing1.matrix.rotate(7,0,0,1);
  lowerMiddleRightWing1.renderFast();

  var lowerMiddleRightWing2 = new Cube();
  lowerMiddleRightWing2.color = V1_YELLOW;
  lowerMiddleRightWing2.matrix = new Matrix4(wingJoint7.matrix);
  lowerMiddleRightWing2.matrix.translate(-1.8,2.3,.35);
  lowerMiddleRightWing2.matrix.rotate(30,0,0,1);
  lowerMiddleRightWing2.matrix.scale(0.4,4.1,0.2);
  lowerMiddleRightWing2.matrix.rotate(7,0,0,1);
  lowerMiddleRightWing2.renderFast();

  // Right wing 4

  var wingJoint8 = new Cube();
  wingJoint8.matrix = new Matrix4(wingPackRef);
  wingJoint8.matrix.rotate(g_wingCurl/3.3 + 100,0,0,1);
  wingJoint8.matrix.rotate(15,0,1,0);

  var lowerRightWingConnector = new Cube();
  lowerRightWingConnector.color = V1_BODY3_COLOR;
  lowerRightWingConnector.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWingConnector.matrix.translate(-0.5,0.4,0.35);
  lowerRightWingConnector.matrix.rotate(60,0,0,1);
  lowerRightWingConnector.matrix.scale(0.2,1,0.2);
  lowerRightWingConnector.renderFast();

  var lowerRightWingSheath = new Cube();
  lowerRightWingSheath.color = V1_PLATE_COLOR;
  lowerRightWingSheath.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWingSheath.matrix.translate(-0.8,1,0.35);
  lowerRightWingSheath.matrix.scale(0.3,1.3,0.4);
  lowerRightWingSheath.matrix.rotate(-20,0,0,1);
  lowerRightWingSheath.renderFast();

  var lowerRightWing1 = new Cube();
  lowerRightWing1.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWing1.color = V1_YELLOW;
  lowerRightWing1.matrix.translate(-1.9,2.8,.35);
  lowerRightWing1.matrix.rotate(35,0,0,1);
  lowerRightWing1.matrix.scale(0.4,4,0.2);
  lowerRightWing1.matrix.rotate(7,0,0,1);
  lowerRightWing1.renderFast();

  var lowerRightWing2 = new Cube();
  lowerRightWing2.color = V1_YELLOW;
  lowerRightWing2.matrix = new Matrix4(wingJoint8.matrix);
  lowerRightWing2.matrix.translate(-1.8,2.3,.35);
  lowerRightWing2.matrix.rotate(30,0,0,1);
  lowerRightWing2.matrix.scale(0.4,4.1,0.2);
  lowerRightWing2.matrix.rotate(7,0,0,1);
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
  leftShoulder.matrix.translate(0.35,0.12,0.1);
  leftShoulder.matrix.rotate(g_leftShoulderRotX,1,0,0);
  leftShoulder.matrix.rotate(g_leftShoulderRotY,0,1,0);
  leftShoulder.matrix.rotate(g_leftShoulderRotZ,0,0,1);
  var leftShoulderCoords = new Matrix4(leftShoulder.matrix);
  leftShoulder.matrix.scale(0.12,0.13,0.16);
  leftShoulder.renderFast();

  var leftBicep = new Cube();
  leftBicep.matrix = new Matrix4(leftShoulderCoords);
  leftBicep.color = V1_BODY_COLOR;
  leftBicep.matrix.translate(0,-0.12,0);
  leftBicep.matrix.rotate(-3,1,0,0);
  leftBicep.matrix.scale(0.08,0.2,0.12);
  leftBicep.renderFast();

  var leftElbow = new Cube();
  leftElbow.matrix = new Matrix4(leftShoulderCoords);
  leftElbow.color = V1_PLATE_COLOR;
  leftElbow.matrix.translate(0.0,-0.26,0);
  leftElbow.matrix.rotate(g_leftElbowRot,1,0,0);
  leftElbow.matrix.scale(0.1,0.12,0.1);
  var leftElbowRef = new Matrix4(leftElbow.matrix);
  leftElbow.renderFast();

  var leftForearm = new Cube();
  leftForearm.color = V1_PLATE_COLOR;
  leftForearm.matrix = new Matrix4(leftElbowRef);
  leftForearm.matrix.translate(0,-0.6,0);
  leftForearm.matrix.scale(0.7,2,0.8);
  leftForearm.renderFast();

  var leftWrist = new Cube();
  leftWrist.color = V1_BODY3_COLOR;
  leftWrist.matrix = new Matrix4(leftElbowRef);
  leftWrist.matrix.translate(0,-1.5,0);
  leftWrist.matrix.rotate(g_leftWristRotX,1,0,0);
  leftWrist.matrix.rotate(g_leftWristRotY,0,1,0);
  leftWrist.matrix.rotate(g_leftWristRotZ,0,0,1);
  leftWrist.matrix.scale(0.3,0.6,0.6);
  var leftWristRef = new Matrix4(leftWrist.matrix);
  leftWrist.renderFast();

  var leftPalm = new Cube();
  leftPalm.color = V1_PLATE_COLOR;
  leftPalm.matrix = new Matrix4(leftWristRef);
  leftPalm.matrix.translate(0,-1,0);
  leftPalm.matrix.scale(1.4,1.4,1.4);
  var leftPalmRef = new Matrix4(leftPalm.matrix);
  leftPalm.renderFast();

  var leftFingers = new Cube();
  leftFingers.color = V1_BODY_COLOR
  leftFingers.matrix = new Matrix4(leftPalmRef);
  leftFingers.matrix.translate(0,-0.7,0);
  leftFingers.matrix.scale(0.9,0.8,0.9);
  leftFingers.renderFast();

  var leftThumb = new Cube();
  leftThumb.color = V1_BODY_COLOR
  leftThumb.matrix = new Matrix4(leftPalmRef);
  leftThumb.matrix.translate(0,0,-0.55);
  leftThumb.matrix.rotate(45,1,0,0);
  leftThumb.matrix.scale(0.9,0.8,0.4);
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
  rightShoulder.matrix.translate(-0.1,0.12,0.1);
  rightShoulder.matrix.rotate(g_rightShoulderRotX,1,0,0);
  rightShoulder.matrix.rotate(-g_rightShoulderRotY,0,1,0);
  rightShoulder.matrix.rotate(-g_rightShoulderRotZ,0,0,1);
  var rightShoulderCoords = new Matrix4(rightShoulder.matrix);
  rightShoulder.matrix.scale(0.12,0.13,0.16);
  rightShoulder.renderFast();

  var rightBicep = new Cube();
  rightBicep.matrix = new Matrix4(rightShoulderCoords);
  rightBicep.color = V1_BODY_COLOR;
  rightBicep.matrix.translate(0,-0.12,0);
  rightBicep.matrix.rotate(-3,1,0,0);
  rightBicep.matrix.scale(0.08,0.2,0.12);
  rightBicep.renderFast();

  var rightElbow = new Cube();
  rightElbow.matrix = new Matrix4(rightShoulderCoords);
  rightElbow.color = V1_PLATE_COLOR;
  rightElbow.matrix.translate(0.0,-0.26,0);
  rightElbow.matrix.rotate(g_rightElbowRot,1,0,0);
  rightElbow.matrix.scale(0.1,0.12,0.1);
  var rightElbowRef = new Matrix4(rightElbow.matrix);
  rightElbow.renderFast();

  var rightForearm = new Cube();
  rightForearm.color = V1_PLATE_COLOR;
  rightForearm.matrix = new Matrix4(rightElbowRef);
  rightForearm.matrix.translate(0,-0.6,0);
  rightForearm.matrix.scale(0.7,2,0.8);
  rightForearm.renderFast();

  var rightWrist = new Cube();
  rightWrist.color = V1_BODY3_COLOR;
  rightWrist.matrix = new Matrix4(rightElbowRef);
  rightWrist.matrix.translate(0,-1.5,0);
  rightWrist.matrix.rotate(-g_rightWristRotX,1,0,0);
  rightWrist.matrix.rotate(-g_rightWristRotY,0,1,0);
  rightWrist.matrix.rotate(-g_rightWristRotZ,0,0,1);
  rightWrist.matrix.scale(0.3,0.6,0.6);
  var rightWristRef = new Matrix4(rightWrist.matrix);
  rightWrist.renderFast();

  var rightPalm = new Cube();
  rightPalm.color = V1_PLATE_COLOR;
  rightPalm.matrix = new Matrix4(rightWristRef);
  rightPalm.matrix.translate(0,-1,0);
  rightPalm.matrix.scale(1.4,1.4,1.4);
  var rightPalmRef = new Matrix4(rightPalm.matrix);
  rightPalm.renderFast();

  var rightFingers = new Cube();
  rightFingers.color = V1_BODY_COLOR
  rightFingers.matrix = new Matrix4(rightPalmRef);
  rightFingers.matrix.translate(0,-0.7,0);
  rightFingers.matrix.scale(0.9,0.8,0.9);
  rightFingers.renderFast();

  var rightThumb = new Cube();
  rightThumb.color = V1_BODY_COLOR
  rightThumb.matrix = new Matrix4(rightPalmRef);
  rightThumb.matrix.translate(0,0,-0.55);
  rightThumb.matrix.rotate(45,1,0,0);
  rightThumb.matrix.scale(0.9,0.8,0.4);
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
  pelvis.matrix = new Matrix4(torsoCoords);
  pelvis.matrix.translate(0,-1.1,0);
  pelvis.matrix.scale(1,0.6,1);
  pelvis.renderFast();

  var pelvisLower = new Cube();
  pelvisLower.color = V1_PLATE_COLOR;
  pelvisLower.matrix = new Matrix4(torsoCoords);
  pelvisLower.matrix.translate(0,-1.4,0);
  pelvisLower.matrix.scale(0.5,0.6,0.7);
  var pelvisRef = new Matrix4(pelvisLower.matrix);
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
  leftLegTopJoint.matrix = new Matrix4(pelvisRef);
  leftLegTopJoint.matrix.translate(0.7,-0.3,0);
  leftLegTopJoint.matrix.rotate(g_leftTopLegRotX,1,0,0);
  leftLegTopJoint.matrix.rotate(g_leftTopLegRotY,0,1,0);
  leftLegTopJoint.matrix.rotate(g_leftTopLegRotZ,0,0,1);
  var legJointL1 = leftLegTopJoint.matrix;
  leftLegTopJoint.matrix.scale(0.8,0.8,0.8);
  leftLegTopJoint.renderFast();

  var upperLeftThigh = new Cube();
  upperLeftThigh.color = V1_PLATE_COLOR;
  upperLeftThigh.matrix = new Matrix4(legJointL1);
  upperLeftThigh.matrix.translate(0.2,-1.1,0);
  upperLeftThigh.matrix.rotate(-4,0,0,1);
  upperLeftThigh.matrix.scale(1.3,3,1.5);
  upperLeftThigh.renderFast();

  var lowerLeftThigh = new Cube();
  lowerLeftThigh.color = V1_PLATE_COLOR;
  lowerLeftThigh.matrix = new Matrix4(legJointL1);
  lowerLeftThigh.matrix.translate(0.1,-2.5,0);
  var thighLRef = lowerLeftThigh.matrix;
  lowerLeftThigh.matrix.scale(1,2.5,1.2);
  lowerLeftThigh.renderFast();

  var leftKneeJoint = new Cube();
  leftKneeJoint.color = V1_BODY_COLOR;
  leftKneeJoint.matrix = new Matrix4(thighLRef);
  leftKneeJoint.matrix.translate(-0.1,-0.6,0.1);
  leftKneeJoint.matrix.scale(0.6,0.5,1);
  leftKneeJoint.matrix.rotate(g_leftKneeRot,1,0,0);
  var legJointL2 = leftKneeJoint.matrix;
  leftKneeJoint.renderFast();

  var leftShin = new Cube();
  leftShin.color = V1_PLATE_COLOR;
  leftShin.matrix = new Matrix4(legJointL2);
  leftShin.matrix.translate(0.1,-2,-0.21);
  var leftShinRef = new Matrix4(leftShin.matrix);
  leftShin.matrix.scale(1.5,3.4,0.6);
  leftShin.renderFast();

  var leftCalf = new Cube();
  leftCalf.color = V1_BODY_COLOR;
  leftCalf.matrix = new Matrix4(leftShinRef);
  leftCalf.matrix.translate(0,0.4,0.3);
  leftCalf.matrix.rotate(10,1,0,0);
  leftCalf.matrix.scale(1.2,2,0.8);
  leftCalf.renderFast();

  var leftKneeCap = new Cube();
  leftKneeCap.color = V1_PLATE_COLOR;
  leftKneeCap.matrix = new Matrix4(legJointL2);
  leftKneeCap.matrix.translate(0.1,-0.4,-0.65);
  leftKneeCap.matrix.rotate(-25,1,0,0);
  leftKneeCap.matrix.scale(1.2,1,0.3);
  leftKneeCap.renderFast();

  var leftAnkle = new Cube();
  leftAnkle.color = V1_BODY_COLOR;
  leftAnkle.matrix = new Matrix4(legJointL2);
  leftAnkle.matrix.translate(0.1,-3.8,-0.2);
  leftAnkle.matrix.rotate(g_leftAnkleRot,1,0,0);
  var legJointL3 = leftAnkle.matrix;
  leftAnkle.matrix.scale(1,0.6,0.6);
  leftAnkle.renderFast();

  var leftFoot = new Cube();
  leftFoot.color = V1_PLATE_COLOR;
  leftFoot.matrix = new Matrix4(legJointL3);
  leftFoot.matrix.translate(0,-0.2,-1.4);
  leftFoot.matrix.scale(2,0.8,2.5);
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
  rightLegTopJoint.matrix = new Matrix4(pelvisRef);
  rightLegTopJoint.matrix.translate(-0.7,-0.3,0);
  rightLegTopJoint.matrix.rotate(g_rightTopLegRotX,1,0,0);
  rightLegTopJoint.matrix.rotate(-g_rightTopLegRotY,0,1,0);
  rightLegTopJoint.matrix.rotate(-g_rightTopLegRotZ,0,0,1);
  var legJointR1 = rightLegTopJoint.matrix;
  rightLegTopJoint.matrix.scale(0.8,0.8,0.8);
  rightLegTopJoint.renderFast();

  var upperrightThigh = new Cube();
  upperrightThigh.color = V1_PLATE_COLOR;
  upperrightThigh.matrix = new Matrix4(legJointR1);
  upperrightThigh.matrix.translate(-0.2,-1.1,0);
  upperrightThigh.matrix.rotate(4,0,0,1);
  upperrightThigh.matrix.scale(1.3,3,1.5);
  upperrightThigh.renderFast();

  var lowerrightThigh = new Cube();
  lowerrightThigh.color = V1_PLATE_COLOR;
  lowerrightThigh.matrix = new Matrix4(legJointR1);
  lowerrightThigh.matrix.translate(-0.1,-2.5,0);
  var thighLRef = lowerrightThigh.matrix;
  lowerrightThigh.matrix.rotate(-0,0,0,1);
  lowerrightThigh.matrix.scale(1,2.5,1.2);
  lowerrightThigh.renderFast();

  var rightKneeJoint = new Cube();
  rightKneeJoint.color = V1_BODY_COLOR;
  rightKneeJoint.matrix = new Matrix4(thighLRef);
  rightKneeJoint.matrix.translate(0.1,-0.6,0.1);
  rightKneeJoint.matrix.scale(0.6,0.5,1);
  rightKneeJoint.matrix.rotate(g_rightKneeRot,1,0,0);
  var legJointR2 = rightKneeJoint.matrix;
  rightKneeJoint.renderFast();

  var rightShin = new Cube();
  rightShin.color = V1_PLATE_COLOR;
  rightShin.matrix = new Matrix4(legJointR2);
  rightShin.matrix.translate(-0.1,-2,-0.21);
  var rightShinRef = new Matrix4(rightShin.matrix);
  rightShin.matrix.scale(1.5,3.4,0.6);
  rightShin.renderFast();

  var rightCalf = new Cube();
  rightCalf.color = V1_BODY_COLOR;
  rightCalf.matrix = new Matrix4(rightShinRef);
  rightCalf.matrix.translate(0,0.4,0.3);
  rightCalf.matrix.rotate(10,1,0,0);
  rightCalf.matrix.scale(1.2,2,0.8);
  rightCalf.renderFast();

  var rightKneeCap = new Cube();
  rightKneeCap.color = V1_PLATE_COLOR;
  rightKneeCap.matrix = new Matrix4(legJointR2);
  rightKneeCap.matrix.translate(-0.1,-0.4,-0.65);
  rightKneeCap.matrix.rotate(-25,1,0,0);
  rightKneeCap.matrix.scale(1.2,1,0.3);
  rightKneeCap.renderFast();

  var rightAnkle = new Cube();
  rightAnkle.color = V1_BODY_COLOR;
  rightAnkle.matrix = new Matrix4(legJointR2);
  rightAnkle.matrix.translate(-0.1,-3.8,-0.2);
  rightAnkle.matrix.rotate(g_rightAnkleRot,1,0,0);
  var legJointR3 = rightAnkle.matrix;
  rightAnkle.matrix.scale(1,0.6,0.6);
  rightAnkle.renderFast();

  var rightFoot = new Cube();
  rightFoot.color = V1_PLATE_COLOR;
  rightFoot.matrix = new Matrix4(legJointR3);
  rightFoot.matrix.translate(0,-0.2,-1.4);
  rightFoot.matrix.scale(2,0.8,2.5);
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
  headWire.matrix = bodyCoords;
  headWire.matrix.translate(0.105,0.34,0.13);
  var headWireCoords = new Matrix4(headWire.matrix);
  headWire.matrix.rotate(130,1,0,0);
  headWire.matrix.scale(0.04,0.04,0.23);
  headWire.renderFast();

  // head
  var head = new Cube();
  head.color = V1_BODY_COLOR;
  head.matrix = headWireCoords;
  head.matrix.translate(0.02, 0.02, -0.07);
  head.matrix.rotate(g_headRotX,1,0,0);
  head.matrix.rotate(g_headRotY,0,1,0);
  head.matrix.scale(0.17,0.17,0.23);
  var headRef = new Matrix4(head.matrix);
  head.renderFast();

  // head trims
  var headTopRight = new Cube();
  headTopRight.color = V1_PLATE_COLOR;
  headTopRight.matrix = new Matrix4(headRef);
  headTopRight.matrix.translate(0.6,0.2,0);
  headTopRight.matrix.rotate(10,0,0,1);
  headTopRight.matrix.scale(0.3,0.8,1.4);
  headTopRight.renderFast();

  var headTopLeft = new Cube();
  headTopLeft.color = V1_PLATE_COLOR;
  headTopLeft.matrix = new Matrix4(headRef);
  headTopLeft.matrix.translate(-0.6,0.2,0);
  headTopLeft.matrix.rotate(-10,0,0,1);
  headTopLeft.matrix.scale(0.3,0.8,1.4);
  headTopLeft.renderFast();

  var headBottomRight = new Cube();
  headBottomRight.color = V1_PLATE_COLOR;
  headBottomRight.matrix = new Matrix4(headRef);
  headBottomRight.matrix.translate(0.6,-0.2,0);
  headBottomRight.matrix.rotate(-10,0,0,1);
  headBottomRight.matrix.scale(0.3,0.8,1.2);
  headBottomRight.renderFast();

  var headBottomLeft = new Cube();
  headBottomLeft.color = V1_PLATE_COLOR;
  headBottomLeft.matrix = new Matrix4(headRef);
  headBottomLeft.matrix.translate(-0.6,-0.2,0);
  headBottomLeft.matrix.rotate(10,0,0,1);
  headBottomLeft.matrix.scale(0.3,0.8,1.2);
  headBottomLeft.renderFast();

  // head light
  var light = new Cube();
  light.color = V1_YELLOW;
  light.matrix = new Matrix4(headRef);
  light.matrix.translate(0,0,-0.3);
  light.matrix.scale(0.6,0.6,0.6);
  light.renderFast();

  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration)/10, "performance");
}