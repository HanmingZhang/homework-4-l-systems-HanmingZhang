import {vec3, mat3} from 'gl-matrix';

const Deg2Rad = 0.017453292519943295769236907684886;

class Turtle
{
    pos: vec3;
    up: vec3;
    forward: vec3;
    left: vec3;

    constructor(_pos: vec3 = vec3.fromValues(.0, .0, .0),
                _up:  vec3 = vec3.fromValues(.0, 1., .0), 
                _forward: vec3 = vec3.fromValues(.0, .0, 1.),
                _left: vec3 = vec3.fromValues(1., .0, .0)) 
    {   
        this.pos = vec3.fromValues(_pos[0], _pos[1], _pos[2]);

        this.up  = vec3.fromValues(_up[0], _up[1], _up[2]);

        this.forward = vec3.fromValues(_forward[0], _forward[1], _forward[2]);

        this.left = vec3.fromValues(_left[0], _left[1], _left[2]);
    }


    moveForward(distance: number){
        let tmp = vec3.create();
        vec3.multiply(tmp, [distance, distance, distance], this.forward);  
        vec3.add(this.pos, this.pos, tmp);
    }

    applyUpRot(degrees: number){
        let world2local = mat3.fromValues(this.left[0], this.left[1], this.left[2],
                                          this.up[0], this.up[1], this.up[2],
                                          this.forward[0], this.forward[1], this.forward[2]);
        let rad = Deg2Rad * degrees;
        
        let tmpForward = vec3.create();
        vec3.rotateY(tmpForward, vec3.fromValues(.0, .0, 1.), vec3.fromValues(.0, .0, .0), rad);
        vec3.transformMat3(this.forward, tmpForward, world2local);
        
        let tmpLeft = vec3.create();
        vec3.rotateY(tmpLeft, vec3.fromValues(1., .0, .0), vec3.fromValues(.0, .0, .0), rad);
        vec3.transformMat3(this.left, tmpLeft, world2local);
    }

    applyLeftRot(degrees: number){
        let world2local = mat3.fromValues(this.left[0], this.left[1], this.left[2],
                                          this.up[0], this.up[1], this.up[2],
                                          this.forward[0], this.forward[1], this.forward[2]);
        let rad = Deg2Rad * degrees;
                                          
        let tmpForward = vec3.create();
        vec3.rotateX(tmpForward, vec3.fromValues(.0, .0, 1.), vec3.fromValues(.0, .0, .0), rad);
        vec3.transformMat3(this.forward, tmpForward, world2local);

        let tmpUp = vec3.create();
        vec3.rotateX(tmpUp, vec3.fromValues(.0, 1., .0), vec3.fromValues(.0, .0, .0), rad);
        vec3.transformMat3(this.up, tmpUp, world2local);
    }

    applyForwardRot(degrees: number){
        let world2local = mat3.fromValues(this.left[0], this.left[1], this.left[2],
                                          this.up[0], this.up[1], this.up[2],
                                          this.forward[0], this.forward[1], this.forward[2]);
        let rad = Deg2Rad * degrees;
                                         
        let tmpUp = vec3.create();
        vec3.rotateZ(tmpUp, vec3.fromValues(.0, 1., .0), vec3.fromValues(.0, .0, .0), rad);
        vec3.transformMat3(this.up, tmpUp, world2local);

        let tmpLeft = vec3.create();
        vec3.rotateZ(tmpLeft, vec3.fromValues(1., .0, .0), vec3.fromValues(.0, .0, .0), rad);
        vec3.transformMat3(this.left, tmpLeft, world2local);
    }

    
};


export default Turtle;