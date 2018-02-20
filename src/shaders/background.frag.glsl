#version 300 es
precision highp float;

uniform float u_Width;
uniform float u_Height;
uniform float u_Time;
uniform int u_DarkScene;

out vec4 out_Col;


// -------------------------------------------------------------------------------
// control range of SSS
// .3 - exaggerated / realistic for a small object
// .05 - realistic for human-scale (I think)
#define TRANSMISSION_RANGE .15
	
// consts
const float PI = 3.1415926;

// globals
vec3 envBrightness = vec3(1);
const vec3 darkEnvBrightness = vec3(.02,.03,.05);


vec4 noise_gen2(vec2 v){

	return vec4(fract(sin(dot(v, vec2(12.9898, 78.2333))) * 43758.5453),
				fract(sin(dot(v, vec2(21.4682, 32.4583))) * 22675.3125),
				fract(sin(dot(v, vec2(13.3321, 44.1201))) * 67512.2214),
				fract(sin(dot(v, vec2(45.2168, 84.2146))) * 44122.1267));
}


vec3 Sky( vec3 ray )
{
	return envBrightness * mix( vec3(.8), vec3(0), exp2(-(1.0/max(ray.y,.01))*vec3(.4,.6,1.0)) );
}


// Camera
vec3 Ray( float zoom, vec2 fragCoord )
{	
	vec2 iResolution = vec2(u_Width, u_Height);
	return vec3( fragCoord.xy-iResolution.xy*.5, iResolution.x*zoom );
}

vec3 Rotate( inout vec3 v, vec2 a )
{
	vec4 cs = vec4( cos(a.x), sin(a.x), cos(a.y), sin(a.y) );
	
	v.yz = v.yz*cs.x+v.zy*cs.y*vec2(-1,1);
	v.xz = v.xz*cs.z+v.zx*cs.w*vec2(1,-1);
	
	vec3 p;
	p.xz = vec2( -cs.w, -cs.z )*cs.x;
	p.y = cs.y;
	
	return p;
}




vec3 LensFlare( vec3 ray, vec3 lightCol, vec3 light, float lightVisible, float sky, vec2 fragCoord )
{
	vec2 dirtuv = fragCoord.xy/u_Width;
	
	float dirt = 1.0-noise_gen2(dirtuv).r;

	float l = (dot(light,ray)*.5+.5);
	
	return (
			((pow(l,30.0)+.05)*dirt*.1
			+ 1.0*pow(l,200.0))*lightVisible + sky*1.0*pow(l,5000.0)
		   )*lightCol
		   + 5.0*pow(smoothstep(.9999,1.0,l),20.0) * lightVisible * normalize(lightCol);
}


float SmoothMax( float a, float b, float smoothing )
{
	return a-sqrt(smoothing*smoothing+pow(max(.0,a-b),2.0));
}

// Analytically integrating quadratically decaying participating media within a sphere. 
// No raymarching involved.
//
// Related info: http://iquilezles.org/www/articles/spherefunctions/spherefunctions.htm
//-------------------------------------------------------------------------------------------
// sphere related functions
//-------------------------------------------------------------------------------------------
float sphDensity( vec3  ro, vec3  rd,   // ray origin, ray direction
                  vec3  sc, float sr,   // sphere center, sphere radius
                  float dbuffer )       // depth buffer
{
    // normalize the problem to the canonical sphere
    float ndbuffer = dbuffer / sr;
    vec3  rc = (ro - sc)/sr;
	
    // find intersection with sphere
    float b = dot(rd,rc);
    float c = dot(rc,rc) - 1.0;
    float h = b*b - c;

    // not intersecting
    if( h<0.0 ) return 0.0;
	
    h = sqrt( h );
    
    //return h*h*h;

    float t1 = -b - h;
    float t2 = -b + h;

    // not visible (behind camera or behind ndbuffer)
    if( t2<0.0 || t1>ndbuffer ) return 0.0;

    // clip integration segment from camera to ndbuffer
    t1 = max( t1, 0.0 );
    t2 = min( t2, ndbuffer );

    // analytical integration of an inverse squared density
    float i1 = -(c*t1 + b*t1*t1 + t1*t1*t1/3.0);
    float i2 = -(c*t2 + b*t2*t2 + t2*t2*t2/3.0);
    return (i2-i1)*(3.0/4.0);
}
//=====================================================


void main()
{

    if (u_DarkScene > 0){
	 	envBrightness = darkEnvBrightness;
	}

	float zoom = 0.7;
	vec3 ray = Ray(zoom, gl_FragCoord.xy);

	ray = normalize(ray);
	vec3 localRay = ray;

    float T = 14.0;

	vec3 pos = 3.0 * Rotate(ray, vec2(.2, 0.0 - T) + vec2(-.2,-3.15));

	vec3 col;

	col = Sky( ray );

	vec3 lightCol1 = vec3(1.1, 1, .9) * 1.4 * envBrightness;
    // vec3 lightCol2 = vec3( .8,.4, .2) * 2.0;
    // float lightRange2 = .4; // distance of intensity = 1.0
	
	vec3 lightDir1 = normalize(vec3(3,1,-2));

		// vec3 lightDir2 = lightPos-pos;
		// float lightIntensity2 = length(lightDir2);
		// lightDir2 /= lightIntensity2;
		// lightIntensity2 = lightRange2/(.1+lightIntensity2*lightIntensity2);

		// lens flare
		// float s1 = TraceMin( pos, lightDir1, .5, 40.0 );
		// float s2 = TraceMin( pos, lightDir2, .5, length(lightPos-pos) );
        float s1 = 35.0;
        //float s2 = 5.0 * sin(u_Time) + 5.0;
		col += LensFlare( ray, lightCol1, lightDir1, smoothstep(.01,.1,s1), 1.0, gl_FragCoord.xy );
		//col += LensFlare( ray, lightCol2*lightIntensity2, lightDir2, smoothstep(.01,.1,s2), 1.0,gl_FragCoord.xy );
	
		// vignetting:
		col *= smoothstep( .7, .0, dot(localRay.xy,localRay.xy) );
	
		// compress bright colours, ( because bloom vanishes in vignette )
		vec3 c = (col-1.0);
		c = sqrt(c*c+.05); // soft abs
		col = mix(col,1.0-c,.48); // .5 = never saturate, .0 = linear
		
		// grain
		vec2 grainuv = gl_FragCoord.xy + floor(u_Time*60.0)*vec2(37,41);
		vec2 filmNoise = noise_gen2(.5*grainuv/vec2(u_Width, u_Height)).rb;

		col *= mix( vec3(1), mix(vec3(1,.5,0),vec3(0,.5,1),filmNoise.x), .1*filmNoise.y );
	
	
	// compress bright colours
	float l = max(col.x,max(col.y,col.z));//dot(col,normalize(vec3(2,4,1)));
	l = max(l,.01); // prevent div by zero, darker colours will have no curve
	float l2 = SmoothMax(l,1.0,.01);
	col *= l2/l;
	
	col = pow(col,vec3(1.0/2.2));


	if (u_DarkScene > 0){
		// ---------------------------------------------
		// sphere fog density
		vec2 p = (2.0*gl_FragCoord.xy-vec2(u_Width, u_Height)) / u_Height;
		vec3 ro = vec3(0.0, 0.2, 3.0 );
		vec3 rd = normalize( vec3(p,-3.0) );
		
		// sphere
		vec4 sph1 = vec4(cos(0.011 * u_Time * vec3(1.0,1.1,1.3)) * vec3(0.8,0.1,0.3) + vec3(0.0,0.2,0.5), .05);
		vec4 sph2 = vec4(-sin(0.01 * u_Time * vec3(1.0,1.1,1.3)) * vec3(-0.5,0.3,0.5) + vec3(-0.5,0.1,0.6), .075);
		vec4 sph3 = vec4(2.0 * sin(0.012 * u_Time * vec3(-0.7,0.5,0.33)) * vec3(0.3,-0.08,0.16) + vec3(-0.1,0.3,0.5), .04);
		vec4 sph4 = vec4(sin(0.014 * u_Time * vec3(0.4, 0.6, -0.3)) * vec3(0.5,-0.06,0.1) + vec3(0.5,0.1,-0.6), .07);
		vec4 sph5 = vec4(sin(0.013 * u_Time * vec3(-0.35, -0.26, -0.3)) * vec3(0.7,-0.2,0.21) + vec3(0.25,0.15,-0.4), .06);
		vec4 sph6 = vec4(sin(0.0115 * u_Time * vec3(-0.2, 0.45, -0.18)) * vec3(-0.45,-0.3,0.4) + vec3(0.35,0.22,-0.4), .06);

		float h1 = sphDensity(ro, rd, sph1.xyz, sph1.w, 1000.0 );
		float h2 = sphDensity(ro, rd, sph2.xyz, sph2.w, 1000.0 );
		float h3 = sphDensity(ro, rd, sph3.xyz, sph3.w, 1000.0 );
		float h4 = sphDensity(ro, rd, sph4.xyz, sph4.w, 1000.0 );
		float h5 = sphDensity(ro, rd, sph5.xyz, sph5.w, 1000.0 );
		float h6 = sphDensity(ro, rd, sph6.xyz, sph6.w, 1000.0 );

		float h = max(h1, max(h2,max(h3, max(h4, max(h5, h6)))));
		if( h>0.0 )
		{
			col = mix( col, vec3(0.2,0.5,1.0), pow(h, 25.0) );
			col = mix( col, 1.15*vec3(1.0,0.9,0.6), pow(h, 80.0));
		}
		//col = sqrt( col );
	}

	out_Col = vec4(col, 1);
}
