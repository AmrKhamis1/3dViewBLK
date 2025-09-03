export default /* glsl */ `
uniform sampler2D uEnvMapOld; // equirectangular or baked to 2D
uniform sampler2D uEnvMapNew;
uniform float uMix;          // 0 = fully old, 1 = fully new

uniform vec3 uPanoPos;
uniform vec3 uPanoPos2;

uniform vec4 uPanoQuat;
uniform vec4 uPanoQuat2;

varying vec3 vWorldPos;

vec3 quatRotate(vec3 v, vec4 q) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

// direction → equirectangular uv
vec2 dirToEquirectUv(vec3 dir) {
    dir = normalize(dir);
    // Use convention that +Z is forward, +X is right; flip X to match standard pano layout
    float yaw = atan(dir.z, -dir.x);
    float pitch = asin(clamp(dir.y, -1.0, 1.0));
    float u = (yaw / (2.0 * 3.14159265358979323846)) + 0.5; // [-pi,pi] -> [0,1]
    float v = 0.5 - (pitch / 3.14159265358979323846);       // [-pi/2,pi/2] -> [0,1]
    return vec2(u, v);
}

void main() {
    vec3 dirOld = normalize(vWorldPos - uPanoPos );
    vec3 dirNew = normalize(vWorldPos - uPanoPos2);

    dirOld = quatRotate(dirOld, uPanoQuat);
    dirNew = quatRotate(dirNew, uPanoQuat2);

    vec2 uvOld = dirToEquirectUv(dirOld);
    vec2 uvNew = dirToEquirectUv(dirNew);

    vec3 colorOld = texture2D(uEnvMapOld, uvOld).rgb;
    vec3 colorNew = texture2D(uEnvMapNew, uvNew).rgb;

    gl_FragColor = vec4(mix(colorOld, colorNew, uMix), 1.0);
}
`;
