import { useState, useEffect, useRef, useCallback } from "react";
import getApiData from "./services/APIFetch";
import { convertPosition, convertRotation } from "./utils/MatterToThree";
import * as THREE from "three";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import RoomPoints from "./components/RoomPoints";
import Camera from "./components/Camera";
import "./App.css";
import ProjectedPanoMesh from "./components/ProjectedPanoMesh";
import LoaderManager from "./components/LoaderManager";
import useTextureCache from "./hooks/useTextureCache";
import MatterTag from "./components/MatterTag";
import DamModel from "./components/Dam";
import HoverCursor from "./components/HoverCursor";
// import ModelNode from "./components/ModelNode";
function App() {
  const [error, setError] = useState(null);
  const [panos, setPanos] = useState([]);
  const [activePanos, setActivePanos] = useState([]);
  const [activeRoom, setActiveRoom] = useState(0);
  const [animationLoading, setAnimationLoading] = useState(false);

  const [activePosition, setActivePosition] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  const [activeRotation, setActiveRotation] = useState({
    x: 0,
    y: 0,
    z: 0,
    w: 1,
  });
  const [animateTOO, setAnimateTOO] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  const sceneRef = useRef();
  const [allAssets, setAllAssets] = useState([]);
  const texture = useLoader(THREE.TextureLoader, "/images/point.png");
  useEffect(() => {
    console.log("panos updated:", panos);
  }, [panos]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getApiData();
        // New API: array of records: { name, image, pos[3], rot_quat[4] }
        const panoData = (Array.isArray(data) ? data : []).map((rec, idx) => {
          const apiPos = {
            x: rec.pos?.[0] ?? 0,
            y: rec.pos?.[1] ?? 0,
            z: rec.pos?.[2] ?? 0,
          };
          const apiQuat = {
            x: rec.rot_quat?.[0] ?? 0,
            y: rec.rot_quat?.[1] ?? 0,
            z: rec.rot_quat?.[2] ?? 0,
            w: rec.rot_quat?.[3] ?? 1,
          };

          return {
            position: convertPosition(apiPos),
            rotation: convertRotation(apiQuat),
            panos: [rec.image?.startsWith("/") ? rec.image : `/${rec.image}`],
            index: idx,
          };
        });

        setPanos(panoData);
        if (panoData.length > 0) {
          setAnimationLoading(true);
          setActivePanos(panoData[0].panos);
          setActivePosition(panoData[0].position);
          setActiveRotation(panoData[0].rotation);
          setAnimateTOO(panoData[0].position);
        }
      } catch (err) {
        setError(err.message);
        console.log(error);
      }
    };

    fetchData();
  }, []);

  //  all heavy assets (images and models) to preload
  useEffect(() => {
    // wait for panos to be loaded from api
    if (!panos.length) return;
    // collect all unique image URLs and model URLs
    const panoImages = panos.flatMap((p) => p.panos || []);
    const modelUrls = ["/models/Model.glb"];
    const all = Array.from(new Set([...panoImages, ...modelUrls]));
    setAllAssets(all);
  }, [panos]);

  //  cache hook to preload all assets
  const {
    isLoading,
    progress,
    error: cacheError,
    assets,
    get,
  } = useTextureCache(allAssets);

  const handleRoomSelect = useCallback(
    (roomIndex) => {
      if (roomIndex === activeRoom || animationLoading === true) return;
      panos.map((pan) => {
        if (pan.index === roomIndex) {
          if (!animationLoading) {
            setAnimationLoading(true);
            setActiveRotation(pan.rotation);
            setActivePosition(pan.position);
            setActivePanos(pan.panos);
            setAnimateTOO(pan.position);
          }
        } else {
          return;
        }
      });

      setActiveRoom(roomIndex);
    },
    [activeRoom, animationLoading]
  );

  return (
    <>
      <LoaderManager isLoading={isLoading} progress={progress} />

      <Canvas
        camera={{
          position: [0, 2, 8],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        onCreated={({ scene }) => {
          THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
          scene.up.set(0, 0, 1);
        }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
          outputEncoding: THREE.sRGBEncoding,
        }}
        style={{
          width: "100vw",
          height: "100vh",
          background: "linear-gradient(to bottom, #1a1a2e, #16213e)",
        }}
      >
        <Camera animateTo={animateTOO}></Camera>

        <ambientLight intensity={2} />
        <primitive object={new THREE.AxesHelper(35)} />
        <group ref={sceneRef}>
          {panos.map((pan) => (
            <>
              <RoomPoints
                key={pan.index}
                pos={pan.position}
                isActive={pan.index === activeRoom}
                isClicked={pan.index === activeRoom}
                onClick={() => {
                  handleRoomSelect(pan.index);
                }}
              />
            </>
          ))}
          {/* <Model></Model> */}

          {/* <Grid position={[0, 0, 0]} args={[30.5, 30.5]}></Grid> */}
        </group>
        {/* <DamModel />{" " } */}
        <ProjectedPanoMesh
          modelUrl="/models/model3.glb"
          cubeFaces={activePanos}
          mpQuaternion={activeRotation}
          faceOrder={[2, 4, 0, 5, 1, 3]}
          scale={[1, 1, 1]}
          panoPosition={[activePosition.x, activePosition.y, activePosition.z]}
          textureCache={get}
          updateAnimation={setAnimationLoading}
        />
        {/* Simple model renderer */}
        {/* <ModelNode modelUrl="/models/Model.glb" /> */}
        <MatterTag
          position={[5.365654531141063, 1.6400552468899843, 2.3959047743518265]}
          label="Savant Controls® | Smart Home Technology"
          description="Door locks, Shades, HVAC controls, and more controlled by user-friendly Savant technology."
          color="#03687d"
        />
        <HoverCursor
          texturePath="/images/point.png"
          size={0.4}
          roomPoints={panos.map((p) => ({
            index: p.index,
            position: p.position,
          }))}
          onSelectRoom={handleRoomSelect}
          currentPosition={activePosition}
          currentRoomIndex={activeRoom}
        />
      </Canvas>
    </>
  );
}

export default App;
