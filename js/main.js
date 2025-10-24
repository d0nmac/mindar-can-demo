import {loadGLTF} from 'https://cdn.jsdelivr.net/npm/mind-ar@1.1.4/dist/utils/loader.js';

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

    // Cylinder with label texture
    const cylinderGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 64);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/can-label.png', (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
      const cylinderMaterial = new THREE.MeshBasicMaterial({ map: texture });
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.position.set(0, 0, 0);
      anchor.group.add(cylinder);
      logMessage("Cylinder with texture added.");
    }, undefined, (err) => {
      logMessage("Error loading cylinder texture: " + err.message);
    });

    // Info Panel with Text
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.font = '28px Arial';
    context.fillText('Product Info: Sparkling Water', 20, 100);

    const panelTexture = new THREE.CanvasTexture(canvas);
    const panelGeometry = new THREE.PlaneGeometry(0.3, 0.15);
    const panelMaterial = new THREE.MeshBasicMaterial({map: panelTexture, side: THREE.DoubleSide, transparent: true});
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0.2, -0.15);
    anchor.group.add(panel);
    logMessage("Info panel added.");

    await mindarThree.start();
    logMessage("MindAR started successfully.");

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  } catch (err) {
    logMessage("Error initializing AR: " + err.message);
  }
});
