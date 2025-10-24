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

    // Cylinder with label texture (larger size)
    const cylinderGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 64);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/can-label.png', (texture) => {
      const cylinderMaterial = new THREE.MeshBasicMaterial({ map: texture });
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.position.set(0, 0, 0);
      anchor.group.add(cylinder);
      logMessage("Cylinder with texture added.");

      // Animate rotation
      renderer.setAnimationLoop(() => {
        cylinder.rotation.y += 0.01;
        renderer.render(scene, camera);
      });
    }, undefined, (err) => {
      logMessage("Error loading cylinder texture: " + err.message);
    });

    // Info Panel with Text (scaled up)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.font = '48px Arial';
    context.fillText('Product Info: Sparkling Water', 40, 200);

    const panelTexture = new THREE.CanvasTexture(canvas);
    const panelGeometry = new THREE.PlaneGeometry(0.6, 0.3); // doubled size
    const panelMaterial = new THREE.MeshBasicMaterial({map: panelTexture, side: THREE.DoubleSide, transparent: true});
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0.4, -0.2); // positioned above and behind the larger can
    anchor.group.add(panel);
    logMessage("Info panel added.");

    await mindarThree.start();
    logMessage("MindAR started successfully.");
  } catch (err) {
    logMessage("Error initializing AR: " + err.message);
  }
});
