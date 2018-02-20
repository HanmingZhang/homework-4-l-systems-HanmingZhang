import {vec2, vec3, vec4, mat3, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import Mesh from './geometry/Mesh'
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import * as OBJLoader from 'obj-mtl-loader';
import Turtle from './lsystem/Turtle';
import {LSystem, Geometry, Branch} from './lsystem/LSystem';

const invPi = 0.3183099;
const Pi    = 3.1415926;

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  step: 2.0,
  angle: 22.5,
  iteration: 7,
  DarkScene: true,
  BranchColor: [200.0, 150.0, 120.0],
  FlowerColor: [222.0, 140.0, 178.0],
  'Camera Info': printCameraInfo, // function pointer
};

// Camera
const camera = new Camera(vec3.fromValues(0, 49, 41), vec3.fromValues(0, 48, -8));

function printCameraInfo(){
  console.log(camera.controls.eye);
  console.log(camera.controls.center);
}

// Scene components
let icosphere: Icosphere;
let square: Square;
let cube : Cube;

// Obj Mesh
let mergedBranchMesh: Mesh;
let mergedLeafMesh: Mesh;
let fallingLeafMesh: Mesh;

interface faceInfo{
  indices: Array<number>;
  texture: Array<number>;
  normal:  Array<number>;
};


// ----------------------------------------------
// ------------ Falling Leaves ------------------
// ----------------------------------------------
let motionMatrics: mat4[];

let motionPosInit: vec3[];
let motionPos: vec3[];
let motionVel: vec3[];


const leafCountInAir = 12;

function initMotionMat(){
    motionMatrics = [];

    motionPosInit = [];
    motionPos = [];
    motionVel = [];


    // Pos
    motionPosInit.push(vec3.fromValues(-35.0, 75.0, 0.0));
    motionPosInit.push(vec3.fromValues(-15.0, 35.0, 15.0));
    motionPosInit.push(vec3.fromValues(-20.0, 20, -12.0));
    motionPosInit.push(vec3.fromValues(-5.0, 77.0, 8.0));
    motionPosInit.push(vec3.fromValues(1.5, 66.0, 20.0));
    motionPosInit.push(vec3.fromValues(-8, 35.0, -6.0));
    motionPosInit.push(vec3.fromValues(-17.0, 40.0,-20.0));
    motionPosInit.push(vec3.fromValues(-25, 35.0, 11.0));
    motionPosInit.push(vec3.fromValues(-8, 35.0, -10.0));
    motionPosInit.push(vec3.fromValues(-12, 35.0, 4.0));
    motionPosInit.push(vec3.fromValues(-30, 35.0, 7.0));
    motionPosInit.push(vec3.fromValues(-17, 35.0, -4.0));

    for(let i = 0; i < leafCountInAir; i++){
      motionPos.push(vec3.fromValues(motionPosInit[i][0], motionPosInit[i][1], motionPosInit[i][2]));
    }

    // Vel
    for(let i = 0; i < leafCountInAir; i++){
      motionVel.push(vec3.fromValues(0.015 * Math.random(), -0.018 * (Math.random() + 0.3) , 0.009 * Math.random()));
    }

    // Rot

    // Rot Vel

    // form matrices
    for(let i = 0; i < leafCountInAir; i++){
      let tmpMat = mat4.create();
      mat4.fromTranslation(tmpMat, motionPos[i]);
      motionMatrics.push(tmpMat);
    }
}

function updateMotionMat(deltaTime: number){

  for(let i = 0; i < leafCountInAir; i++){
    // update position
    motionPos[i][0] +=  motionVel[i][0] * deltaTime;
    motionPos[i][1] +=  motionVel[i][1] * deltaTime;
    motionPos[i][2] +=  motionVel[i][2] * deltaTime;
    
    // form matrix
    mat4.fromTranslation(motionMatrics[i], motionPos[i]);
    
    // check boundary
    if(motionPos[i][1] < 1.0){
      // recover pos
      motionPos[i][0] = motionPosInit[i][0];
      motionPos[i][1] = 75.0;
      motionPos[i][2] = motionPosInit[i][2];
      
      // new random pos
      motionVel[i][0] = 0.015 * Math.random();
      motionVel[i][1] = -0.018 * (Math.random() + 0.3);
      motionVel[i][2] = 0.008 * Math.random()
    }
  }
}


function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, 5.0);
  icosphere.create();

  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();

  cube = new Cube(vec3.fromValues(0, 0, 0));
  cube.create();


  // initialize Meshes
  mergedBranchMesh = new Mesh();
  mergedLeafMesh   = new Mesh();
  fallingLeafMesh  = new Mesh();
}

function clamp(a: number, b: number, x: number): number {
  let result;
  result = Math.max(a, Math.min(b, x));
  return result;
}

// ----------------------------------------------
// ------------- Mesh Loading  ------------------
// ----------------------------------------------

// generate branch VBO 
function GenerateMergedBranchMesh(branches: Branch[]){
  // these are data to be pushed to VBO
  var indices: number[] = [];
  var nor: number[] = [];
  var pos: number[] = [];

  var objMtlLoader = new OBJLoader();
  objMtlLoader.load("./obj/cylinder.obj", function(err : any, result: any) {
    if(err){
      /*Handle error here*/
      console.log("Obj Loader Error");
    }
    var branchVertices = result.vertices;
    var branchFaces = result.faces;
    var branchNormals = result.normals;

    // add branches info 
    for(let i = 0; i < branches.length; i++){
      
      // -----------------------------------------------------------
      // ------------------ transform part -------------------------
      // -----------------------------------------------------------

      let forward = vec3.create();
      vec3.subtract(forward, branches[i].endPos, branches[i].startPos);
    
      let s = vec3.length(forward);
    
      vec3.normalize(forward, forward);
    
      let left = vec3.create();
      vec3.cross(left, vec3.fromValues(0.0, 1.0, 0.0), forward);
    
      let up = vec3.create();
    
      if (vec3.length(left) < 0.0001)
      {   
          vec3.cross(up, forward, vec3.fromValues(0.0, 0.0, 1.0));
          vec3.cross(left, up, forward);
      }
      else
      { 
          vec3.cross(up, forward, left);
      }
    
      vec3.normalize(left, left);
      vec3.normalize(up, up);
    
      // This is column-major
      // default forward : (0, 0, 1)
      //         up      : (0, 1, 0)
      //         left    : (1, 0, 0)
      let world2local = mat3.fromValues(left[0], left[1], left[2],
                                        up[0], up[1], up[2],
                                        forward[0], forward[1], forward[2]);
      // -----------------------------------------------------------
      
      // to shrink branch radius
      let branchHeight = branches[i].startPos[2];
      let baseHeight = 0.0;
      let shrinkStep = 4.5; // how long should I shrink branch
      let shrinkRate = 0.08; // how much should I shrink each time
      let shrinkResult = 1.0 - clamp(0.0, 0.96, shrinkRate * (branchHeight - baseHeight)/shrinkStep);

      let indexOffset = indices.length;
      
      // add vbo for each branch
      for (var _i = 0; _i < branchFaces.length; _i++) {
          // index
          indices.push(indexOffset + 3 * _i + 0);
          indices.push(indexOffset + 3 * _i + 1);
          indices.push(indexOffset + 3 * _i + 2);

          // position
          let vertexIdx = branchFaces[_i].indices;
          for(let j = 0; j < 3; j++){

            var tmpPos = vec3.fromValues(branchVertices[vertexIdx[j]- 1][0], branchVertices[vertexIdx[j]- 1][1], branchVertices[vertexIdx[j]- 1][2]);
            
            // transform pos according to this branch
            tmpPos[2] = tmpPos[2] * s; // scale in the forward(z component) direction
            // higher -> thiner
            tmpPos[0] = tmpPos[0] * shrinkResult;
            tmpPos[1] = tmpPos[1] * shrinkResult;

            vec3.transformMat3(tmpPos, tmpPos, world2local);
            vec3.add(tmpPos, tmpPos, branches[i].startPos);

            pos.push(tmpPos[0]); // x
            pos.push(tmpPos[1]); // y
            pos.push(tmpPos[2]); // z
            pos.push(1.);        // w
          }

          // normal
          let normalIdx = branchFaces[_i].normal;
          for(let j = 0; j < 3; j++){

            var tmpNor = vec3.fromValues(branchNormals[normalIdx[j]- 1][0], branchNormals[normalIdx[j]- 1][1], branchNormals[normalIdx[j]- 1][2]);

            // transform normal according to this branch
            vec3.transformMat3(tmpNor, tmpNor, world2local);

            nor.push(tmpNor[0]); // x
            nor.push(tmpNor[1]); // y
            nor.push(tmpNor[2]); // z
            nor.push(.0);        // w
          }
      }
    }

    // create mergedBranchMesh
    mergedBranchMesh.createMesh(indices, pos, nor);
  });
}



// generate leaves VBO 
function GenerateMergedLeavesMesh(geos: Geometry[]){
  // this should be an independent mesh with independent shader
  // add geos(fruit, follower, leaves, ... etc)
  // these are data to be pushed to VBO
  var indices: number[] = [];
  var nor: number[] = [];
  var pos: number[] = [];

  var objMtlLoader = new OBJLoader();
  objMtlLoader.load("./obj/flower.obj", function(err : any, result: any) {
    if(err){
      /*Handle error here*/
      console.log("Obj Loader Error");
    }
    var leafVertices = result.vertices;
    var leafFaces = result.faces;
    var leafNormals = result.normals;

    // add branches info 
    for(let i = 0; i < geos.length; i++){

      // make sure this string represents a leaf
      // if(geos[i].geom != "X"){
	  if(geos[i].geom != "!"){
        continue;
      }

      // Randomly skip some leaf
      var randomNumberBetween0and100 = Math.floor(Math.random() * 100);
      if(randomNumberBetween0and100 >= 8){
        continue;
      }

      // ranndomly rotate
      let identityMatrix = mat4.create();
      mat4.identity(identityMatrix);
      let rotX = mat4.create();
      mat4.rotateX(rotX, identityMatrix, Math.random() * Pi);
      let rotY = mat4.create();
      mat4.rotateY(rotY, identityMatrix, Math.random() * Pi);
      let rot = mat4.create();
      mat4.multiply(rot, rotX, rotY);

      let indexOffset = indices.length;
      
      // add vbo for each branch
      for (var _i = 0; _i < leafFaces.length; _i++) {
          // index
          indices.push(indexOffset + 3 * _i + 0);
          indices.push(indexOffset + 3 * _i + 1);
          indices.push(indexOffset + 3 * _i + 2);

          
          // position
          let vertexIdx = leafFaces[_i].indices;
          for(let j = 0; j < 3; j++){

            let tmpPos = vec4.fromValues(leafVertices[vertexIdx[j]- 1][0], leafVertices[vertexIdx[j]- 1][1], leafVertices[vertexIdx[j]- 1][2], 1.0);

            //randomly transform position
            vec4.transformMat4(tmpPos, tmpPos, rot);

            // move it to position
            tmpPos[0] += geos[i].pos[0];
            tmpPos[1] += geos[i].pos[1];
            tmpPos[2] += geos[i].pos[2];

            pos.push(tmpPos[0]); // x
            pos.push(tmpPos[1]); // y
            pos.push(tmpPos[2]); // z
            pos.push(1.);        // w
          }

          // normal
          let normalIdx = leafFaces[_i].normal;
          for(let j = 0; j < 3; j++){

            var tmpNor = vec4.fromValues(leafNormals[normalIdx[j]- 1][0], leafNormals[normalIdx[j]- 1][1], leafNormals[normalIdx[j]- 1][2], 0.0);

            // randomly transform normal
            vec4.transformMat4(tmpNor, tmpNor, rot);

            nor.push(tmpNor[0]); // x
            nor.push(tmpNor[1]); // y
            nor.push(tmpNor[2]); // z
            nor.push(.0);        // w
          }
      }
    }

    // create mergedLeafMesh
    mergedLeafMesh.createMesh(indices, pos, nor);
  });
}

// generate falling leaves VBO 
function GenerateFallingLeavesMesh(){
  // this should be an independent mesh with independent shader
  // add geos(fruit, follower, leaves, ... etc)
  // these are data to be pushed to VBO
  var indices: number[] = [];
  var nor: number[] = [];
  var pos: number[] = [];

  var objMtlLoader = new OBJLoader();
  objMtlLoader.load("./obj/flowerPetal.obj", function(err : any, result: any) {
    if(err){
      /*Handle error here*/
      console.log("Obj Loader Error");
    }
    var leafVertices = result.vertices;
    var leafFaces = result.faces;
    var leafNormals = result.normals;

    // add vbo for each branch
    for (var _i = 0; _i < leafFaces.length; _i++) {
        // index
        indices.push(3 * _i + 0);
        indices.push(3 * _i + 1);
        indices.push(3 * _i + 2);

        
        // position
        let vertexIdx = leafFaces[_i].indices;
        for(let j = 0; j < 3; j++){

          let tmpPos = vec4.fromValues(leafVertices[vertexIdx[j]- 1][0], leafVertices[vertexIdx[j]- 1][1], leafVertices[vertexIdx[j]- 1][2], 1.0);

          pos.push(tmpPos[0]); // x
          pos.push(tmpPos[1]); // y
          pos.push(tmpPos[2]); // z
          pos.push(1.);        // w
        }

        // normal
        let normalIdx = leafFaces[_i].normal;
        for(let j = 0; j < 3; j++){

          var tmpNor = vec4.fromValues(leafNormals[normalIdx[j]- 1][0], leafNormals[normalIdx[j]- 1][1], leafNormals[normalIdx[j]- 1][2], 0.0);

          nor.push(tmpNor[0]); // x
          nor.push(tmpNor[1]); // y
          nor.push(tmpNor[2]); // z
          nor.push(.0);        // w
        }
    }
    
    // create fallingLeafMesh
    fallingLeafMesh.createMesh(indices, pos, nor);
  });
}


function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  // Add controls to the gui
  const gui = new DAT.GUI();

 
  // Open GL Renderer
  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(169.0 / 255.0, 217.0 / 255.0, 198.0 / 255.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  // enable transparent
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


  // setup lambert shader
  const lambertBranch = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);
  lambertBranch.setGeometryColor(vec4.fromValues(200.0 / 255.0, 150.0 / 255.0, 120.0 / 255.0, 1.0));
  
  // setup lambert shader
  const lambertLeaf = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);
  lambertLeaf.setGeometryColor(vec4.fromValues(222.0 / 255.0, 140.0 / 255.0, 178.0 / 255.0, 1.0));

  // setup background shader
  const background = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/background.vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/background.frag.glsl')),
  ]);
  background.setDimensions(vec2.fromValues(1.0, 1.0));
  background.setResolution(window.innerWidth, window.innerHeight);


  // --------------------------------------------
  // LSystem 
  var system = new LSystem();

  // initialize rules
  // the first element must be the axiom

  // This is Rule 1
  // var rules = ['X', ' X -> F[-X]F[-X]+F[X]', 'F -> FF',];

  // This is Rule 2
  // var rules = ['R', 'R -> FA', 'A -> [&FLA]/////[&FLA]///////[&FLA]', 'F -> S/////F', 'F -> LS//L//F','S -> FL', 'L -> [∧∧X]'];  
  var rules = ['R', 'R -> FA', 'A -> [&FL!A]/////[&FL!A]///////[&FL!A]', 'F -> S/////F', 'F -> LS//L//F', 'S -> FL', 'L -> [∧∧{-f+f+f-|-f+f+f}]'];

  // This is Rule 3
  // var rules = ['A', 
  //              'A -> B+[A+E]--//[--D]B[++D]-[AE]++AE',
  //              'B -> FC[//&&D][//^^D]FC',
  //              'C -> CFC',
  //              'D -> [X]',
  //              'E -> [&&&G/H////H////H////H////H]',
  //              'G -> FF',
  //              'H -> [^F][Y]'];
  
  system.loadProgram(rules);

  // for Rule 1
  // set data and generate mesh
  // system.setDefaultStep(1.0);
  // system.setDefaultAngle(30.0);
  // system.process(2);

  // for Rule 2
  system.setDefaultStep(2.0);
  system.setDefaultAngle(22.5);
  system.process(7);

  // for Rule 3
  // system.setDefaultStep(2.0);
  // system.setDefaultAngle(18);
  // system.process(5);

  let geos = system.getGeometry();
  let branches = system.getBranches();


  // ----------------------------------------------
  // Process geos and branches from lsystem
  GenerateMergedBranchMesh(branches);
  GenerateMergedLeavesMesh(geos);
  GenerateFallingLeavesMesh();

  // GUI function
  function updateScene(){
    system.setDefaultStep(controls.step);
    system.setDefaultAngle(controls.angle);
    system.process(controls.iteration);
    
    let geos = system.getGeometry();
    let branches = system.getBranches();

    GenerateMergedBranchMesh(branches);
    GenerateMergedLeavesMesh(geos);    
  }

  
  function setDarkScene(){
    background.setDarkScene(controls.DarkScene);
    lambertBranch.setDarkScene(controls.DarkScene);
    lambertLeaf.setDarkScene(controls.DarkScene);
  }

  function setColor(){
    lambertBranch.setGeometryColor(vec4.fromValues(controls.BranchColor[0] / 255.0, controls.BranchColor[1] / 255.0, controls.BranchColor[2] / 255.0, 1.0));
    lambertLeaf.setGeometryColor(vec4.fromValues(controls.FlowerColor[0] / 255.0, controls.FlowerColor[1] / 255.0, controls.FlowerColor[2] / 255.0, 1.0));    
  }


  // GUI
  gui.add(controls, 'step', 1.0, 6.0).step(1.0).onChange(updateScene);
  gui.add(controls, 'angle', 10.0, 90.0).step(5.0).onChange(updateScene);
  gui.add(controls, 'iteration', 1, 8).step(1).onChange(updateScene);
  gui.add(controls, 'DarkScene').onChange(setDarkScene);
  gui.addColor(controls, 'FlowerColor').onChange(setColor);
  gui.addColor(controls, 'BranchColor').onChange(setColor);
  gui.add(controls, 'Camera Info');

  setColor();
  setDarkScene();

  // initial fall petals motion matrics
  initMotionMat();

  // set up a timer
  var prevTime = Date.now();
  var timer = 0.0;

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    renderer.clear();
    
    // set uniforms
    timer += 1.0;
    if(timer > 10000.0){
      timer -= 10000.0;
    }
    background.setTimer(timer);

    // scene lamber shader
    // branches
    let branchesModelRot = mat4.create();
    mat4.fromXRotation(branchesModelRot, -0.5 * 3.1415926);
    renderer.render(camera, lambertBranch, [
      mergedBranchMesh,
    ], branchesModelRot);

    // leaves
    renderer.render(camera, lambertLeaf, [
      mergedLeafMesh,
    ], branchesModelRot);


    // // ground
    // let groundModelRot = mat4.create();
    // mat4.fromXRotation(groundModelRot, -0.5 * 3.1415926);
    // let groundModelScale = mat4.create();
    // mat4.fromScaling(groundModelScale, vec3.fromValues(100.0, 100.0, 1.0));
    // let groundModel = mat4.create();
    // mat4.multiply(groundModel, groundModelRot, groundModelScale);
    // renderer.render(camera, lambert, [
    //   square,
    // ], groundModel);

    
    // background
    var speed = 2.0;
    let bgModel = mat4.create();
    mat4.identity(bgModel);
    renderer.render(camera, background, [
      square,
    ], bgModel);

    // falling petals
    updateMotionMat(Date.now() - prevTime);    
    for(let i = 0; i < leafCountInAir; i++){
      renderer.render(camera, lambertLeaf, [
        fallingLeafMesh,
      ], motionMatrics[i]);
    }

    prevTime = Date.now();

    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();

    background.setResolution(window.innerWidth, window.innerHeight);
    
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
