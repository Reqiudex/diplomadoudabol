import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, RotateCw, ZoomIn, ZoomOut, AlertCircle, Sparkles, Layers } from 'lucide-react';

export interface Product3DViewerProps {
  productName?: string;
  category?: string;
  sku?: string;
  stock?: number;
}

// Clasificación automática de modelo 3D según el producto
export function detectModelType(name: string = "", sku: string = "", category: string = ""): string {
  const text = `${name} ${sku} ${category}`.toLowerCase();
  if (text.includes("martillo") || text.includes("tool-1001") || text.includes("hammer")) {
    return 'hammer';
  }
  if (text.includes("taladro") || text.includes("bosch") || text.includes("percutor")) {
    return 'drill';
  }
  if (text.includes("amoladora") || text.includes("dewalt") || text.includes("disco")) {
    return 'grinder';
  }
  if (text.includes("bolsa") || text.includes("silopack") || text.includes("ensilado") || text.includes("saco")) {
    return 'silobag';
  }
  if (text.includes("inoculante") || text.includes("frasco") || text.includes("100g") || text.includes("quimico")) {
    return 'jar';
  }
  if (text.includes("llave") || text.includes("stanley") || text.includes("llaves")) {
    return 'wrenchset';
  }
  if (text.includes("silo") || text.includes("almacen")) {
    return 'silo';
  }
  return 'defaultbox';
}

export const Product3DViewer: React.FC<Product3DViewerProps> = ({
  productName = "Martillo de Uña 16oz Test",
  category = "Herramientas Manuales",
  sku = "TEST-TOOL-1001",
  stock = 10,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [isRotating, setIsRotating] = useState(true);

  // Tipo de modelo detectado según las propiedades del producto
  const autoType = detectModelType(productName, sku, category);
  const [modelType, setModelType] = useState<string>(autoType);

  // Actualizar automáticamente cuando cambie el producto seleccionado
  useEffect(() => {
    setModelType(detectModelType(productName, sku, category));
  }, [productName, sku, category]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
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

    // Limpiar restos previos si existieran
    while (currentMount.firstChild) {
      currentMount.removeChild(currentMount.firstChild);
    }

    const width = currentMount.clientWidth || 400;
    const height = currentMount.clientHeight || 320;

    // 1. Escena
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a); // Fondo oscuro slate-900 elegante de estudio

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 5.5);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    // 3. Renderer con sombras suaves
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    currentMount.appendChild(renderer.domElement);

    // 4. Luces tipo estudio 3D
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8); // Luz azul cielo de contraste
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 0.5); // Relleno cálido ámbar
    fillLight.position.set(4, -3, -4);
    scene.add(fillLight);

    // Piso reflejante / Grid futurista
    const gridHelper = new THREE.GridHelper(10, 16, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    // Pedestal circular
    const pedestalGeo = new THREE.CylinderGeometry(1.8, 1.9, 0.15, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.8,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -1.15;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Anillo luminoso de pedestal
    const ringGeo = new THREE.RingGeometry(1.81, 1.86, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.07;
    scene.add(ring);

    // 5. Grupo del Modelo 3D
    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    // CONSTRUCTOR DE MODELOS 3D SEGÚN EL PRODUCTO
    const buildProductModel = (type: string) => {
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }

      switch (type) {
        // =========================================================================
        // 1. MARTILLO DE UÑA (TEST-TOOL-1001)
        // =========================================================================
        case 'hammer': {
          // Mango de madera ergonómica con grip negro
          const handleGeo = new THREE.CylinderGeometry(0.08, 0.11, 2.5, 16);
          const handleMat = new THREE.MeshStandardMaterial({
            color: 0xd97706, // Roble cálido
            roughness: 0.7,
            metalness: 0.1,
          });
          const handle = new THREE.Mesh(handleGeo, handleMat);
          handle.position.y = -0.1;
          handle.castShadow = true;
          group.add(handle);

          // Grip de goma negro
          const gripGeo = new THREE.CylinderGeometry(0.115, 0.118, 0.9, 16);
          const gripMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
          const grip = new THREE.Mesh(gripGeo, gripMat);
          grip.position.y = -0.8;
          group.add(grip);

          // Cabeza de acero forjado
          const headGeo = new THREE.BoxGeometry(0.35, 0.35, 1.2);
          const metalMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8, // Cromo / acero forjado
            metalness: 0.9,
            roughness: 0.2,
          });
          const head = new THREE.Mesh(headGeo, metalMat);
          head.position.set(0, 1.15, 0.1);
          head.castShadow = true;
          group.add(head);

          // Cara de golpe cilíndrica
          const faceGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 16);
          const face = new THREE.Mesh(faceGeo, metalMat);
          face.rotation.x = Math.PI / 2;
          face.position.set(0, 1.15, 0.7);
          group.add(face);

          // Uña sacaclavos curvada
          const clawGeo = new THREE.ConeGeometry(0.2, 0.6, 4);
          const claw = new THREE.Mesh(clawGeo, metalMat);
          claw.rotation.x = -Math.PI / 3;
          claw.position.set(0, 1.05, -0.6);
          group.add(claw);

          group.rotation.z = Math.PI / 12; // Leve inclinación de exposición
          break;
        }

        // =========================================================================
        // 2. TALADRO PERCUTOR BOSCH (TAL-BOSCH-750W)
        // =========================================================================
        case 'drill': {
          // Carcasa principal Bosch Azul Eléctrico
          const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 1.6);
          const boschMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7, // Azul industrial Bosch
            roughness: 0.4,
            metalness: 0.2,
          });
          const body = new THREE.Mesh(bodyGeo, boschMat);
          body.position.set(0, 0.3, 0);
          body.castShadow = true;
          group.add(body);

          // Empuñadura ergonómica
          const handleGeo = new THREE.CylinderGeometry(0.18, 0.16, 1.4, 16);
          const handleMat = new THREE.MeshStandardMaterial({
            color: 0x18181b, // Goma negra
            roughness: 0.8,
          });
          const handle = new THREE.Mesh(handleGeo, handleMat);
          handle.rotation.x = 0.25;
          handle.position.set(0, -0.6, -0.2);
          group.add(handle);

          // Gatillo rojo Bosch
          const triggerGeo = new THREE.BoxGeometry(0.12, 0.25, 0.15);
          const triggerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
          const trigger = new THREE.Mesh(triggerGeo, triggerMat);
          trigger.position.set(0, -0.2, 0.05);
          group.add(trigger);

          // Mandril / Chuck de acero
          const chuckGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 20);
          const steelMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.2 });
          const chuck = new THREE.Mesh(chuckGeo, steelMat);
          chuck.rotation.x = Math.PI / 2;
          chuck.position.set(0, 0.3, 1.0);
          group.add(chuck);

          // Broca percutora plateada
          const bitGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12);
          const bitMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
          const bit = new THREE.Mesh(bitGeo, bitMat);
          bit.rotation.x = Math.PI / 2;
          bit.position.set(0, 0.3, 1.6);
          group.add(bit);

          // Selector de percusión superior rojo
          const knobGeo = new THREE.BoxGeometry(0.2, 0.1, 0.3);
          const knob = new THREE.Mesh(knobGeo, triggerMat);
          knob.position.set(0, 0.8, 0.1);
          group.add(knob);

          break;
        }

        // =========================================================================
        // 3. AMOLADORA ANGULAR DEWALT (AMOL-DEWALT-412)
        // =========================================================================
        case 'grinder': {
          // Cuerpo cilíndrico Amarillo DeWalt
          const bodyGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.0, 24);
          const dewaltYellowMat = new THREE.MeshStandardMaterial({
            color: 0xeab308, // Amarillo DeWalt
            roughness: 0.3,
            metalness: 0.3,
          });
          const body = new THREE.Mesh(bodyGeo, dewaltYellowMat);
          body.rotation.z = Math.PI / 2;
          body.position.set(-0.3, 0.1, 0);
          group.add(body);

          // Cabezal de engranajes metálico
          const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.65);
          const metalMat = new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.85, roughness: 0.25 });
          const head = new THREE.Mesh(headGeo, metalMat);
          head.position.set(0.85, 0.1, 0);
          group.add(head);

          // Guarda de seguridad protectora
          const guardGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 32, 1, false, 0, Math.PI);
          const guardMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.6, roughness: 0.4 });
          const guard = new THREE.Mesh(guardGeo, guardMat);
          guard.position.set(0.85, 0.1, 0.35);
          group.add(guard);

          // Disco de corte 4-1/2"
          const discGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.04, 32);
          const discMat = new THREE.MeshStandardMaterial({
            color: 0x27272a,
            roughness: 0.7,
            metalness: 0.4,
          });
          const disc = new THREE.Mesh(discGeo, discMat);
          disc.rotation.x = Math.PI / 2;
          disc.position.set(0.85, 0.1, 0.4);
          disc.castShadow = true;
          group.add(disc);

          // Tuerca central del disco
          const nutGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
          const nutMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, metalness: 0.95 });
          const nut = new THREE.Mesh(nutGeo, nutMat);
          nut.rotation.x = Math.PI / 2;
          nut.position.set(0.85, 0.1, 0.45);
          group.add(nut);

          // Mango auxiliar lateral
          const sideHandleGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 16);
          const sideHandleMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
          const sideHandle = new THREE.Mesh(sideHandleGeo, sideHandleMat);
          sideHandle.position.set(0.85, 0.7, 0);
          group.add(sideHandle);

          break;
        }

        // =========================================================================
        // 4. BOLSA DE ENSILADO SILOPACK 50KG (ENS-MAIZ-SILOPACK-50)
        // =========================================================================
        case 'silobag': {
          // Bolsa de ensilado tipo silo bag gruesa blanca/verde tricapa
          const bagGeo = new THREE.CylinderGeometry(0.75, 0.7, 2.2, 32, 8);
          // Modificar vértices para que parezca bolsa con material orgánico compactado
          const pos = bagGeo.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const radiusFactor = 1.0 + Math.sin(y * 2) * 0.08;
            pos.setX(i, pos.getX(i) * radiusFactor);
            pos.setZ(i, pos.getZ(i) * radiusFactor);
          }
          bagGeo.computeVertexNormals();

          const bagMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc, // Polietileno blanco tricapa con protección UV
            roughness: 0.35,
            metalness: 0.1,
          });
          const bag = new THREE.Mesh(bagGeo, bagMat);
          bag.position.y = 0.1;
          bag.castShadow = true;
          group.add(bag);

          // Franja verde distintiva de marca Ensilados SiloPack
          const stripeGeo = new THREE.CylinderGeometry(0.78, 0.78, 0.5, 32);
          const stripeMat = new THREE.MeshStandardMaterial({
            color: 0x16a34a, // Verde forrajero
            roughness: 0.4,
          });
          const stripe = new THREE.Mesh(stripeGeo, stripeMat);
          stripe.position.y = 0.2;
          group.add(stripe);

          // Sellado superior plegado
          const topSealGeo = new THREE.BoxGeometry(1.2, 0.2, 0.1);
          const sealMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
          const seal = new THREE.Mesh(topSealGeo, sealMat);
          seal.position.y = 1.25;
          group.add(seal);

          // Precinto / Cuerda de amarre
          const tieGeo = new THREE.TorusGeometry(0.55, 0.05, 12, 24);
          const tieMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
          const tie = new THREE.Mesh(tieGeo, tieMat);
          tie.rotation.x = Math.PI / 2;
          tie.position.y = 1.1;
          group.add(tie);

          break;
        }

        // =========================================================================
        // 5. INOCULANTE BACTERIANO 100G (INOC-FORRAJE-100G)
        // =========================================================================
        case 'jar': {
          // Frasco farmacéutico / frasco blanco de agroquímicos de alta calidad
          const bottleGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.5, 32);
          const bottleMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.15,
          });
          const bottle = new THREE.Mesh(bottleGeo, bottleMat);
          bottle.position.y = -0.1;
          bottle.castShadow = true;
          group.add(bottle);

          // Hombro / cuello del frasco
          const neckGeo = new THREE.CylinderGeometry(0.4, 0.65, 0.35, 32);
          const neck = new THREE.Mesh(neckGeo, bottleMat);
          neck.position.y = 0.8;
          group.add(neck);

          // Tapa de seguridad azul / precinto inviolable
          const capGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.45, 32);
          const capMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb, // Azul de laboratorio
            roughness: 0.3,
            metalness: 0.3,
          });
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.y = 1.15;
          group.add(cap);

          // Etiqueta envolvente con indicación de biotecnología
          const labelGeo = new THREE.CylinderGeometry(0.66, 0.66, 1.0, 32, 1, true);
          const labelMat = new THREE.MeshStandardMaterial({
            color: 0x10b981, // Verde biotecnológico
            roughness: 0.4,
            side: THREE.DoubleSide,
          });
          const label = new THREE.Mesh(labelGeo, labelMat);
          label.position.y = -0.1;
          group.add(label);

          // Medidor de contenido
          const levelGeo = new THREE.BoxGeometry(0.04, 0.8, 0.02);
          const levelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const level = new THREE.Mesh(levelGeo, levelMat);
          level.position.set(0, -0.1, 0.67);
          group.add(level);

          break;
        }

        // =========================================================================
        // 6. JUEGO DE LLAVES COMBINADAS STANLEY (JUEGO-LLAVES-STANLEY)
        // =========================================================================
        case 'wrenchset': {
          // Estuche porta-herramientas negro/amarillo
          const caseGeo = new THREE.BoxGeometry(2.4, 0.15, 1.8);
          const caseMat = new THREE.MeshStandardMaterial({
            color: 0x1c1917,
            roughness: 0.8,
            metalness: 0.2,
          });
          const wrenchCase = new THREE.Mesh(caseGeo, caseMat);
          wrenchCase.rotation.x = -Math.PI / 4;
          wrenchCase.position.set(0, 0, 0);
          group.add(wrenchCase);

          // Franja amarilla Stanley en estuche
          const stanleyBarGeo = new THREE.BoxGeometry(2.3, 0.04, 0.2);
          const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
          const stanleyBar = new THREE.Mesh(stanleyBarGeo, yellowMat);
          stanleyBar.rotation.x = -Math.PI / 4;
          stanleyBar.position.set(0, 0.55, -0.55);
          group.add(stanleyBar);

          // Conjunto de 5 llaves ordenadas de menor a mayor
          const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            metalness: 0.95,
            roughness: 0.1,
          });

          const lengths = [0.8, 1.0, 1.2, 1.4, 1.6];
          const xOffsets = [-0.8, -0.4, 0, 0.4, 0.8];

          lengths.forEach((len, idx) => {
            const wrenchGroup = new THREE.Group();

            // Vástago de la llave
            const shaftGeo = new THREE.BoxGeometry(0.08, len, 0.03);
            const shaft = new THREE.Mesh(shaftGeo, chromeMat);
            wrenchGroup.add(shaft);

            // Cabeza fija (boca abierta)
            const openHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16);
            const openHead = new THREE.Mesh(openHeadGeo, chromeMat);
            openHead.position.y = len / 2;
            wrenchGroup.add(openHead);

            // Cabeza estriada (anillo corona)
            const ringHeadGeo = new THREE.TorusGeometry(0.1, 0.03, 8, 16);
            const ringHead = new THREE.Mesh(ringHeadGeo, chromeMat);
            ringHead.position.y = -len / 2;
            wrenchGroup.add(ringHead);

            wrenchGroup.rotation.x = -Math.PI / 4;
            wrenchGroup.position.set(xOffsets[idx], 0.08, 0);
            group.add(wrenchGroup);
          });

          break;
        }

        // =========================================================================
        // SILO DE ALMACENAMIENTO GANADERO (DEFAULT)
        // =========================================================================
        case 'silo':
        default: {
          const bodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 2.0, 32);
          const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            metalness: 0.7,
            roughness: 0.25,
          });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.4;
          body.castShadow = true;
          group.add(body);

          // Techo cónico
          const roofGeo = new THREE.ConeGeometry(1.02, 0.7, 32);
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.8, roughness: 0.2 });
          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.position.y = 1.75;
          group.add(roof);

          // Cono inferior de descarga
          const bottomGeo = new THREE.ConeGeometry(0.9, 0.6, 32);
          const bottomMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6 });
          const bottom = new THREE.Mesh(bottomGeo, bottomMat);
          bottom.rotation.x = Math.PI;
          bottom.position.y = -0.7;
          group.add(bottom);

          // 4 Patas soporte estructural
          const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
          const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
          [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ang) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(Math.cos(ang) * 0.85, -0.6, Math.sin(ang) * 0.85);
            group.add(leg);
          });
          break;
        }
      }
    };

    buildProductModel(modelType);

    // 6. Interacción táctil y de ratón (Rotación manual 360)
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

      group.rotation.y += deltaX * 0.012;
      group.rotation.x += deltaY * 0.008;

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

    // 7. Bucle continuo de animación
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotating && !isDragging && group) {
        group.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Auto-redimensionamiento responsivo
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
    cameraRef.current.position.z = Math.max(2.0, Math.min(8.0, cameraRef.current.position.z + factor));
  };

  // Nombres de pestaña amigables
  const modelLabels: Record<string, string> = {
    hammer: 'Martillo 16oz',
    drill: 'Taladro Bosch',
    grinder: 'Amoladora DeWalt',
    silobag: 'Bolsa SiloPack',
    jar: 'Inoculante 100g',
    wrenchset: 'Llaves Stanley',
    silo: 'Silo Granel'
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col gap-3">
      {/* Barra de cabecera */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-emerald-600 animate-pulse" />
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight">
              Visor 3D Interactivo de Producto
            </h3>
            <span className="text-[11px] text-slate-400">
              Modelo 3D Three.js adaptado en tiempo real
            </span>
          </div>
        </div>

        {/* Selector rápido de perspectiva / modelo */}
        <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          {Object.entries(modelLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setModelType(key)}
              className={`px-2 py-1 rounded transition text-xs ${
                modelType === key
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenedor Canvas 3D */}
      <div className="relative w-full h-88 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
        {!webGLSupported ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-slate-300">
            <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
            <p className="font-semibold text-sm">Visualizador 3D no compatible con WebGL</p>
            <div className="mt-4 p-3 bg-slate-800 rounded text-left text-xs w-full max-w-xs shadow">
              <p><strong>Producto:</strong> {productName}</p>
              <p><strong>SKU:</strong> {sku}</p>
              <p><strong>Categoría:</strong> {category}</p>
              <p><strong>Stock:</strong> {stock} unidades</p>
            </div>
          </div>
        ) : (
          <>
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Badge distintivo del modelo activo */}
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full text-xs text-sky-400 flex items-center gap-1.5 shadow">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-[11px] uppercase tracking-wider">{modelLabels[modelType] || 'Personalizado'}</span>
            </div>

            {/* Controles flotantes */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow z-10 text-slate-200">
              <button
                onClick={() => setIsRotating(!isRotating)}
                title={isRotating ? "Pausar rotación" : "Girar automáticamente"}
                className={`p-1.5 rounded transition ${isRotating ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(-0.6)}
                title="Acercar (Zoom In)"
                className="p-1.5 rounded hover:bg-slate-800 transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(0.6)}
                title="Alejar (Zoom Out)"
                className="p-1.5 rounded hover:bg-slate-800 transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Guía de usuario */}
            <div className="absolute bottom-2 left-3 text-[11px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none border border-slate-800">
              🖱️ Arrastra en cualquier dirección para rotar 360° • Zoom con botones
            </div>
          </>
        )}
      </div>

      {/* Ficha técnica del producto sincronizado */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-slate-900">{productName}</span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-slate-500">SKU: {sku}</span>
        </div>
        <div className="flex gap-4">
          <span>Categoría: <strong className="text-slate-800">{category}</strong></span>
          <span>Existencia: <strong className={stock > 5 ? "text-emerald-700" : "text-amber-700"}>{stock} disp.</strong></span>
        </div>
      </div>
    </div>
  );
};
