
// --- Minimal, self-contained WebXR Surface Detection demo ---


const container = document.querySelector('#mindar-container'); // reuse your container

function log(msg) {
  const box = document.getElementById('log-box');
  if (!box) return;
  const div = document.createElement('div');
  div.textContent = msg;
  box.appendChild(div);
}

// Create a simple circular reticle (hit marker)
function createReticle() {
  const ringGeo = new THREE.RingGeometry(0.08, 0.1, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);

  const dotGeo = new THREE.CircleGeometry(0.01, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.set(0, 0.001, 0); // tiny lift to avoid z-fighting

  const reticle = new THREE.Group();
  reticle.add(ring);
  reticle.add(dot);

  reticle.rotation.x = -Math.PI / 2; // lay flat on plane
  reticle.visible = false;
  return reticle;
}

function createCylinderWithTexture(texture) {
  texture.encoding = THREE.sRGBEncoding;
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

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.font = '96px Arial';
  ctx.fillText('Product Info: -196 Grapefruit', 80, 400);
  ctx.fillText('Tasting notes: Crisp, citrusy finish', 80, 500);
  ctx.fillText('Nick’s Recommendation: Strawberry — he LOVES it', 80, 600);

  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;

  const geo = new THREE.PlaneGeometry(1.2, 0.6);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    side: THREE.DoubleSide,
    transparent: true,
    roughness: 0.8,
    metalness: 0.0,
  });
  const panel = new THREE.Mesh(geo, mat);
  panel.frustumCulled = false;
  return panel;
}

async function startWebXRViewerDemo() {
  try {
    if (!navigator.xr) {
      log('navigator.xr not available — WebXR unsupported on this UA.');
      return;
    }

    // Request AR session with hit-test
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local-floor'], // if local-floor fails, try ['hit-test','local']
    });

    // Three.js renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.xr.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(0.5, 1, 0.8);
    scene.add(ambient, dir);

    // Reticle (hit marker)
    const reticle = createReticle();
    scene.add(reticle);

    // Load cylinder texture
    const textureLoader = new THREE.TextureLoader();
    const labelTexture = await new Promise((resolve, reject) => {
      textureLoader.load('./assets/can-label.png', resolve, undefined, reject);
    });

    // Placeable objects
    const cylinder = createCylinderWithTexture(labelTexture);
    const panel = createInfoPanel();
    panel.position.set(0, 0.8, -0.4);
    cylinder.visible = false;
    panel.visible = false;
    scene.add(cylinder, panel);

    // Reference spaces
    const referenceSpace = await session.requestReferenceSpace('local'); // fallback: 'local'
    const viewerSpace = await session.requestReferenceSpace('viewer');
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

    // Resize handler
    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // Attach session to renderer
    renderer.xr.setSession(session);

    // Place object on tap if reticle is visible
    const handleSelect = () => {
      if (!reticle.visible) {
        log('Select pressed but no hit — move device over a textured surface.');
        return;
      }
      cylinder.position.copy(reticle.position);
      cylinder.visible = true;

      panel.position.set(reticle.position.x, reticle.position.y + 0.8, reticle.position.z - 0.4);
      panel.visible = true;
      log('Placed cylinder & panel at reticle.');
    };
    session.addEventListener('select', handleSelect);

    // Render loop with hit-testing
    renderer.setAnimationLoop((time, frame) => {
      if (!frame) {
        renderer.render(scene, camera);
        return;
      }
      const hits = frame.getHitTestResults(hitTestSource);
      if (hits.length > 0) {
        const hit = hits[0];
        const pose = hit.getPose(referenceSpace);
        if (pose) {
          reticle.visible = true;
          reticle.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);

          // Align reticle with plane orientation (optional but useful)
          const q = pose.transform.orientation;
          reticle.quaternion.set(q.x, q.y, q.z, q.w);
          // Flatten the reticle to lie on the plane
          reticle.rotation.x = -Math.PI / 2;

          // Debug logs occasionally (throttle)
          if (Math.floor(time) % 2 === 0) {
            log(`Hit detected @ (${reticle.position.x.toFixed(2)}, ${reticle.position.y.toFixed(2)}, ${reticle.position.z.toFixed(2)})`);
          }
        } else {
          reticle.visible = false;
        }
      } else {
        reticle.visible = false;
      }

      renderer.render(scene, camera);
    });

    log('WebXR Viewer AR session started. Move device over a textured, well-lit surface.');
  } catch (err) {
    log(`WebXR start error: ${err.message}`);
  }
}

// Call this from your "Start Surface AR" button
// document.getElementById('start-webxr').addEventListener('click', startWebXRViewerDemo);
