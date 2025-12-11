
// app.js
function logMessage(message) {
  const logBox = document.getElementById('log-box');
  const entry = document.createElement('div');
  entry.textContent = message;
  logBox.appendChild(entry);
}

document.getElementById('start-button').addEventListener('click', async () => {
  logMessage("Start AR button clicked!");

  try {
    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: document.querySelector("#mindar-container"),
      imageTargetSrc: "./assets/targets.mind",
      // Helpful to avoid odd blending artifacts; keep default unless you have special alpha needs
      // uiLoading: true,
      // uiError: true,
      // uiScanning: true,
    });

    const { renderer, scene, camera } = mindarThree;

    // --- Rendering: color management & tone mapping to prevent washed-out look ---
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Adjust between ~0.85–1.2 based on your device/lighting
    renderer.physicallyCorrectLights = true;
    renderer.setClearAlpha(0); // AR background (camera feed) visible

    const anchor = mindarThree.addAnchor(0);

    // --- Lighting: Standard material needs light; improves color depth and contrast ---
    // Soft ambient to lift shadows + directional to add shape
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(0.5, 1, 0.8);
    dirLight.castShadow = false;
    scene.add(dirLight);

    // --- Cylinder with label texture ---
    const cylinderGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.8, 64);
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      './assets/can-label.png',
      (texture) => {
        // Color fidelity
        texture.encoding = THREE.sRGBEncoding;

        // Quality/perf hints (tune to taste)
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Use Standard material for richer results under light
        const cylinderMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.55, // a bit of roughness to avoid plastic look
          metalness: 0.05, // usually labels aren't metallic
        });

        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinder.position.set(0, 0, 0);
        cylinder.frustumCulled = false; // avoids disappearing when AR anchor jitters
        anchor.group.add(cylinder);
        logMessage("Large cylinder with texture added.");

        // Animate rotation
        renderer.setAnimationLoop(() => {
          cylinder.rotation.y += 0.01;
          renderer.render(scene, camera);
        });
      },
      undefined,
      (err) => {
        logMessage("Error loading cylinder texture: " + err.message);
      }
    );

    // --- Info Panel with Canvas Texture ---
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const context = canvas.getContext('2d');

    // High-contrast background + text
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Optional: add a soft gradient header strip to boost perceived contrast
    const grad = context.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#f5f5f5');
    grad.addColorStop(1, '#e9e9e9');
    context.fillStyle = grad;
    context.fillRect(0, 0, canvas.width, 200);

    context.fillStyle = '#000000';
    context.font = '96px Arial';
    context.fillText('Product Info: -196 Grapefruit', 80, 400);
    context.fillText('Tasting notes: Crisp, citrusy finish', 80, 500);
    context.fillText('Nick’s Recommendation: Strawberry', 80,600);
    context.fillText('He LOVES it', 80, 700);

    const panelTexture = new THREE.CanvasTexture(canvas);
    panelTexture.encoding = THREE.sRGBEncoding; // crucial for non-washed-out text
    panelTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
    panelTexture.minFilter = THREE.LinearMipmapLinearFilter;
    panelTexture.magFilter = THREE.LinearFilter;
    panelTexture.needsUpdate = true;

    const panelGeometry = new THREE.PlaneGeometry(1.2, 0.6);
    const panelMaterial = new THREE.MeshStandardMaterial({
      map: panelTexture,
      side: THREE.DoubleSide,
      transparent: true,
      roughness: 0.8,
      metalness: 0.0,
    });

    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0.8, -0.4); // positioned above and behind the larger can
    panel.frustumCulled = false;
    anchor.group.add(panel);
    logMessage("Large info panel added.");

    // --- Start AR session ---
    await mindarThree.start();
    logMessage("MindAR started successfully.");

    // --- Optional: handle visibility flicker on anchor tracking loss ---
    anchor.onTargetFound = () => {
      panel.visible = true;
      // You can also adjust exposure slightly when target reacquires if needed
      // renderer.toneMappingExposure = 1.0;
    };
    anchor.onTargetLost = () => {
      panel.visible = false;
    };

  } catch (err) {
    logMessage("Error initializing AR: " + err.message);
  }
});
