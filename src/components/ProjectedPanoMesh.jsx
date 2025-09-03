import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import gsap from "gsap";
import panoVertex from "../shaders/panoMesh/panoMeshVertex.glsl.js";
import panoFragment from "../shaders/panoMesh/panoMeshFragment.glsl.js";

export default function ProjectedPanoMesh({
  modelUrl = "./models/ss2.glb",
  cubeFaces,
  panoPosition = null,
  mpQuaternion = null,
  faceOrder = [2, 4, 0, 5, 1, 3],
  updateAnimation,
  onMeshClick, // new prop
}) {
  const groupRef = useRef();
  const { nodes, scene } = useGLTF(modelUrl);
  // store current uniforms outside useMemo
  const materialRef = useRef();
  // if 6 faces, reorder; if single image (equirectangular), just pass through
  const panoInputs = useMemo(() => {
    if (!Array.isArray(cubeFaces)) return [];
    if (cubeFaces.length === 1) return cubeFaces; // equirectangular
    return faceOrder.map((i) => cubeFaces[i]); // legacy cubemap ordering
  }, [cubeFaces, faceOrder]);

  // init material with dummy textures
  const material = useMemo(() => {
    const dummy = new THREE.Texture();
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uEnvMapOld: { value: dummy },
        uEnvMapNew: { value: dummy },
        uMix: { value: 0 },
        uPanoPos: { value: new THREE.Vector3() },
        uPanoPos2: { value: new THREE.Vector3() },
        uPanoQuat: { value: new THREE.Quaternion() },
        uPanoQuat2: {
          value: new THREE.Quaternion(),
        },
      },
      vertexShader: panoVertex,
      fragmentShader: panoFragment,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  // load the first pano on mount
  useEffect(() => {
    if (!panoInputs || panoInputs.length === 0) return;
    const loader = new THREE.TextureLoader();
    loader.load(panoInputs[0], (tex) => {
      tex.flipY = false; // equirect on custom shader uses GL coords
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipMapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.encoding = THREE.sRGBEncoding;
      materialRef.current.uniforms.uEnvMapOld.value = tex;
    });
  }, []);

  // whenever pano inputs change → fade transition
  useEffect(() => {
    if (!materialRef.current || !panoInputs || panoInputs.length === 0) return;

    const uniforms = materialRef.current.uniforms;

    const onTextureReady = (tex) => {
      tex.flipY = true;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipMapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.encoding = THREE.sRGBEncoding;

      uniforms.uEnvMapNew.value = tex;
      const q = new THREE.Quaternion(
        mpQuaternion?.x ?? 0,
        mpQuaternion?.y ?? 0,
        mpQuaternion?.z ?? 0,
        mpQuaternion?.w ?? 1
      );
      uniforms.uPanoQuat2.value.copy(q);
      const p = Array.isArray(panoPosition)
        ? new THREE.Vector3(
            panoPosition[0] ?? 0,
            panoPosition[1] ?? 0,
            panoPosition[2] ?? 0
          )
        : panoPosition || new THREE.Vector3();
      uniforms.uPanoPos2.value.copy(p);
      gsap.killTweensOf(uniforms.uMix);

      gsap.to(uniforms.uMix, {
        value: 1,
        duration: 1.3,
        ease: "power2.inOut",
        onInterrupt: () => {
          uniforms.uMix.value = 0;
        },
        onComplete: () => {
          uniforms.uEnvMapOld.value = uniforms.uEnvMapNew.value;
          uniforms.uPanoPos.value.copy(uniforms.uPanoPos2.value);
          uniforms.uPanoQuat.value.copy(uniforms.uPanoQuat2.value);
          uniforms.uMix.value = 0;
          updateAnimation(false);
        },
      });
    };

    const loader = new THREE.TextureLoader();
    loader.load(panoInputs[0], onTextureReady);
  }, [panoInputs, mpQuaternion, panoPosition]);

  return (
    <group
      ref={groupRef}
      scale={scene?.scale}
      position={scene?.position}
      rotation={scene?.rotation}
    >
      <mesh material={material} position={panoPosition}>
        <sphereGeometry args={[20, 15, 15]}></sphereGeometry>
      </mesh>
      {Object.entries(nodes).map(([key, node]) =>
        node?.isMesh ? (
          <mesh
            key={key}
            geometry={node.geometry}
            material={material}
            position={[node.position.x, node.position.y, -node.position.z]}
            rotation={node.rotation}
            scale={node.scale}
            frustumCulled={false}
          />
        ) : null
      )}
    </group>
  );
}
