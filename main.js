// Refactored 3D Model Loader
function initModelViewer(options) {
  const {
    containerId,
    loadingIndicatorId,
    fallbackImage,
    fallbackAlt,
    modelPath,
    autoRotateSpeed = 2,
    loadingSpinnerColor = "border-gray-600",
  } = options;

  const container = document.getElementById(containerId);
  const loadingIndicator = loadingIndicatorId
    ? document.getElementById(loadingIndicatorId)
    : null;
  if (!container) {
    console.error(`Container '${containerId}' bulunamadı.`);
    return;
  }

  // Mobile check - disable 3D on mobile for performance
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    container.innerHTML = `
      <img src="${fallbackImage}" alt="${fallbackAlt}" 
           class="w-full h-full object-cover rounded-lg" loading="lazy" />
    `;
    return;
  }

  if (
    typeof THREE === "undefined" ||
    typeof THREE.OrbitControls === "undefined" ||
    typeof THREE.GLTFLoader === "undefined"
  ) {
    console.error(
      "Three.js, OrbitControls veya GLTFLoader yüklü değil. Fallback image gösteriliyor."
    );
    showFallbackImage();
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    container.offsetWidth / container.offsetHeight,
    0.1,
    100
  );

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
  });

  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = autoRotateSpeed;

  // Intersection Observer for lazy loading
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadModel();
        observer.unobserve(container);
      }
    });
  });
  observer.observe(container);

  function loadModel() {
    const loader = new THREE.GLTFLoader();
    // Model yolu düzeltmesi: assets klasörü kontrolü
    let fixedModelPath = modelPath;
    if (modelPath.startsWith("/assets/models/")) {
      // workspace'te models/ ana dizinde, assets altında değil
      fixedModelPath = modelPath.replace("/assets/models/", "/models/");
    }

    const loadingTimeout = setTimeout(() => {
      console.warn(`Model loading timeout for ${containerId}`);
      showFallbackImage();
    }, 10000);

    loader.load(
      fixedModelPath,
      function (gltf) {
        clearTimeout(loadingTimeout);
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
          if (child.material) {
            child.material.needsUpdate = true;
          }
        });

        // Scale and position
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.5 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        scene.add(model);
        camera.position.set(0, 0, 2.5);
        camera.lookAt(0, 0, 0);

        if (loadingIndicator) loadingIndicator.style.display = "none";
        container.appendChild(renderer.domElement);
        animate();
      },
      function (progress) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        if (loadingIndicator && percent < 100) {
          loadingIndicator.innerHTML = `
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 ${loadingSpinnerColor} mx-auto mb-2"></div>
              <div class="text-xs text-gray-500">${percent}%</div>
            </div>
          `;
        }
      },
      function (error) {
        clearTimeout(loadingTimeout);
        console.error(`Error loading model for ${containerId}:`, error);
        showFallbackImage();
      }
    );
  }

  function showFallbackImage() {
    if (container) {
      container.innerHTML = `
            <img src="${fallbackImage}" alt="${fallbackAlt}" 
                 class="w-full h-full object-cover rounded-lg" loading="lazy" />
        `;
    }
  }

  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  function cleanup() {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
    // Remove event listener to prevent memory leaks
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("beforeunload", cleanup);
    if (observer && typeof observer.disconnect === "function")
      observer.disconnect();
    if (
      visibilityObserver &&
      typeof visibilityObserver.disconnect === "function"
    )
      visibilityObserver.disconnect();
  }

  window.addEventListener("beforeunload", cleanup);

  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (!animationId) animate();
      } else {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      }
    });
  });

  if (container) visibilityObserver.observe(container);

  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (container) {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    }, 250);
  }

  window.addEventListener("resize", handleResize);
}

// Initialize models
document.addEventListener("DOMContentLoaded", function () {
  function initializeModels() {
    // Drill model configuration
    initModelViewer({
      containerId: "drill-model",
      loadingIndicatorId: "loading-indicator",
      fallbackImage: "/assets/images/slider1.jpg",
      fallbackAlt: "Misyon",
      modelPath: "/models/compressed_drill.glb", // <-- GLB dosya yolu
      autoRotateSpeed: 2,
      loadingSpinnerColor: "border-blue-600",
    });

    // Toolbox model configuration
    initModelViewer({
      containerId: "toolbox-model",
      loadingIndicatorId: "toolbox-loading-indicator",
      fallbackImage: "/assets/images/slider2.jpg",
      fallbackAlt: "Vizyon",
      modelPath: "/models/compressed_toolbox.glb", // <-- GLB dosya yolu
      autoRotateSpeed: 2,
      loadingSpinnerColor: "border-green-600",
    });
  }

  initializeModels();
});
