import * as THREE from "three";
// api: {x, y, z} → {x, z, -y}
export function convertPosition(apiVec) {
  return new THREE.Vector3(apiVec.x, apiVec.z, -apiVec.y);
}

// rotate basis change
export function convertRotation(apiQuat) {
  // apiQuat is {w, x, y, z}  (CloudCompare style)
  const q = new THREE.Quaternion(apiQuat.w, apiQuat.x, apiQuat.y, apiQuat.z);

  // --- coordinate system adjustments ---

  // rotate from Matterport "z-up" → Three.js "y-up"
  const zUpToYUp = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0, Math.PI * 1.5, "XYZ") // -90° around X
  );

  // flip handedness (right-handed → left-handed)
  const flipHandedness = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 0),
    Math.PI
  );

  // combine transforms
  q.premultiply(zUpToYUp).premultiply(flipHandedness).normalize();

  // return in Three.js-friendly format (x,y,z,w)
  return { x: q.x, y: q.z, z: q.y, w: q.w };
}
