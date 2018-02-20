import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Mesh extends Drawable {
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  
  constructor() {
    super(); // Call the constructor of the super class. This is required.
    // this.center = vec4.fromValues(center[0], center[1], center[2], 1);
    
  }

  create(){

  }

  createMesh(idx: Array<number>, pos: Array<number>, nor: Array<number>) {

    //console.log(pos);

    this.indices = new Uint32Array(idx);
    this.normals = new Float32Array(nor);
    this.positions = new Float32Array(pos);
    //console.log(this.normals);
    

    this.generateIdx();
    this.generatePos();
    this.generateNor();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    console.log(`Created Mesh`);
  }
};

export default Mesh;
