import * as THREE from "three";
import { gsap } from "gsap";
import {
	lerpRectangles,
	rotateY,
	scaleRectangle,
	sleep,
	toggleVisibility,
} from "./util";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import Page from "./Page";
import * as dat from "dat.gui";
import VideoOverlay from "./video-overlay";
import SlidingNumber, { ValueChangeEvent } from "./SlidingNumber";
import SwipeHandler from "./SwipeHandler";
import IntroOverlay from "./intro-overlay";

export default class Flipbook {
	private containerEl: HTMLElement;
	private wrapperLinkEl: HTMLElement;
	private pageWidth: number;
	private pageHeight: number;
	private pageThickness: number;
	private pageRootThickness: number;
	private coverThickness: number;
	private coverMarginX: number;
	private coverMarginY: number;
	private textureUrls;
	private pageActiveAreas: PageActiveArea[] = [];
	private pageEdgeColor: number;
	public readonly settings: FlipbookSettings = {
		cameraAngle: (Math.PI / 2) * 0.28,
		cameraDistance: 1.02,
		cameraFov: 14,

		spotLightX: 250,
		spotLightY: 500,
		spotLightZ: 1500,
		spotLightColor: 0xffffff,
		spotLightIntensity: 60,
		spotLightAngle: 0.7,
		spotLightPenumbra: 0.6,
		spotLightDecay: 0.4,
		spotLightNearClip: 500,
		spotLightFarClip: 3500,
		spotLightMapSize: 2048,

		ambientLightColor: 0xffffff,
		ambientLightIntensity: 0.35,

		showSpotLightHelper: false,
		showSpotShadowHelper: false,
	};

	private pages: Page[] = [];
	private group: THREE.Group;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private spineMesh: THREE.Mesh;
	private spotLight: THREE.SpotLight;
	private ambientLight: THREE.AmbientLight;
	private raycaster: THREE.Raycaster;
	private sceneMousePos: THREE.Vector2;

	private progress = new SlidingNumber(0, 0.1, 4);
	private spineWidth: number;
	private spineZ: number;

	private controls: OrbitControls;
	private stats;
	private datGui: dat.GUI;

	private spotLightHelper: THREE.SpotLightHelper | null = null;
	private spotShadowHelper: THREE.CameraHelper | null = null;
	private textureLoader: THREE.TextureLoader;
	private initCompleted: boolean = false;
	private videoOverlay: VideoOverlay;
	private introOverlay: IntroOverlay;

	private focusedActiveArea: PageActiveArea | null = null;
	private isChangingFocus = false;
	// @remark, css values should be changed individually
	private CAMERA_SIDE_GRAVITY = 4;
	private cameraSideShift = new SlidingNumber(1, 0.2);
	private isVerticalMode = false;
	private swipeHandler: SwipeHandler;

	// if this code is running, means the scripts are already loaded
	private scriptProgressWeight = 0.4;

	private introPhase: "LOADING" | "ANIMATING" | "COMPLETED" = "LOADING";

	constructor(params: FlipBookParams) {
		this.containerEl = params.containerEl;
		this.pageWidth = params.pageWidth;
		this.pageHeight = params.pageHeight;
		this.pageThickness = params.pageThickness || 2;
		this.pageRootThickness = params.pageRootThickness || 4;
		this.coverThickness = params.coverThickness || 5;
		this.coverMarginX = params.coverMarginX || 8;
		this.coverMarginY = params.coverMarginY || 8;
		this.textureUrls = params.textureUrls;
		this.pageEdgeColor = params.pageEdgeColor;
		this.pageActiveAreas = params.pageActiveAreas || [];

		this.videoOverlay = new VideoOverlay(this.containerEl, () => {
			this.unfocusActiveArea();
		});
		this.pageActiveAreas.forEach(area =>
			this.videoOverlay.addVideo(area?.video),
		);

		this.introOverlay = new IntroOverlay(
			this.containerEl.querySelector(".intro-overlay")!,
		);
		this.introOverlay.onProgress(this.scriptProgressWeight);

		THREE.DefaultLoadingManager.onProgress = (
			_,
			itemsLoaded,
			itemsTotal,
		) => {
			if (this.introPhase === "COMPLETED") return;

			const assetsProgress = itemsLoaded / itemsTotal;
			const overallProgress =
				this.scriptProgressWeight +
				assetsProgress * (1 - this.scriptProgressWeight);
			this.introOverlay.onProgress(overallProgress);
			if (overallProgress === 1) {
				this.playIntro();
			}
		};

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			this.settings.cameraFov,
			window.innerWidth / window.innerHeight,
			1200,
			9000,
		);

		this.renderer = new THREE.WebGLRenderer();
		// this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		// this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		// this.renderer.toneMappingExposure = 1.2;
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.domElement.classList.add("flipbook-canvas");
		this.wrapperLinkEl = document.createElement("a");
		this.wrapperLinkEl.draggable = false;
		this.wrapperLinkEl.classList.add("wrapper-link");
		this.wrapperLinkEl.setAttribute("target", "_blank");
		this.containerEl.appendChild(this.wrapperLinkEl);
		this.wrapperLinkEl.appendChild(this.renderer.domElement);

		this.textureLoader = new THREE.TextureLoader();

		this.raycaster = new THREE.Raycaster();
		this.sceneMousePos = new THREE.Vector2();

		// add pages
		const totalPages = Math.ceil(this.textureUrls.pages.length / 2);
		for (let i = 0; i < totalPages; i++) {
			const isCover = i === 0 || i === totalPages - 1;
			const width = isCover
				? this.pageWidth + this.coverMarginX + this.coverThickness
				: this.pageWidth;
			const height = isCover
				? this.pageHeight + this.coverMarginY * 2
				: this.pageHeight;

			const edgeTextures: Record<string, string> = {};
			if (isCover) {
				edgeTextures.edgeLR = this.textureUrls.coverEdgeLR;
				edgeTextures.edgeTB = this.textureUrls.coverEdgeTB;
			}

			const page = new Page({
				textureUrls: {
					front: this.textureUrls.pages[i * 2],
					back: this.textureUrls.pages[i * 2 + 1],
					...edgeTextures,
				},
				width,
				height,
				thickness: isCover ? this.coverThickness : this.pageThickness,
				rootThickness: isCover
					? this.coverThickness
					: this.pageRootThickness,
				isCover,
				isFrontCover: i === 0,
				edgeColor: this.pageEdgeColor,
				textureLoader: this.textureLoader,
			});
			this.pages.push(page);
		}

		this.ambientLight = new THREE.AmbientLight();
		this.scene.add(this.ambientLight);

		this.spotLight = new THREE.SpotLight();
		this.spotLight.castShadow = true;
		this.spotLight.shadow.bias = -0.0001;
		this.scene.add(this.spotLight);

		// this.controls = new OrbitControls(
		// 	this.camera,
		// 	this.renderer.domElement,
		// );

		this.group = new THREE.Group();
		this.scene.add(this.group);

		// init spine
		this.spineWidth = (this.pages.length - 2) * this.pageRootThickness;
		this.spineZ = this.coverThickness / 2;

		// init spine mesh
		const _texture = (url: string) => {
			const texture = this.textureLoader.load(url);
			texture.colorSpace = THREE.SRGBColorSpace;
			return { map: texture };
		};

		const textures = {
			spineInner: _texture(this.textureUrls.spineInner),
			spineOuter: _texture(this.textureUrls.spineOuter),
			spineEdgeLR: _texture(this.textureUrls.spineEdgeLR),
			spineEdgeTB: _texture(this.textureUrls.spineEdgeTB),
		};
		const spineMaterials = [
			new THREE.MeshStandardMaterial(textures.spineEdgeLR), // right face
			new THREE.MeshStandardMaterial(textures.spineEdgeLR), // left face
			new THREE.MeshStandardMaterial(textures.spineEdgeTB), // top face
			new THREE.MeshStandardMaterial(textures.spineEdgeTB), // bottom face
			new THREE.MeshStandardMaterial(textures.spineInner), // front face
			new THREE.MeshStandardMaterial(textures.spineOuter), // back face
		];
		const spineGeometry = new THREE.BoxGeometry(
			this.spineWidth,
			this.pageHeight + this.coverMarginY * 2,
			this.coverThickness,
		);
		this.spineMesh = new THREE.Mesh(spineGeometry, spineMaterials);
		this.spineMesh.receiveShadow = true;
		this.spineMesh.castShadow = true;
		this.spineMesh.position.z = this.spineZ;
		this.spineMesh.renderOrder = 99;
		this.group.add(this.spineMesh);

		// init pages
		let spinePlacementStart = -this.spineWidth / 2;
		let spinePlacementShift = 0;
		this.pages.forEach((page, index) => {
			this.group.add(page.pivot);

			if (page.isCover) {
				page.pivot.position.z = this.coverThickness;
				page.pivot.position.x =
					(this.spineWidth / 2) * (index ? 1 : -1);
			} else {
				const elevationLeft =
					spinePlacementShift + page.rootThickness / 2;
				const elevationRight = this.spineWidth - elevationLeft;
				const elevationMultiplier = 0.7;
				page.setElevation(
					elevationLeft * elevationMultiplier,
					elevationRight * elevationMultiplier,
				);

				page.pivot.position.z = this.spineZ + this.coverThickness / 2;
				page.pivot.position.x =
					spinePlacementStart +
					spinePlacementShift +
					page.rootThickness / 2;
				spinePlacementShift += page.rootThickness;
			}
		});

		// create desk
		const deskGeometry = new THREE.PlaneGeometry(5216, 1956, 1, 1);
		const deskTexture = this.textureLoader.load(this.textureUrls.desk);
		deskTexture.colorSpace = THREE.SRGBColorSpace;
		const deskMaterial = new THREE.MeshStandardMaterial({
			map: deskTexture,
		});
		const deskMesh = new THREE.Mesh(deskGeometry, deskMaterial);
		deskMesh.receiveShadow = true;
		deskMesh.castShadow = true;
		deskMesh.renderOrder = 100;
		this.scene.add(deskMesh);

		this.updateVerticalMode();
		this.applySettings(params.settings || {}, true);

		// Add fps counter
		this.stats = new Stats();
		this.stats.showPanel(0);
		this.stats.dom.style.display = "none";
		document.body.appendChild(this.stats.dom);

		this.datGui = new dat.GUI();
		this.datGui.domElement.style.display = "none";

		const cameraFolder = this.datGui.addFolder("Camera");
		cameraFolder.open();
		cameraFolder.add(
			this.settings,
			"cameraAngle",
			Math.PI / -2,
			Math.PI / 2,
		);
		cameraFolder.add(this.settings, "cameraDistance", 0, 2);
		cameraFolder.add(this.settings, "cameraFov", 1, 90);

		const spotLightFolder = this.datGui.addFolder("Spot Light");
		const spotLightPosFolder = spotLightFolder.addFolder("Position");
		spotLightPosFolder.add(this.settings, "spotLightX", -1000, 1000);
		spotLightPosFolder.add(this.settings, "spotLightY", -1000, 1000);
		spotLightPosFolder.add(this.settings, "spotLightZ", 0, 2000);
		spotLightFolder.addColor(this.settings, "spotLightColor");
		spotLightFolder.add(this.settings, "spotLightIntensity", 0, 10000000);
		spotLightFolder.add(this.settings, "spotLightAngle", 0, Math.PI);
		spotLightFolder.add(this.settings, "spotLightPenumbra", 0, 1);
		spotLightFolder.add(this.settings, "spotLightDecay", 0, 10);
		spotLightFolder.add(this.settings, "spotLightNearClip", 1, 4000);
		spotLightFolder.add(this.settings, "spotLightFarClip", 1, 4000);
		spotLightFolder.add(this.settings, "spotLightMapSize", 0, 4096);

		const ambientLightFolder = this.datGui.addFolder("Ambient Light");
		ambientLightFolder.addColor(this.settings, "ambientLightColor");
		ambientLightFolder.add(this.settings, "ambientLightIntensity", 0, 1);

		const helpersFolder = this.datGui.addFolder("Helpers");
		helpersFolder.add(this.settings, "showSpotLightHelper");
		helpersFolder.add(this.settings, "showSpotShadowHelper");

		const addChangeListeners = (gui: dat.GUI): void => {
			gui.__controllers.forEach((controller: dat.GUIController) => {
				controller.onChange((value: any) => {
					this.applySettings({ [controller.property]: value });
				});
			});

			for (const folderName in gui.__folders) {
				if (gui.__folders.hasOwnProperty(folderName)) {
					addChangeListeners(gui.__folders[folderName]);
				}
			}
		};
		addChangeListeners(this.datGui);

		// event listeners
		window.addEventListener(
			"resize",
			this.onWindowResize.bind(this),
			false,
		);

		// process interactive areas
		this.renderer.domElement.addEventListener("mousemove", event => {
			this.sceneMousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.sceneMousePos.y =
				-(event.clientY / window.innerHeight) * 2 + 1;

			this.updateCursor();
		});

		this.swipeHandler = new SwipeHandler(this.renderer.domElement);
		this.swipeHandler.addCallback("swipeStart", () => {
			if (this.focusedActiveArea || this.isChangingFocus) return;
			// continuing dropped turn or shift
			// TODO: refactor; make it more comprehendable
			this.isTurning() && this.progress.lock();
			!this.cameraSideShift.isSettled() && this.cameraSideShift.lock();
		});
		this.swipeHandler.addCallback("swipeEnd", () => {
			this.progress.release();
			this.cameraSideShift.release();
		});
		this.swipeHandler.addCallback("swipeMove", (swipe: Swipe) => {
			if (this.focusedActiveArea || this.isChangingFocus) return;
			this.onSwipeMove(swipe);
		});

		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Escape" || event.code === "Escape") {
				this.unfocusActiveArea();
			} else if (event.key === "d" || event.code === "KeyD") {
				toggleVisibility(this.datGui.domElement);
			} else if (event.key === "f" || event.code === "KeyF") {
				toggleVisibility(this.stats.dom);
			}
		});

		this.renderer.domElement.addEventListener("click", event => {
			this.sceneMousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.sceneMousePos.y =
				-(event.clientY / window.innerHeight) * 2 + 1;
			this.onBookClick(this.sceneMousePos);
		});

		this.wrapperLinkEl.addEventListener("dblclick", () => {
			if (!document.fullscreenElement) {
				if (this.containerEl.requestFullscreen) {
					this.containerEl.requestFullscreen().catch(err => {
						console.error(
							"Failed to enter a full-screen mode",
							err,
						);
					});
				} else {
					console.error(
						"Fullscreen API is not supported in this browser.",
					);
				}
			} else {
				if (document.exitFullscreen) {
					document.exitFullscreen().catch(err => {
						console.error("Failed to exit a full-screen mode", err);
					});
				}
			}
		});

		this.cameraSideShift.setMin(-1); // look at the left page
		this.cameraSideShift.setMax(1); // look at the right page

		this.progress.setMin(-Infinity);
		this.progress.setMax(Infinity);

		this.progress.addCallback("settled", () => {
			this.progress.setMin(-Infinity);
			this.progress.setMax(Infinity);
		});

		// update cameraSideShift
		this.progress.addCallback(
			"valueChange",
			({ newValue: progress }: ValueChangeEvent) => {
				if (this.isVerticalMode) {
					if (this.isTurning()) {
						const tp = progress - this.getTurningPage()!;
						this.cameraSideShift.setValue((1 - tp) * 2 - 1);
					} else {
						this.cameraSideShift.setValue(
							Math.round(this.cameraSideShift.getValue()),
						);
					}
				} else {
					const bookOpenFactor = Math.min(
						progress,
						this.pages.length - progress,
						1,
					);

					this.cameraSideShift.setValue(1 - bookOpenFactor);
					if (progress + 1 > this.pages.length) {
						this.cameraSideShift.setValue(
							-this.cameraSideShift.getValue(),
						);
					}
				}
			},
		);
	}

	private updateCursor() {
		let cursor = "grab";
		let href = "";
		let title = "";

		if (this.isChangingFocus) {
			cursor = "default";
		} else if (this.focusedActiveArea) {
			cursor = "pointer";
		} else if (
			(this.isTurning() || this.isShifting()) &&
			this.swipeHandler.isPointerDown()
		) {
			cursor = "ew-resize";
		} else {
			const activeArea = this.getActiveAreaAt(this.sceneMousePos);

			if (activeArea) {
				cursor = "pointer";
				title = activeArea.title || "";

				if (typeof activeArea.link === "function") {
					href = activeArea.link();
				} else {
					href = activeArea.link || "";
				}
			}
		}

		// applying cursor, href and title
		this.wrapperLinkEl.style.cursor = cursor;
		this.wrapperLinkEl.title = title;
		if (href) {
			this.wrapperLinkEl.setAttribute("href", href);
		} else {
			this.wrapperLinkEl.removeAttribute("href");
		}
	}

	private getTurningPage(): number | null {
		if (!this.isTurning()) return null;
		return this.progress.minValue;
	}

	private isTurning() {
		return !this.progress.isSettled();
	}

	private isShifting() {
		return !this.cameraSideShift.isSettled() && !this.isTurning();
	}

	private swipeDeltaToProgress(delta: number) {
		return delta / -500; // TODO:
	}

	private runAnimation() {
		let previousTime = performance.now();

		const animate = ((currentTime: number) => {
			let dt = (currentTime - previousTime) / 1000;
			previousTime = currentTime;
			this.stats.begin();
			this.update(dt);
			this.stats.end();
			this.controls?.update?.();

			requestAnimationFrame(animate);
		}).bind(this);

		animate(performance.now());
	}

	private onSwipeMove(swipe: Swipe) {
		const deltaX = swipe.x - swipe.prevX;
		if (!deltaX) return;
		const progressDelta = this.swipeDeltaToProgress(deltaX);

		if (!this.cameraSideShift.locked && !this.progress.locked) {
			// start either a shift or a turn
			if (
				this.isVerticalMode &&
				!this.isTurning() &&
				(this.isShifting() ||
					(this.cameraSideShift.getValue() === -1 &&
						progressDelta > 0 &&
						this.progress.getValue() < this.pages.length - 1) ||
					(this.cameraSideShift.getValue() === 1 &&
						progressDelta < 0 &&
						this.progress.getValue() > 0))
			) {
				// starting a shift
				this.cameraSideShift.lock();
			} else {
				// starting a turn
				this.progress.lock();
				this.cameraSideShift.lock();

				if (progressDelta > 0) {
					this.progress.setMin(this.progress.getValue());
					this.progress.setMax(this.progress.getValue() + 1);
				} else {
					this.progress.setMin(this.progress.getValue() - 1);
					this.progress.setMax(this.progress.getValue());
				}

				// handling book beginning and ending
				if (this.progress.minValue < 0) {
					this.progress.setMin(0);
					this.progress.setMax(1);
				} else if (this.progress.maxValue > this.pages.length) {
					this.progress.setMin(this.pages.length - 1);
					this.progress.setMax(this.pages.length);
				}
			}
		}

		if (this.isTurning()) {
			this.progress.nudge(progressDelta);
		}

		if (this.isShifting()) {
			this.cameraSideShift.nudge(progressDelta * 2);
		}
	}

	private update(dt: number) {
		if (!dt) return;
		this.initCompleted = true;

		if (
			!this.isChangingFocus &&
			!this.focusedActiveArea &&
			this.introPhase === "COMPLETED"
		) {
			this.restoreCamera();
		}

		// TODO:
		// calculating visual turn progress to timely hide shadows
		// const topPage =
		// 	this.pages[Math.max(Math.ceil(this.progress.getValue()) - 1, 0)];
		// const visualProgress =
		// 	this.progress.getValue() +
		// 	(topPage.turnProgress - topPage.turnProgressLag) * 0.5;

		const bookOpenFactor = Math.min(
			this.progress.getValue(),
			this.pages.length - this.progress.getValue(),
			1,
		);

		this.pages.forEach((page, index) => {
			// TODO:
			// toggle shadow
			// if (index && index < this.pages.length - 1) {
			// 	page.mesh.castShadow = visualProgress < index + 1.9;
			// }

			let tp;
			if (index >= this.progress.getValue()) {
				tp = bookOpenFactor;
			} else if (index < Math.floor(this.progress.getValue())) {
				tp = -bookOpenFactor;
			} else {
				if (page.isCover) {
					tp = index ? bookOpenFactor : -bookOpenFactor;
				} else {
					tp = (this.progress.getValue() % 1) * -2 + 1;
				}
			}

			page.setTurnProgress(tp);

			page.bendingEnabled =
				this.progress.getValue() >= 1 &&
				this.progress.getValue() <= this.pages.length - 1;

			page.mesh.renderOrder = Math.abs(
				this.progress.getValue() - 0.5 - index,
			);

			if (page.needsUpdate()) {
				page.update(dt);
			}
		});

		// handle book rotation
		let bookAngle = 0;
		if (this.progress.getValue() < 1) {
			bookAngle = 1 - this.progress.getValue();
		} else if (this.progress.getValue() > this.pages.length - 1) {
			bookAngle = this.pages.length - 1 - this.progress.getValue();
		}
		bookAngle *= Math.PI / 2;
		this.group.rotation.y = bookAngle;

		// handle book rotation shift
		const pivot = new THREE.Vector3(
			this.spineWidth / 2,
			0,
			this.coverThickness,
		);
		if (bookAngle < 0) {
			pivot.x = -pivot.x;
		}
		const newPoint = rotateY(new THREE.Vector3(0, 0, 0), pivot, -bookAngle);
		this.group.position.x = newPoint.x;
		this.group.position.z = newPoint.z;

		if (!this.focusedActiveArea || this.isChangingFocus) {
			this.render();
		}
	}

	private render() {
		this.renderer.render(this.scene, this.camera);
	}

	private updateVerticalMode() {
		const bookAspect = (this.pageWidth * 2) / this.pageHeight;
		const screenAspect = window.innerWidth / window.innerHeight;
		// TODO: tweak the breakpoint
		this.isVerticalMode = bookAspect > screenAspect;
		if (this.isVerticalMode) {
			this.cameraSideShift.gravity = this.CAMERA_SIDE_GRAVITY;
		} else {
			this.cameraSideShift.gravity = 0;
		}
	}

	private onWindowResize() {
		this.updateVerticalMode();
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.render();
	}

	public applySettings(
		newSettings: Partial<FlipbookSettings>,
		updateAll = false,
	) {
		Object.assign(this.settings, newSettings);
		if (updateAll) {
			newSettings = this.settings; // ensure all updates are triggered
		}

		if (
			newSettings.cameraDistance ||
			newSettings.cameraAngle ||
			newSettings.cameraFov
		) {
			this.restoreCamera();
		}

		if (newSettings.cameraFov) {
			this.camera.fov = this.settings.cameraFov;
			this.camera.updateProjectionMatrix();
			this.restoreCamera();
		}

		if (
			newSettings.spotLightX ||
			newSettings.spotLightY ||
			newSettings.spotLightZ
		) {
			this.spotLight.position.set(
				this.settings.spotLightX,
				this.settings.spotLightY,
				this.settings.spotLightZ,
			);
			this.spotLight.lookAt(new THREE.Vector3());

			this.spotLightHelper?.update();
			this.spotShadowHelper?.update();
		}

		if (newSettings.spotLightColor) {
			this.spotLight.color = new THREE.Color(
				this.settings.spotLightColor,
			);
		}

		if (newSettings.spotLightIntensity) {
			this.spotLight.intensity = this.settings.spotLightIntensity;
		}

		if (newSettings.spotLightAngle) {
			this.spotLight.angle = this.settings.spotLightAngle;
		}

		if (newSettings.spotLightPenumbra) {
			this.spotLight.penumbra = this.settings.spotLightPenumbra;
		}

		if (newSettings.spotLightDecay) {
			this.spotLight.decay = this.settings.spotLightDecay;
		}

		if (newSettings.spotLightNearClip || newSettings.spotLightFarClip) {
			this.spotLight.shadow.camera.near = this.settings.spotLightNearClip;
			this.spotLight.shadow.camera.far = this.settings.spotLightFarClip;
			this.spotLight.shadow.camera.updateProjectionMatrix();
		}

		if (newSettings.spotLightMapSize) {
			this.spotLight.shadow.mapSize.x = this.settings.spotLightMapSize;
			this.spotLight.shadow.mapSize.y = this.settings.spotLightMapSize;
			this.spotLight.shadow.map?.dispose?.();
			this.spotLight.shadow.map = null;
			this.spotLight.shadow.needsUpdate = true;
		}

		if (newSettings.ambientLightColor) {
			this.ambientLight.color = new THREE.Color(
				this.settings.ambientLightColor,
			);
		}

		if (newSettings.ambientLightIntensity) {
			this.ambientLight.intensity = this.settings.ambientLightIntensity;
		}

		if (typeof newSettings.showSpotLightHelper !== "undefined") {
			if (this.spotLightHelper && !newSettings.showSpotLightHelper) {
				this.scene.remove(this.spotLightHelper);
				this.spotLightHelper = null;
			}
			if (!this.spotLightHelper && newSettings.showSpotLightHelper) {
				this.spotLightHelper = new THREE.SpotLightHelper(
					this.spotLight,
				);
				this.scene.add(this.spotLightHelper);
			}
		}

		if (typeof newSettings.showSpotShadowHelper !== "undefined") {
			if (this.spotShadowHelper && !newSettings.showSpotShadowHelper) {
				this.scene.remove(this.spotShadowHelper);
				this.spotShadowHelper = null;
			}
			if (!this.spotShadowHelper && newSettings.showSpotShadowHelper) {
				this.spotShadowHelper = new THREE.CameraHelper(
					this.spotLight.shadow.camera,
				);
				this.scene.add(this.spotShadowHelper);
			}
		}
	}

	public getActiveAreaAt(scenePos: THREE.Vector2) {
		if (!this.initCompleted) return;
		if (this.isTurning()) return;
		if (this.isShifting()) return;

		// determine a top pages
		const pr = Math.round(this.progress.getValue());
		const topPageIndices = [];
		if (pr !== 0) topPageIndices.push(pr - 1);
		if (pr !== this.pages.length) topPageIndices.push(pr);

		// run raycast
		this.raycaster.setFromCamera(scenePos, this.camera);
		const intersects = this.raycaster.intersectObjects(
			topPageIndices.map(i => this.pages[i].mesh),
		);
		if (!intersects.length) return;

		// check if ray hits one of the top pages
		const hoverPageIndex = topPageIndices.find(
			i => this.pages[i].mesh === intersects[0].object,
		);
		if (typeof hoverPageIndex !== "number") return;

		// prevent clicking bending pages
		const hoverPage = this.pages[hoverPageIndex];
		const hoverPageBend = Math.abs(
			hoverPage.turnProgress - hoverPage.turnProgressLag,
		);
		if (hoverPageBend > 0.01) return;

		// get face index
		let hoverFaceIndex;
		if (intersects[0].face?.materialIndex === 1) {
			hoverFaceIndex = hoverPageIndex * 2;
		} else if (intersects[0].face?.materialIndex === 0) {
			hoverFaceIndex = hoverPageIndex * 2 + 1;
		} else {
			return;
		}

		// find active area with given coords
		const faceX = intersects[0].uv?.x || 0;
		const faceY = 1 - (intersects[0].uv?.y || 0);
		return this.pageActiveAreas.find(
			area =>
				area.faceIndex === hoverFaceIndex &&
				faceY > area.top &&
				faceY < area.top + area.height &&
				faceX > area.left &&
				faceX < area.left + area.width,
		);
	}

	public async watchArea(
		corners: THREE.Vector3[],
		preset: "direct" | "page-zoom" | "page-unzoom" = "direct",
		duration = 0,
	) {
		const targetPos = this.getCameraPos(corners);

		let restFinishAt = 1;
		if (preset === "page-zoom" || preset === "page-unzoom") {
			// all properties except z finish transition at 73% of animation
			restFinishAt = 0.73;
		}

		let [zDuration, restDuration, restDelay] = [0, 0, 0];
		if (duration) {
			zDuration = duration;
			restDuration = duration * restFinishAt;

			if (preset === "page-unzoom") {
				restDelay = duration * (1 - restFinishAt);
			}
		}

		const ease = "power2.inOut";

		gsap.to(this.camera.position, {
			z: targetPos.position.z,
			duration: zDuration / 1000,
			ease,
		});

		const animateRest = () => {
			gsap.to(this.camera.position, {
				x: targetPos.position.x,
				duration: restDuration / 1000,
				ease,
			});

			gsap.to(this.camera.position, {
				y: targetPos.position.y,
				duration: restDuration / 1000,
				ease,
			});

			gsap.to(this.camera.quaternion, {
				x: targetPos.rotation.x,
				y: targetPos.rotation.y,
				z: targetPos.rotation.z,
				w: targetPos.rotation.w,
				duration: restDuration / 1000,
				ease,
			});
		};

		if (restDelay) {
			sleep(restDelay).then(animateRest);
		} else {
			// synchronous update is needed to prevent camera jittering
			animateRest();
		}
		await sleep(duration);
	}

	public getCameraPos(corners: THREE.Vector3[]) {
		const [TL, TR, BL, BR] = corners;

		const center = new THREE.Vector3()
			.addVectors(TL, TR)
			.add(BL)
			.add(BR)
			.multiplyScalar(0.25);

		// Calculate normal using cross product of diagonals
		let v1 = new THREE.Vector3().subVectors(BL, TR);
		let v2 = new THREE.Vector3().subVectors(BR, TL);
		const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

		const width = TL.distanceTo(TR);
		const height = TL.distanceTo(BL);

		// Calculate distance using camera's FOV and aspect ratio
		const fovYRadians = THREE.MathUtils.degToRad(this.camera.fov);
		const aspect = this.camera.aspect;
		const hFOV = 2 * Math.atan(Math.tan(fovYRadians / 2) * aspect);

		const distanceH = width / 2 / Math.tan(hFOV / 2);
		const distanceV = height / 2 / Math.tan(fovYRadians / 2);
		const distance = Math.max(distanceH, distanceV);

		const targetPosition = new THREE.Vector3(
			center.x + normal.x * distance,
			center.y + normal.y * distance,
			center.z + normal.z * distance,
		);

		// Calculate the quaternion for the target rotation
		const targetQuaternion = new THREE.Quaternion();
		const targetDirection = new THREE.Vector3()
			.subVectors(center, targetPosition)
			.normalize();
		targetQuaternion.setFromUnitVectors(
			new THREE.Vector3(0, 0, -1),
			targetDirection,
		);

		return {
			position: targetPosition,
			rotation: targetQuaternion,
		};
	}

	public async restoreCamera(duration = 0) {
		await this.watchArea(this.getBaseViewRect(), "page-unzoom", duration);
	}

	public getBaseViewRect(
		overrideSettings: null | Partial<FlipbookSettings> = null,
	) {
		const pw = this.pageWidth;
		const ph = this.pageHeight;
		const yShift = -ph * 0.011; // 1.1% down

		const cornerTL = new THREE.Vector3(-pw, ph / 2 + yShift, 0);
		const cornerTR = new THREE.Vector3(pw, ph / 2 + yShift, 0);
		const cornerBL = new THREE.Vector3(-pw, ph / -2 + yShift, 0);
		const cornerBR = new THREE.Vector3(pw, ph / -2 + yShift, 0);

		const corners = [cornerTL, cornerTR, cornerBL, cornerBR];

		// applying transformations to the corners
		if (this.isVerticalMode) {
			corners.forEach(point => {
				point.x *= 0.6;
			});
		}

		if (this.cameraSideShift) {
			corners.forEach(point => {
				point.x +=
					(this.pageWidth * this.cameraSideShift.getValue()) / 2;
			});
		}

		// rotate the target rectangle
		const cameraAngle =
			overrideSettings?.cameraAngle || this.settings.cameraAngle;
		const cameraDistance =
			overrideSettings?.cameraDistance || this.settings.cameraDistance;
		let rotationMatrix = new THREE.Matrix4().makeRotationX(cameraAngle);
		corners.forEach(point => point.applyMatrix4(rotationMatrix));

		return scaleRectangle(corners, cameraDistance);
	}

	private async focusActiveArea(
		area: PageActiveArea,
		distanceMultiplier: number = 1,
	) {
		if (this.isChangingFocus) return;

		const page = this.pages[Math.floor(area.faceIndex / 2)];
		const isBackside = area.faceIndex % 2 === 1;
		const corners = page.getPageAreaCorners(area, isBackside);

		this.focusedActiveArea = area;
		this.isChangingFocus = true;
		await this.watchArea(
			scaleRectangle(corners, distanceMultiplier),
			"page-zoom",
			1100,
		);
		this.isChangingFocus = false;

		this.updateCursor();
	}

	private async onBookClick(sceneMousePos: THREE.Vector2) {
		if (!this.isChangingFocus) {
			if (this.focusedActiveArea) {
				this.unfocusActiveArea();
			} else {
				// handle active area click
				const area = this.getActiveAreaAt(sceneMousePos);

				if (area?.video) {
					this.videoOverlay.open(area.video);
					this.focusActiveArea(area, 1.125);
				}

				if (area?.zoom) {
					this.focusActiveArea(area, 1.05);
				}
			}
		}

		this.updateCursor();
	}

	private async unfocusActiveArea() {
		if (this.isChangingFocus) return;

		this.focusedActiveArea = null;
		this.videoOverlay.close();

		this.isChangingFocus = true;
		await this.restoreCamera(1100);
		this.isChangingFocus = false;

		this.updateCursor();
	}

	private async playIntro() {
		const bottomViewSettings = {
			// cameraAngle: 1.047,
			// cameraAngle: 0.9,
			cameraAngle: 0.8,
			// cameraDistance: 0.742,
			// cameraDistance: 0.75,
			cameraDistance: 0.85,
		};

		const transitionToBottomView = async (durationMs: number) => {
			const animation1 = { progress: 0 };
			await gsap.to(animation1, {
				progress: 1,
				duration: durationMs / 1000,
				ease: "power2.inOut",
				onUpdate: () => {
					const bottomViewRect =
						this.getBaseViewRect(bottomViewSettings);
					this.watchArea(
						lerpRectangles(
							logoCorners,
							bottomViewRect,
							animation1.progress,
						),
					);
				},
			});
		};

		const openFirstPage = async (durationMs: number) => {
			const animation = { progress: 0 };
			this.progress.lock();
			this.progress.setMin(0);
			this.progress.setMax(1);
			await gsap.to(animation, {
				progress: 1,
				duration: durationMs / 1000,
				ease: "power2.inOut",
				onUpdate: () => {
					this.progress.setValue(animation.progress);
				},
				onComplete: () => {
					this.progress.release();
				},
			});
		};

		const transitionRaise = async (durationMs: number) => {
			// temporarily apply bottom view settings and gradually raise to
			// the base position
			const originalSettings = { ...this.settings };
			this.settings.cameraAngle = bottomViewSettings.cameraAngle;
			this.settings.cameraDistance = bottomViewSettings.cameraDistance;

			await gsap.to(this.settings, {
				cameraDistance: originalSettings.cameraDistance,
				cameraAngle: originalSettings.cameraAngle,
				duration: durationMs / 1000,
				ease: "power2.inOut",
				onUpdate: () => {
					this.restoreCamera();
				},
			});
		};

		const logoEl = this.introOverlay.dom.logo;

		this.introPhase = "ANIMATING";

		// catch the current logo opacity value
		const currentOpacity = window.getComputedStyle(logoEl).opacity;
		logoEl.style.opacity = currentOpacity;
		logoEl.style.animation = "none";

		// Trigger reflow to ensure the transition starts correctly
		logoEl.offsetHeight; // Reading the offsetHeight forces reflow

		logoEl.style.opacity = "1";

		await sleep(500); // let logo and progress settle

		// remember the light values and turn them off
		const spotLightIntensity = this.spotLight.intensity;
		const ambientLightIntensity = this.ambientLight.intensity;

		this.spotLight.intensity = 0;
		this.ambientLight.intensity = 0;

		// perform initial setup
		this.update(1);

		// prepare camera for intro animation
		const logoArea: PageArea = {
			top: 582.5 / this.pageHeight,
			left: 279 / this.pageWidth,
			width: 204 / this.pageWidth,
			height: 204 / this.pageHeight,
		};
		const logoCorners = scaleRectangle(
			this.pages[0].getPageAreaCorners(logoArea),
			1.95,
		);
		await this.watchArea(logoCorners);

		// run the main loop
		this.runAnimation();

		this.introOverlay.dom.progress.style.opacity = "0";

		await sleep(200); // make sure all the hard work is done

		// logoEl.style.filter = "drop-shadow(0 0 10px white)";
		logoEl.style.filter =
			"drop-shadow(0 0 10px white) drop-shadow(0 0 20px white) drop-shadow(0 0 40px white)";

		gsap.to(this.spotLight, {
			intensity: spotLightIntensity,
			duration: 1.5,
			// ease: "elastic.out(1, 0.3)", // Elastic ease with overshoot
			ease: "power2.inOut",
		});

		gsap.to(this.ambientLight, {
			intensity: ambientLightIntensity,
			duration: 1.5,
			ease: "power2.inOut",
		});

		await sleep(750); // wait till the max brightness

		await sleep(500); // wait during the max brightness

		logoEl.style.opacity = "0";
		logoEl.style.filter = "";

		await sleep(400); // let opacity and filter transition

		transitionToBottomView(3000);
		await sleep(2000);
		openFirstPage(3500);
		await sleep(1000);
		await transitionRaise(4000);

		// finalize
		this.introOverlay.dom.container.style.display = "none";
		this.updateCursor();
		this.introPhase = "COMPLETED";
	}
}
