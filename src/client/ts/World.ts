import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { CameraController } from './CameraController'
import { FreeCameraControls, CharacterControls } from './GameModes'
import { Utility } from './Utility'
import { Character } from './Characters/Character'

import RAPIER from '@dimforge/rapier3d-compat'
await RAPIER.init()
import { RapierDebugRenderer } from './RapierDebugRenderer'

export class World {
	characters: Character[]
	parallelPairs: {
		physical: RAPIER.RigidBody
		visual: THREE.Mesh
	}[]
	physicsFramerate: number
	physicsMaxPrediction: number
	clock: THREE.Clock
	timeScaleBottomLimit: number
	timeScaleChangeSpeed: number
	timeScaleTarget: number

	renderer: THREE.WebGLRenderer
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	stats: Stats

	preStep: Function[]
	postStep: Function[]
	world: RAPIER.World
	rapierDebugRenderer: RapierDebugRenderer

	cameraController: CameraController
	gameMode: FreeCameraControls | CharacterControls

	constructor() {
		// bind functions
		this.onWindowResize = this.onWindowResize.bind(this)
		this.keyDown = this.keyDown.bind(this)
		this.keyUp = this.keyUp.bind(this)
		this.mouseDown = this.mouseDown.bind(this)
		this.mouseUp = this.mouseUp.bind(this)
		this.mouseWheel = this.mouseWheel.bind(this)
		this.SpawnCharacter = this.SpawnCharacter.bind(this)
		this.createBoxPrimitive = this.createBoxPrimitive.bind(this)
		this.createCapsulePrimitive = this.createCapsulePrimitive.bind(this)
		this.animate = this.animate.bind(this)

		// init
		this.characters = []
		this.parallelPairs = []
		this.physicsFramerate = 1 / 60
		this.physicsMaxPrediction = 10
		this.clock = new THREE.Clock()
		this.timeScaleBottomLimit = 0.003
		this.timeScaleChangeSpeed = 1.3
		this.timeScaleTarget = 1

		// Renderer
		this.renderer = new THREE.WebGLRenderer()
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.setAnimationLoop(this.animate)
		document.body.appendChild(this.renderer.domElement)

		// Scene
		this.scene = new THREE.Scene()

		// Lighting
		let ambientLight = new THREE.AmbientLight(0x888888) // soft white light
		this.scene.add(ambientLight)

		let dirLight = new THREE.DirectionalLight(0xffffff)
		this.scene.add(dirLight)

		// Camera
		this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 120)
		this.camera.position.set(0, 1, 5)

		// Stats (FPS, Frame time, Memory)
		this.stats = new Stats()
		document.body.appendChild(this.stats.dom)

		// World
		this.preStep = []
		this.postStep = []
		const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0)
		this.world = new RAPIER.World(gravity)

		this.rapierDebugRenderer = new RapierDebugRenderer(this.scene, this.world)

		this.cameraController = new CameraController(this.camera)
		this.gameMode = new FreeCameraControls(this)

		// Auto window resize
		window.addEventListener('resize', this.onWindowResize, false)
		// Event listeners
		document.addEventListener('keydown', this.keyDown, false)
		document.addEventListener('keyup', this.keyUp, false)
		document.addEventListener('mousedown', this.mouseDown, false)
		document.addEventListener('mouseup', this.mouseUp, false)
		document.addEventListener('wheel', this.mouseWheel, false)
		{
			this.onWindowResize()
		}
	}

	private onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
	}

	private keyDown(event: KeyboardEvent) {
		this.gameMode.handleKey(event, event.key, true)
	}

	private keyUp(event: KeyboardEvent) {
		this.gameMode.handleKey(event, event.key, false)
	}

	private mouseDown(event: MouseEvent) {
		this.gameMode.handleKey(event, 'mouse' + event.button, true)
	}

	private mouseUp(event: MouseEvent) {
		this.gameMode.handleKey(event, 'mouse' + event.button, false)
	}

	private mouseWheel(event: WheelEvent) {
		if (event.deltaY > 0) {
			this.timeScaleTarget /= this.timeScaleChangeSpeed
			if (this.timeScaleTarget < this.timeScaleBottomLimit) this.timeScaleTarget = 0
		} else {
			this.timeScaleTarget *= this.timeScaleChangeSpeed
			if (this.timeScaleTarget < this.timeScaleBottomLimit) this.timeScaleTarget = this.timeScaleBottomLimit
			this.timeScaleTarget = Math.min(this.timeScaleTarget, 1)
		}
	}

	public SpawnCharacter(options: { [id: string]: any } = {}) {
		let defaults = {
			position: new THREE.Vector3(0, 3, 0),
		}
		options = Utility.setDefaults(options, defaults)

		let character = new Character(this)
		character.setPosition(options.position.x, options.position.y, options.position.z)

		// Register character
		this.characters.push(character)

		// Register physics
		// this.physicsWorld.addBody(character.characterCapsule.physical);

		// Register capsule visuals
		this.scene.add(character.characterCapsule.visual)
		this.scene.add(character.raycastBox)
		this.scene.add(character.raycastBoxS)

		// Register for synchronization
		this.parallelPairs.push(character.characterCapsule)

		// Add to graphicsWorld
		this.scene.add(character)

		return character
	}

	public createBoxPrimitive(options: { [id: string]: any } = {}) {
		let defaults = {
			mass: 1,
			position: new RAPIER.Vector3(0, 0, 0),
			size: new RAPIER.Vector3(0.3, 0.3, 0.3),
			friction: 0.3,
			visible: true,
		}
		options = Utility.setDefaults(options, defaults)

		const phyShape = RAPIER.ColliderDesc.cuboid(options.size.x, options.size.y, options.size.z)
		phyShape.setMass(options.mass)
		phyShape.setFriction(options.friction)

		const phyDesc = options.mass === 0 ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic()
		phyDesc.setTranslation(options.position.x, options.position.y, options.position.z)
		phyDesc.setCanSleep(false)

		let physBox = this.world.createRigidBody(phyDesc)
		this.world.createCollider(phyShape, physBox)

		// Add visual box
		let geometry = new THREE.BoxGeometry(options.size.x * 2, options.size.y * 2, options.size.z * 2)
		let material = new THREE.MeshLambertMaterial({ color: 0xffffff })
		let visualBox = new THREE.Mesh(geometry, material)
		visualBox.castShadow = true
		visualBox.receiveShadow = true
		visualBox.visible = options.visible
		this.scene.add(visualBox)

		let pair = {
			physical: physBox,
			visual: visualBox,
		}

		this.parallelPairs.push(pair)
		return pair
	}

	public createCapsulePrimitive(options: { [id: string]: any } = {}) {
		let defaults = {
			mass: 1,
			position: new RAPIER.Vector3(0, 0, 0),
			height: 0.5,
			radius: 0.3,
			segments: 8,
			friction: 0.3,
			visible: true,
		}
		options = Utility.setDefaults(options, defaults)

		// cylinderShape.transformAllPoints(new CANNON.Vec3(), new CANNON.Quaternion(0.707, 0, 0, 0.707)); */

		const phyShape = RAPIER.ColliderDesc.capsule(options.height - options.radius, options.radius)
		phyShape.setMass(options.mass)
		phyShape.setFriction(options.friction)
		phyShape.setTranslation(
			options.position.x,
			options.position.y - options.height - 2 * options.radius,
			options.position.z
		)

		const phyDesc = options.mass === 0 ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic()
		phyDesc.setTranslation(options.position.x, options.position.y, options.position.z)
		phyDesc.setCanSleep(false)

		let physBox = this.world.createRigidBody(phyDesc)
		this.world.createCollider(phyShape, physBox)

		let visualCapsule = new THREE.Mesh(
			Utility.createCapsuleGeometry(options.radius, options.height, options.segments),
			new THREE.MeshLambertMaterial({ color: 0xcccccc, wireframe: true })
		)
		visualCapsule.visible = options.visible

		let pair = {
			physical: physBox,
			visual: visualCapsule,
		}

		return pair
	}

	private animate() {
		this.stats.update()
		this.gameMode.update()

		let timeStep = Math.min(0.1, this.clock.getDelta()) //* 0.2;

		this.preStep.forEach((preStep) => {
			preStep()
		})
		this.world.timestep = timeStep
		this.world.step()
		this.postStep.forEach((postStep) => {
			postStep()
		})
		this.rapierDebugRenderer.update()

		this.characters.forEach((char) => {
			char.behaviour.update(timeStep)
			char.updateMatrixWorld()
		})

		this.cameraController.update()
		this.gameMode.update()

		this.parallelPairs.forEach((pair) => {
			if (pair.physical.translation().y < -5) {
				pair.physical.setTranslation(new RAPIER.Vector3(0, 10, 0), true)
			}

			/* if (pair.physical.translation().y > 10) {
				pair.physical.translation().y = -1;
			}

				if (pair.physical.translation().x > 5) {
				pair.physical.translation().x = -5;
			}

			if (pair.physical.translation().x < -5) {
				pair.physical.translation().x = 5;
			}

			if (pair.physical.translation().z > 5) {
				pair.physical.translation().z = -5;
			}

			if (pair.physical.translation().z < -5) {
				pair.physical.translation().z = 5;
			} */

			pair.visual.position.copy(pair.physical.translation()) //.add(new THREE.Vector3(0, 1, 0));
			pair.visual.quaternion.copy(pair.physical.rotation())
		})

		this.renderer.render(this.scene, this.camera)
	}
}
