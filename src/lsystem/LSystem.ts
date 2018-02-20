import Turtle from './Turtle';
import {vec3, vec4} from 'gl-matrix';

export interface Geometry {
    pos: vec3;
    geom: string;
};


export interface Branch {
    startPos: vec3;
    endPos:   vec3;
}

export class LSystem
{
    // rules are stored here
    productions: Map<string, string[]>;
    // result after each iteration
    iterations: Array<string> = [];
    // current stirng interperation result
    current: string = "";

    mDfltAngle: number = 45.0; // default value
    mDfltStep: number = 1.0;   // default value
    mGrammar: string = "";

    // outputs
    branches: Array<Branch> = [];
    geoms: Array<Geometry> = [];

    constructor(){
        // initialize map
        this.productions = new Map();
    }

    loadProgram(rules: Array<string>){
        this.reset();

        console.log('this is rules input');
        console.log(rules);

        for(var rule of rules){
            this.addProduction(rule);
        }
    }

    setDefaultAngle(degrees: number){
        this.mDfltAngle = degrees;
    }

    setDefaultStep(distance: number){
        this.mDfltStep = distance;
    }
    
    // Iterate grammar
    getIteration(n: number): string {
        if (n >= this.iterations.length)
        {
            for (let i = this.iterations.length; i <= n; i++)
            {
                this.current = this.iterate(this.current);
                this.iterations.push(this.current);
            }        
        }
        return this.iterations[n];
    }

    iterate(input: string): string {
        var output = "";
        for (let i = 0; i < input.length; i++)
        {
            let sym: string = input.substr(i,1);

            // TODO : randomly select an kind of interperation
            // now, we just select the first one
            let next;
            if(this.productions.has(sym)){
                var selectedIdx = Math.floor(this.productions.get(sym).length * Math.random());
                next = this.productions.get(sym)[selectedIdx];
            }
            else{
                next = sym;
            }
            output = output + next;
        }
        return output;
    }

    // All rule and axiom should be added through this
    addProduction(line: string){

        let index;
        
        // 1. Strip whitespace
        line = line.replace(/ /g, '');
        if (line.length == 0) return;
    
        // 2. Split productions
        index = line.indexOf("->");
        if (index != -1)
        {
            let symFrom = line.substr(0, index);
            let symTo = line.substr(index+2);

            // if it's empty, initialize it
            if(!this.productions.has(symFrom)){
                this.productions.set(symFrom, []);                
            }

            this.productions.get(symFrom).push(symTo);
        }
        else  // assume its the start sym
        {
            this.current = line;
            this.iterations.push(line);
        }
    }

    reset(){
        this.current = "";
        this.iterations = [];
        this.productions.clear();
    }

    // process and generate outputs
    // input is iteration number
    process(n: number) {

        // intialize arrays
        this.branches = [];
        this.geoms = [];

        var turtle = new Turtle();

        var stack: Array<Turtle> = [];
    
        var insn = this.getIteration(n);

        console.log('this is the result string');
        console.log(insn);

        for (let i = 0; i < insn.length; i++)
        {
            let sym = insn.substr(i,1);
            if (sym == "F")
            {   
                let start = vec3.fromValues(turtle.pos[0], turtle.pos[1], turtle.pos[2]);

                turtle.moveForward(this.mDfltStep);

                this.branches.push({startPos: start, 
                                    endPos: vec3.fromValues(turtle.pos[0], turtle.pos[1], turtle.pos[2])});
            }
            else if (sym == "f")
            {
                turtle.moveForward(this.mDfltStep);
            }
            else if (sym == "+")
            {
                turtle.applyUpRot(this.mDfltAngle);
            }
            else if (sym == "-")
            {   
                turtle.applyUpRot(-this.mDfltAngle);                
            }
            else if (sym == "&")
            {
                turtle.applyLeftRot(this.mDfltAngle);
            }
            else if (sym == "^")
            {
                turtle.applyLeftRot(-this.mDfltAngle);
            }
            else if (sym == "\\")
            {
                turtle.applyForwardRot(this.mDfltAngle);
            }
            else if (sym == "/")
            {
                turtle.applyForwardRot(-this.mDfltAngle);
            }
            else if (sym == "|")
            {
                turtle.applyUpRot(180.0);
            }
            else if (sym == "[")
            {   
                let tmpTurtle = new Turtle(turtle.pos, turtle.up, turtle.forward, turtle.left);

                stack.push(tmpTurtle);
            }
            else if (sym == "]")
            {   
                // return the last element and pop
                let tmpTurtle = stack.pop();
                turtle.pos[0] = tmpTurtle.pos[0];
                turtle.pos[1] = tmpTurtle.pos[1];
                turtle.pos[2] = tmpTurtle.pos[2];
                
                turtle.forward[0] = tmpTurtle.forward[0];
                turtle.forward[1] = tmpTurtle.forward[1];
                turtle.forward[2] = tmpTurtle.forward[2];

                turtle.left[0] = tmpTurtle.left[0];
                turtle.left[1] = tmpTurtle.left[1];
                turtle.left[2] = tmpTurtle.left[2];

                turtle.up[0] = tmpTurtle.up[0];
                turtle.up[1] = tmpTurtle.up[1];
                turtle.up[2] = tmpTurtle.up[2];
            }
            else
            {
                this.geoms.push({pos: vec3.fromValues(turtle.pos[0], turtle.pos[1], turtle.pos[2]), geom: sym});
            }
        }
    } 

    // result will only exist 
    // after call process() func
    getGeometry(): Array<Geometry> {
        return this.geoms;
    }
    
    getBranches(): Array<Branch> {
        return this.branches;
    }


};
