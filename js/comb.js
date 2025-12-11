
function logMessage(msg) {
  const logBox = document.getElementById('log-box');
  const entry = document.createElement('div');
  entry.textContent = msg;
  logBox.appendChild(entry);
}

// Shared geometry/material creation
function createCylinder(texture) {
  const geometry = new THREE.CylinderGeometry(0.24, 0.24, 0.8, 64);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

function createInfoPanel() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = '96px Arial';
  ctx.fillText('Product Info: -196 Grapefruit', 80, 400);
  ctx.fillText('Tasting notes: Crisp, citrusy finish', 80, 500);
  ctx.fillText('Nick’s Recommendation: Strawberry — he LOVES it', 80, 600);

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  const geometry = new THREE.PlaneGeometry(1.2, 0.6);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    roughness: 0.8,
  });
  const panel = new THREE.Mesh(geometry, material);
  panel.frustumCulled = false;
  return panel;
}

// --- MindAR Mode ---
document.getElementById('start-mindar').addEventListener('click', async () => {
  logMessage("Starting MindAR...");
  const mindarThree = new window.MINDAR.IMAGE.MindARThree({
    container: document.querySelector("#mindar-container"),
    imageTargetSrc: "./assets/targets.mind",
  });

  const { renderer, scene, camera } = mindarThree;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(0.5, 1, 0.8);
  scene.add(ambientLight, dirLight);

  const anchor = mindarThree.addAnchor(0);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('./assets/alt-can-label.png', (texture) => {
    texture.encoding = THREE.sRGBEncoding;
    const cylinder = createCylinder(texture);
    const panel = createInfoPanel();
    panel.position.set(0, 0.8, -0.4);
    anchor.group.add(cylinder);
    anchor.group.add(panel);

    renderer.setAnimationLoop(() => {
      cylinder.rotation.y += 0.01;
      renderer.render(scene, camera);
    });
  });

  await mindarThree.start();
  logMessage("MindAR started successfully.");
});

// --- WebXR Mode ---
document.getElementById('start-webxr').addEventListener('click', async () => {
  logMessage("Starting WebXR Surface Detection...");
  if (!navigator.xr) {
    logMessage("WebXR not supported on this device.");
    return;
  }

  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'local-floor']
  });

  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.xr.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.querySelector("#mindar-container").appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(0.5, 1, 0.8);
  scene.add(ambientLight, dirLight);

  const textureLoader = new THREE.TextureLoader();
  const cylinder = await new Promise((resolve) => {
    textureLoader.load('./assets/alt-can-label.png', (texture) => {
      texture.encoding = THREE.sRGBEncoding;
      resolve(createCylinder(texture));
    });
  });
  const panel = createInfoPanel();
  panel.position.set(0, 0.8, -0.4);
  scene.add(cylinder);
  scene.add(panel);
  cylinder.visible = false;
  panel.visible = false;

  const referenceSpace = await session.requestReferenceSpace('local');
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  renderer.xr.setSession(session);

  renderer.setAnimationLoop((time, frame) => {
    if (frame) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hitPose = hitTestResults[0].getPose(referenceSpace);
        cylinder.visible = true;
        panel.visible = true;
        cylinder.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
        panel.position.set(hitPose.transform.position.x, hitPose.transform.position.y + 0.8, hitPose.transform.position.z - 0.4);
      }
    }
    renderer.render(scene, camera);
  });

  logMessage("WebXR AR session started.");
});
