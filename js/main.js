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
    });

    const {renderer, scene, camera} = mindarThree;
    const anchor = mindarThree.addAnchor(0);

    // Cylinder with label texture (double size again)
    const cylinderGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.8, 64);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/alt-can-label.png', (texture) => {
      const cylinderMaterial = new THREE.MeshBasicMaterial({ map: texture });
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.position.set(0, 0, 0);
      anchor.group.add(cylinder);
      logMessage("Large cylinder with texture added.");

      // Animate rotation
      renderer.setAnimationLoop(() => {
        cylinder.rotation.y += 0.01;
        renderer.render(scene, camera);
      });
    }, undefined, (err) => {
      logMessage("Error loading cylinder texture: " + err.message);
    });

    // Info Panel with Text (scaled up again)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.font = '96px Arial';
    context.fillText('Product Info: -196  Grapefruit', 80, 400);
    context.fillText('Tasting notes: Crisp, citrusy finish', 80, 500);

    const panelTexture = new THREE.CanvasTexture(canvas);
    const panelGeometry = new THREE.PlaneGeometry(1.2, 0.6); // scaled up again
    const panelMaterial = new THREE.MeshBasicMaterial({map: panelTexture, side: THREE.DoubleSide, transparent: true});
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0.8, -0.4); // positioned above and behind the larger can
    anchor.group.add(panel);
    logMessage("Large info panel added.");

    await mindarThree.start();
    logMessage("MindAR started successfully.");
  } catch (err) {
    logMessage("Error initializing AR: " + err.message);
  }
});
