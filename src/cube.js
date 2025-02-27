class Cube {
  constructor() {
    this.type = 'cube';
  //   this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
  //   this.size = 5.0;
  //   this.segments = 10;
  this.matrix = new Matrix4();
  this.normalMatrix = new Matrix4();
  this.textureNum = -2;
  }

  render() {
    // var xy = this.position;
    var rgba = this.color;
    // var size = this.size;

    // pass the texture number
    gl.uniform1i(u_whichTexture, this.textureNum);

    // pass the matrix to u_ModelMatrix attribute
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // front of cube
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     0.5,0.5,-0.5,      0.5,-0.5,-0.5], [0,0,     1,1,     1,0], [0,0,-1,  0,0,-1,   0,0,-1]);
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     -0.5,0.5,-0.5,      0.5,0.5,-0.5], [0,0,     0,1,     1,1], [0,0,-1,  0,0,-1,   0,0,-1]);

    // back of cube
    drawTriangle3DUVNormal([-0.5,-0.5,0.5,     0.5,0.5,0.5,      0.5,-0.5,0.5], [0,0,     1,1,     1,0], [0,0,1,   0,0,1,  0,0,1]);
    drawTriangle3DUVNormal([-0.5,-0.5,0.5,     -0.5,0.5,0.5,      0.5,0.5,0.5], [0,0,     0,1,     1,1], [0,0,1,   0,0,1,  0,0,1]);

    // top of cube
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     -0.5,0.5,0.5,      0.5,0.5,0.5], [0,0,     0,1,     1,1], [0,1,0,  0,1,0,  0,1,0]);
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     0.5,0.5,0.5,      0.5,0.5,-0.5], [0,0,     1,1,     1,0], [0,1,0,  0,1,0,  0,1,0]);

    // bottom of cube
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     -0.5,-0.5,0.5,      0.5,-0.5,0.5], [0,0,     0,1,     1,1], [0,-1,0,  0,-1,0,  0,-1,0]);
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     0.5,-0.5,0.5,      0.5,-0.5,-0.5], [0,0,     1,1,     1,0], [0,-1,0,  0,-1,0,  0,-1,0]);

    // left of cube
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     -0.5,0.5,0.5,      -0.5,-0.5,0.5], [0,0,     1,0,     1,1], [-1,0,0,  -1,0,0,  -1,0,0]);
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     -0.5,-0.5,0.5,      -0.5,-0.5,-0.5], [0,0,     1,1,     0,1], [-1,0,0,  -1,0,0,  -1,0,0]);

    // right of cube
    drawTriangle3DUVNormal([0.5,0.5,0.5,     0.5,-0.5,-0.5,      0.5,-0.5,0.5], [0,0,     1,0,     1,1], [1,0,0,  1,0,0,  1,0,0]);
    drawTriangle3DUVNormal([0.5,0.5,0.5,     0.5,0.5,-0.5,      0.5,-0.5,-0.5], [0,0,     1,1,     0,1], [1,0,0,  1,0,0,  1,0,0]);
  }

  renderFast() {
    var rgba = this.color;

    gl.uniform1i(u_whichTexture, this.textureNum);

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the matrix to u_ModelMatrix attribute
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // pass normal matrix
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

    var allverts = [];
    var allUVs = [];
    var allNormals = [];

    allverts = allverts.concat([-0.5,-0.5,-0.5,     0.5,0.5,-0.5,      0.5,-0.5,-0.5]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,0,-1,  0,0,-1,   0,0,-1]);
    allverts = allverts.concat([-0.5,-0.5,-0.5,     -0.5,0.5,-0.5,      0.5,0.5,-0.5]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,0,-1,  0,0,-1,   0,0,-1]);

    allverts = allverts.concat([-0.5,-0.5,0.5,     0.5,0.5,0.5,      0.5,-0.5,0.5]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,0,1,   0,0,1,  0,0,1]);
    allverts = allverts.concat([-0.5,-0.5,0.5,     -0.5,0.5,0.5,      0.5,0.5,0.5]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,0,1,   0,0,1,  0,0,1]);

    allverts = allverts.concat([-0.5,0.5,-0.5,     -0.5,0.5,0.5,      0.5,0.5,0.5]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,1,0,  0,1,0,  0,1,0]);
    allverts = allverts.concat([-0.5,0.5,-0.5,     0.5,0.5,0.5,      0.5,0.5,-0.5]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,1,0,  0,1,0,  0,1,0]);

    allverts = allverts.concat([-0.5,-0.5,-0.5,     -0.5,-0.5,0.5,      0.5,-0.5,0.5]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,-1,0,  0,-1,0,  0,-1,0]);
    allverts = allverts.concat([-0.5,-0.5,-0.5,     0.5,-0.5,0.5,      0.5,-0.5,-0.5]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,-1,0,  0,-1,0,  0,-1,0]);

    allverts = allverts.concat([-0.5,0.5,-0.5,     -0.5,0.5,0.5,      -0.5,-0.5,0.5]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([-1,0,0,  -1,0,0,  -1,0,0]);
    allverts = allverts.concat([-0.5,0.5,-0.5,     -0.5,-0.5,0.5,      -0.5,-0.5,-0.5]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([-1,0,0,  -1,0,0,  -1,0,0]);

    allverts = allverts.concat([0.5,0.5,0.5,     0.5,-0.5,-0.5,      0.5,-0.5,0.5]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([1,0,0,  1,0,0,  1,0,0]);
    allverts = allverts.concat([0.5,0.5,0.5,     0.5,0.5,-0.5,      0.5,-0.5,-0.5]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([1,0,0,  1,0,0,  1,0,0]);

    drawTriangle3DUVNormal(allverts, allUVs, allNormals);
  }
}

class Cube2 {
  constructor() {
    this.type = 'cube';
  //   this.position = [0.-0.5, 0.-0.5, 0.0];
    this.color = [1.-0.5, 1.-0.5, 1.-0.5, 1.0];
  //   this.size = 5.0;
  //   this.segments = 10;
  this.matrix = new Matrix4();
  this.normalMatrix = new Matrix4();
  this.textureNum = -2;
  }

  render() {
    // var xy = this.position;
    var rgba = this.color;
    // var size = this.size;

    // pass the texture number
    gl.uniform1i(u_whichTexture, this.textureNum);

    // pass the matrix to u_ModelMatrix attribute
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // front of cube
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     0.5,0.5,-0.5,      0.5,-0.5,-0.5], [0,0,     1,1,     1,0], [0,0,-1,  0,0,-1,   0,0,-1]);
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     -0.5,0.5,-0.5,      0.5,0.5,-0.5], [0,0,     0,1,     1,1], [0,0,-1,  0,0,-1,   0,0,-1]);

    // back of cube
    drawTriangle3DUVNormal([-0.5,-0.5,0.5,     0.5,0.5,0.5,      0.5,-0.5,0.5], [0,0,     1,1,     1,0], [0,0,1,   0,0,1,  0,0,1]);
    drawTriangle3DUVNormal([-0.5,-0.5,0.5,     -0.5,0.5,0.5,      0.5,0.5,0.5], [0,0,     0,1,     1,1], [0,0,1,   0,0,1,  0,0,1]);

    // top of cube
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     -0.5,0.5,0.5,      0.5,0.5,0.5], [0,0,     0,1,     1,1], [0,1,0,  0,1,0,  0,1,0]);
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     0.5,0.5,0.5,      0.5,0.5,-0.5], [0,0,     1,1,     1,0], [0,1,0,  0,1,0,  0,1,0]);

    // bottom of cube
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     -0.5,-0.5,0.5,      0.5,-0.5,0.5], [0,0,     0,1,     1,1], [0,-1,0,  0,-1,0,  0,-1,0]);
    drawTriangle3DUVNormal([-0.5,-0.5,-0.5,     0.5,-0.5,0.5,      0.5,-0.5,-0.5], [0,0,     1,1,     1,0], [0,-1,0,  0,-1,0,  0,-1,0]);

    // left of cube
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     -0.5,0.5,0.5,      -0.5,-0.5,0.5], [0,0,     1,0,     1,1], [-1,0,0,  -1,0,0,  -1,0,0]);
    drawTriangle3DUVNormal([-0.5,0.5,-0.5,     -0.5,-0.5,0.5,      -0.5,-0.5,-0.5], [0,0,     1,1,     0,1], [-1,0,0,  -1,0,0,  -1,0,0]);

    // right of cube
    drawTriangle3DUVNormal([0.5,0.5,0.5,     0.5,-0.5,-0.5,      0.5,-0.5,0.5], [0,0,     1,0,     1,1], [1,0,0,  1,0,0,  1,0,0]);
    drawTriangle3DUVNormal([0.5,0.5,0.5,     0.5,0.5,-0.5,      0.5,-0.5,-0.5], [0,0,     1,1,     0,1], [1,0,0,  1,0,0,  1,0,0]);
  }

  renderFast() {
    var rgba = this.color;

    gl.uniform1i(u_whichTexture, this.textureNum);

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the matrix to u_ModelMatrix attribute
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var allverts = [];
    var allUVs = [];
    var allNormals = [];

    allverts = allverts.concat([0,0,0,   1,1,0,   1,0,0]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,0,-1,  0,0,-1,   0,0,-1]);
    allverts = allverts.concat([0,0,0,   0,1,0,   1,1,0]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,0,-1,  0,0,-1,   0,0,-1]);

    allverts = allverts.concat([0,0,1,   1,1,1,   1,0,1]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,0,1,   0,0,1,  0,0,1]);
    allverts = allverts.concat([0,0,1,   0,1,1,   1,1,1]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,0,1,   0,0,1,  0,0,1]);

    allverts = allverts.concat([0,1,0,   0,1,1,   1,1,1]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,1,0,  0,1,0,  0,1,0]);
    allverts = allverts.concat([0,1,0,   1,1,1,   1,1,0]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,1,0,  0,1,0,  0,1,0]);

    allverts = allverts.concat([0,0,0,   0,0,1,   1,0,1]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([0,-1,0,  0,-1,0,  0,-1,0]);
    allverts = allverts.concat([0,0,0,   1,0,1,   1,0,0]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([0,-1,0,  0,-1,0,  0,-1,0]);

    allverts = allverts.concat([0,0,0,   0,1,0,   0,1,1]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([-1,0,0,  -1,0,0,  -1,0,0]);
    allverts = allverts.concat([0,0,0,   0,1,1,   0,0,1]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([-1,0,0,  -1,0,0,  -1,0,0]);

    allverts = allverts.concat([1,0,0,   1,1,0,   1,1,1]);
    allUVs = allUVs.concat([0,0,   0,1,   1,1]);
    allNormals = allNormals.concat([1,0,0,  1,0,0,  1,0,0]);
    allverts = allverts.concat([1,0,0,   1,1,1,   1,0,1]);
    allUVs = allUVs.concat([0,0,   1,1,   1,0]);
    allNormals = allNormals.concat([1,0,0,  1,0,0,  1,0,0]);

    drawTriangle3DUVNormal(allverts, allUVs, allNormals);
  }

  clear() {
    drawTriangle3DUVNormal([], [], []);
  }
}