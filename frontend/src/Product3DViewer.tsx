import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, RotateCw, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';

interface Product3DViewerProps {
  productName?: string;
  category?: string;
  sku?: string;
  stock?: number;
}

export const Product3DViewer: React.FC<Product3DViewerProps> = ({
  productName = "Silo Metálico de Grano / Forraje",
  category = "Almacenamiento",
  sku = "SILO-01",
  stock = 10,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [isRotating, setIsRotating] = useState(true);
  const [modelType, setModelType] = useState<'silo' | 'box' | 'cylinder'>('silo');
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    // Verificar soporte de WebGL
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLSupported(false);
        return;
      }
    } catch {
      setWebGLSupported(false);
      return;
    }

    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 400;
    const height = currentMount.clientHeight || 320;

    // 1. Escena
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc); // slate-50

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 6);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    currentMount.appendChild(renderer.domElement);

    // 4. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.4);
    dirLight2.position.set(-5, -2, -5);
    scene.add(dirLight2);

    // Grid de piso
    const gridHelper = new THREE.GridHelper(10, 10, 0x16a34a, 0xe2e8f0);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    // 5. Grupo del Modelo 3D
    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    const buildModel = (type: 'silo' | 'box' | 'cylinder') => {
      // Limpiar hijos previos
      while (group.children.length > 0) {
        const obj = group.children[0];
        group.remove(obj);
      }

      if (type === 'silo') {
        // Silo Agrícola: Cilindro con techo cónico y patas
        // Cuerpo principal
        const bodyGeo = new THREE.CylinderGeometry(1, 1, 2.2, 32);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7, // azul cielo industrial
          metalness: 0.6,
          roughness: 0.3,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        group.add(body);

        // Techo cónico
        const roofGeo = new THREE.ConeGeometry(1.08, 0.8, 32);
        const roofMat = new THREE.MeshStandardMaterial({
          color: 0x0369a1,
          metalness: 0.7,
          roughness: 0.2,
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.95;
        group.add(roof);

        // Cono inferior de descarga
        const bottomGeo = new THREE.ConeGeometry(1, 0.7, 32);
        const bottomMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.5,
          roughness: 0.4,
        });
        const bottom = new THREE.Mesh(bottomGeo, bottomMat);
        bottom.rotation.x = Math.PI;
        bottom.position.y = -0.75;
        group.add(bottom);

        // 4 Patas soporte
        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        angles.forEach((ang) => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(Math.cos(ang) * 0.9, -0.6, Math.sin(ang) * 0.9);
          group.add(leg);
        });
      } else if (type === 'box') {
        // Contenedor / Caja de Ensilado
        const boxGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const boxMat = new THREE.MeshStandardMaterial({
          color: 0x16a34a, // verde forraje
          roughness: 0.6,
          metalness: 0.2,
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = 0.2;
        group.add(box);

        // Bordes de refuerzo
        const edges = new THREE.EdgesGeometry(boxGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        line.position.y = 0.2;
        group.add(line);
      } else {
        // Barril / Tambor de Almacenaje
        const cylGeo = new THREE.CylinderGeometry(1.1, 1.1, 2, 24);
        const cylMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b, // ámbar
          roughness: 0.4,
          metalness: 0.5,
        });
        const cyl = new THREE.Mesh(cylGeo, cylMat);
        cyl.position.y = 0.2;
        group.add(cyl);
      }
    };

    buildModel(modelType);

    // 6. Manejo de Interacción Mouse / Touch (Rotación y Zoom manual)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !group) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePosition.x;
      const deltaY = clientY - previousMousePosition.y;

      group.rotation.y += deltaX * 0.01;
      group.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: clientX, y: clientY };
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', handlePointerDown);
    domElem.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    domElem.addEventListener('touchstart', handlePointerDown);
    domElem.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    // 7. Bucle de Animación
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotating && !isDragging && group) {
        group.rotation.y += 0.008;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('mousedown', handlePointerDown);
      domElem.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      domElem.removeEventListener('touchstart', handlePointerDown);
      domElem.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('resize', handleResize);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [modelType, isRotating]);

  const handleZoom = (factor: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = Math.max(2.5, Math.min(10, cameraRef.current.position.z + factor));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm md:text-base">
            Visor 3D Interactivo de Producto
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setModelType('silo')}
            className={`px-2 py-1 rounded transition ${modelType === 'silo' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600'}`}
          >
            Silo Agrícola
          </button>
          <button
            onClick={() => setModelType('box')}
            className={`px-2 py-1 rounded transition ${modelType === 'box' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600'}`}
          >
            Caja / Bulto
          </button>
          <button
            onClick={() => setModelType('cylinder')}
            className={`px-2 py-1 rounded transition ${modelType === 'cylinder' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600'}`}
          >
            Tambor
          </button>
        </div>
      </div>

      {/* Contenedor 3D con Fallback */}
      <div className="relative w-full h-80 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
        {!webGLSupported ? (
          // Fallback visual 2D si WebGL no está disponible
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-100 text-slate-600">
            <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
            <p className="font-medium text-sm">Visualizador 3D no compatible en este navegador</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              WebGL está desactivado o no tiene soporte de aceleración gráfica. Mostrando ficha estática del producto:
            </p>
            <div className="mt-4 p-3 bg-white rounded border border-slate-200 text-left text-xs w-full max-w-xs shadow-sm">
              <p><strong>Producto:</strong> {productName}</p>
              <p><strong>SKU:</strong> {sku}</p>
              <p><strong>Categoría:</strong> {category}</p>
              <p><strong>Stock disponible:</strong> {stock} unidades</p>
            </div>
          </div>
        ) : (
          <>
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Controles flotantes sobre el canvas 3D */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg border border-slate-200 shadow-sm z-10">
              <button
                onClick={() => setIsRotating(!isRotating)}
                title={isRotating ? "Pausar rotación" : "Girar automáticamente"}
                className={`p-1.5 rounded hover:bg-slate-100 transition ${isRotating ? 'text-indigo-600' : 'text-slate-400'}`}
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(-0.8)}
                title="Acercar (Zoom In)"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(0.8)}
                title="Alejar (Zoom Out)"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Indicador de ayuda */}
            <div className="absolute bottom-2 left-3 text-[11px] text-slate-400 bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
              Arrastra con el ratón o dedo para rotar 360°
            </div>
          </>
        )}
      </div>

      {/* Info de Producto Vinculada */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-1 pt-1">
        <div>
          <span className="font-semibold text-slate-800">{productName}</span>
          <span className="text-slate-400 ml-2">SKU: {sku}</span>
        </div>
        <div className="flex gap-3">
          <span>Categoría: <strong className="text-slate-700">{category}</strong></span>
          <span>Stock: <strong className={stock > 5 ? "text-emerald-600" : "text-amber-600"}>{stock}</strong></span>
        </div>
      </div>
    </div>
  );
};
